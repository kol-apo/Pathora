import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { generateDiscovery } from '@/lib/ai/discovery';
import { PROMPT_VERSION } from '@/lib/ai/prompt';
import { DiscoveryAnswersSchema } from '@/lib/discovery/validation';
import { getStudentStatus } from '@/lib/db/queries/accounts';
import { previewBridge, saveDiscoveryResult, type BridgeView } from '@/lib/db/queries/discovery';
import { logStudentEvent } from '@/lib/db/queries/research';

/**
 * POST /api/discovery — run the career discovery agent, then the bridge.
 *
 * A consented student's result is stored with its interest vector, and its
 * three mentors are recorded: that is the study's data. Anyone else (a visitor,
 * a student who has not consented yet, a mentor or admin trying it out) gets
 * the same result and the same three mentors, but nothing is written.
 * `notSaved` tells the page why, so it can offer the right next step.
 */

// The agent calls an external model; never prerender or cache this.
export const dynamic = 'force-dynamic';
// Waits on the AI model or on publishers' feeds; Vercel's default limit is 10 seconds.
export const maxDuration = 60;

type NotSaved = 'signed-out' | 'needs-consent' | 'not-a-student';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON.' }, { status: 400 });
  }

  const parsed = DiscoveryAnswersSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid answers.',
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
      { status: 422 },
    );
  }
  const answers = parsed.data;

  const outcome = await generateDiscovery(answers, { signal: request.signal });

  if (outcome.usedFallback) {
    // Visible in server logs so a broken key or model is noticed, while the
    // student still gets a usable result.
    console.warn('[discovery] fell back to offline match:', outcome.fallbackReason);
  }

  const session = await auth();
  const user = session?.user;
  let notSaved: NotSaved | null = null;
  if (!user?.id) notSaved = 'signed-out';
  else if (user.role !== 'student') notSaved = 'not-a-student';
  else if (!(await getStudentStatus(user.id)).consented) notSaved = 'needs-consent';

  const sector = outcome.result.primary.sector;
  let resultId: string | null = null;
  let bridge: BridgeView | null = null;

  try {
    if (!notSaved && user?.id) {
      const saved = await saveDiscoveryResult(user.id, answers, outcome);
      resultId = saved.id;
      bridge = saved.bridge;
      await logStudentEvent(user.id, {
        type: 'discovery_completed',
        payload: { sector, promptVersion: PROMPT_VERSION, model: outcome.model, usedFallback: outcome.usedFallback },
      });
      if (bridge.status === 'ready') {
        await logStudentEvent(user.id, { type: 'bridge_surfaced', payload: { sector } });
      }
    } else {
      bridge = await previewBridge(answers, sector);
    }
  } catch (err) {
    // The student still gets their result. The page shows a link to Explore
    // in place of the three mentors.
    console.error('[discovery] could not save or build the bridge:', err);
  }

  return NextResponse.json({
    result: outcome.result,
    resultId,
    notSaved,
    bridge,
    meta: {
      provider: outcome.provider,
      model: outcome.model,
      latencyMs: outcome.latencyMs,
      usedFallback: outcome.usedFallback,
    },
  });
}
