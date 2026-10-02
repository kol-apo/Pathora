/**
 * Typed failures for the data layer.
 *
 * Query functions throw these instead of returning ad-hoc strings, so an API
 * route can map a cause to a status code without string-matching messages.
 */

export type DataErrorCode =
  | 'INVALID_ID'
  | 'MENTOR_NOT_FOUND'
  | 'MENTOR_NOT_ACCEPTING'
  | 'NO_AVAILABILITY'
  | 'SLOT_UNAVAILABLE'
  | 'SLOT_TAKEN'
  | 'BOOKING_NOT_FOUND'
  | 'NOT_A_PARTICIPANT'
  | 'INVALID_TRANSITION';

export class DataError extends Error {
  constructor(
    readonly code: DataErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DataError';
  }
}

/** HTTP status for each cause. Kept beside the codes so they cannot drift. */
export const STATUS_FOR_CODE: Record<DataErrorCode, number> = {
  INVALID_ID: 400,
  MENTOR_NOT_FOUND: 404,
  MENTOR_NOT_ACCEPTING: 409,
  NO_AVAILABILITY: 409,
  SLOT_UNAVAILABLE: 409,
  // 409, not 500: the request was valid, someone else simply got there first.
  SLOT_TAKEN: 409,
  BOOKING_NOT_FOUND: 404,
  // 404 rather than 403 — do not confirm a booking exists to a non-participant.
  NOT_A_PARTICIPANT: 404,
  INVALID_TRANSITION: 409,
};

export function statusForError(err: unknown): number {
  return err instanceof DataError ? STATUS_FOR_CODE[err.code] : 500;
}

/**
 * Is this a MongoDB unique-index violation?
 *
 * This is how the double-booking guarantee surfaces in application code: the
 * partial unique index on `{ mentor, startsAt }` rejects the second concurrent
 * write with error 11000. Detected structurally rather than by driver class,
 * so it survives a driver upgrade.
 */
export function isDuplicateKeyError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const code = (err as { code?: unknown }).code;
  if (code === 11000 || code === 11001) return true;
  // Mongoose can wrap the driver error during bulk paths.
  const inner = (err as { cause?: unknown }).cause;
  return inner ? isDuplicateKeyError(inner) : false;
}
