# backend/app/api/attacks.py
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
import uuid
import json

from ..database import get_db, Attack, Event, Scenario, Detection, IOC, Report
from ..services.llm_service import LLMService
from ..agents.attack_planner import AttackPlannerAgent
from ..agents.soc_analyst import SOCAnalystAgent

router = APIRouter(prefix="/api/attacks", tags=["attacks"])

# Initialize services
llm_service = LLMService()
attack_planner = AttackPlannerAgent(llm_service)
soc_analyst = SOCAnalystAgent(llm_service)

# Log sources cycled through when synthesizing events per attack stage, keyed
# loosely by common MITRE tactic phases so events look plausible.
LOG_SOURCE_BY_KEYWORD = {
    "initial access": "Email Gateway",
    "execution": "Sysmon",
    "persistence": "Windows Event Log",
    "privilege escalation": "Windows Event Log",
    "defense evasion": "EDR",
    "credential access": "Sysmon",
    "discovery": "Windows Event Log",
    "lateral movement": "Firewall",
    "collection": "EDR",
    "command and control": "Network IDS",
    "exfiltration": "Firewall",
    "impact": "EDR",
}


def _build_events_from_scenario(scenario_data: dict) -> List[dict]:
    """
    Derive realistic-looking security events from the AI-generated attack
    stages/timeline instead of returning the same two hardcoded events for
    every attack. Falls back to a minimal event if no stages exist.
    """
    stages = scenario_data.get("attack_stages", []) or []
    timeline = scenario_data.get("timeline", []) or []

    if not stages:
        return [{
            "timestamp": datetime.now().isoformat(),
            "log_source": "SIEM",
            "event_type": "Unknown",
            "event_id": "0000",
            "description": "No attack stages available to derive events from",
            "severity": "Low",
            "mitre_technique": ""
        }]

    events = []
    base_time = datetime.now()

    for i, stage in enumerate(stages):
        stage_name = (stage.get("stage") or "").lower()
        log_source = next(
            (src for kw, src in LOG_SOURCE_BY_KEYWORD.items() if kw in stage_name),
            "SIEM"
        )

        # Severity escalates as the attack progresses through the chain
        if i < len(stages) * 0.3:
            severity = "Medium"
        elif i < len(stages) * 0.7:
            severity = "High"
        else:
            severity = "Critical"

        # Prefer the AI-generated timeline's description/time if it lines up
        # with this stage index, otherwise synthesize.
        timeline_entry = timeline[i] if i < len(timeline) else None
        description = (
            timeline_entry.get("description") if timeline_entry
            else stage.get("description", stage.get("technique", "Suspicious activity"))
        )

        events.append({
            "timestamp": (base_time + timedelta(minutes=i * 3)).isoformat(),
            "log_source": log_source,
            "event_type": stage.get("technique", "Unknown"),
            "event_id": str(4600 + i),
            "description": description,
            "severity": severity,
            "mitre_technique": stage.get("mitre_technique", ""),
            "attack_stage": stage.get("stage", "")
        })

    return events


# Request/Response Models
class AttackGenerateRequest(BaseModel):
    name: str
    industry: str = "Technology"
    attack_type: str = "Ransomware"
    difficulty: str = "Medium"
    operating_system: str = "Windows"
    environment: str = "On-Premise"
    custom_scenario: Optional[str] = None

class AttackResponse(BaseModel):
    id: str
    name: str
    description: str
    status: str
    created_at: datetime
    attack_stages: Optional[List[dict]] = None
    timeline: Optional[List[dict]] = None
    events: Optional[List[dict]] = None
    analysis: Optional[dict] = None

class DetectionGenerateRequest(BaseModel):
    rule_format: str = "sigma"  # "sigma" or "yara"
    max_stages: int = 5  # cap how many stages get rules, to control LLM calls


def _get_attack_or_404(attack_id: str, db: Session) -> Attack:
    attack = db.query(Attack).filter(Attack.id == attack_id).first()
    if not attack:
        raise HTTPException(status_code=404, detail="Attack not found")
    return attack


def _scenario_dict(scenario: Scenario) -> dict:
    if not scenario:
        return {}
    return {
        "company_profile": scenario.company_profile,
        "network_topology": scenario.network_topology,
        "assets": scenario.assets,
        "security_controls": scenario.security_controls,
        "attack_stages": scenario.attack_stages,
        "objectives": scenario.objectives,
        "indicators": scenario.indicators,
    }


