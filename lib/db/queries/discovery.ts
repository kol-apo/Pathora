import { isValidObjectId } from 'mongoose';
import dbConnect from '../connect';
import { BridgeRecommendation, DiscoveryResult, StudentProfile, VerifiedResource } from '../models';
import { toDiscoveryResultDoc, type DiscoveryOutcome } from '@/lib/ai/discovery';
import type { CareerMatch } from '@/lib/ai/schema';
import { studentVectorFor, type DiscoveryAnswers } from '@/lib/discovery/questions';
import type { Sector } from '@/lib/types';
import { DataError } from './errors';
import { getDiscoveryResultForStudent } from './access';
import { previewBridgeConsultants, surfaceBridgeConsultants } from './bridge';
import { getMentorsByIds } from './mentors';
import type { MentorDTO, OpportunityDTO } from './dto';
import { listOpportunities } from './opportunities';

/**
 * Saving discovery results and reading them back with their bridge.
 *
 * Only consented students' results are stored: they are the study's
 * participants. Everyone else sees the same three mentors, ranked the same
 * way, but nothing is written (see previewBridgeConsultants).
 */

/** The three mentors on a result, best match first, or the reason there are none. */
export type BridgeView =
  | { status: 'ready'; mentors: MentorDTO[] }
  | { status: 'insufficient'; sector: Sector };

export interface SavedResultDTO {
  id: string;
  createdAt: string;
  match: CareerMatch;
  /** The student's own answers. Server-side only: never sent to a mentor. */
  answers: DiscoveryAnswers;
}

/**
 * Store a completed discovery for a student, then record its bridge. The
 * student's profile keeps a pointer to their latest result for the dashboard.
 */
export async function saveDiscoveryResult(
  studentId: string,
  answers: DiscoveryAnswers,
  outcome: DiscoveryOutcome,
): Promise<{ id: string; bridge: BridgeView }> {
  if (!isValidObjectId(studentId)) throw new DataError('INVALID_ID', 'Malformed student id.');
  await dbConnect();

  const doc = await DiscoveryResult.create(toDiscoveryResultDoc(answers, outcome, studentId));
  const id = String(doc._id);

  await StudentProfile.updateOne(
    { user: studentId },
    {
      $set: {
        careerMatch: outcome.result.primary.title,
        matchedSector: outcome.result.primary.sector,
        latestDiscovery: doc._id,
      },
    },
  );

  return { id, bridge: await bridgeForResult(id, studentId) };
}

/**
 * The bridge for a stored result: surfaced on first call, read back after.
 * A sector without three approved mentors gives 'insufficient' rather than a
 * shorter list.
 */
export async function bridgeForResult(resultId: string, studentId: string): Promise<BridgeView> {
  try {
    const recs = await surfaceBridgeConsultants(resultId, { studentId });
    return { status: 'ready', mentors: await getMentorsByIds(recs.map((r) => r.mentorId)) };
  } catch (err) {
    if (err instanceof DataError && err.code === 'INSUFFICIENT_CONSULTANTS') {
      const result = await DiscoveryResult.findById(resultId).select('primary.sector').lean();
      return { status: 'insufficient', sector: result!.primary.sector };
    }
    throw err;
  }
}

/** The bridge for answers that are not being stored. Same ranking, nothing written. */
export async function previewBridge(answers: DiscoveryAnswers, sector: Sector): Promise<BridgeView> {
  try {
    const ids = await previewBridgeConsultants(sector, studentVectorFor(answers));
    return { status: 'ready', mentors: await getMentorsByIds(ids) };
  } catch (err) {
    if (err instanceof DataError && err.code === 'INSUFFICIENT_CONSULTANTS') {
      return { status: 'insufficient', sector };
    }
    throw err;
  }
}

/** One of the student's own results, for the results page. Null for anyone else's. */
export async function getSavedResult(resultId: string, studentId: string): Promise<SavedResultDTO | null> {
  const doc = await getDiscoveryResultForStudent(resultId, studentId);
  if (!doc) return null;
  return {
    id: String(doc._id),
    createdAt: new Date(doc.createdAt).toISOString(),
    answers: {
      status: doc.answers.status,
      interests: [...doc.answers.interests],
      environment: doc.answers.environment,
      strength: doc.answers.strength,
      vision: doc.answers.vision,
      field: doc.answers.field || undefined,
    },
    match: {
      primary: {
        title: doc.primary.title,
        sector: doc.primary.sector,
        description: doc.primary.description,
        why: doc.primary.why,
        africanMarket: doc.primary.africanMarket,
        skills: doc.primary.skills,
        roadmap: doc.primary.roadmap.map((p) => ({ period: p.period, focus: p.focus, actions: p.actions })),
      },
      secondary: doc.secondary.map((s) => ({
        title: s.title,
        sector: s.sector,
        description: s.description,
        skills: s.skills,
      })),
    },
  };
}

/** The student's most recent result, or null if they have not done discovery yet. */
export async function getLatestResult(studentId: string): Promise<SavedResultDTO | null> {
  if (!isValidObjectId(studentId)) return null;
  await dbConnect();
  const latest = await DiscoveryResult.findOne({ student: studentId }).sort({ createdAt: -1 }).select('_id').lean();
  return latest ? getSavedResult(String(latest._id), studentId) : null;
}

/** How many of a result's three mentors the student has booked through the bridge. */
export async function bridgeBookedCount(resultId: string): Promise<number> {
  if (!isValidObjectId(resultId)) return 0;
  await dbConnect();
  return BridgeRecommendation.countDocuments({ discoveryResult: resultId, bookedAt: { $exists: true } });
}

/** Open opportunities for a student's sector (plus those open to any sector), closing soonest first. */
export async function listOpenOpportunities(sector: Sector | null, limit = 3, now = new Date()): Promise<OpportunityDTO[]> {
  return listOpportunities({ sector: sector ?? undefined, limit, now });
}

/** The verified programmes Pathy may name, for the student's sector and those open to all. */
export async function listVerifiedProgrammes(sector: Sector): Promise<{ name: string; organisation: string; url: string }[]> {
  await dbConnect();
  const docs = await VerifiedResource.find({ $or: [{ sector }, { sector: null }] })
    .select('name organisation url')
    .lean();
  return docs.map((d) => ({ name: d.name, organisation: d.organisation ?? '', url: d.url }));
}
