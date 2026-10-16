import dbConnect from '../connect';
import { AnalyticsEvent, BridgeRecommendation, DiscoveryResult, VideoSession } from '../models';
import type { Sector } from '@/lib/types';

/**
 * Research reports: MongoDB aggregations over the study's data.
 * Run them with `npm run report`.
 */

export interface FunnelRow {
  sector: Sector;
  resultsGenerated: number;
  resultsViewed: number;
  resultsBooked: number;
  /** Share of generated results that led to a bridge booking, in percent. */
  bridgeConversionPct: number;
}

/**
 * The primary dependent variable of the study: for each sector, how many
 * discovery results led to a booking with one of the mentors surfaced on them.
 * A result counts as viewed or booked if any of its recommendations was.
 */
export async function bridgeFunnel(): Promise<FunnelRow[]> {
  await dbConnect();
  const hasDate = (field: string) => ({
    $gt: [
      {
        $size: {
          $filter: { input: '$recs', cond: { $ne: [{ $ifNull: [`$$this.${field}`, null] }, null] } },
        },
      },
      0,
    ],
  });

  return DiscoveryResult.aggregate<FunnelRow>([
    {
      $lookup: {
        from: BridgeRecommendation.collection.name,
        localField: '_id',
        foreignField: 'discoveryResult',
        as: 'recs',
      },
    },
    {
      $group: {
        _id: '$primary.sector',
        resultsGenerated: { $sum: 1 },
        resultsViewed: { $sum: { $cond: [hasDate('viewedAt'), 1, 0] } },
        resultsBooked: { $sum: { $cond: [hasDate('bookedAt'), 1, 0] } },
      },
    },
    {
      $project: {
        _id: 0,
        sector: '$_id',
        resultsGenerated: 1,
        resultsViewed: 1,
        resultsBooked: 1,
        bridgeConversionPct: {
          $round: [{ $multiply: [{ $divide: ['$resultsBooked', '$resultsGenerated'] }, 100] }, 2],
        },
      },
    },
    { $sort: { sector: 1 } },
  ]);
}

export interface ValidityRow {
  promptVersion: string;
  results: number;
  schemaValid: number;
  validityPct: number;
  validFirstAttempt: number;
  firstAttemptPct: number;
  meanRetries: number;
  models: string[];
}

/** How reliably each prompt version meets its output contract. */
export async function schemaValidation(): Promise<ValidityRow[]> {
  await dbConnect();
  return DiscoveryResult.aggregate<ValidityRow>([
    {
      $group: {
        _id: '$promptVersion',
        results: { $sum: 1 },
        schemaValid: { $sum: { $cond: ['$schemaValid', 1, 0] } },
        validFirstAttempt: {
          $sum: { $cond: [{ $and: ['$schemaValid', { $eq: ['$retryCount', 0] }] }, 1, 0] },
        },
        meanRetries: { $avg: '$retryCount' },
        models: { $addToSet: '$model' },
      },
    },
    {
      $project: {
        _id: 0,
        promptVersion: '$_id',
        results: 1,
        schemaValid: 1,
        validityPct: { $round: [{ $multiply: [{ $divide: ['$schemaValid', '$results'] }, 100] }, 2] },
        validFirstAttempt: 1,
        firstAttemptPct: {
          $round: [{ $multiply: [{ $divide: ['$validFirstAttempt', '$results'] }, 100] }, 2],
        },
        meanRetries: { $round: ['$meanRetries', 3] },
        models: 1,
      },
    },
    { $sort: { promptVersion: 1 } },
  ]);
}

export interface CompletionRow {
  sessions: number;
  sessionsEnded: number;
  completionPct: number | null;
  medianDurationSeconds: number | null;
}

/** Whether booked sessions actually happen, and how long they run. */
export async function sessionCompletion(): Promise<CompletionRow> {
  await dbConnect();
  const sessions = await VideoSession.countDocuments();
  const durations = (
    await VideoSession.find({ status: 'ended', durationSeconds: { $exists: true } })
      .select('durationSeconds')
      .sort({ durationSeconds: 1 })
      .lean()
  ).map((s) => s.durationSeconds as number);
  const sessionsEnded = await VideoSession.countDocuments({ status: 'ended' });

  const mid = Math.floor(durations.length / 2);
  const median =
    durations.length === 0
      ? null
      : durations.length % 2
        ? durations[mid]
        : (durations[mid - 1] + durations[mid]) / 2;

  return {
    sessions,
    sessionsEnded,
    completionPct: sessions ? Math.round((sessionsEnded / sessions) * 10000) / 100 : null,
    medianDurationSeconds: median,
  };
}

/**
 * Record a research event under a participant's pseudonymous code. Never pass
 * a user id or any other direct identifier in `payload`.
 */
export async function logEvent(
  participantCode: string,
  eventType: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  await dbConnect();
  await AnalyticsEvent.create({ participantCode, eventType, payload });
}
