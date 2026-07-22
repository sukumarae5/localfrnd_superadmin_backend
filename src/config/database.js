
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  // Uncomment while debugging to see every generated SQL query in the terminal:
  // log: ["query", "warn", "error"],
});

// Call once at server startup — fails fast with a clear message if the
// database is unreachable, instead of the first API request silently erroring.
async function connectDB() {
  try {
    await prisma.$connect();
    console.log("✅ PostgreSQL connected successfully");
  } catch (error) {
    console.error("❌ Failed to connect to the database:", error.message);
    process.exit(1);
  }
}

// Call on graceful shutdown so connections close cleanly.
async function disconnectDB() {
  await prisma.$disconnect();
  console.log("Database connection closed");
}

module.exports = { prisma, connectDB, disconnectDB };