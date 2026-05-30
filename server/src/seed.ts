import bcryptjs from "bcryptjs";
import { prisma } from "./db";
import { getHexIndex } from "./utils/hex";

/**
 * Idempotent seed routines run on server startup. Achievements + vouchers are
 * upserted every boot; the heavier demo content (accounts, posts, hexes, org,
 * marketplace) is created once and skipped on subsequent boots.
 *
 * Demo credentials (all created here):
 *   admin@greenify.bg   / admin123    (role: admin — moderation dashboard)
 *   founder@greenify.bg / founder123  (Level 5 — owns "Burgas Green Guild")
 *   maria@greenify.bg   / demo123     (available for hire, has reviews)
 *   georgi@greenify.bg  / demo123     (available for hire)
 */

const ACHIEVEMENTS = [
  { slug: "first-plant", name: "First Plant", description: "Created your first planting post", icon: "🌱" },
  { slug: "pollinator", name: "Pollinator", description: "Planted 5 flowers or shrubs", icon: "🌸" },
  { slug: "canopy-starter", name: "Canopy Starter", description: "Planted 3 trees", icon: "🌳" },
  { slug: "neighborhood-anchor", name: "Neighborhood Anchor", description: "Claimed 10 contiguous hexes", icon: "🗺️" },
  { slug: "green-zone-pioneer", name: "Green Zone Pioneer", description: "Planted in a hex with zero prior plants", icon: "🏆" },
  { slug: "endorser", name: "Endorser", description: "Endorsed 20 posts", icon: "👍" },
  { slug: "trusted-worker", name: "Trusted Worker", description: "Received 10 five-star reviews", icon: "⭐" },
  { slug: "org-founder", name: "Org Founder", description: "Created an organization", icon: "🏢" },
];

const VOUCHERS = [
  { code: "ECOVERDE10", organizationName: "EcoVerde Solutions", gpValue: 100, description: "10% off sustainable landscaping services", organizationDescription: "Sustainable urban landscaping" },
  { code: "BIONEST-SEEDS", organizationName: "BioNest Bulgaria", gpValue: 150, description: "Free packet of organic wildflower seeds", organizationDescription: "Organic seeds & fertilizers" },
  { code: "BLACKSEA-TOUR", organizationName: "Черно море Еко", gpValue: 200, description: "Guided coastal conservation tour for two", organizationDescription: "Coastal conservation NGO" },
  { code: "SUNNY-STAY", organizationName: "Sunny Beach Resorts Group", gpValue: 500, description: "€20 carbon-offset stay credit", organizationDescription: "Hospitality carbon offsetting" },
  { code: "SOLARGRID-AUDIT", organizationName: "SolarGrid BG", gpValue: 300, description: "Free home solar suitability audit", organizationDescription: "Renewable energy provider" },
  { code: "GREENTECH-MERCH", organizationName: "GreenTech Capital", gpValue: 80, description: "Greenify tote bag + reusable bottle", organizationDescription: "Impact investing" },
];

export async function seedAchievements() {
  for (const ach of ACHIEVEMENTS) {
    await prisma.achievement.upsert({ where: { slug: ach.slug }, update: {}, create: ach });
  }
}

export async function seedVouchers() {
  for (const v of VOUCHERS) {
    await prisma.voucher.upsert({
      where: { code: v.code },
      update: { gpValue: v.gpValue, description: v.description, status: "active" },
      create: { ...v, status: "active" },
    });
  }
}

async function upsertUser(opts: {
  email: string;
  username: string;
  displayName: string;
  password: string;
  role?: string;
  level: number;
  xp: number;
  greenPoints: number;
  bio?: string;
  availableForHire?: boolean;
  bioForHire?: string;
}) {
  const passwordHash = await bcryptjs.hash(opts.password, 10);
  return prisma.user.upsert({
    where: { email: opts.email },
    update: {},
    create: {
      email: opts.email,
      username: opts.username,
      displayName: opts.displayName,
      passwordHash,
      role: opts.role || "user",
      level: opts.level,
      xp: opts.xp,
      greenPoints: opts.greenPoints,
      bio: opts.bio,
      availableForHire: opts.availableForHire ?? false,
      bioForHire: opts.bioForHire,
    },
  });
}

async function createSeedPost(
  userId: string,
  title: string,
  plantType: string,
  lat: number,
  lng: number,
  description: string,
) {
  const h3Index = getHexIndex(lat, lng);
  const hex = await prisma.hex.upsert({
    where: { h3Index },
    update: { plantCount: { increment: 1 } },
    create: { h3Index, userId, plantCount: 1 },
  });
  return prisma.post.create({
    data: {
      userId,
      title,
      description,
      plantType,
      latitude: lat,
      longitude: lng,
      status: "approved",
      hexId: hex.id,
      images: {
        // Inline SVG placeholders so the feed/map have visible imagery without binary assets.
        create: [1, 2, 3].map((order) => ({
          order,
          imageUrl: placeholderImage(plantType, order),
        })),
      },
    },
  });
}

