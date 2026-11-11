import { createHash } from 'node:crypto';

/**
 * Mentor headshots, stored on Cloudinary.
 *
 * The browser uploads the file straight to Cloudinary (so large photos never
 * pass through our server, which Vercel limits to about 4.5 MB per request),
 * using a short-lived signature this server creates. The signature fixes where
 * the file goes: one file per mentor, `pathora/mentors/<mentorId>`. After the
 * upload, the server builds the photo's address itself from the cloud name and
 * that file name; it never stores an address sent by the browser.
 *
 * Signing follows Cloudinary's documented scheme: SHA-1 of the parameters,
 * sorted by name and joined as `a=1&b=2`, followed by the API secret.
 * No SDK is used.
 */

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

/** The three settings, or null when photo uploads are not set up. */
export function cloudinaryConfig(env: Record<string, string | undefined> = process.env): CloudinaryConfig | null {
  const cloudName = env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

/** Cloudinary's request signature for a set of parameters. */
export function signParams(params: Record<string, string | number>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .filter((k) => params[k] !== '' && params[k] !== undefined)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return createHash('sha1').update(toSign + apiSecret).digest('hex');
}

export const PHOTO_FOLDER = 'pathora/mentors';
/** Formats a headshot may be uploaded in (HEIC is what iPhones take). */
export const PHOTO_FORMATS = 'jpg,jpeg,png,webp,heic';
/** The largest file the page accepts, before Cloudinary shrinks it. */
export const PHOTO_MAX_BYTES = 8 * 1024 * 1024;

export const photoPublicId = (mentorId: string) => `${PHOTO_FOLDER}/${mentorId}`;

/**
 * What the browser needs to upload one mentor's photo. Every parameter here is
 * covered by the signature, so the browser cannot change where the file goes
 * or what is accepted. Cloudinary rejects a signature older than an hour.
 */
export function uploadSignature(mentorId: string, config: CloudinaryConfig, now = new Date()) {
  const params = {
    public_id: photoPublicId(mentorId),
    overwrite: 'true',
    invalidate: 'true',
    allowed_formats: PHOTO_FORMATS,
    // Stored no larger than 1200 px: plenty for a 400 px square, and small.
    transformation: 'c_limit,w_1200,h_1200',
    timestamp: Math.floor(now.getTime() / 1000),
  };
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
    apiKey: config.apiKey,
    signature: signParams(params, config.apiSecret),
    params,
  };
}

/**
 * The address students see: a 400 px square cropped around the face, in the
 * best format and quality for each browser. `version` changes on every upload,
 * so a new photo is never hidden behind an old cached one.
 */
export function photoUrl(config: Pick<CloudinaryConfig, 'cloudName'>, mentorId: string, version: number): string {
  return `https://res.cloudinary.com/${config.cloudName}/image/upload/c_fill,g_face,w_400,h_400,f_auto,q_auto/v${version}/${photoPublicId(mentorId)}`;
}

/** True when an address is a photo stored by `photoUrl` in this account. */
export function isOurPhoto(url: string | undefined | null, config: Pick<CloudinaryConfig, 'cloudName'>): boolean {
  return !!url && url.startsWith(`https://res.cloudinary.com/${config.cloudName}/image/upload/`) && url.includes(`/${PHOTO_FOLDER}/`);
}

/** Delete one mentor's photo from Cloudinary. Resolves either way: a missing file is not an error. */
export async function destroyPhoto(
  mentorId: string,
  config: CloudinaryConfig,
  fetchImpl: typeof fetch = fetch,
  now = new Date(),
): Promise<boolean> {
  const params = { public_id: photoPublicId(mentorId), invalidate: 'true', timestamp: Math.floor(now.getTime() / 1000) };
  const body = new URLSearchParams({
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    api_key: config.apiKey,
    signature: signParams(params, config.apiSecret),
  });
  try {
    const res = await fetchImpl(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/destroy`, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(15_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
