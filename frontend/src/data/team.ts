// Team roster for the About page. This is the single source of truth -
// the page renders exactly what's here. Photos live in /public/team/.

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  photoUrl: string;
  links: {
    github?: string;
    linkedin?: string;
    email?: string;
  };
}

export const projectInfo = {
  name: 'NerdForge AI',
  tagline: 'Autonomous AI Security Operations Center',
  summary:
    'Built for the DYLP Vibe Coding Hackathon 2026, NerdForge AI combines attack simulation, ' +
    'AI-driven detection, and automated incident reporting into a single console - so a security ' +
    'analyst can go from "generate a scenario" to "here is the incident report" without leaving the browser.',
};

export const teamMembers: TeamMember[] = [
  {
    id: 'aftab-ahmed',
    name: 'Aftab Ahmed',
    role: 'Backend Developer',
    bio:
      'Designed and implemented the core backend architecture of NerdForge AI: the FastAPI application, ' +
      'LLM integration (Groq + Gemini) for attack scenario generation, the AI agent system (Attack Planner, ' +
      'SOC Analyst), and the database models for security artifacts. Also built the IOC extraction, ' +
      'detection rule generation, and report generation pipelines.',
    photoUrl: '/team/Aftab_Ahmed.png',
    links: {},
  },
  {
    id: 'ali-hamza',
    name: 'Ali Hamza',
    role: 'Deployment & DevOps',
    bio:
      'Handles deployment and infrastructure: configuring the production environment, managing ' +
      'containerization with Docker, and setting up CI/CD pipelines for automated testing and deployment. ' +
      'Ensures the platform is scalable, reliable, and secure in the cloud, and manages the Railway ' +
      'deployment configuration.',
    photoUrl: '/team/Ali_Hamza.png',
    links: {},
  },
  {
    id: 'muhammad-raheel',
    name: 'Muhammad Raheel',
    role: 'Frontend Developer',
    bio:
      'Built the user interface of NerdForge AI: the React application with Vite and TypeScript, the ' +
      'dashboard with interactive charts (Attack Chain Graph, Severity Donut, Bar Charts), and the pages ' +
      'for attack generation, listing, and detailed views. Also implemented the dark/light theme and a ' +
      'responsive, professional UI for security analysts.',
    photoUrl: '/team/Muhammad_Raheel.png',
    links: {},
  },
];
