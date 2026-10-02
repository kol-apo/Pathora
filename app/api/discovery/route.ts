import { NextResponse } from 'next/server';
import { generateDiscovery } from '@/lib/ai/discovery';
import { DiscoveryAnswersSchema } from '@/lib/discovery/validation';

/**
 * POST /api/discovery — run the career discovery agent.
 *
 * Not persisted yet: DiscoveryResult rows need a signed-in student, which
 * arrives with auth. `toDiscoveryResultDoc()` in lib/ai/discovery.ts already
 * shapes the document for that step.
 */

// The agent calls an external model; never prerender or cache this.
export const dynamic = 'force-dynamic';

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

  const outcome = await generateDiscovery(parsed.data, { signal: request.signal });

  if (outcome.usedFallback) {
    // Visible in server logs so a broken key or model is noticed, while the
    // student still gets a usable result.
    console.warn('[discovery] fell back to offline match:', outcome.fallbackReason);
  }

  return NextResponse.json({
    result: outcome.result,
    meta: {
      provider: outcome.provider,
      model: outcome.model,
      latencyMs: outcome.latencyMs,
      usedFallback: outcome.usedFallback,
    },
  });
}
