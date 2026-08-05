export type Sector = 'Entrepreneurship' | 'Technology' | 'Finance' | 'Creative';

export const SECTORS: Sector[] = ['Entrepreneurship', 'Technology', 'Finance', 'Creative'];

export interface Consultant {
  id: string;
  name: string;
  initials: string;
  role: string;
  company: string;
  sector: Sector;
  experience: number;
  /** Two short phrases shown as outlined pills on the card. */
  focus: string[];
  /** Longer expertise list shown on the profile page. */
  tags: string[];
  bio: string;
  sessions: number;
  rating: number;
  /** `null` means available this week; otherwise the wait, e.g. "in 2 weeks". */
  nextSlot: string | null;
  helpWith: string[];
}

export type OpportunityType = 'Fellowship' | 'Hackathon' | 'Internship' | 'Campus program';

export interface Opportunity {
  id: string;
  title: string;
  organisation: string;
  type: OpportunityType;
  sector: Sector;
  /** A closing date such as "14 Sep", or "Rolling" for open applications. */
  deadline: string;
  urgent: boolean;
  description: string;
  url: string;
}

export interface UpcomingSession {
  consultant: Consultant;
  /** Session topic, e.g. "Product career review". */
  topic: string;
  when: string;
  duration: string;
  format: string;
  notes: string[];
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
  /** Career-path progress shown on the dashboard roadmap strip. */
  pathYear: number;
  pathYears: number;
  milestonesDone: number;
  milestonesTotal: number;
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
