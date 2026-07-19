# backend/app/services/llm_service.py
import json
import logging
import re
import asyncio
from datetime import datetime
from typing import Dict, Any, Optional, List
from google import genai
from groq import Groq
from ..config import settings

logger = logging.getLogger(__name__)


class LLMJSONError(Exception):
    """Raised when the model's output could not be parsed into the requested
    JSON shape even after retries and repair attempts. Callers can catch this
    and surface a clear error, or pass a `fallback` to generate_json to avoid
    raising entirely."""
    pass


class LLMService:
    """Unified LLM service with Groq primary + Gemini fallback"""

    def __init__(self):
        self.groq = self._init_groq()
        self.gemini_client = self._init_gemini()

        logger.info(f"✅ LLM Service initialized. Groq: {bool(self.groq)}, Gemini: {bool(self.gemini_client)}")

    def _init_groq(self):
        """Initialize Groq (Primary - Fastest)"""
        if settings.GROQ_API_KEY:
            try:
                client = Groq(api_key=settings.GROQ_API_KEY)
                logger.info("✅ Groq initialized successfully")
                return client
            except Exception as e:
                logger.error(f"Failed to initialize Groq: {e}")
        else:
            logger.warning("⚠️ GROQ_API_KEY not set")
        return None

    def _init_gemini(self):
        """Initialize Google Gemini (Fallback)"""
        if settings.GEMINI_API_KEY:
            try:
                client = genai.Client(api_key=settings.GEMINI_API_KEY)
                logger.info("✅ Gemini initialized successfully")
                return client
            except Exception as e:
                logger.error(f"Failed to initialize Gemini: {e}")
        else:
            logger.warning("⚠️ GEMINI_API_KEY not set")
        return None

    async def generate(
        self,
        prompt: str,
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,  # Reduced to avoid token limits
        system_prompt: Optional[str] = None,
        force_json: bool = False,
    ) -> str:
        """Generate response with Groq primary + Gemini fallback.

        force_json=True asks the provider's native JSON mode to constrain
        output to syntactically valid JSON (Groq's response_format /
        Gemini's response_mime_type). This does NOT guarantee the JSON
        matches our desired *shape* - generate_json() still validates and
        repairs that - but it eliminates most stray prose/markdown wrapping.
        """

        # Try Groq FIRST (fastest)
        if self.groq and (not model or model == "groq"):
            try:
                messages = []
                if system_prompt:
                    messages.append({"role": "system", "content": system_prompt})
                messages.append({"role": "user", "content": prompt})

                # Retry logic for rate limits
                for attempt in range(3):
                    try:
                        create_kwargs = dict(
                            model="llama-3.1-8b-instant",
                            messages=messages,
                            temperature=temperature,
                            max_tokens=max_tokens,
                            timeout=60.0,
                        )
                        if force_json:
                            create_kwargs["response_format"] = {"type": "json_object"}

                        try:
                            response = self.groq.chat.completions.create(**create_kwargs)
                        except Exception as inner_e:
                            # Some Groq models/accounts may reject response_format -
                            # fall back to a plain call rather than losing the whole request.
                            if force_json and "response_format" in str(inner_e).lower():
                                create_kwargs.pop("response_format", None)
                                response = self.groq.chat.completions.create(**create_kwargs)
                            else:
                                raise

                        if response.choices and len(response.choices) > 0:
                            content = response.choices[0].message.content
                            if content is not None:
                                return content
                            return ""
                        return ""
                    except Exception as e:
                        if "429" in str(e) and attempt < 2:
                            wait_time = 2 ** attempt
                            logger.warning(f"Rate limited, waiting {wait_time}s...")
                            await asyncio.sleep(wait_time)
                            continue
                        raise e
            except Exception as e:
                logger.warning(f"Groq failed after retries: {e}")

        # Try Gemini fallback
        if self.gemini_client and (not model or model == "gemini"):
            try:
                full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
                config: Dict[str, Any] = {
                    "temperature": temperature,
                    "max_output_tokens": max_tokens,
                }
                if force_json:
                    config["response_mime_type"] = "application/json"

                response = self.gemini_client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=full_prompt,
                    config=config,
                )
                if response.text is not None:
                    return response.text
                return ""
            except Exception as e:
                logger.warning(f"Gemini failed: {e}")

        # If both fail
        logger.error("All AI models failed")
        return "Error: No AI model available. Please check your API keys."

    # ------------------------------------------------------------------
    # Structured JSON generation
    # ------------------------------------------------------------------

    def _schema_to_template(self, schema: Dict[str, Any]) -> Any:
        """
        Convert our simplified JSON-schema-like dict into a flat EXAMPLE
        instance rather than JSON-Schema-draft syntax.

        This matters a lot in practice: smaller/faster models (like
        llama-3.1-8b-instant) frequently echo back a literal JSON-Schema
        envelope (`{"type": "object", "properties": {...}}`) when asked to
        "match this schema", instead of producing an instance of it. Showing
        the model something that already looks like the target JSON object -
        with placeholder text marking what to fill in - avoids that failure
        mode almost entirely.
        """
        t = schema.get("type")

        if t == "object":
            return {
                key: self._schema_to_template(val)
                for key, val in schema.get("properties", {}).items()
            }
        if t == "array":
            item_template = self._schema_to_template(schema.get("items", {"type": "string"}))
            return [item_template]
        if t in ("integer", "number"):
            hint = schema.get("description")
            return f"<{t}{': ' + hint if hint else ''}>"
        if t == "boolean":
            return "<true or false>"
        # string (default)
        hint = schema.get("description")
        return f"<string{': ' + hint if hint else ''}>"

    def _find_json_object(self, text: str) -> Optional[str]:
        """
        Locate the first complete top-level JSON object in `text` using a
        quote-aware brace-depth scan, rather than a naive greedy regex.

        This matters specifically for rule content: YARA rules
        (`rule Name { ... }`) and some Sigma text contain their own literal
        '{' and '}' characters inside string values. A naive `\\{.*\\}` regex
        can misjudge where the *outer* JSON object actually ends. This scan
        tracks brace depth only *outside* of quoted strings (respecting
        escaped quotes), so nested braces inside rule_content never confuse
        the boundary detection.

        Returns None if the braces never balance - which correctly signals
        a truncated/incomplete response (e.g. cut off by max_tokens) rather
        than silently matching the wrong span.
        """
        start = text.find('{')
        if start == -1:
            return None

        depth = 0
        in_string = False
        escape = False

        for i in range(start, len(text)):
            ch = text[i]
            if in_string:
                if escape:
                    escape = False
                elif ch == '\\':
                    escape = True
                elif ch == '"':
                    in_string = False
                continue
            if ch == '"':
                in_string = True
            elif ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    return text[start:i + 1]
        return None  # braces never balanced - likely truncated mid-generation

    def _extract_json(self, response: str) -> Optional[Dict[str, Any]]:
        """Best-effort extraction + repair of a JSON object from raw model output."""
        text = (response or "").strip()

        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]

        boundary_match = self._find_json_object(text)
        if boundary_match:
            text = boundary_match
        text = text.strip()

        if not text:
            return None

        # Attempt 1: parse as-is. strict=False permits literal control
        # characters (raw newlines/tabs) inside strings, which some models
        # emit when writing multi-line rule content instead of escaping them.
        try:
            return json.loads(text, strict=False)
        except json.JSONDecodeError:
            pass

        # Attempt 2: repair invalid backslash escapes. Rule content (YARA
        # regex, Windows paths like C:\Users) often contains backslashes
        # that aren't valid JSON escape sequences (\d, \U, \S, ...). Escape
        # any backslash not already followed by a valid JSON escape char.
        sanitized = re.sub(r'\\(?!["\\/bfnrtu])', r'\\\\', text)
        try:
            return json.loads(sanitized, strict=False)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON even after sanitization: {e}")
            logger.error(f"Full response ({len(text)} chars): {text}")
            return None

    _SCHEMA_MARKER_KEYS = {"type", "properties", "$schema", "items"}

    def _is_schema_echo_fragment(self, value: Any) -> bool:
        """A dict that looks like a JSON-Schema-draft fragment (e.g.
        {"type": "string", "value": "..."}) instead of real content - the
        actual failure mode we need to catch."""
        return isinstance(value, dict) and bool(set(value.keys()) & self._SCHEMA_MARKER_KEYS)

    def _coerce_scalar(self, value: Any, schema: Dict[str, Any]) -> Any:
        """Best-effort coercion of a validated-but-loosely-typed scalar into
        the type the rest of the app expects (e.g. "90" -> 90)."""
        t = schema.get("type")
        try:
            if t in ("integer",) and not isinstance(value, bool):
                return int(float(value)) if not isinstance(value, int) else value
            if t == "number" and not isinstance(value, bool):
                return float(value) if not isinstance(value, (int, float)) else value
            if t == "string" and not isinstance(value, str):
                return str(value)
        except (TypeError, ValueError):
            pass
        return value
    def _coerce_to_schema(self, value: Any, schema: Dict[str, Any]) -> Any:
        """Recursively coerce a validated value's scalars to match schema
        types (e.g. "90" -> 90), so downstream DB writes get real ints."""
        t = schema.get("type")
        if t == "object" and isinstance(value, dict):
            return {
                k: (self._coerce_to_schema(v, schema["properties"][k]) if k in schema.get("properties", {}) else v)
                for k, v in value.items()
            }
        if t == "array" and isinstance(value, list):
            item_schema = schema.get("items", {"type": "string"})
            return [self._coerce_to_schema(v, item_schema) for v in value]
        return self._coerce_scalar(value, schema)

    def _extract_usable(
        self,
        parsed: Dict[str, Any],
        schema: Dict[str, Any],
        critical_keys: Optional[set] = None,
    ) -> "tuple[Dict[str, Any], bool]":
        """
        Extract whatever's usable from a parsed JSON object, field by field,
        rather than an all-or-nothing verdict on the whole object.

        `critical_keys` are fields that must be present, non-schema-echoed,
        and non-trivial (e.g. rule_content) for the result to count as
        success. Every other field is best-effort: coerced if loosely typed,
        silently dropped (falling back to the caller's default) if it's a
        schema-echo fragment or otherwise unusable - never enough on its own
        to discard an otherwise-good result. This is what actually fixes the
        recurring failure mode where a cosmetic field like `confidence` or
        `severity` being slightly malformed threw away perfectly good
        rule_content.
        """
        if not isinstance(parsed, dict):
            return {}, False

        critical_keys = critical_keys or set()
        result: Dict[str, Any] = {}
        ok = True

        for key, sub_schema in schema.get("properties", {}).items():
            if key not in parsed:
                if key in critical_keys:
                    ok = False
                continue

            raw = parsed[key]
            if self._is_schema_echo_fragment(raw):
                if key in critical_keys:
                    ok = False
                continue  # cosmetic field: drop it, caller's .get() default applies

            result[key] = self._coerce_to_schema(raw, sub_schema)

        for key in critical_keys:
            val = result.get(key)
            if isinstance(val, str) and len(val.strip()) < 10:
                ok = False

        return result, ok

    async def generate_json(
        self,
        prompt: str,
        schema: Dict[str, Any],
        model: Optional[str] = None,
        temperature: float = 0.3,
        fallback: Optional[Dict[str, Any]] = None,
        max_tokens: int = 2048,
        critical_keys: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Generate structured JSON output.

        `critical_keys` (e.g. ["rule_content"]) marks fields that must be
        genuinely present for the result to count as success; every other
        field is extracted best-effort and defaults are left to the caller
        if unusable - so a malformed cosmetic field never discards otherwise
        good content.

        If parsing fails after retrying once, returns `fallback` if provided;
        otherwise raises LLMJSONError so the caller (API layer) can surface a
        clear error instead of silently returning wrong-shaped data.
        """

        # Truncate prompt if too long (Groq has 6000 token limit)
        if len(prompt) > 4000:
            prompt = prompt[:4000] + "\n... [truncated for length]"
            logger.warning("Prompt truncated to avoid token limits")

        template = json.dumps(self._schema_to_template(schema), indent=2)
        base_prompt = f"""{prompt}

Respond with ONLY a single JSON object shaped exactly like this example
(replace every placeholder in angle brackets with real content, and keep
exactly these keys - do not add, remove, or rename keys, and do not include
the words "type" or "properties" anywhere in your answer):

{template}

Output raw JSON only - no markdown code fences, no commentary before or after."""

        critical_set = set(critical_keys or [])
        last_response = ""
        for attempt in range(2):
            json_prompt = base_prompt
            if attempt == 1:
                json_prompt += (
                    "\n\nYour previous response was not valid JSON matching the shape "
                    "above. Try again - return ONLY the corrected JSON object."
                )

            response = await self.generate(
                json_prompt, model, temperature, max_tokens=max_tokens, force_json=True
            )
            last_response = response

            parsed = self._extract_json(response)
            if parsed is not None:
                usable, ok = self._extract_usable(parsed, schema, critical_set)
                if ok:
                    return usable
                logger.error(
                    f"generate_json attempt {attempt + 1}: critical field(s) "
                    f"{sorted(critical_set)} missing or unusable. Parsed keys present: "
                    f"{list(parsed.keys())}"
                )
            else:
                logger.error(f"generate_json attempt {attempt + 1} failed to parse")

        logger.error(f"generate_json giving up after retries. Last response ({len(last_response)} chars): {last_response}")

        if fallback is not None:
            return fallback

        raise LLMJSONError(
            "The AI returned output that couldn't be parsed as JSON, even after retrying. "
            "Please try again."
        )

    def _get_fallback_scenario(self) -> Dict[str, Any]:
        """Fallback scenario used only for the top-level generate_scenario call -
        the app's flagship flow should never hard-fail even if the AI output
        can't be parsed after retries."""
        return {
            "company_profile": {
                "name": "NerdForge Corp",
                "employees": 500,
                "industry": "Technology",
                "description": "A technology company with hybrid work environment"
            },
            "network_topology": {
                "architecture": "Hybrid Cloud",
                "segments": ["Corporate Network", "DMZ", "Cloud VPC"],
                "security_controls": ["Firewall", "IDS/IPS", "SIEM", "MFA"]
            },
            "attack_stages": [
                {
                    "stage": "Initial Access",
                    "technique": "Phishing",
                    "mitre_tactic": "TA0001",
                    "mitre_technique": "T1566.001",
                    "description": "Attacker sends phishing email with malicious attachment",
                    "commands": ["powershell -nop -w hidden -c Invoke-Expression"],
                    "tools": ["PowerShell"]
                },
                {
                    "stage": "Execution",
                    "technique": "PowerShell",
                    "mitre_tactic": "TA0002",
                    "mitre_technique": "T1059.001",
                    "description": "Macro executes PowerShell to download payload",
                    "commands": ["powershell -exec bypass -file payload.ps1"],
                    "tools": ["PowerShell"]
                },
                {
                    "stage": "Persistence",
                    "technique": "Registry Run Keys",
                    "mitre_tactic": "TA0003",
                    "mitre_technique": "T1547.001",
                    "description": "Adds registry key for persistence",
                    "commands": ["reg add HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run /v Update /t REG_SZ /d C:\\Users\\Public\\update.exe"],
                    "tools": ["reg.exe"]
                }
            ],
            "timeline": [
                {"time": "09:00", "action": "Email Delivered", "description": "Phishing email received by user"},
                {"time": "09:03", "action": "Attachment Opened", "description": "User opens malicious Word document"},
                {"time": "09:05", "action": "PowerShell Executed", "description": "Macro executes malicious PowerShell"},
                {"time": "09:08", "action": "Persistence Established", "description": "Registry run key added"}
            ],
            "objectives": ["Steal credentials", "Deploy ransomware", "Establish persistent access"],
            "indicators": ["malicious-domain.com", "185.xxx.xxx.xxx", "powershell.exe", "mimikatz.exe"]
        }

    def _get_fallback_analysis(self) -> Dict[str, Any]:
        """Honest fallback for SOC analysis - keeps the overall attack-generation
        flow from hard-failing, but is clearly labeled as unavailable rather
        than silently showing wrong-shaped data."""
        return {
            "summary": (
                "AI analysis could not be generated for this attack after retrying. "
                "You can still review the attack stages and timeline above, or try "
                "regenerating the attack."
            ),
            "detections": [],
            "attack_chain": [],
            "severity_score": 50,
            "priority": "Medium",
            "recommended_actions": [
                "Review the attack stages and timeline manually",
                "Regenerate this attack for a fresh AI analysis",
            ],
        }

    # ------------------------------------------------------------------
    # Feature-specific generators
    # ------------------------------------------------------------------

    async def generate_scenario(
        self,
        industry: str,
        attack_type: str,
        difficulty: str = "medium",
        os: str = "Windows",
        environment: str = "on-premise",
        custom_scenario: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate a complete attack scenario"""

        schema = {
            "type": "object",
            "properties": {
                "company_profile": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "employees": {"type": "integer"},
                        "industry": {"type": "string"},
                        "description": {"type": "string"}
                    }
                },
                "network_topology": {
                    "type": "object",
                    "properties": {
                        "architecture": {"type": "string"},
                        "segments": {"type": "array", "items": {"type": "string"}},
                        "security_controls": {"type": "array", "items": {"type": "string"}}
                    }
                },
                "attack_stages": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "stage": {"type": "string"},
                            "technique": {"type": "string"},
                            "mitre_tactic": {"type": "string"},
                            "mitre_technique": {"type": "string"},
                            "description": {"type": "string"},
                            "commands": {"type": "array", "items": {"type": "string"}},
                            "tools": {"type": "array", "items": {"type": "string"}}
                        }
                    }
                },
                "timeline": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "time": {"type": "string"},
                            "action": {"type": "string"},
                            "description": {"type": "string"}
                        }
                    }
                },
                "objectives": {"type": "array", "items": {"type": "string"}},
                "indicators": {"type": "array", "items": {"type": "string"}}
            }
        }

        custom_instruction = (
            f"\n        The user described this specific scenario - base the attack on it:\n        \"{custom_scenario[:500]}\"\n"
            if custom_scenario else ""
        )
        prompt = f"""
        Generate a realistic cyber attack scenario:
        Industry: {industry}
        Attack Type: {attack_type}
        Difficulty: {difficulty}
        OS: {os}
        Environment: {environment}
        {custom_instruction}
        Include MITRE ATT&CK techniques, commands, and timeline.
        """

        return await self.generate_json(
            prompt, schema, temperature=0.3, fallback=self._get_fallback_scenario(),
            critical_keys=["attack_stages"],
        )

    async def extract_iocs(
        self,
        scenario: Dict[str, Any],
        analysis: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Extract and enrich Indicators of Compromise from a scenario + its SOC analysis"""

        schema = {
            "type": "object",
            "properties": {
                "iocs": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "indicator_type": {
                                "type": "string",
                                "description": "one of: ip, domain, url, file_hash, email, registry_key, filename"
                            },
                            "value": {"type": "string"},
                            "context": {"type": "string", "description": "why this is suspicious / where it appeared"},
                            "risk_score": {"type": "integer", "description": "0-100"}
                        }
                    }
                }
            }
        }

        raw_indicators = scenario.get("indicators", [])
        attack_stages = scenario.get("attack_stages", [])

        prompt = f"""
        Extract Indicators of Compromise (IOCs) from this attack scenario for a SOC analyst.

        Raw indicators already noted: {json.dumps(raw_indicators)}
        Attack stages: {json.dumps(attack_stages[:6], indent=2)}
        SOC analysis summary: {analysis.get('summary', 'None') if analysis else 'None'}

        For each IOC, classify its type, give brief enrichment context (why it's
        suspicious, which attack stage it relates to), and assign a risk score
        0-100. Include IPs, domains, file hashes, filenames, and registry keys
        where relevant. De-duplicate values.
        """

        # No fallback here: an empty/wrong IOC list silently looks like a
        # legitimate "no IOCs found" result, which is misleading. Better to
        # raise and let the API return a clear error so the user can retry.
        result = await self.generate_json(prompt, schema, temperature=0.2, critical_keys=["iocs"])
        return result.get("iocs", [])

    async def generate_detection_rule(
        self,
        attack_stage: Dict[str, Any],
        rule_format: str = "sigma"
    ) -> Dict[str, Any]:
        """Generate a detection rule (Sigma or YARA) for a given attack stage"""

        schema = {
            "type": "object",
            "properties": {
                "rule_name": {"type": "string"},
                "rule_content": {"type": "string", "description": "the full rule text in valid Sigma YAML or YARA syntax"},
                "description": {"type": "string"},
                "severity": {"type": "string", "description": "low, medium, high, or critical"},
                "confidence": {"type": "integer", "description": "0-100"}
            }
        }

        today = datetime.now().strftime("%Y-%m-%d")
        commands = attack_stage.get("commands", []) or ["(no example commands provided)"]
        tools = attack_stage.get("tools", []) or []
        mitre_technique = attack_stage.get("mitre_technique", "T0000")
        mitre_tactic = attack_stage.get("mitre_tactic", "")

        if rule_format == "sigma":
            syntax_guide = f"""
Follow this exact Sigma structure (this is real, valid Sigma syntax - match it closely):

title: <short descriptive title, Title Case>
id: <a realistic random UUID>
status: experimental
description: <one sentence, what this detects>
references:
    - https://attack.mitre.org/techniques/{mitre_technique}/
author: NerdForge AI
date: {today}
tags:
    - attack.{mitre_tactic.lower() if mitre_tactic else 'unknown'}
    - attack.{mitre_technique.lower()}
logsource:
    category: <the correct Sigma category for this behavior, e.g. process_creation, network_connection, registry_event, file_event>
    product: windows
detection:
    selection:
        <field>: <value>
        <field2>: <value2>
    condition: selection
falsepositives:
    - <one realistic, specific false-positive scenario - not "Unknown">
level: <informational|low|medium|high|critical>

The "selection" fields MUST be built from the actual commands/tools below -
use real Sigma field names (CommandLine, Image, TargetFilename, DestinationIp,
RegistryKey, etc. as appropriate to the logsource category), not placeholders.
"""
        else:
            syntax_guide = f"""
Follow this exact YARA structure (this is real, valid YARA syntax - match it closely):

rule <Rule_Name_In_PascalCase_With_Underscores>
{{
    meta:
        author = "NerdForge AI"
        date = "{today}"
        description = "<one sentence, what this detects>"
        reference = "https://attack.mitre.org/techniques/{mitre_technique}/"
        tags = "<comma-separated tags relevant to this stage>"

    strings:
        $string1 = "<a concrete string pulled directly from the commands/tools below>" nocase
        $string2 = "<another concrete, specific indicator - a real flag, path, or argument>" nocase

    condition:
        <a realistic condition such as "any of them", "all of them", or "2 of them">
}}

The $string values MUST be concrete substrings derived from the actual
commands/tools below (executable names, flags, URLs, file paths) - not
generic placeholders like "malware.exe" unless that literal string actually
appears in the commands.
"""

        prompt = f"""
        Write a {rule_format.upper()} detection rule for this specific attack stage.
        You are an experienced detection engineer - the rule must be technically
        accurate and directly grounded in the observed activity below, not generic.

        Stage: {attack_stage.get('stage', 'Unknown')}
        Technique: {attack_stage.get('technique', 'Unknown')}
        MITRE Technique ID: {mitre_technique}
        MITRE Tactic: {mitre_tactic}
        Description: {attack_stage.get('description', '')}
        Tools observed: {json.dumps(tools)}
        Commands observed (use these verbatim as the basis for your detection logic): {json.dumps(commands)}

        {syntax_guide}

        Do not use placeholder values like "Your Name", "your_hash_value", or
        generic dates like 2023-01-01 - use the author and date given above.
        Put the complete rule text (matching the structure above exactly) into
        the rule_content field. Within rule_content, escape backslashes and
        newlines properly so the surrounding JSON stays valid.
        """

        # No fallback: an empty rule_content silently rendered as a "successful"
        # card is exactly the bug we're fixing. Raise so the batch endpoint can
        # surface a clear error instead.
        result = await self.generate_json(
            prompt, schema, temperature=0.15, max_tokens=3000, critical_keys=["rule_content"]
        )
        result["mitre_technique"] = mitre_technique
        result["mitre_tactic"] = mitre_tactic
        result["rule_format"] = rule_format
        return result

    async def generate_incident_report(
        self,
        scenario: Dict[str, Any],
        attack_summary: Dict[str, Any],
        analysis: Dict[str, Any],
        iocs: List[Dict[str, Any]],
        detections: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate a professional incident report from everything gathered so far"""

        schema = {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "executive_summary": {"type": "string"},
                "technical_details": {
                    "type": "object",
                    "properties": {
                        "attack_narrative": {"type": "string"},
                        "affected_systems": {"type": "array", "items": {"type": "string"}},
                        "attack_chain": {"type": "array", "items": {"type": "string"}},
                        "root_cause": {"type": "string"}
                    }
                },
                "recommendations": {
                    "type": "array",
                    "items": {"type": "string"}
                }
            }
        }

        prompt = f"""
        Write a professional cybersecurity incident report based on this data.

        Company: {json.dumps(scenario.get('company_profile', {}))}
        Attack summary: {json.dumps(attack_summary, indent=2)[:1500]}
        SOC analysis: {json.dumps(analysis, indent=2)[:1500] if analysis else 'None'}
        IOCs found: {len(iocs)} indicators - top ones: {json.dumps(iocs[:5])}
        Detection rules written: {len(detections)}

        Produce an executive summary suitable for leadership, a technical
        narrative of how the attack unfolded, affected systems, root cause,
        and concrete, prioritized remediation recommendations.
        """

        # No fallback: a report with an empty summary but a real-looking title
        # is worse than no report at all. Raise so the frontend shows a clear
        # error and the user can regenerate.
        return await self.generate_json(
            prompt, schema, temperature=0.3, max_tokens=3000, critical_keys=["executive_summary"]
        )

    async def analyze_events(
        self,
        events: List[Dict],
        attack_plan: Dict
    ) -> Dict[str, Any]:
        """Analyze security events and provide SOC insights"""

        schema = {
            "type": "object",
            "properties": {
                "summary": {"type": "string"},
                "detections": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "event_id": {"type": "string"},
                            "severity": {"type": "string"},
                            "confidence": {"type": "integer"},
                            "description": {"type": "string"},
                            "mitre_technique": {"type": "string"},
                            "explanation": {"type": "string"}
                        }
                    }
                },
                "attack_chain": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "step": {"type": "integer"},
                            "event": {"type": "string"},
                            "mitre_tactic": {"type": "string"},
                            "description": {"type": "string"}
                        }
                    }
                },
                "severity_score": {"type": "integer"},
                "priority": {"type": "string"},
                "recommended_actions": {"type": "array", "items": {"type": "string"}}
            }
        }

        prompt = f"""
        Analyze these security events for a SOC analyst.
        Events: {json.dumps(events[:5], indent=2)}
        Context: {json.dumps(attack_plan, indent=2) if attack_plan else 'None'}

        Provide analysis with:
        1. Summary
        2. Detections with severity and explanation
        3. Attack chain
        4. Severity score (0-100)
        5. Priority level
        6. Recommended actions
        """

        # Fallback here (not the scenario one) so a parse failure during
        # attack generation degrades gracefully instead of 500ing the whole
        # request, while being honest that analysis is unavailable.
        return await self.generate_json(
            prompt, schema, temperature=0.3, fallback=self._get_fallback_analysis(),
            critical_keys=["summary"],
        )
