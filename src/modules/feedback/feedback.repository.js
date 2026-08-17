const { prisma } = require("../../config/database");

function buildWhere({ search, type, status, priority, category, dateFrom, dateTo }) {
  const where = {};
  if (type) where.type = type;
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (category) where.category = category;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = dateFrom;
    if (dateTo) where.createdAt.lte = dateTo;
  }
  if (search) {
    where.OR = [
      { ticketCode: { contains: search, mode: "insensitive" } },
      { subject: { contains: search, mode: "insensitive" } },
      { user: { fullName: { contains: search, mode: "insensitive" } } },
    ];
  }
  return where;
}

async function listFeedback({ page, limit, ...filters }) {
  const where = buildWhere(filters);
  const skip = (page - 1) * limit;

  const [items, total] = await prisma.$transaction([
    prisma.userFeedback.findMany({
      where, skip, take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { fullName: true, displayCode: true, avatarUrl: true } },
        assignedTo: { select: { fullName: true } },
      },
    }),
    prisma.userFeedback.count({ where }),
  ]);

  return { items, total };
}

async function getStats() {
  const [total, open, resolved, ratingAgg, features, bugs, complaints] = await prisma.$transaction([
    prisma.userFeedback.count(),
    prisma.userFeedback.count({ where: { status: { in: ["open", "in_progress"] } } }),
    prisma.userFeedback.count({ where: { status: "resolved" } }),
    prisma.userFeedback.aggregate({ _avg: { rating: true } }),
    prisma.userFeedback.count({ where: { type: "feature" } }),
    prisma.userFeedback.count({ where: { type: "bug" } }),
    prisma.userFeedback.count({ where: { type: "complaint" } }),
  ]);

  // Avg response time = avg(resolvedAt - createdAt) in hours, for resolved tickets
  const resolvedItems = await prisma.userFeedback.findMany({
    where: { resolvedAt: { not: null } },
    select: { createdAt: true, resolvedAt: true },
  });
  const avgResponseHours = resolvedItems.length
    ? (resolvedItems.reduce((sum, f) => sum + (f.resolvedAt - f.createdAt) / 3600000, 0) / resolvedItems.length).toFixed(1)
    : 0;

  return {
    total,
    openTasks: open,
    resolved,
    avgRating: ratingAgg._avg.rating ? Number(ratingAgg._avg.rating.toFixed(1)) : 0,
    features,
    bugs,
    complaints,
    avgResponseHours: Number(avgResponseHours),
  };
}

// Category breakdown for the "Feedback by Category" chart
function getCategoryBreakdown() {
  return prisma.userFeedback.groupBy({
    by: ["category"],
    _count: { category: true },
    where: { category: { not: null } },
  });
}

function findById(id) {
  return prisma.userFeedback.findUnique({
    where: { id: BigInt(id) },
    include: {
      user: { select: { fullName: true, displayCode: true, avatarUrl: true, email: true } },
      assignedTo: { select: { fullName: true } },
    },
  });
}

function create(data) {
  return prisma.userFeedback.create({ data });
}

function update(id, data) {
  return prisma.userFeedback.update({
    where: { id: BigInt(id) },
    data,
    include: { user: { select: { fullName: true, displayCode: true } }, assignedTo: { select: { fullName: true } } },
  });
}

module.exports = { listFeedback, getStats, getCategoryBreakdown, findById, create, update };