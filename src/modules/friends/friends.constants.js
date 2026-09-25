// src/modules/friends/friends.constants.js
// Mirrors prisma/models/social.prisma's FriendshipStatus enum.
const FRIENDSHIP_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
};

module.exports = { FRIENDSHIP_STATUS };