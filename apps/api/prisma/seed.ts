import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.js"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const workspace = await prisma.workspace.upsert({
    where: { slug: "default-workspace" },
    update: {},
    create: {
      name: "Default Workspace",
      slug: "default-workspace",
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Admin User",
    },
  });

  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
    update: {},
    create: {
      workspaceId: workspace.id,
      userId: user.id,
      role: "OWNER",
    },
  });

  const brand = await prisma.brand.upsert({
    where: { id: "seed-brand-default" },
    update: {},
    create: {
      id: "seed-brand-default",
      workspaceId: workspace.id,
      name: "Default Brand",
      description: "Auto-seeded brand for development",
    },
  });

  console.log("Seeded:", { workspace: workspace.id, user: user.id, brand: brand.id });
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
