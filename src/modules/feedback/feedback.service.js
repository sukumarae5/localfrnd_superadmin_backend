const ApiError = require("../../utils/apiError.util");
const { HTTP_STATUS } = require("../../constants");
const { generateTicketCode } = require("./feedback.constants");
const repo = require("./feedback.repository");

function serialize(f) {
  return {
    id: f.id.toString(),
    ticketCode: f.ticketCode,
    user: { fullName: f.user.fullName, displayCode: f.user.displayCode, avatarUrl: f.user.avatarUrl },
    type: f.type,
    subject: f.subject,
    message: f.message,
    category: f.category,
    rating: f.rating,
    priority: f.priority,
    status: f.status,
    assignedToName: f.assignedTo?.fullName || null,
    resolvedAt: f.resolvedAt,
    resolutionNote: f.resolutionNote,
    createdAt: f.createdAt,
  };
}

async function listFeedback(query) {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 20, 100);

  const [{ items, total }, stats, categoryBreakdown] = await Promise.all([
    repo.listFeedback({
      page, limit,
      search: query.search,
      type: query.type,
      status: query.status,
      priority: query.priority,
      category: query.category,
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
    }),
    repo.getStats(),
    repo.getCategoryBreakdown(),
  ]);

  return {
    items: items.map(serialize),
    stats,
    categoryBreakdown: categoryBreakdown.map((c) => ({ category: c.category, count: c._count.category })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getById(id) {
  const item = await repo.findById(id);
  if (!item) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Feedback not found");
  return serialize(item);
}

async function createFeedback({ userId, type, subject, message, category, rating }) {
  const created = await repo.create({
    ticketCode: generateTicketCode(),
    userId: BigInt(userId),
    type, subject, message,
    category: category || null,
    rating: rating || null,
  });
  return getById(created.id);
}

async function updateStatus(id, { status, resolutionNote }) {
  const existing = await repo.findById(id);
  if (!existing) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Feedback not found");

  const data = { status };
  if (status === "resolved") {
    data.resolvedAt = new Date();
    data.resolutionNote = resolutionNote || existing.resolutionNote;
  }

  await repo.update(id, data);
  return getById(id);
}

async function assign(id, assignedToId) {
  const existing = await repo.findById(id);
  if (!existing) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Feedback not found");

  await repo.update(id, { assignedToId: BigInt(assignedToId), status: existing.status === "open" ? "in_progress" : existing.status });
  return getById(id);
}

async function setPriority(id, priority) {
  const existing = await repo.findById(id);
  if (!existing) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Feedback not found");

  await repo.update(id, { priority });
  return getById(id);
}

module.exports = { listFeedback, getById, createFeedback, updateStatus, assign, setPriority };