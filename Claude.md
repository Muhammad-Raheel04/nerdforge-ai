# CLAUDE.md - NerdForge AI

## 🛡️ Project Overview

**NerdForge AI** is an autonomous AI-powered Security Operations Center (SOC) platform that combines attack simulation, threat detection, incident response, and automated reporting into a unified ecosystem. The platform uses Generative AI to augment security analysts, making cybersecurity operations faster, more accessible, and more effective.

**Hackathon:** DYLP Vibe Coding Hackathon 2026
**Category:** Cyber Security + Generative AI
**Duration:** 3 Weeks

---

## 🎯 Project Goals

1. **Generate** realistic attack scenarios using AI (Groq + Gemini)
2. **Simulate** attacks as sequences of security events with MITRE ATT&CK mapping
3. **Detect** and explain malicious activity through an AI SOC analyst
4. **Correlate** events into coherent incident timelines
5. **Extract** and enrich Indicators of Compromise (IOCs)
6. **Generate** detection rules for multiple security platforms (Sigma, YARA, etc.)
7. **Recommend** incident response actions
8. **Produce** professional incident reports automatically

---

## ✅ What We've Achieved

### Backend (Complete)
- ✅ FastAPI application with full REST API
- ✅ PostgreSQL/SQLite database with ORM models
- ✅ LLM Service with Groq primary + Gemini fallback
- ✅ Attack Planner Agent for scenario generation
- ✅ SOC Analyst Agent for event analysis
- ✅ API endpoints for attack generation and retrieval
- ✅ MITRE ATT&CK technique mapping
- ✅ Rate limit handling and retry logic
- ✅ JSON response parsing with fallback
- ✅ Security: API keys protected with `.gitignore`

### AI Integration
- ✅ Groq API integration (primary, fast responses)
- ✅ Google Gemini API integration (fallback)
- ✅ Structured JSON output generation
- ✅ Attack scenario generation with MITRE mapping
- ✅ SOC analysis with severity scoring
- ✅ Fallback scenarios when APIs fail

### Core Features
- ✅ Attack scenario generation with:
  - Company profile
  - Network topology
  - Attack stages with MITRE techniques
  - Timeline of events
  - Objectives and indicators
- ✅ SOC analysis with:
  - Detection summary
  - Attack chain reconstruction
  - Severity assessment
  - Recommended actions

### Development Infrastructure
- ✅ VS Code with Python virtual environment
- ✅ Git repository with GitHub integration
- ✅ .gitignore configured for security
- ✅ API documentation (Swagger/OpenAPI)
- ✅ Requirements.txt with all dependencies

---

## 📂 Project Structure
NerdForge/
├── backend/
│ ├── app/
│ │ ├── init.py
│ │ ├── config.py # Environment configuration
│ │ ├── main.py # FastAPI application
│ │ ├── api/
│ │ │ ├── init.py
│ │ │ └── attacks.py # Attack generation endpoints
│ │ ├── agents/
│ │ │ ├── init.py
│ │ │ ├── base_agent.py # Base agent class
│ │ │ ├── attack_planner.py # Attack scenario generator
│ │ │ └── soc_analyst.py # SOC analysis agent
│ │ ├── database/
│ │ │ ├── init.py
│ │ │ ├── models.py # SQLAlchemy models
│ │ │ └── session.py # Database session
│ │ └── services/
│ │ ├── init.py
│ │ └── llm_service.py # Unified LLM service
│ ├── .env # API keys (gitignored)
│ ├── .env.example # Template for team
│ ├── requirements.txt # Python dependencies
│ └── nerdforge.db # SQLite database
├── frontend/ # React + Vite + TypeScript
├── .gitignore
├── README.md


---

## 🧠 AI Architecture

