import "dotenv/config";
import { PrismaClient } from "../apps/api/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const userCount = await prisma.user.count();
  const workspaceCount = await prisma.workspace.count();
  const brandCount = await prisma.brand.count();

  console.log(`✅ Connected — ${userCount} users, ${workspaceCount} workspaces, ${brandCount} brands`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ Failed:", e);
  process.exit(1);
});
