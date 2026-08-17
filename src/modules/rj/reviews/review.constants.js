// src/modules/rj/review/review.constants.js

const REVIEW_SENTIMENTS = ["positive", "neutral", "negative"];
const REVIEW_STATUSES = ["published", "flagged", "removed"];

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// Very small heuristic fallback for when a review is created without an
// explicit sentiment (e.g. from a webhook that doesn't run its own NLP).
// Swap this for a real sentiment-analysis call if you have one available —
// this only exists so the field is never left null.
function sentimentFromRating(rating) {
  if (rating >= 4) return "positive";
  if (rating === 3) return "neutral";
  return "negative";
}

module.exports = {
  REVIEW_SENTIMENTS,
  REVIEW_STATUSES,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  sentimentFromRating,
};