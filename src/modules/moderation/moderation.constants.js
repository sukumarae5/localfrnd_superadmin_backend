const BLOCK_TYPES = ["temporary", "permanent"];
const APPEAL_STATUSES = ["pending", "accepted", "rejected"];
const BLOCKED_BY_TYPES = ["admin", "system"];

// Statuses that count as "currently blocked" for this screen —
// mirrors the two red/purple states shown in Figma (Suspended / Permanent).
const BLOCKED_STATUSES = ["suspended", "blocked"];

module.exports = {
  BLOCK_TYPES,
  APPEAL_STATUSES,
  BLOCKED_BY_TYPES,
  BLOCKED_STATUSES,
};