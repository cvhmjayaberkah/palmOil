import { PrismaClient } from "@prisma/client";
import { seedUsers } from "./seeds/seedUsers";

const prisma = new PrismaClient();

async function main() {
  console.log("🗑️ Clearing existing users...");

  // Clear only users table
  await prisma.users.deleteMany({});

  console.log("✅ Users table cleared.");

  console.log("👥 Creating users...");

  // Seed users
  const users = await seedUsers(prisma);

  console.log(`✅ Created ${users.length} users successfully!`);

  // Display created users
  users.forEach((user) => {
    console.log(`📧 ${user.email} - ${user.name} (${user.role})`);
  });
}

main()
  .catch((e) => {
    console.error("❌ Error seeding users:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
