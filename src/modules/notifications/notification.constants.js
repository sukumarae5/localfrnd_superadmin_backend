// src/modules/notifications/notifications.constants.js
// Mirrors prisma/models/social.prisma's NotificationType enum.
const NOTIFICATION_TYPES = {
  FRIEND_REQUEST: "friend_request",
  FRIEND_ACCEPT: "friend_accept",
  MESSAGE: "message",
  CALL: "call",
  MISSED_CALL: "missed_call",
};

// How long a duplicate (same sender, receiver, type) is suppressed for —
// stops a doubled network request or a socket retry from creating two rows
// for the same event. Mirrors the reference app's DEDUP_SECONDS.
const DEDUP_SECONDS = 30;

module.exports = { NOTIFICATION_TYPES, DEDUP_SECONDS };