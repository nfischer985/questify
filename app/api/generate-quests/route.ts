import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const REGEN_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function POST(req: NextRequest) {
  // 1. Verify auth token
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let uid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // 2. Parse body
  const { lat, lng } = await req.json();
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return NextResponse.json({ error: 'Missing lat/lng' }, { status: 400 });
  }

  // 3. Check rate limit
  const userQuestsRef = adminDb.doc(`userQuests/${uid}`);
  const [userQuestsSnap, lbSnap] = await Promise.all([
    userQuestsRef.get(),
    adminDb.doc(`leaderboard/${uid}`).get(),
  ]);

  const isPremium = lbSnap.data()?.premium ?? false;
  const lastRegenAt: number | undefined = userQuestsSnap.data()?.lastRegenAt;
  const existingSolo: unknown[] = userQuestsSnap.data()?.solo ?? [];
  const hasNoQuests = !userQuestsSnap.exists || existingSolo.length === 0;

  // Skip rate limit if the user has no quests (first generation or after a reset)
  if (!isPremium && !hasNoQuests && lastRegenAt) {
    const elapsed = Date.now() - lastRegenAt;
    if (elapsed < REGEN_COOLDOWN_MS) {
      return NextResponse.json(
        { error: 'Rate limited', retryAfter: lastRegenAt + REGEN_COOLDOWN_MS },
        { status: 429 }
      );
    }
  }

  // 4. Fetch active templates
  const templatesSnap = await adminDb.collection('questTemplates')
    .where('active', '==', true)
    .get();

  if (templatesSnap.empty) {
    return NextResponse.json({ error: 'No templates configured' }, { status: 500 });
  }

  const templates = templatesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  // 5. Call Claude
  let generated: GeneratedQuest[];
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8096,
      messages: [{
        role: 'user',
        content: buildPrompt(lat, lng, templates),
      }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('No JSON array in response');
    generated = JSON.parse(match[0]);
  } catch (err) {
    console.error('Claude error:', err);
    return NextResponse.json({ error: 'Quest generation failed' }, { status: 500 });
  }

  // 6. Group by mode and assign IDs
  const byMode: Record<string, object[]> = { solo: [], duo: [], trio: [], squad: [] };
  const ts = Date.now();
  for (let i = 0; i < generated.length; i++) {
    const q = generated[i];
    const mode = q.mode;
    if (byMode[mode]) {
      byMode[mode].push({ ...q, id: `${mode}-${ts}-${i}`, completed: false });
    }
  }

  // 7. Save to Firestore
  await userQuestsRef.set({
    ...byMode,
    lastRegenAt: ts,
  });

  return NextResponse.json({ success: true });
}

interface GeneratedQuest {
  title: string;
  description: string;
  lat: number;
  lng: number;
  venue: string;
  mode: string;
  difficulty: string;
  xpReward: number;
  coinReward: number;
  category: string;
}

function buildPrompt(lat: number, lng: number, templates: object[]): string {
  return `You are generating personalised quests for Questify, a location-based adventure app.

The user is at coordinates: ${lat}, ${lng}.

For each template below, generate one specific quest set at a REAL place near those coordinates. Use your knowledge of local parks, beaches, restaurants, museums, trails, landmarks, and neighbourhoods.

Each quest object must have these exact fields:
- "title": Exciting quest name (max 40 characters)
- "description": Specific instructions mentioning the real place name (max 200 characters)
- "lat": Latitude of the quest location (number)
- "lng": Longitude of the quest location (number)
- "venue": Real place name (e.g. "Lincoln Park, Chicago")
- "mode": Copy from the template
- "difficulty": Copy from the template
- "xpReward": Copy from the template
- "coinReward": Copy from the template
- "category": Copy from the template

Templates:
${JSON.stringify(templates, null, 2)}

Return ONLY a valid JSON array — one quest object per template, in the same order. No other text or markdown.`;
}
