/**
 * Client-side sliding-window rate limiter for Firestore write operations.
 *
 * This is the first layer of defence. Firestore security rules are the
 * authoritative server-side guard; this prevents accidental bursts and
 * gives clear feedback without a round-trip.
 *
 * Note: state is per-tab (in-memory). For cross-tab coordination, a
 * BroadcastChannel or localStorage counter could be used, but for this
 * app the per-tab limit is sufficient.
 */

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

/**
 * Returns true if the action is allowed and records the attempt.
 * Returns false if the caller is over the rate limit.
 *
 * @param key       Unique key (e.g. `chat:${uid}`)
 * @param max       Maximum allowed calls within windowMs
 * @param windowMs  Sliding window in milliseconds
 */
export function allow(key: string, max: number, windowMs: number): boolean {
  const now  = Date.now();
  const b    = buckets.get(key) ?? { timestamps: [] };

  // Evict timestamps outside the current window
  b.timestamps = b.timestamps.filter(t => now - t < windowMs);

  if (b.timestamps.length >= max) {
    buckets.set(key, b);
    return false; // rate limited
  }

  b.timestamps.push(now);
  buckets.set(key, b);
  return true;
}

/**
 * Returns how many milliseconds until the oldest timestamp leaves the window,
 * i.e. how long the caller should wait before retrying.
 */
export function retryAfterMs(key: string, windowMs: number): number {
  const b = buckets.get(key);
  if (!b || b.timestamps.length === 0) return 0;
  const oldest = b.timestamps[0];
  return Math.max(0, windowMs - (Date.now() - oldest));
}

// ── Pre-configured limiters ─────────────────────────────────────────────────

/** Chat messages: max 5 per 10 s per user.  Prevents spam floods. */
export function allowChat(uid: string): boolean {
  return allow(`chat:${uid}`, 5, 10_000);
}

/** Leaderboard syncs: max 1 per 4 s per user.  Avoids write storms. */
export function allowLeaderboardUpdate(uid: string): boolean {
  return allow(`lb:${uid}`, 1, 4_000);
}

/** Activity log writes: max 10 per minute per user. */
export function allowActivityLog(uid: string): boolean {
  return allow(`act:${uid}`, 10, 60_000);
}

/** Username availability checks: max 20 per minute per session. */
export function allowUsernameCheck(): boolean {
  return allow('usernameCheck', 20, 60_000);
}
