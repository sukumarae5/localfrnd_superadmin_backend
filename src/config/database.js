
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});


async function connectDB() {
  try {
    await prisma.$connect();
    console.log("✅ PostgreSQL connected successfully");
  } catch (error) {
    console.error("❌ Failed to connect to the database:", error.message);
    process.exit(1);
  }
}

async function disconnectDB() {
  await prisma.$disconnect();
  console.log("Database connection closed");
}

module.exports = { prisma, connectDB, disconnectDB };