### LLM Orchestration Layer
```mermaid
graph TD
    A[User Request] --> B[Attack Planner Agent]
    B --> C{LLM Service}
    C --> D[Groq Primary]
    C --> E[Gemini Fallback]
    D --> F[JSON Response]
    E --> F
    F --> G[SOC Analyst Agent]
    G --> H[Analysis Result]
    H --> I[API Response]

    Model Selection Strategy
Task	Primary Model	Fallback Model
Scenario Generation	Groq (Llama 3.1)	Gemini 2.0 Flash
SOC Analysis	Groq (Llama 3.1)	Gemini 2.0 Flash
JSON Parsing	Regex extraction	Fallback scenarios

🔑 Environment Variables
# backend/.env
# Primary AI - Groq (Fast, free tier)
GROQ_API_KEY=gsk_...your_key...

# Fallback AI - Google Gemini
GEMINI_API_KEY=AIzaSy...your_key...

# Database
DATABASE_URL=sqlite:///./nerdforge.db

# Application
DEBUG=True
SECRET_KEY=your-secret-key-here

Getting API Keys
Service	Link	Free Tier
Groq	https://console.groq.com	~1,000 requests/day
Google Gemini	https://aistudio.google.com/app/apikey	1,500 requests/day

🚀 API Endpoints

Attack Generation
POST /api/attacks/generate

Request:
{
  "name": "Ransomware Test",
  "industry": "finance",
  "attack_type": "ransomware",
  "difficulty": "Medium",
  "operating_system": "Windows",
  "environment": "On-Premise",
  "custom_scenario": null
}

Response:
{
  "id": "uuid",
  "name": "Attack Name",
  "status": "completed",
  "created_at": "timestamp",
  "attack_stages": [...],
  "timeline": [...],
  "events": [...],
  "analysis": {...}
}

List All Attacks
GET /api/attacks/

Get Specific Attack
GET /api/attacks/{id}

Health Check
GET /api/health

🛠️ Development Commands
Backend
cd backend

# Activate virtual environment
venv\Scripts\activate (Windows)

# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run tests (when added)
pytest tests/

# Format code
black app/

Database
# SQLite is used by default
# Database file: backend/nerdforge.db
# Tables are auto-created on startup

API Documentation
Swagger UI: http://localhost:8000/docs
ReDoc: http://localhost:8000/redoc

🧪 Testing
Manual Testing
Start the server: uvicorn app.main:app --reload

Open: http://localhost:8000/docs

Test endpoints:

POST /api/attacks/generate with different inputs

GET /api/attacks/ to list attacks

GET /api/attacks/{id} to get details

Example Test Cases
Test Case	Input	Expected Output
Basic Attack	industry: finance, type: ransomware	Attack with MITRE stages
Custom Scenario	custom_scenario: "Phishing attack"	Uses custom text
Different Industry	industry: healthcare	Industry-specific scenario
Error Handling	Missing required field	422 Validation Error

🗓️ Roadmap
Phase 1: Core Infrastructure ✅ (Completed)
FastAPI backend setup

Database models

LLM service (Groq + Gemini)

Attack Planner Agent

SOC Analyst Agent

API endpoints

Phase 2: Frontend (In Progress)
React dashboard

Scenario generator UI

Attack timeline display

MITRE matrix visualization

Report generation UI

Phase 3: Enhanced Features
Atomic Red Team integration

Real attack simulation

Detection rule generation

PDF report export

User authentication

Phase 4: Integration & Deployment
Docker containerization

Deployment to cloud

CI/CD pipeline

Performance optimization

🧩 Key Technologies
Category	Technology	Version
Backend	FastAPI	0.139.0
Database	SQLAlchemy	2.0+
AI/LLM	Groq, Gemini	-
Python	Python	3.14
Frontend	React, Vite, TypeScript	-
Styling	Tailwind CSS	-
Version Control	Git, GitHub	-

📊 Code Quality Standards
Python (Backend)
Use type hints for all functions

Follow PEP 8 guidelines

Use black for formatting

Use mypy for type checking

Keep functions focused and small

JavaScript/TypeScript (Frontend)
Use TypeScript with strict mode

Follow ESLint rules

Use functional components with hooks

Keep components modular and reusable

🔒 Security Best Practices
Never commit .env files to the repository

Use .env.example for sharing configurations

Regenerate API keys if they've been exposed

Keep dependencies updated (especially security-critical ones)

Validate all user inputs to prevent injection attacks

Use HTTPS in production

📚 References
AI & Security
MITRE ATT&CK Framework: https://attack.mitre.org

Atomic Red Team: https://github.com/redcanaryco/atomic-red-team

Groq API: https://console.groq.com

Google Gemini: https://ai.google.dev

🏁 Success Criteria
Hackathon Deliverables
Interactive web application

AI-driven attack scenario generation

Live attack timeline

AI SOC dashboard

MITRE ATT&CK mapping

Automated incident report export

Demonstration video

Technical documentation

GitHub repository

Evaluation Metrics
✅ Realistic attack scenarios (atomic red team)

✅ Accurate MITRE mapping

✅ Useful SOC analysis

✅ Clean, professional UI

✅ Working end-to-end workflow

✅ Security best practices followed

📞 Getting Help
Check API Documentation: http://localhost:8000/docs

Read the Code: All services have detailed docstrings

Team Communication: Share updates via GitHub issues

Debug Logs: Check terminal for detailed logs

📝 Notes
The backend is functional and ready for frontend integration

All AI features work with fallback mechanisms
Follow the CLAUDE.md for project standards and goals

