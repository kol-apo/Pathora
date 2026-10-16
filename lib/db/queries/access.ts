import { isValidObjectId } from 'mongoose';
import dbConnect from '../connect';
import { Booking, DiscoveryResult, MentorProfile } from '../models';
import type { IDiscoveryResult } from '../models/DiscoveryResult';

/**
 * Who may read a discovery result.
 *
 * MongoDB has no row-level security, so access rules live in the data layer:
 * API routes read participant data only through functions like these, which
 * take the caller's identity as a parameter and return null for anything the
 * caller may not see. Null rather than a distinguishable error, so a stranger
 * cannot probe which ids exist.
 *
 * The rules (see docs/data-model.md for the full matrix):
 *   - a student reads only their own results;
 *   - a mentor reads a result only if a booking links them to it;
 *   - questionnaire answers are never returned to a mentor at all.
 */

type Result = IDiscoveryResult;

export async function getDiscoveryResultForStudent(
  resultId: string,
  studentUserId: string,
): Promise<Result | null> {
  if (!isValidObjectId(resultId) || !isValidObjectId(studentUserId)) return null;
  await dbConnect();
  return DiscoveryResult.findOne({ _id: resultId, student: studentUserId }).lean<Result>();
}

/**
 * A mentor sees a result only through a booking against it, and never the
 * student's raw questionnaire answers: those are personal reflections.
 */
export async function getDiscoveryResultForMentor(
  resultId: string,
  mentorUserId: string,
): Promise<Omit<Result, 'answers'> | null> {
  if (!isValidObjectId(resultId) || !isValidObjectId(mentorUserId)) return null;
  await dbConnect();

  const profile = await MentorProfile.findOne({ user: mentorUserId }).select('_id').lean();
  if (!profile) return null;

  const linked = await Booking.exists({ discoveryResult: resultId, mentor: profile._id });
  if (!linked) return null;

  return DiscoveryResult.findById(resultId).select('-answers').lean<Omit<Result, 'answers'>>();
}
