// src/modules/rj/performance/performance.constants.js

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// Grade thresholds for the perf score (0-100) — used to compute the
// "GRADE A+" badge shown in the RJ Deep Dive panel.
function gradeFromScore(score) {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B+";
  if (score >= 60) return "B";
  if (score >= 50) return "C";
  return "D";
}

function performanceLabel(score) {
  if (score >= 85) return "Excellent Performance";
  if (score >= 70) return "Good Performance";
  if (score >= 50) return "Average Performance";
  return "Needs Improvement";
}

module.exports = { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, gradeFromScore, performanceLabel };