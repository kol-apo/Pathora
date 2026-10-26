/**
 * Live video through Daily (daily.co), using its REST API directly.
 *
 *   DAILY_API_KEY   from the Daily dashboard, Developers page. Server only.
 *
 * Each booking gets its own private room. Only someone holding a meeting
 * token can enter, and tokens are issued by Pathora, per person, after
 * checking they are the booking's student or mentor. The room opens 10
 * minutes before the session and closes 15 minutes after it, then Daily
 * removes everyone. Recording is never enabled: no recording setting is
 * sent, and the consent form promises sessions are not recorded.
 */

/** How early a room opens, and how long after the end it stays open. */
export const OPENS_BEFORE_MS = 10 * 60_000;
export const CLOSES_AFTER_MS = 15 * 60_000;

export interface SessionWindow {
  opensAt: Date;
  closesAt: Date;
}

export function sessionWindow(startsAt: Date, endsAt: Date): SessionWindow {
  return {
    opensAt: new Date(startsAt.getTime() - OPENS_BEFORE_MS),
    closesAt: new Date(endsAt.getTime() + CLOSES_AFTER_MS),
  };
}

/** One room per booking, named from the booking id so it can always be found again. */
export const roomNameFor = (bookingId: string) => `pathora-${bookingId}`;

const seconds = (d: Date) => Math.floor(d.getTime() / 1000);

/**
 * The room's settings. A pure function, so the rules can be tested offline:
 * private, two people at most, open only within the session's window, and
 * no recording of any kind.
 */
export function roomProperties(window: SessionWindow) {
  return {
    nbf: seconds(window.opensAt),
    exp: seconds(window.closesAt),
    eject_at_room_exp: true,
    max_participants: 2,
    enable_prejoin_ui: true,
    enable_knocking: false,
    enable_screenshare: true,
    enable_chat: true,
    lang: 'en',
  };
}

/** A meeting token's settings: who this person is, and when the token stops working. */
export function tokenProperties(roomName: string, userName: string, isMentor: boolean, window: SessionWindow) {
  return {
    room_name: roomName,
    user_name: userName,
    // The mentor hosts: Daily lets the owner manage the call.
    is_owner: isMentor,
    nbf: seconds(window.opensAt),
    exp: seconds(window.closesAt),
    eject_at_token_exp: true,
  };
}

export class VideoUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VideoUnavailableError';
  }
}

export interface DailyClient {
  ensureRoom(name: string, window: SessionWindow): Promise<{ name: string; url: string }>;
  createToken(roomName: string, userName: string, isMentor: boolean, window: SessionWindow): Promise<string>;
  /** Daily's own record of a room's calls: when each started and how long it ran. */
  meetings(roomName: string): Promise<{ startTime: Date; durationSeconds: number; participants: number }[]>;
  deleteRoom(name: string): Promise<void>;
}

/** The real client. `fetchImpl` is injectable so tests can stand in for Daily. */
export function dailyClient(apiKey = process.env.DAILY_API_KEY?.trim(), fetchImpl: typeof fetch = fetch): DailyClient {
  if (!apiKey) throw new VideoUnavailableError('DAILY_API_KEY is not set.');

  const call = async (path: string, init: RequestInit = {}) => {
    const res = await fetchImpl(`https://api.daily.co/v1${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
      signal: AbortSignal.timeout(15_000),
    });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, body: body as Record<string, unknown> };
  };

  return {
    async ensureRoom(name, window) {
      const existing = await call(`/rooms/${name}`);
      if (existing.ok) return { name, url: String(existing.body.url) };
      const created = await call('/rooms', {
        method: 'POST',
        body: JSON.stringify({ name, privacy: 'private', properties: roomProperties(window) }),
      });
      if (!created.ok) throw new VideoUnavailableError(`Daily could not create the room (HTTP ${created.status}).`);
      return { name, url: String(created.body.url) };
    },

    async createToken(roomName, userName, isMentor, window) {
      const res = await call('/meeting-tokens', {
        method: 'POST',
        body: JSON.stringify({ properties: tokenProperties(roomName, userName, isMentor, window) }),
      });
      if (!res.ok || typeof res.body.token !== 'string') {
        throw new VideoUnavailableError(`Daily could not issue a meeting token (HTTP ${res.status}).`);
      }
      return res.body.token;
    },

    async meetings(roomName) {
      const res = await call(`/meetings?room=${encodeURIComponent(roomName)}`);
      if (!res.ok || !Array.isArray(res.body.data)) return [];
      return (res.body.data as { start_time?: number; duration?: number; max_participants?: number; participants?: unknown[] }[])
        .filter((m) => typeof m.start_time === 'number')
        .map((m) => ({
          startTime: new Date(m.start_time! * 1000),
          durationSeconds: Math.max(0, Math.round(m.duration ?? 0)),
          participants: m.max_participants ?? (Array.isArray(m.participants) ? m.participants.length : 0),
        }));
    },

    async deleteRoom(name) {
      await call(`/rooms/${name}`, { method: 'DELETE' });
    },
  };
}
