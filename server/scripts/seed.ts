import { admin } from "../src/supabase.js";
import { createSampleReceipts } from "../src/services/sampleReceipts.js";

async function runSeed(): Promise<void> {
  console.log("Seeding demo user and initial sample receipts...");

  let demoUserId: string | null = null;

  // 1. Create or find the demo user
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: "demo@verishield.dev",
    password: "Demo@12345",
    email_confirm: true,
    user_metadata: { name: "Demo User" },
  });

  if (created?.user) {
    demoUserId = created.user.id;
    console.log(`Demo user created: demo@verishield.dev (id: ${demoUserId})`);
  } else if (createErr?.message?.includes("already") || createErr?.code === "email_exists") {
    console.log("Demo user already exists. Retrieving user id...");
    const { data: usersData, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
    if (listErr) {
      throw new Error(`Failed to list users: ${listErr.message}`);
    }
    const found = usersData.users.find((u) => u.email === "demo@verishield.dev");
    if (!found) {
      throw new Error("Demo user reported already existing, but not found in user list.");
    }
    demoUserId = found.id;
    console.log(`Found existing demo user: demo@verishield.dev (id: ${demoUserId})`);
  } else {
    throw new Error(`Unexpected error creating demo user: ${createErr?.message || "unknown"}`);
  }

  // 2. Check if the user already has receipts
  const { count, error: countErr } = await admin
    .from("receipts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", demoUserId);

  if (countErr) {
    throw new Error(`Failed to check existing receipts for demo user: ${countErr.message}`);
  }

  if (count !== null && count > 0) {
    console.log(`Demo user already has ${count} receipts. Skipping sample receipt creation.`);
  } else {
    console.log("Creating 3 sample hash-chained receipts for demo user...");
    await createSampleReceipts(demoUserId);
    console.log("Sample receipts created successfully.");
  }

  console.log("Seed complete.");
}

runSeed().catch((err) => {
  console.error("Seed script failed:", err);
  process.exit(1);
});

