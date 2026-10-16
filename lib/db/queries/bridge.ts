import { isValidObjectId } from 'mongoose';
import dbConnect from '../connect';
import { BridgeRecommendation, DiscoveryResult, MentorProfile } from '../models';
import { BRIDGE_SIZE, isValidVector, rankCandidates } from '@/lib/matching/similarity';
import { DataError, isDuplicateKeyError } from './errors';
import { toBridgeRecommendationDTO, type BridgeRecommendationDTO } from './dto';

/**
 * The mandatory bridge: from a discovery result to three people.
 *
 * The model decides direction (a sector and an interest vector); this function
 * decides which humans, deterministically. It ranks approved mentors IN THE
 * RESULT'S SECTOR ONLY by cosine similarity between their profileVector and the
 * result's studentVector, and records the top three, ranked 1 to 3. Because
 * the ranking is computed from stored data, any match can be reproduced and
 * audited without calling the model again.
 *
 * If the sector has fewer than three approved mentors with a usable vector it
 * throws INSUFFICIENT_CONSULTANTS rather than returning two. Degrading quietly
 * would weaken the architectural claim the study tests.
 *
 * Surfacing happens once per result: a repeat call returns what was recorded,
 * so surfacedAt stays the moment the student first saw them. If two requests
 * race, the unique indexes on BridgeRecommendation let only one set be written;
 * the other request reads it back.
 *
 * `studentId`, when given, must own the result (the access check).
 */
export async function surfaceBridgeConsultants(
  resultId: string,
  options: { studentId?: string } = {},
): Promise<BridgeRecommendationDTO[]> {
  if (!isValidObjectId(resultId)) throw new DataError('INVALID_ID', 'Malformed result id.');
  await dbConnect();

  const result = await DiscoveryResult.findById(resultId).lean();
  if (!result || (options.studentId && result.student && String(result.student) !== options.studentId)) {
    throw new DataError('RESULT_NOT_FOUND', 'No such discovery result.');
  }

  const existing = await BridgeRecommendation.find({ discoveryResult: resultId }).sort({ rank: 1 }).lean();
  if (existing.length > 0) return existing.map(toBridgeRecommendationDTO);

  if (!isValidVector(result.studentVector)) {
    throw new DataError('NO_STUDENT_VECTOR', 'This result has no interest vector to match on.');
  }

  const sector = result.primary.sector;
  const candidates = await MentorProfile.find({ vetted: true, sector, profileVector: { $exists: true } })
    .select('_id profileVector')
    .lean();

  const ranked = rankCandidates(
    result.studentVector,
    candidates.map((c) => ({ id: String(c._id), vector: c.profileVector })),
  );

  if (ranked.length < BRIDGE_SIZE) {
    throw new DataError(
      'INSUFFICIENT_CONSULTANTS',
      `${sector} has ${ranked.length} approved mentor(s) with a usable profile vector; the bridge requires ${BRIDGE_SIZE}.`,
    );
  }

  try {
    const created = await BridgeRecommendation.insertMany(
      ranked.map((r) => ({
        discoveryResult: result._id,
        mentor: r.id,
        rank: r.rank,
        similarity: r.similarity,
        surfacedAt: new Date(),
      })),
      { ordered: true },
    );
    return created.map((d) => toBridgeRecommendationDTO(d.toObject()));
  } catch (err) {
    if (!isDuplicateKeyError(err)) throw err;
    // A concurrent request surfaced this result first. Our first insert is
    // always rank 1, so it is the one that clashed and nothing of ours was
    // written. The winner may still be mid-insert, so wait for its full set.
    for (let attempt = 0; attempt < 20; attempt++) {
      const winners = await BridgeRecommendation.find({ discoveryResult: resultId }).sort({ rank: 1 }).lean();
      if (winners.length >= BRIDGE_SIZE) return winners.map(toBridgeRecommendationDTO);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw err;
  }
}

/** Record that the student saw a surfaced mentor. Only the first view counts. */
export async function markRecommendationViewed(resultId: string, mentorId: string): Promise<void> {
  if (!isValidObjectId(resultId) || !isValidObjectId(mentorId)) {
    throw new DataError('INVALID_ID', 'Malformed id.');
  }
  await dbConnect();
  await BridgeRecommendation.updateOne(
    { discoveryResult: resultId, mentor: mentorId, viewedAt: { $exists: false } },
    { $set: { viewedAt: new Date() } },
  );
}
