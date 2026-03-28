/**
 * One-time script: seeds the Firestore `questTemplates` collection.
 * Run with: npx tsx scripts/seedTemplates.ts
 * Uses Application Default Credentials — run `gcloud auth application-default login` first.
 */
import * as admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'nuri-apps',
});

const db = admin.firestore();

const templates = [
  // ── Solo ─────────────────────────────────────────────────────────────────
  { mode: 'solo', difficulty: 'easy',   category: 'outdoor', xpReward: 55,  coinReward: 30,  hint: 'Find a nearby park or nature trail and walk its main path from end to end' },
  { mode: 'solo', difficulty: 'easy',   category: 'food',    xpReward: 45,  coinReward: 25,  hint: 'Visit a local café or bakery you have never been to and order something off the specials board' },
  { mode: 'solo', difficulty: 'easy',   category: 'culture', xpReward: 50,  coinReward: 28,  hint: 'Find a piece of public art, mural, or outdoor sculpture near you and photograph it up close' },
  { mode: 'solo', difficulty: 'easy',   category: 'outdoor', xpReward: 60,  coinReward: 35,  hint: 'Walk to a nearby waterfront, pier, lake, or river bank and spend at least 20 minutes there' },
  { mode: 'solo', difficulty: 'medium', category: 'outdoor', xpReward: 125, coinReward: 80,  hint: 'Hike or walk a nature reserve, state park, or multi-mile trail near you — complete the full loop or go at least 2 miles' },
  { mode: 'solo', difficulty: 'medium', category: 'culture', xpReward: 115, coinReward: 75,  hint: 'Visit a local museum, gallery, historic landmark, or cultural site and learn at least one new thing to share' },
  { mode: 'solo', difficulty: 'medium', category: 'outdoor', xpReward: 130, coinReward: 82,  hint: 'Find a scenic overlook, hilltop, rooftop, or observation point with a memorable view and photograph it' },
  { mode: 'solo', difficulty: 'medium', category: 'food',    xpReward: 120, coinReward: 78,  hint: 'Find a restaurant or food stall serving a cuisine you have never tried and order a full meal' },
  { mode: 'solo', difficulty: 'hard',   category: 'fitness', xpReward: 300, coinReward: 185, hint: 'Complete a 10+ mile run, bike ride, or hike on a local trail or greenway in a single session' },
  { mode: 'solo', difficulty: 'hard',   category: 'outdoor', xpReward: 260, coinReward: 160, hint: 'Reach a remote or hard-to-access natural destination near you — an island, peak, waterfall, or wildlife preserve — that requires real effort' },
  { mode: 'solo', difficulty: 'hard',   category: 'adventure', xpReward: 280, coinReward: 170, hint: 'Spend 2+ hours exploring a neighbourhood, district, or area of your city you have genuinely never visited before' },
  { mode: 'solo', difficulty: 'golden', category: 'outdoor', xpReward: 580, coinReward: 450, hint: 'Plan an epic early-morning adventure — a sunrise hike, kayak, boat trip, or cycle — to somewhere spectacular near you' },
  { mode: 'solo', difficulty: 'golden', category: 'food',    xpReward: 620, coinReward: 510, hint: 'Build a self-guided food tour of your city\'s best local cuisine — at least 3 stops, ending with something sweet' },

  // ── Duo ──────────────────────────────────────────────────────────────────
  { mode: 'duo', difficulty: 'easy',   category: 'outdoor', xpReward: 70,  coinReward: 42,  hint: 'Walk a scenic local trail or waterfront path together — no phones for directions, navigate by instinct' },
  { mode: 'duo', difficulty: 'easy',   category: 'culture', xpReward: 62,  coinReward: 38,  hint: 'Take turns photographing each other at 5 landmark spots around your town — compare shots at the end and pick a winner' },
  { mode: 'duo', difficulty: 'easy',   category: 'food',    xpReward: 65,  coinReward: 40,  hint: 'Visit a local market or food hall together — each person orders something the other picks, without looking at the menu first' },
  { mode: 'duo', difficulty: 'easy',   category: 'outdoor', xpReward: 60,  coinReward: 36,  hint: 'Find the best sunset or sunrise viewing spot near you and arrive at least 10 minutes before the moment — both photograph it' },
  { mode: 'duo', difficulty: 'medium', category: 'outdoor', xpReward: 140, coinReward: 88,  hint: 'Hike or walk a local nature trail together — spot the most interesting wildlife or flora with memory only, no phone lookup' },
  { mode: 'duo', difficulty: 'medium', category: 'culture', xpReward: 132, coinReward: 84,  hint: 'Explore your city\'s arts or historic district together — find every mural or landmark and agree on a top-3 list' },
  { mode: 'duo', difficulty: 'medium', category: 'food',    xpReward: 145, coinReward: 92,  hint: 'Do a mini food tour of a local neighbourhood together — at least 3 different stops, each person picks one dish to share' },
  { mode: 'duo', difficulty: 'hard',   category: 'outdoor', xpReward: 290, coinReward: 180, hint: 'Travel together to a remote or scenic natural destination near you that requires a ferry, boat, or long hike to reach' },
  { mode: 'duo', difficulty: 'hard',   category: 'fitness', xpReward: 325, coinReward: 200, hint: 'Bike or run a long local trail together — set a shared pace and celebrate at the finish line' },

  // ── Trio ─────────────────────────────────────────────────────────────────
  { mode: 'trio', difficulty: 'easy',   category: 'culture', xpReward: 74,  coinReward: 44,  hint: 'Split roles — Navigator, Photographer, Historian — and do a scavenger hunt for 10 historic or interesting landmarks in your downtown' },
  { mode: 'trio', difficulty: 'easy',   category: 'outdoor', xpReward: 67,  coinReward: 40,  hint: 'Walk a local nature boardwalk or park trail together — each person must identify 5 unique plants or animals before you finish' },
  { mode: 'trio', difficulty: 'medium', category: 'food',    xpReward: 148, coinReward: 95,  hint: 'Each person orders a different course at three different local restaurants or food stalls — share everything and rank your favourites' },
  { mode: 'trio', difficulty: 'medium', category: 'fitness', xpReward: 155, coinReward: 98,  hint: 'Find a beach, park, or open space and challenge each other to 3 athletic events — pick the winner of each' },
  { mode: 'trio', difficulty: 'medium', category: 'outdoor', xpReward: 142, coinReward: 90,  hint: 'Race to complete a local trail loop — each person takes a different fork at every junction and reunites at the end' },
  { mode: 'trio', difficulty: 'medium', category: 'food',    xpReward: 158, coinReward: 100, hint: 'Visit three different local craft breweries, coffee shops, or juice bars — sample one thing at each and vote on the group\'s favourite' },
  { mode: 'trio', difficulty: 'hard',   category: 'outdoor', xpReward: 300, coinReward: 188, hint: 'Rent three kayaks, paddleboards, or bikes and race from a local launch point to a designated landmark and back' },
  { mode: 'trio', difficulty: 'hard',   category: 'fitness', xpReward: 340, coinReward: 212, hint: 'Run or cycle a relay on a long local trail — each person takes an equal leg, support each other at the handoff points' },

  // ── Squad ────────────────────────────────────────────────────────────────
  { mode: 'squad', difficulty: 'easy',   category: 'outdoor',   xpReward: 80,  coinReward: 48,  hint: 'Walk a scenic local trail or nature loop in single file — if anyone breaks formation they do 10 push-ups on the spot' },
  { mode: 'squad', difficulty: 'easy',   category: 'community', xpReward: 78,  coinReward: 47,  hint: 'Spend 1 hour doing a clean-up at a local beach, park, or public space as a squad — take a before-and-after group photo' },
  { mode: 'squad', difficulty: 'medium', category: 'food',      xpReward: 162, coinReward: 102, hint: 'Each person orders one appetizer, one main, and one dessert from different local vendors — share everything around the table' },
  { mode: 'squad', difficulty: 'medium', category: 'outdoor',   xpReward: 165, coinReward: 104, hint: 'Walk or cycle a long local causeway, greenway, or coastal path together from end to end — last one in buys lunch' },
  { mode: 'squad', difficulty: 'medium', category: 'food',      xpReward: 155, coinReward: 98,  hint: 'Find a local bar or brewery that runs trivia nights — form two teams of two and compete. Losers buy the next round.' },
  { mode: 'squad', difficulty: 'hard',   category: 'fitness',   xpReward: 315, coinReward: 196, hint: 'Organize a squad Olympics at a local beach or park — frisbee, swimming, sandcastle, relay — crown an overall winner' },
  { mode: 'squad', difficulty: 'hard',   category: 'outdoor',   xpReward: 328, coinReward: 204, hint: 'Race to a natural landmark and back from a local water launch or trailhead — four separate vessels or bikes, pure technique wins' },
  { mode: 'squad', difficulty: 'hard',   category: 'adventure', xpReward: 420, coinReward: 262, hint: 'In one day visit 5 iconic or beloved spots in your city — a historic site, waterfront, market, viewpoint, and local favourite. Photo proof at each.' },
];

async function seed() {
  const col = db.collection('questTemplates');
  const batch = db.batch();

  for (let i = 0; i < templates.length; i++) {
    const ref = col.doc();
    batch.set(ref, {
      ...templates[i],
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
  console.log(`Seeded ${templates.length} quest templates.`);
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
