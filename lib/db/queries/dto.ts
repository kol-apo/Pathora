import type { Types } from 'mongoose';
import type { Sector } from '@/lib/types';
import type { BookingStatus } from '../models/Booking';
import type { MentorSource } from '@/lib/partners';
import { SOURCES, type OpportunitySource, type OpportunityType } from '@/lib/opportunities/sources';

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
  /** Empty when not known. */
  company: string;
  sector: Sector;
  /** Null when not known. */
  experience: number | null;
  country: string | null;
  photo: string | null;
  source: MentorSource;
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
  socials: { linkedin?: string; x?: string };
  links: { kind: 'portfolio' | 'publication' | 'video' | 'website'; url: string; title?: string }[];
  /**
   * Start of the soonest bookable slot (ISO, UTC), or null when nothing is
   * open. Only present on reads that compute it — it is derived from the
   * availability rules and live bookings, never stored.
   */
  nextSlotAt?: string | null;
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
  discoveryResult?: string;
  viaBridge: boolean;
  notes: BookingNoteDTO[];
  rating?: { score: number; comment?: string };
}

export interface BridgeRecommendationDTO {
  mentorId: string;
  rank: number;
  similarity: number;
  surfacedAt: string;
  viewedAt: string | null;
  bookedAt: string | null;
}

export interface OpportunityDTO {
  id: string;
  title: string;
  organisation: string;
  type: OpportunityType;
  /** Null when it is open to any sector. */
  sector: Sector | null;
  description: string;
  url: string;
  /** ISO date, or null when no deadline is stated. */
  deadline: string | null;
  source: OpportunitySource;
  /** The publisher's name, e.g. "Opportunity Desk". */
  sourceName: string;
  /** ISO date the publisher posted it, if known. */
  publishedAt: string | null;
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
    experience: typeof doc.experience === 'number' ? doc.experience : null,
    country: doc.country || null,
    photo: doc.photo || null,
    source: doc.source ?? 'pathora',
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
    socials: { linkedin: doc.socials?.linkedin || undefined, x: doc.socials?.x || undefined },
    links: (doc.links ?? []).map((l: any) => ({ kind: l.kind, url: l.url, title: l.title || undefined })),
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
    discoveryResult: doc.discoveryResult ? id(doc.discoveryResult) : undefined,
    viaBridge: !!doc.viaBridge,
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
    sector: doc.sector ?? null,
    description: doc.description ?? '',
    url: doc.url,
    deadline: doc.deadline ? new Date(doc.deadline).toISOString() : null,
    source: doc.source ?? 'pathora',
    sourceName: SOURCES[doc.source as OpportunitySource]?.name ?? 'Pathora',
    publishedAt: doc.publishedAt ? new Date(doc.publishedAt).toISOString() : null,
  };
}

export function toBridgeRecommendationDTO(doc: any): BridgeRecommendationDTO {
  return {
    mentorId: id(doc.mentor),
    rank: doc.rank,
    similarity: doc.similarity,
    surfacedAt: new Date(doc.surfacedAt).toISOString(),
    viewedAt: doc.viewedAt ? new Date(doc.viewedAt).toISOString() : null,
    bookedAt: doc.bookedAt ? new Date(doc.bookedAt).toISOString() : null,
  };
}
