// prisma/seed.js
// Run with: npx prisma db seed
//
// 1. Ensures all admin_roles rows exist (super_admin, admin, support).
//    Safe to re-run — uses upsert, so existing rows are left untouched.
// 2. Creates the very first super admin so you have someone to log in as.
//    (There's intentionally no public "register admin" endpoint — every
//    admin after this one should be created by an existing super admin
//    via POST /api/admins.)

const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

// Single source of truth for what admin roles exist in this system.
// Add new roles here — not via manual SQL — so every environment
// (local, staging, prod, a teammate's fresh clone) stays in sync.
const ADMIN_ROLE_DEFS = [
  { code: "super_admin", displayName: "Super Admin" },
  { code: "admin", displayName: "Admin" },
  { code: "support", displayName: "Support" },
];

async function seedAdminRoles() {
  for (const role of ADMIN_ROLE_DEFS) {
    await prisma.adminRole.upsert({
      where: { code: role.code },
      update: { displayName: role.displayName },
      create: role,
    });
  }
  console.log(
    `✅ Admin roles ensured: ${ADMIN_ROLE_DEFS.map((r) => r.code).join(", ")}`
  );
}

async function seedSuperAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL || "admin@lokalfrnd.com";
  const password = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";

  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) {
    console.log(`Super admin already exists: ${email} (skipping)`);
    return;
  }

  const role = await prisma.adminRole.findUnique({ where: { code: "super_admin" } });
  if (!role) {
    // Should never happen since seedAdminRoles() runs first, but fail loudly if it does.
    throw new Error("super_admin role not found — seedAdminRoles() must run before seedSuperAdmin()");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  await prisma.admin.create({
    data: {
      fullName: "Super Admin",
      email,
      passwordHash,
      roleId: role.id,
      status: "active",
    },
  });

  console.log("✅ Super admin created — you can log in with:");
  console.log(`   email:    ${email}`);
  console.log(`   password: ${password}`);
  console.log("   Change this password after your first login.");
}

async function main() {
  await seedAdminRoles();
  await seedSuperAdmin();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());