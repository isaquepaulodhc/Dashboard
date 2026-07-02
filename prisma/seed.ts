import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db"
});

const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.refreshLog.create({
    data: {
      source: "seed",
      success: true,
      message: "Banco SQLite preparado para historico, snapshots e logs do dashboard."
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
