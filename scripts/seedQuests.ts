/**
 * One-time script: seeds the Firestore `quests` collection from the hardcoded
 * quest arrays. Run with:
 *   npx tsx scripts/seedQuests.ts
 *
 * Uses Application Default Credentials — run `gcloud auth application-default login` first.
 */
import * as admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'nuri-apps',
});

const db = admin.firestore();

const TRAIL_ROUTE = [[28.0790,-82.7706],[28.0640,-82.7758],[28.0490,-82.7812],[28.0350,-82.7862],[28.0190,-82.7895],[28.0060,-82.7902],[27.9870,-82.7930]];
const CAUSEWAY_ROUTE = [[28.0561,-82.8070],[28.0625,-82.8170],[28.0695,-82.8270],[28.0760,-82.8370],[28.0825,-82.8455]];
const OSPREY_ROUTE = [[28.0717,-82.8323],[28.0820,-82.8400],[28.0900,-82.8310],[28.0875,-82.8210],[28.0790,-82.8185],[28.0717,-82.8323]];

const quests = [
  // ── Solo ────────────────────────────────────────────────────────────────────
  { id: 'q1',  mode: 'solo',  title: 'Sponge Docks Stroll',         description: 'Walk the historic Sponge Docks on Dodecanese Blvd and try a fresh Greek pastry from one of the waterfront bakeries.', difficulty: 'easy',   xpReward: 55,  coinReward: 30,  lat: 28.1557, lng: -82.7610, category: 'culture', venue: 'Sponge Docks, Tarpon Springs' },
  { id: 'q2',  mode: 'solo',  title: 'Clearwater Beach Sunrise',    description: 'Arrive at Pier 60 before sunrise and photograph the sky the moment the sun breaks over the Gulf.', difficulty: 'easy',   xpReward: 60,  coinReward: 35,  lat: 27.9774, lng: -82.8302, category: 'outdoor', venue: 'Pier 60, Clearwater Beach' },
  { id: 'q3',  mode: 'solo',  title: 'Wall Springs Park Walk',      description: 'Explore the boardwalk trail at Wall Springs County Park and find the historic natural spring.', difficulty: 'easy',   xpReward: 50,  coinReward: 28,  lat: 28.1069, lng: -82.7714, category: 'outdoor', venue: 'Wall Springs County Park, Palm Harbor' },
  { id: 'q4',  mode: 'solo',  title: 'Downtown Palm Harbor Coffee', description: "Visit a café along Alt-19 in downtown Palm Harbor you've never tried before. Order something off the specials board.", difficulty: 'easy',   xpReward: 45,  coinReward: 25,  lat: 28.0781, lng: -82.7637, category: 'food',    venue: 'Downtown Palm Harbor' },
  { id: 'q5',  mode: 'solo',  title: 'Honeymoon Island Hike',       description: 'Drive to Honeymoon Island State Park and hike the full Osprey Trail. Keep an eye out for dolphins offshore.', difficulty: 'medium', xpReward: 130, coinReward: 85,  lat: 28.0717, lng: -82.8323, category: 'outdoor', venue: 'Honeymoon Island State Park', route: OSPREY_ROUTE },
  { id: 'q6',  mode: 'solo',  title: 'Tarpon Springs Arts Walk',    description: 'Explore the Arts District around Tarpon Ave and photograph at least 3 murals or public sculptures.', difficulty: 'medium', xpReward: 120, coinReward: 78,  lat: 28.1464, lng: -82.7548, category: 'culture', venue: 'Arts District, Tarpon Springs' },
  { id: 'q7',  mode: 'solo',  title: 'Clearwater Marine Aquarium',  description: 'Visit the Clearwater Marine Aquarium at 249 Windward Passage and learn something new about marine rescue.', difficulty: 'medium', xpReward: 115, coinReward: 75,  lat: 27.9769, lng: -82.8177, category: 'culture', venue: 'Clearwater Marine Aquarium' },
  { id: 'q8',  mode: 'solo',  title: 'Dunedin Causeway Adventure',  description: 'Bike or walk the full Dunedin Causeway out to the island and dip your feet in the Gulf when you reach the end.', difficulty: 'medium', xpReward: 125, coinReward: 82,  lat: 28.0561, lng: -82.8070, category: 'outdoor', venue: 'Dunedin Causeway', route: CAUSEWAY_ROUTE },
  { id: 'q9',  mode: 'solo',  title: 'Caladesi Island Explorer',    description: 'Take the ferry from Honeymoon Island to Caladesi Island State Park and spend at least an hour on the beach.', difficulty: 'hard',   xpReward: 260, coinReward: 160, lat: 28.0636, lng: -82.8316, category: 'outdoor', venue: 'Caladesi Island Ferry Dock' },
  { id: 'q10', mode: 'solo',  title: 'Pinellas Trail Challenge',    description: 'Complete at least 10 miles on the Pinellas Trail in one go. Screenshot your fitness app route as proof.', difficulty: 'hard',   xpReward: 310, coinReward: 190, lat: 28.0790, lng: -82.7706, category: 'fitness', venue: 'Pinellas Trail — Pop Stansell Park', route: TRAIL_ROUTE },
  { id: 'gq1', mode: 'solo',  title: 'Anclote Key Sunrise Expedition', description: 'Launch from Anclote River Park by kayak or boat at dawn, reach the Anclote Key lighthouse, and photograph the untouched barrier island at sunrise.', difficulty: 'golden', xpReward: 550, coinReward: 420, lat: 28.1762, lng: -82.7881, category: 'outdoor', venue: 'Anclote River Park, Tarpon Springs' },
  { id: 'gq2', mode: 'solo',  title: 'Tarpon Springs Greek Food Tour', description: 'Self-guided food tour of Tarpon Springs — loukoumades at Hellas, fresh grouper, baklava, and a sponge cake to finish.', difficulty: 'golden', xpReward: 620, coinReward: 510, lat: 28.1557, lng: -82.7610, category: 'food', venue: 'Sponge Docks, Tarpon Springs' },

  // ── Duo ─────────────────────────────────────────────────────────────────────
  { id: 'dq1',  mode: 'duo', title: 'Tandem Kayak at Fred Howard Park',   description: 'Rent or bring a tandem kayak and paddle together around Fred Howard Park. Make it out to the sandbar!', difficulty: 'easy',   xpReward: 70,  coinReward: 42,  lat: 28.1530, lng: -82.7992, category: 'outdoor', venue: 'Fred Howard Park, Tarpon Springs' },
  { id: 'dq2',  mode: 'duo', title: 'Duo Photography Walk',               description: 'Take turns photographing each other at 5 landmark spots around Clearwater Beach. Compare shots and pick a favorite together.', difficulty: 'easy',   xpReward: 60,  coinReward: 36,  lat: 27.9774, lng: -82.8302, category: 'culture', venue: 'Clearwater Beach' },
  { id: 'dq3',  mode: 'duo', title: 'Partner Greek Food Challenge',       description: "Each order one dish at the Sponge Docks — without looking at the menu first. Whoever finishes first wins bragging rights.", difficulty: 'medium', xpReward: 145, coinReward: 92,  lat: 28.1557, lng: -82.7610, category: 'food',    venue: 'Sponge Docks, Tarpon Springs' },
  { id: 'dq4',  mode: 'duo', title: 'Honeymoon Island Partner Hike',      description: 'Complete the Osprey Trail together and spot the most unique wildlife. Memory only — no phones to identify species.', difficulty: 'medium', xpReward: 138, coinReward: 88,  lat: 28.0717, lng: -82.8323, category: 'outdoor', venue: 'Honeymoon Island State Park', route: OSPREY_ROUTE },
  { id: 'dq5',  mode: 'duo', title: 'Sunset Dunedin Stroll',              description: "Walk Dunedin's Main Street together, stopping at every mural. Find one shop you'd both visit again.", difficulty: 'easy',   xpReward: 62,  coinReward: 38,  lat: 28.0121, lng: -82.7898, category: 'culture', venue: 'Downtown Dunedin' },
  { id: 'dq6',  mode: 'duo', title: 'Safety Harbor Shoreline Walk',       description: 'Walk the full Safety Harbor waterfront loop together and find the oldest tree in Philippe Park.', difficulty: 'easy',   xpReward: 58,  coinReward: 34,  lat: 27.9891, lng: -82.6862, category: 'outdoor', venue: 'Safety Harbor Waterfront' },
  { id: 'dq7',  mode: 'duo', title: 'Pier 60 Sunset Challenge',           description: 'Arrive at Pier 60 at least 15 minutes before sunset. Both photograph the exact moment of sunset. Compare shots!', difficulty: 'easy',   xpReward: 72,  coinReward: 44,  lat: 27.9774, lng: -82.8302, category: 'outdoor', venue: 'Pier 60, Clearwater Beach' },
  { id: 'dq8',  mode: 'duo', title: 'Tarpon Arts Duo Tour',               description: 'Explore the Arts District and find every mural together. Agree on a top-3 list and debate the winner.', difficulty: 'medium', xpReward: 132, coinReward: 84,  lat: 28.1464, lng: -82.7548, category: 'culture', venue: 'Arts District, Tarpon Springs' },
  { id: 'dq9',  mode: 'duo', title: 'Caladesi Island Duo Expedition',     description: 'Ferry over to Caladesi Island together and make it to Shell Key before heading back. Count the pelicans.', difficulty: 'hard',   xpReward: 285, coinReward: 178, lat: 28.0636, lng: -82.8316, category: 'outdoor', venue: 'Caladesi Island Ferry Dock' },
  { id: 'dq10', mode: 'duo', title: 'Pinellas Trail Duo Ride',            description: "Bike the Pinellas Trail together for 10 miles. Set a pace, don't leave your partner behind, and celebrate at the finish.", difficulty: 'hard',   xpReward: 325, coinReward: 202, lat: 28.0790, lng: -82.7706, category: 'fitness', venue: 'Pinellas Trail — Pop Stansell Park', route: TRAIL_ROUTE },

  // ── Trio ─────────────────────────────────────────────────────────────────────
  { id: 'tq1',  mode: 'trio', title: 'Clearwater Beach Trio Volleyball', description: 'Find a net on Clearwater Beach and challenge another group to volleyball. Best of 3 games!', difficulty: 'medium', xpReward: 155, coinReward: 98,  lat: 27.9774, lng: -82.8302, category: 'fitness', venue: 'Clearwater Beach' },
  { id: 'tq2',  mode: 'trio', title: 'Greek Food Tour for Three',        description: 'Each person orders a different course at three Sponge Docks spots and shares with the group. End with baklava — required.', difficulty: 'medium', xpReward: 148, coinReward: 95,  lat: 28.1557, lng: -82.7610, category: 'food',    venue: 'Sponge Docks, Tarpon Springs' },
  { id: 'tq3',  mode: 'trio', title: 'Palm Harbor Trio Scavenger Hunt',  description: 'Split roles: Navigator, Photographer, Historian. Find 10 historical markers around downtown Palm Harbor together.', difficulty: 'easy',   xpReward: 74,  coinReward: 44,  lat: 28.0781, lng: -82.7637, category: 'culture', venue: 'Downtown Palm Harbor' },
  { id: 'tq4',  mode: 'trio', title: 'Anclote Park Group Kayak',         description: 'Rent three kayaks and paddle together from Anclote River Park. First person to spot a manatee or dolphin wins.', difficulty: 'hard',   xpReward: 300, coinReward: 188, lat: 28.1762, lng: -82.7881, category: 'outdoor', venue: 'Anclote River Park, Tarpon Springs' },
  { id: 'tq5',  mode: 'trio', title: 'Dunedin Craft Breweries Tour',     description: "Visit three different craft breweries in Dunedin. Sample one flight each and vote on the group's favorite pint.", difficulty: 'medium', xpReward: 158, coinReward: 100, lat: 28.0121, lng: -82.7898, category: 'food',    venue: 'Downtown Dunedin' },
  { id: 'tq6',  mode: 'trio', title: 'Trio Honeymoon Island Blitz',      description: 'Race to complete the full Osprey Trail. Each person takes a different fork at every junction. Reunite at the end.', difficulty: 'medium', xpReward: 142, coinReward: 90,  lat: 28.0717, lng: -82.8323, category: 'outdoor', venue: 'Honeymoon Island State Park', route: OSPREY_ROUTE },
  { id: 'tq7',  mode: 'trio', title: 'Safety Harbor Relay Run',          description: 'Run a relay from Safety Harbor pier to Philippe Park and back. Each person covers a third — switch at marked points.', difficulty: 'medium', xpReward: 150, coinReward: 95,  lat: 27.9891, lng: -82.6862, category: 'fitness', venue: 'Safety Harbor Waterfront Park' },
  { id: 'tq8',  mode: 'trio', title: 'Wall Springs Trio Nature Walk',    description: 'Walk the Wall Springs boardwalk: each person must identify 5 unique plants or animals by the time you reach the spring.', difficulty: 'easy',   xpReward: 67,  coinReward: 40,  lat: 28.1069, lng: -82.7714, category: 'outdoor', venue: 'Wall Springs County Park, Palm Harbor' },
  { id: 'tq9',  mode: 'trio', title: 'Clearwater Aquarium Trio Mission', description: "Each member finds one rescued animal, learns its full story, then presents it to the others at the end of the visit.", difficulty: 'medium', xpReward: 138, coinReward: 87,  lat: 27.9769, lng: -82.8177, category: 'culture', venue: 'Clearwater Marine Aquarium' },
  { id: 'tq10', mode: 'trio', title: 'Pinellas Trail Trio Relay',        description: 'Complete 15 miles on the Pinellas Trail as a relay — each person takes a 5-mile leg. Support each other at handoffs.', difficulty: 'hard',   xpReward: 340, coinReward: 212, lat: 28.0790, lng: -82.7706, category: 'fitness', venue: 'Pinellas Trail — Pop Stansell Park', route: TRAIL_ROUTE },

  // ── Squad ────────────────────────────────────────────────────────────────────
  { id: 'sq1',  mode: 'squad', title: 'Four Corners Pinellas Tour',        description: "Each squad member photographs a different corner of Pinellas County: North, South, East, West. Meet back in Palm Harbor!", difficulty: 'medium', xpReward: 168, coinReward: 106, lat: 28.0781, lng: -82.7637, category: 'adventure', venue: 'Pinellas County' },
  { id: 'sq2',  mode: 'squad', title: 'Clearwater Beach Squad Olympics',   description: 'Four events: frisbee distance, swimming sprint, sandcastle speed build, volleyball point. Winner gets eternal bragging rights.', difficulty: 'hard',   xpReward: 315, coinReward: 196, lat: 27.9774, lng: -82.8302, category: 'fitness',   venue: 'Clearwater Beach' },
  { id: 'sq3',  mode: 'squad', title: 'Full Squad Sponge Docks Feast',     description: 'Each person orders one appetizer, one main, and one dessert from different Sponge Docks vendors. Share everything.', difficulty: 'medium', xpReward: 162, coinReward: 102, lat: 28.1557, lng: -82.7610, category: 'food',      venue: 'Sponge Docks, Tarpon Springs' },
  { id: 'sq4',  mode: 'squad', title: 'Four-Kayak Race at Fred Howard Park', description: 'Race from the Fred Howard boat launch to the sandbar and back. No paddling assist allowed — pure technique wins.', difficulty: 'hard',   xpReward: 328, coinReward: 204, lat: 28.1530, lng: -82.7992, category: 'outdoor',   venue: 'Fred Howard Park, Tarpon Springs' },
  { id: 'sq5',  mode: 'squad', title: 'Honeymoon Island Squad Nature Walk', description: 'Walk the entire Osprey Trail in single file. Whoever breaks formation does 10 push-ups on the spot. No exceptions.', difficulty: 'easy',   xpReward: 82,  coinReward: 49,  lat: 28.0717, lng: -82.8323, category: 'outdoor',   venue: 'Honeymoon Island State Park', route: OSPREY_ROUTE },
  { id: 'sq6',  mode: 'squad', title: 'Dunedin Causeway Full Squad March',  description: "Walk or bike the entire Dunedin Causeway together and make it to the Gulf. Last one in buys lunch.", difficulty: 'medium', xpReward: 165, coinReward: 104, lat: 28.0561, lng: -82.8070, category: 'outdoor',   venue: 'Dunedin Causeway', route: CAUSEWAY_ROUTE },
  { id: 'sq7',  mode: 'squad', title: 'Beach Clean-Up Squad Mission',       description: 'Spend 1 hour cleaning Clearwater Beach as a squad. Each person brings a bag. Take a before-and-after photo together.', difficulty: 'easy',   xpReward: 78,  coinReward: 47,  lat: 27.9774, lng: -82.8302, category: 'community', venue: 'Clearwater Beach' },
  { id: 'sq8',  mode: 'squad', title: 'Safety Harbor Spa + Fitness Day',    description: 'Morning: 2-mile run around Philippe Park. Afternoon: spa treatment at Safety Harbor Spa. Wellness achieved.', difficulty: 'medium', xpReward: 164, coinReward: 103, lat: 27.9891, lng: -82.6862, category: 'fitness',   venue: 'Safety Harbor Spa & Resort' },
  { id: 'sq9',  mode: 'squad', title: 'Four-Way Brewery Trivia Night',      description: 'Form two teams of two at a Dunedin brewery. Play trivia night. Losing team buys the next round — no complaining.', difficulty: 'medium', xpReward: 155, coinReward: 98,  lat: 28.0121, lng: -82.7898, category: 'food',      venue: 'Downtown Dunedin' },
  { id: 'sq10', mode: 'squad', title: 'Grand Pinellas Squad Tour',          description: 'In one day: visit Sponge Docks, Pier 60, Safety Harbor Pier, Dunedin Main St, and Honeymoon Island. Photo proof at each.', difficulty: 'hard',   xpReward: 420, coinReward: 262, lat: 28.0784, lng: -82.7810, category: 'adventure', venue: 'Pinellas County' },
];

async function seed() {
  const batch = db.batch();
  const col = db.collection('quests');

  for (const q of quests) {
    const { id, ...data } = q;
    batch.set(col.doc(id), { ...data, active: true, createdAt: admin.firestore.FieldValue.serverTimestamp() });
  }

  await batch.commit();
  console.log(`Seeded ${quests.length} quests to Firestore.`);
}

seed().catch(console.error);
