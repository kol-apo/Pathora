export type Sector = 'Business' | 'Finance' | 'Technology';

export interface Consultant {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  role: string;
  company: string;
  sector: Sector;
  experience: number;
  tags: string[];
  bio: string;
  sessions: number;
  rating: number;
  available: boolean;
  helpWith: string[];
}

export type OpportunityType = 'Fellowship' | 'Hackathon' | 'Internship' | 'Campus Program';

export interface Opportunity {
  id: string;
  title: string;
  organisation: string;
  type: OpportunityType;
  sector: Sector;
  deadline: string;
  urgent: boolean;
  description: string;
  url: string;
}

export interface UpcomingSession {
  consultant: Consultant;
  date: string;
  time: string;
  duration: string;
}

export interface Student {
  name: string;
  initials: string;
  university: string;
  field: string;
  year: number;
  careerMatch: string;
  matchedSector: Sector;
  sessionsBooked: number;
  consultantsExplored: number;
  opportunitiesSaved: number;
  upcomingSession: UpcomingSession;
}

export interface RoadmapPhase {
  period: string;
  focus: string;
  actions: string[];
}

export interface CareerMatch {
  title: string;
  sector: Sector;
  description: string;
  skills: string[];
}

export interface CareerProfile {
  primary: CareerMatch & {
    why: string;
    africanMarket: string;
    roadmap: RoadmapPhase[];
  };
  secondary: CareerMatch[];
}
