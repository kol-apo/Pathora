import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { resolveChatModel } from '@/lib/ai/provider';
import {
  buildPathyMessages,
  pathyFallbackReply,
  PATHY_DAILY_LIMIT,
  PATHY_HISTORY_TURNS,
  PATHY_MAX_MESSAGE_CHARS,
  PATHY_PROMPT_VERSION,
  type PathyContext,
} from '@/lib/ai/pathy';
import { getStudentStatus } from '@/lib/db/queries/accounts';
import {
  bridgeForResult,
  getLatestResult,
  listOpenOpportunities,
  listVerifiedProgrammes,
} from '@/lib/db/queries/discovery';
import { countStudentEvents, logStudentEvent } from '@/lib/db/queries/research';
import { roleLine } from '@/lib/mentors';
import { deadlineLabel } from '@/lib/opportunities/format';

export const dynamic = 'force-dynamic';
// Waits on the AI model or on publishers' feeds; Vercel's default limit is 10 seconds.
export const maxDuration = 60;

/*
 * POST /api/pathy — one turn of the conversation with Pathy.
 *
 * The browser keeps the conversation (for 24 hours, on the student's device)
 * and sends the recent turns with each message. Nothing the student writes is
 * stored on the server. The research log records only that a message was
 * sent, with the prompt version and model.
 */

const BodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(PATHY_MAX_MESSAGE_CHARS * 4),
      }),
    )
    .min(1)
    .max(PATHY_HISTORY_TURNS * 4),
});

export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || user.role !== 'student') {
    return NextResponse.json({ error: 'Sign in as a student to talk to Pathy.' }, { status: 401 });
  }
  if (!(await getStudentStatus(user.id)).consented) {
    return NextResponse.json({ error: 'Agree to the study terms first.' }, { status: 403 });
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid message.' }, { status: 422 });
  const history = parsed.data.messages;
  const last = history[history.length - 1];
  if (last.role !== 'user') return NextResponse.json({ error: 'The last message must be yours.' }, { status: 422 });
  if (last.content.length > PATHY_MAX_MESSAGE_CHARS) {
    return NextResponse.json(
      { error: `Please keep messages under ${PATHY_MAX_MESSAGE_CHARS} characters.` },
      { status: 422 },
    );
  }

  const latest = await getLatestResult(user.id);
  if (!latest) {
    return NextResponse.json({ error: 'Answer the six questions first, so Pathy knows you.' }, { status: 409 });
  }

  const since = new Date(Date.now() - 24 * 3_600_000);
  if ((await countStudentEvents(user.id, 'pathy_message', since)) >= PATHY_DAILY_LIMIT) {
    return NextResponse.json(
      { error: `You have reached today's limit of ${PATHY_DAILY_LIMIT} messages. Pathy will be back tomorrow.`, code: 'TOO_MANY_MESSAGES' },
      { status: 429 },
    );
  }

  const sector = latest.match.primary.sector;
  const now = new Date();
  const [bridge, opportunities, programmes] = await Promise.all([
    bridgeForResult(latest.id, user.id).catch(() => null),
    listOpenOpportunities(sector, 12, now),
    listVerifiedProgrammes(sector),
  ]);

  const ctx: PathyContext = {
    answers: latest.answers,
    match: latest.match,
    roadmapPath: `/discover/results/${latest.id}`,
    mentors:
      bridge?.status === 'ready'
        ? bridge.mentors.map((m) => ({
            name: m.displayName,
            roleLine: roleLine(m),
            bookable: m.acceptingBookings,
            path: `/consultants/${m.id}?bridge=${latest.id}`,
          }))
        : [],
    // Pathora does not recommend courses, so training listings are left out of Pathy's view.
    opportunities: opportunities
      .filter((o) => o.type !== 'Training')
      .slice(0, 8)
      .map((o) => ({
        title: o.title,
        type: o.type,
        deadline: deadlineLabel(o.deadline, now).text,
        sourceName: o.sourceName,
        url: o.url,
      })),
    programmes,
  };

  const chat = resolveChatModel();
  let reply: string;
  let usedFallback = false;
  if (chat) {
    try {
      reply = (await chat.complete(buildPathyMessages(ctx, history), request.signal)).trim();
    } catch (err) {
      console.warn('[pathy] model failed, sent the fallback reply:', (err as Error).message.slice(0, 200));
      reply = pathyFallbackReply(ctx);
      usedFallback = true;
    }
  } else {
    reply = pathyFallbackReply(ctx);
    usedFallback = true;
  }

  await logStudentEvent(user.id, {
    type: 'pathy_message',
    payload: { sector, promptVersion: PATHY_PROMPT_VERSION, model: chat?.model ?? 'none', usedFallback },
  });

  return NextResponse.json({ reply, usedFallback });
}
