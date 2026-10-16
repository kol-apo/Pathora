/**
 * Interest vectors and the bridge ranking.
 *
 * Pure functions: no database, no clock. Students and mentors are both placed
 * on the same five axes (see vector_space in prompts/discovery.json), so the
 * similarity between their vectors is meaningful.
 */

/** Must match vector_space.dimension in prompts/discovery.json. */
export const VECTOR_DIMENSION = 5;

/**
 * The five interest axes, in vector order. Must match vector_space.axes in
 * prompts/discovery.json (npm run verify checks that they do).
 */
export const VECTOR_AXES = [
  { name: 'investigative_technical', label: 'Technical', description: 'Builds, debugs, reasons about systems' },
  { name: 'conventional_analytical', label: 'Analytical', description: 'Structure, numbers, models, compliance' },
  { name: 'enterprising_commercial', label: 'Commercial', description: 'Persuades, negotiates, owns commercial risk' },
  { name: 'artistic_expressive', label: 'Creative', description: 'Narrative, visual, sonic or performed work' },
  { name: 'social_facilitative', label: 'People', description: 'Teaches, mentors, coordinates, cares' },
] as const;

/** How many mentors the bridge surfaces for every result. */
export const BRIDGE_SIZE = 3;

/** Exactly VECTOR_DIMENSION finite numbers, each between 0 and 1. */
export function isValidVector(v: unknown): v is number[] {
  return (
    Array.isArray(v) &&
    v.length === VECTOR_DIMENSION &&
    v.every((x) => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 1)
  );
}

/**
 * Cosine similarity between two vectors, rounded to 5 decimal places.
 *
 * Why cosine, and not the alternatives:
 *   - Cosine is magnitude-invariant. A student who answers expansively produces
 *     larger raw scores than a terse one, but only the DIRECTION of their
 *     interests should decide who they are matched with. Cosine compares
 *     direction alone, so verbosity cannot make one student look "more similar
 *     to everyone".
 *   - Euclidean distance would conflate response verbosity with interest: two
 *     students with identical interests but different answer lengths would sit
 *     far apart.
 *   - Jaccard was rejected because the vectors are continuous scores, not
 *     binary sets.
 *
 * Returns null when either vector is missing, the lengths differ, or either
 * has zero length (cosine is undefined for a zero vector).
 */
export function cosineSimilarity(
  a: readonly number[] | null | undefined,
  b: readonly number[] | null | undefined,
): number | null {
  if (!a || !b || a.length === 0 || a.length !== b.length) return null;

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    if (!Number.isFinite(a[i]) || !Number.isFinite(b[i])) return null;
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return null;

  const cos = dot / (Math.sqrt(normA) * Math.sqrt(normB));
  // Clamp floating-point drift, then round to the precision we store.
  return Math.round(Math.max(-1, Math.min(1, cos)) * 1e5) / 1e5;
}

export interface Candidate {
  id: string;
  vector: readonly number[] | null | undefined;
}

export interface RankedCandidate {
  id: string;
  rank: number;
  similarity: number;
}

/**
 * Rank candidates by similarity to a student's vector, highest first.
 *
 * Candidates with no usable vector are left out. Ties are broken by id, so the
 * same inputs always produce the same ranking; that is what makes a match
 * reproducible and auditable without re-running the model.
 */
export function rankCandidates(
  studentVector: readonly number[],
  candidates: readonly Candidate[],
  count = BRIDGE_SIZE,
): RankedCandidate[] {
  return candidates
    .map((c) => ({ id: c.id, similarity: cosineSimilarity(studentVector, c.vector) }))
    .filter((c): c is { id: string; similarity: number } => c.similarity !== null)
    .sort((x, y) => y.similarity - x.similarity || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0))
    .slice(0, count)
    .map((c, i) => ({ ...c, rank: i + 1 }));
}
