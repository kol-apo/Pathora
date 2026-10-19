/**
 * Data access layer. Server-only — never import from a client component.
 *
 * Callers pass identity in as a parameter (`studentId`, `actorId`) rather than
 * reading a session here, so these functions stay independent of how auth is
 * eventually wired.
 */
export * from './errors';
export * from './dto';
export * from './mentors';
export * from './bookings';
export * from './bridge';
export * from './access';
export * from './research';
export * from './accounts';
export * from './admin';
export * from './mentorConsole';
export * from './discovery';
export * from './opportunities';
