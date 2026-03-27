/**
 * OWASP-aligned schema-based input validation and sanitization.
 * Every user-supplied string passes through here before touching Firestore.
 */

// ── Length constants ────────────────────────────────────────────────────────
export const USERNAME_MIN     = 3;
export const USERNAME_MAX     = 24;
export const DISPLAY_NAME_MAX = 32;
export const CHAT_MSG_MAX     = 500;
export const PARTY_NAME_MAX   = 40;
export const PARTY_CODE_LEN   = 6;
export const QUEST_TITLE_MAX  = 120;

// ── Allowed-character patterns ──────────────────────────────────────────────
const USERNAME_RE   = /^[a-z0-9_-]+$/;
const PARTY_CODE_RE = /^[A-Z0-9]{6}$/;

// ── Result type ─────────────────────────────────────────────────────────────
export interface ValidationResult {
  ok:     boolean;
  error?: string;
}

// ── Validators ──────────────────────────────────────────────────────────────

export function validateUsername(raw: string): ValidationResult {
  const v = raw.trim().toLowerCase();
  if (!v)                      return { ok: false, error: 'Username is required.' };
  if (v.length < USERNAME_MIN) return { ok: false, error: `At least ${USERNAME_MIN} characters required.` };
  if (v.length > USERNAME_MAX) return { ok: false, error: `Max ${USERNAME_MAX} characters.` };
  if (!USERNAME_RE.test(v))    return { ok: false, error: 'Only letters, numbers, _ and - allowed.' };
  return { ok: true };
}

export function validateDisplayName(raw: string): ValidationResult {
  const v = sanitizeText(raw, DISPLAY_NAME_MAX);
  if (!v)                          return { ok: false, error: 'Display name is required.' };
  if (v.length > DISPLAY_NAME_MAX) return { ok: false, error: `Max ${DISPLAY_NAME_MAX} characters.` };
  return { ok: true };
}

export function validateChatMessage(raw: string): ValidationResult {
  const v = sanitizeText(raw, CHAT_MSG_MAX);
  if (!v)                      return { ok: false, error: 'Message cannot be empty.' };
  if (v.length > CHAT_MSG_MAX) return { ok: false, error: `Max ${CHAT_MSG_MAX} characters.` };
  return { ok: true };
}

export function validatePartyName(raw: string): ValidationResult {
  const v = sanitizeText(raw, PARTY_NAME_MAX);
  if (!v)                       return { ok: false, error: 'Party name is required.' };
  if (v.length > PARTY_NAME_MAX) return { ok: false, error: `Max ${PARTY_NAME_MAX} characters.` };
  return { ok: true };
}

export function validatePartyCode(raw: string): ValidationResult {
  const v = raw.trim().toUpperCase();
  if (!v)                       return { ok: false, error: 'Party code is required.' };
  if (!PARTY_CODE_RE.test(v))   return { ok: false, error: 'Invalid party code — must be 6 alphanumeric characters.' };
  return { ok: true };
}

export function validateQuestTitle(raw: string): ValidationResult {
  const v = sanitizeText(raw, QUEST_TITLE_MAX);
  if (!v)                        return { ok: false, error: 'Quest title is required.' };
  if (v.length > QUEST_TITLE_MAX) return { ok: false, error: `Max ${QUEST_TITLE_MAX} characters.` };
  return { ok: true };
}

/**
 * Validates numeric stat values written to the leaderboard.
 * Rejects unreasonably large values to prevent score injection.
 */
export function validateLeaderboardStats(data: {
  level: number; xp: number; totalXp: number;
  coins: number; streak: number; questsCompleted: number; weeklyQuestsCompleted: number;
}): ValidationResult {
  const { level, xp, totalXp, coins, streak, questsCompleted, weeklyQuestsCompleted } = data;
  if (!Number.isInteger(level) || level < 1 || level > 10_000)
    return { ok: false, error: 'Invalid level.' };
  if (!Number.isInteger(xp) || xp < 0 || xp > 1_000_000_000)
    return { ok: false, error: 'Invalid xp.' };
  if (!Number.isInteger(totalXp) || totalXp < 0 || totalXp > 1_000_000_000)
    return { ok: false, error: 'Invalid totalXp.' };
  if (!Number.isInteger(coins) || coins < 0 || coins > 10_000_000)
    return { ok: false, error: 'Invalid coins.' };
  if (!Number.isInteger(streak) || streak < 0 || streak > 100_000)
    return { ok: false, error: 'Invalid streak.' };
  if (!Number.isInteger(questsCompleted) || questsCompleted < 0 || questsCompleted > 1_000_000)
    return { ok: false, error: 'Invalid questsCompleted.' };
  if (!Number.isInteger(weeklyQuestsCompleted) || weeklyQuestsCompleted < 0 || weeklyQuestsCompleted > 10_000)
    return { ok: false, error: 'Invalid weeklyQuestsCompleted.' };
  return { ok: true };
}

// ── Sanitizer ───────────────────────────────────────────────────────────────

/**
 * Strips C0/C1 control characters (except tab, newline, carriage return)
 * and truncates to maxLength. Safe to use before any Firestore write.
 */
export function sanitizeText(raw: string, maxLength: number): string {
  return raw
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\x80-\x9F]/g, '') // strip control chars
    .trim()
    .slice(0, maxLength);
}