@router.post("/generate", response_model=AttackResponse)
async def generate_attack(
    request: AttackGenerateRequest,
    db: Session = Depends(get_db)
):
    """Generate a complete attack scenario with SOC analysis"""
    try:
        # 1. Generate scenario using Attack Planner
        scenario_data = await attack_planner.process(request.dict())

        # 2. Create scenario in database (now including objectives/indicators
        #    so later IOC extraction has real data to work from)
        db_scenario = Scenario(
            id=str(uuid.uuid4()),
            name=request.name,
            industry=request.industry,
            operating_system=request.operating_system,
            attack_type=request.attack_type,
            difficulty=request.difficulty,
            environment=request.environment,
            company_profile=scenario_data.get("company_profile", {}),
            network_topology=scenario_data.get("network_topology", {}),
            assets=scenario_data.get("assets", []),
            security_controls=scenario_data.get("security_controls", []),
            attack_stages=scenario_data.get("attack_stages", []),
            objectives=scenario_data.get("objectives", []),
            indicators=scenario_data.get("indicators", []),
        )
        db.add(db_scenario)
        db.commit()
        db.refresh(db_scenario)

        # 3. Create attack in database
        db_attack = Attack(
            id=str(uuid.uuid4()),
            scenario_id=db_scenario.id,
            name=request.name,
            description=f"{request.attack_type} attack on {request.industry} environment",
            status="pending",
            tactics=scenario_data.get("attack_stages", []),
            timeline=scenario_data.get("timeline", []),
            summary={}
        )
        db.add(db_attack)
        db.commit()
        db.refresh(db_attack)

        # 4. Derive events from the actual generated attack stages/timeline
        #    (previously this was two hardcoded events for every attack)
        events = _build_events_from_scenario(scenario_data)

        # 5. Analyze with SOC Analyst
        soc_analyst.update_context('attack_plan', scenario_data)
        analysis_result = await soc_analyst.process({"events": events})

        # 6. Update attack with analysis
        db.query(Attack).filter(Attack.id == db_attack.id).update({
            "summary": analysis_result,
            "status": "completed",
            "completed_at": datetime.now()
        })
        db.commit()
        db.refresh(db_attack)

        return {
            "id": db_attack.id,
            "name": db_attack.name,
            "description": db_attack.description,
            "status": db_attack.status,
            "created_at": db_attack.created_at,
            "attack_stages": db_attack.tactics,
            "timeline": db_attack.timeline,
            "events": events,
            "analysis": analysis_result
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=List[dict])
async def list_attacks(
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """List all attacks"""
    attacks = db.query(Attack).offset(skip).limit(limit).all()
    return [
        {
            "id": a.id,
            "name": a.name,
            "status": a.status,
            "created_at": a.created_at.isoformat() if a.created_at else None
        }
        for a in attacks
    ]


@router.get("/{attack_id}")
async def get_attack(
    attack_id: str,
    db: Session = Depends(get_db)
):
    """Get attack details"""
    attack = _get_attack_or_404(attack_id, db)

    return {
        "id": attack.id,
        "name": attack.name,
        "description": attack.description,
        "status": attack.status,
        "created_at": attack.created_at.isoformat() if attack.created_at else None,
        "tactics": attack.tactics,
        "timeline": attack.timeline,
        "summary": attack.summary
    }


# ---------------------------------------------------------------------------
# IOC extraction & enrichment
# ---------------------------------------------------------------------------

@router.post("/{attack_id}/iocs/generate")
async def generate_iocs(attack_id: str, db: Session = Depends(get_db)):
    """Extract and store enriched IOCs for an attack"""
    attack = _get_attack_or_404(attack_id, db)
    scenario = db.query(Scenario).filter(Scenario.id == attack.scenario_id).first()

    try:
        iocs = await llm_service.extract_iocs(
            scenario=_scenario_dict(scenario),
            analysis=attack.summary or {}
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"IOC extraction failed: {e}")

    stored = []
    for ioc in iocs:
        db_ioc = IOC(
            id=str(uuid.uuid4()),
            attack_id=attack.id,
            indicator_type=ioc.get("indicator_type", "unknown"),
            value=ioc.get("value", ""),
            threat_intel={"context": ioc.get("context", "")},
            risk_score=ioc.get("risk_score", 0),
        )
        db.add(db_ioc)
        stored.append(db_ioc)

    db.commit()

    return [
        {
            "id": i.id,
            "indicator_type": i.indicator_type,
            "value": i.value,
            "threat_intel": i.threat_intel,
            "risk_score": i.risk_score,
            "created_at": i.created_at.isoformat() if i.created_at else None,
        }
        for i in stored
    ]


@router.get("/{attack_id}/iocs")
async def list_iocs(attack_id: str, db: Session = Depends(get_db)):
    """List stored IOCs for an attack"""
    _get_attack_or_404(attack_id, db)
    iocs = db.query(IOC).filter(IOC.attack_id == attack_id).all()
    return [
        {
            "id": i.id,
            "indicator_type": i.indicator_type,
            "value": i.value,
            "threat_intel": i.threat_intel,
            "risk_score": i.risk_score,
            "created_at": i.created_at.isoformat() if i.created_at else None,
        }
        for i in iocs
    ]


# ---------------------------------------------------------------------------
# Detection rule generation (Sigma / YARA)
# ---------------------------------------------------------------------------

@router.post("/{attack_id}/detections/generate")
async def generate_detections(
    attack_id: str,
    request: DetectionGenerateRequest,
    db: Session = Depends(get_db)
):
    """Generate detection rules (Sigma/YARA) for an attack's stages"""
    attack = _get_attack_or_404(attack_id, db)

    if request.rule_format not in ("sigma", "yara"):
        raise HTTPException(status_code=400, detail="rule_format must be 'sigma' or 'yara'")

    stages = (attack.tactics or [])[: max(1, request.max_stages)]
    if not stages:
        raise HTTPException(status_code=400, detail="This attack has no stages to generate rules from")

    stored = []
    errors = []
    for stage in stages:
        try:
            rule = await llm_service.generate_detection_rule(stage, rule_format=request.rule_format)
        except Exception as e:
            # Don't let one bad stage discard rules that succeeded for
            # other stages - collect the error and keep going.
            errors.append(f"{stage.get('stage', 'stage')}: {e}")
            continue

        db_detection = Detection(
            id=str(uuid.uuid4()),
            attack_id=attack.id,
            rule_name=rule.get("rule_name", f"Rule for {stage.get('stage', 'stage')}"),
            rule_format=rule.get("rule_format", request.rule_format),
            rule_content=rule.get("rule_content", ""),
            description=rule.get("description", ""),
            severity=rule.get("severity", "medium"),
            confidence=rule.get("confidence", 50),
            mitre_technique=rule.get("mitre_technique", ""),
            mitre_tactic=rule.get("mitre_tactic", ""),
        )
        db.add(db_detection)
        stored.append(db_detection)

    if not stored:
        db.rollback()
        detail = "Detection rule generation failed for every stage."
        if errors:
            detail += " " + " | ".join(errors[:3])
        raise HTTPException(status_code=502, detail=detail)

    db.commit()

    return [
        {
            "id": d.id,
            "rule_name": d.rule_name,
            "rule_format": d.rule_format,
            "rule_content": d.rule_content,
            "description": d.description,
            "severity": d.severity,
            "confidence": d.confidence,
            "mitre_technique": d.mitre_technique,
            "mitre_tactic": d.mitre_tactic,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in stored
    ]


@router.get("/{attack_id}/detections")
async def list_detections(attack_id: str, db: Session = Depends(get_db)):
    """List stored detection rules for an attack"""
    _get_attack_or_404(attack_id, db)
    detections = db.query(Detection).filter(Detection.attack_id == attack_id).all()
    return [
        {
            "id": d.id,
            "rule_name": d.rule_name,
            "rule_format": d.rule_format,
            "rule_content": d.rule_content,
            "description": d.description,
            "severity": d.severity,
            "confidence": d.confidence,
            "mitre_technique": d.mitre_technique,
            "mitre_tactic": d.mitre_tactic,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in detections
    ]


# ---------------------------------------------------------------------------
# Incident report generation
# ---------------------------------------------------------------------------

@router.post("/{attack_id}/reports/generate")
async def generate_report(attack_id: str, db: Session = Depends(get_db)):
    """Generate a professional incident report for an attack"""
    attack = _get_attack_or_404(attack_id, db)
    scenario = db.query(Scenario).filter(Scenario.id == attack.scenario_id).first()
    iocs = db.query(IOC).filter(IOC.attack_id == attack_id).all()
    detections = db.query(Detection).filter(Detection.attack_id == attack_id).all()

    try:
        report_data = await llm_service.generate_incident_report(
            scenario=_scenario_dict(scenario),
            attack_summary={
                "name": attack.name,
                "description": attack.description,
                "tactics": attack.tactics,
                "timeline": attack.timeline,
            },
            analysis=attack.summary or {},
            iocs=[{"value": i.value, "indicator_type": i.indicator_type} for i in iocs],
            detections=[{"rule_name": d.rule_name} for d in detections],
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Report generation failed: {e}")

    db_report = Report(
        id=str(uuid.uuid4()),
        attack_id=attack.id,
        title=report_data.get("title", f"Incident Report - {attack.name}"),
        summary=report_data.get("executive_summary", ""),
        technical_details=report_data.get("technical_details", {}),
        recommendations=report_data.get("recommendations", []),
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)

    return {
        "id": db_report.id,
        "title": db_report.title,
        "summary": db_report.summary,
        "technical_details": db_report.technical_details,
        "recommendations": db_report.recommendations,
        "created_at": db_report.created_at.isoformat() if db_report.created_at else None,
    }


@router.get("/{attack_id}/reports")
async def list_reports(attack_id: str, db: Session = Depends(get_db)):
    """List stored reports for an attack"""
    _get_attack_or_404(attack_id, db)
    reports = db.query(Report).filter(Report.attack_id == attack_id).all()
    return [
        {
            "id": r.id,
            "title": r.title,
            "summary": r.summary,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in reports
    ]


@router.get("/{attack_id}/reports/{report_id}")
async def get_report(attack_id: str, report_id: str, db: Session = Depends(get_db)):
    """Get a specific report's full content"""
    _get_attack_or_404(attack_id, db)
    report = db.query(Report).filter(
        Report.id == report_id, Report.attack_id == attack_id
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    return {
        "id": report.id,
        "title": report.title,
        "summary": report.summary,
        "technical_details": report.technical_details,
        "recommendations": report.recommendations,
        "created_at": report.created_at.isoformat() if report.created_at else None,
    }
