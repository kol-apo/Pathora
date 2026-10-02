/**
 * Barrel for the Mongoose models.
 *
 * Importing from here guarantees every schema is registered before any query
 * runs, which matters for `.populate()` — Mongoose throws MissingSchemaError if
 * a referenced model has not been loaded yet.
 *
 * Server-only. Never import from a client component.
 */
export { default as User } from './User';
export { default as StudentProfile } from './StudentProfile';
export { default as MentorProfile } from './MentorProfile';
export { default as Availability } from './Availability';
export { default as Booking, ACTIVE_BOOKING_STATUSES } from './Booking';
export { default as DiscoveryResult } from './DiscoveryResult';
export { default as Opportunity, OPPORTUNITY_TYPES } from './Opportunity';

export type { IUser, UserRole } from './User';
export type { IStudentProfile } from './StudentProfile';
export type { IMentorProfile } from './MentorProfile';
export type { IAvailability, IWeeklyRule, IException, IWindow } from './Availability';
export type { IBooking, IBookingNote, IBookingRating, BookingStatus } from './Booking';
export type {
  IDiscoveryResult,
  IDiscoveryAnswers,
  IRoadmapPhase,
  ISecondaryMatch,
} from './DiscoveryResult';
export type { IOpportunity, OpportunityType } from './Opportunity';
