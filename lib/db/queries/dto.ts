import type { Types } from 'mongoose';
import type { Sector } from '@/lib/types';
import type { BookingStatus } from '../models/Booking';

/**
 * Plain shapes for crossing the server/client boundary.
 *
 * Mongoose documents carry ObjectIds and prototype methods and cannot be handed
 * to a client component. Every query returns one of these instead, so the
 * boundary is explicit rather than something you discover via a serialisation
 * error at runtime.
 */

export interface MentorDTO {
  id: string;
  displayName: string;
  initials: string;
  role: string;
  company: string;
  sector: Sector;
  experience: number;
  focus: string[];
  tags: string[];
  bio: string;
  helpWith: string[];
  timezone: string;
  vetted: boolean;
  acceptingBookings: boolean;
  ratingAvg: number;
  ratingCount: number;
  sessionCount: number;
}

export interface SlotDTO {
  /** ISO 8601, UTC. */
  startsAt: string;
  endsAt: string;
}

export interface BookingNoteDTO {
  body: string;
  author: string;
  createdAt: string;
}

export interface BookingDTO {
  id: string;
  student: string;
  mentor: MentorDTO | string;
  topic: string;
  startsAt: string;
  endsAt: string;
  status: BookingStatus;
  roomUrl?: string;
  notes: BookingNoteDTO[];
  rating?: { score: number; comment?: string };
}

export interface OpportunityDTO {
  id: string;
  title: string;
  organisation: string;
  type: string;
  sector: Sector;
  description: string;
  url: string;
  /** ISO date, or null for rolling applications. */
  deadline: string | null;
}

const id = (v: Types.ObjectId | string): string => String(v);

/* eslint-disable @typescript-eslint/no-explicit-any */

export function toMentorDTO(doc: any): MentorDTO {
  return {
    id: id(doc._id),
    displayName: doc.displayName,
    initials: doc.initials,
    role: doc.role,
    company: doc.company,
    sector: doc.sector,
    experience: doc.experience,
    focus: doc.focus ?? [],
    tags: doc.tags ?? [],
    bio: doc.bio,
    helpWith: doc.helpWith ?? [],
    timezone: doc.timezone,
    vetted: !!doc.vetted,
    acceptingBookings: doc.acceptingBookings !== false,
    ratingAvg: doc.ratingAvg ?? 0,
    ratingCount: doc.ratingCount ?? 0,
    sessionCount: doc.sessionCount ?? 0,
  };
}

export function toBookingDTO(doc: any): BookingDTO {
  // `mentor` is either a raw ObjectId or a populated MentorProfile.
  const mentor =
    doc.mentor && typeof doc.mentor === 'object' && 'displayName' in doc.mentor
      ? toMentorDTO(doc.mentor)
      : id(doc.mentor);

  return {
    id: id(doc._id),
    student: id(doc.student),
    mentor,
    topic: doc.topic,
    startsAt: new Date(doc.startsAt).toISOString(),
    endsAt: new Date(doc.endsAt).toISOString(),
    status: doc.status,
    roomUrl: doc.roomUrl,
    notes: (doc.notes ?? []).map((n: any) => ({
      body: n.body,
      author: id(n.author),
      createdAt: new Date(n.createdAt).toISOString(),
    })),
    rating: doc.rating ? { score: doc.rating.score, comment: doc.rating.comment } : undefined,
  };
}

export function toOpportunityDTO(doc: any): OpportunityDTO {
  return {
    id: id(doc._id),
    title: doc.title,
    organisation: doc.organisation,
    type: doc.type,
    sector: doc.sector,
    description: doc.description,
    url: doc.url,
    deadline: doc.deadline ? new Date(doc.deadline).toISOString() : null,
  };
}