function placeholderImage(plantType: string, order: number): string {
  const colors: Record<string, string> = { tree: "166534", flower: "be185d", grass: "65a30d" };
  const bg = colors[plantType] || "16a34a";
  const labels = ["seed", "placing", "buried"];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#${bg}"/><text x="50%" y="50%" fill="#ffffff" font-family="sans-serif" font-size="28" text-anchor="middle" dominant-baseline="middle">${plantType} · ${labels[order - 1]}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export async function seedDemoContent() {
  // Always ensure the admin account exists (so moderation is reachable).
  await upsertUser({
    email: "admin@greenify.bg",
    username: "admin",
    displayName: "Site Admin",
    password: "admin123",
    role: "admin",
    level: 5,
    xp: 1500,
    greenPoints: 1000,
    bio: "Keeping Greenify clean and green.",
  });

  // The rest of the demo content is created once.
  const existingOrg = await prisma.organization.findFirst({ where: { name: "Burgas Green Guild" } });
  if (existingOrg) return;

  const founder = await upsertUser({
    email: "founder@greenify.bg",
    username: "founder",
    displayName: "Ivan Petrov",
    password: "founder123",
    level: 5,
    xp: 1200,
    greenPoints: 600,
    bio: "Leading the charge to green up Burgas, one hex at a time.",
  });
  const maria = await upsertUser({
    email: "maria@greenify.bg",
    username: "maria",
    displayName: "Maria Dimitrova",
    password: "demo123",
    level: 4,
    xp: 720,
    greenPoints: 350,
    bio: "Flower enthusiast and weekend gardener.",
    availableForHire: true,
    bioForHire: "Experienced gardener — watering, weeding, and planting. Reliable and quick.",
  });
  const georgi = await upsertUser({
    email: "georgi@greenify.bg",
    username: "georgi",
    displayName: "Georgi Stoyanov",
    password: "demo123",
    level: 3,
    xp: 420,
    greenPoints: 220,
    bio: "Tree-hugger, literally.",
    availableForHire: true,
    bioForHire: "Strong back, green thumb. Happy to help with heavier planting jobs.",
  });

  // Demo posts spread around central Burgas (each claims a distinct hex).
  const posts: [string, string, string, number, number, string][] = [
    [founder.id, "Oak by the Sea Garden", "tree", 42.4928, 27.4806, "A young oak near the main alley."],
    [founder.id, "Linden row on Aleksandrovska", "tree", 42.4955, 27.4699, "Three lindens for shade."],
    [founder.id, "Lavender patch", "flower", 42.5012, 27.4662, "Lavender to bring in the bees."],
    [founder.id, "Plane tree near the lake", "tree", 42.5074, 27.4585, "Big canopy potential."],
    [maria.id, "Rose bed in Izgrev", "flower", 42.5101, 27.4523, "Pink and red roses."],
    [maria.id, "Sunflowers by the school", "flower", 42.4889, 27.4731, "The kids helped plant these."],
    [maria.id, "Tulip border", "flower", 42.4972, 27.4778, "Spring colour."],
    [georgi.id, "Grass strip restoration", "grass", 42.5039, 27.4640, "Reseeded a bare patch."],
    [georgi.id, "Maple sapling", "tree", 42.4910, 27.4668, "Hoping it survives the summer."],
    [georgi.id, "Wildflower meadow start", "flower", 42.5125, 27.4601, "Mixed native seeds."],
  ];
  const createdPosts = [];
  for (const [uid, title, type, lat, lng, desc] of posts) {
    createdPosts.push(await createSeedPost(uid, title, type, lat, lng, desc));
  }

  // A few endorsements so contribution scores and feed counts look alive.
  const endorse = async (postId: string, endorserId: string, ownerId: string) => {
    await prisma.endorsement.create({
      data: { postId, endorserId, endorsedUserId: ownerId, hexesGranted: 1 },
    });
  };
  await endorse(createdPosts[0].id, maria.id, founder.id);
  await endorse(createdPosts[0].id, georgi.id, founder.id);
  await endorse(createdPosts[4].id, founder.id, maria.id);
  await endorse(createdPosts[7].id, founder.id, georgi.id);
  await endorse(createdPosts[7].id, maria.id, georgi.id);

  // Organization: founder + two members, all hexes merged into the territory.
  const org = await prisma.organization.create({
    data: {
      name: "Burgas Green Guild",
      description: "A community of Burgas residents reforesting the city block by block.",
      leaderId: founder.id,
      distributionMode: "contribution-weighted",
      members: {
        create: [
          { userId: founder.id, role: "leader" },
          { userId: maria.id, role: "member" },
          { userId: georgi.id, role: "member" },
        ],
      },
    },
  });
  await prisma.hex.updateMany({
    where: { userId: { in: [founder.id, maria.id, georgi.id] } },
    data: { organizationId: org.id },
  });
  await prisma.userAchievement.create({
    data: {
      userId: founder.id,
      achievementId: (await prisma.achievement.findUnique({ where: { slug: "org-founder" } }))!.id,
    },
  }).catch(() => {});

  // A completed marketplace task with a 5-star review, so the worker directory
  // and star ratings have real data.
  const completedTask = await prisma.marketplaceTask.create({
    data: {
      posterId: founder.id,
      title: "Water the Sea Garden lindens for a week",
      description: "Daily watering of the three young lindens while I'm away.",
      budgetGP: 60,
      status: "completed",
      assignedWorkerId: maria.id,
    },
  });
  await prisma.taskApplication.create({
    data: { taskId: completedTask.id, applicantId: maria.id, proposedGP: 60, status: "accepted" },
  });
  await prisma.review.create({
    data: {
      taskId: completedTask.id,
      reviewerId: founder.id,
      revieweeId: maria.id,
      rating: 5,
      comment: "Maria did a fantastic job — every tree thriving. Highly recommend!",
    },
  });
  await prisma.user.update({ where: { id: maria.id }, data: { averageRating: 5 } });

  // An open task so the marketplace isn't empty.
  await prisma.marketplaceTask.create({
    data: {
      posterId: founder.id,
      title: "Help plant 10 saplings in Izgrev park",
      description: "Looking for a couple of helpers for a Saturday planting session. Tools provided.",
      budgetGP: 120,
      status: "open",
    },
  });
}

export async function runSeeds() {
  await seedAchievements();
  await seedVouchers();
  await seedDemoContent();
}
