const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();
(async () => {
  const role = await prisma.role.findUnique({ where: { name: "USER" } });
  const hash = await bcrypt.hash("User@12345", 10);
  const active = await prisma.user.upsert({
    where: { email: "user@example.com" },
    update: { status: "ACTIVE", roleId: role.id, password: hash },
    create: { email: "user@example.com", password: hash, name: "Test User", roleId: role.id, status: "ACTIVE" },
  });
  const pending = await prisma.user.upsert({
    where: { email: "pending@example.com" },
    update: { status: "PENDING", roleId: role.id, password: hash },
    create: { email: "pending@example.com", password: hash, name: "Pending User", roleId: role.id, status: "PENDING" },
  });
  console.log("active", active.id, "pending", pending.id);
  await prisma.$disconnect();
})();
