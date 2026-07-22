const express = require("express");
const { prisma } = require("../../config/database");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, message: "Database connection is healthy" });
  } catch (err) {
    next(err); 
  }
});

module.exports = router;