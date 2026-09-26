// Seed script: creates roles, admin user, sample template, default guest categories
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding roles...");
  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: { name: "ADMIN" },
  });
  const userRole = await prisma.role.upsert({
    where: { name: "USER" },
    update: {},
    create: { name: "USER" },
  });

  console.log("Seeding default admin user...");
  const hash = await bcrypt.hash("Admin@12345", 10);
  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      password: hash,
      name: "Platform Admin",
      roleId: adminRole.id,
      status: "ACTIVE",
    },
  });

  console.log("Seeding settings...");
  await prisma.setting.upsert({
    where: { key: "website_name" },
    update: {},
    create: { key: "website_name", value: "Wedding Invitation Platform" },
  });
  await prisma.setting.upsert({
    where: { key: "logo_url" },
    update: {},
    create: { key: "logo_url", value: "" },
  });
  await prisma.setting.upsert({
    where: { key: "default_theme" },
    update: {},
    create: { key: "default_theme", value: "elegant-brown" },
  });

  console.log("Seeding default Guest Categories with priorities...");
  const defaults = [
    { name: "VIP", order: 10, priority: 1 },
    { name: "Family", order: 20, priority: 2 },
    { name: "Partner", order: 30, priority: 3 },
    { name: "Influencer", order: 40, priority: 4 },
    { name: "Friend", order: 50, priority: 5 },
    { name: "Colleague", order: 60, priority: 6 },
    { name: "General", order: 70, priority: 7 },
    { name: "Other", order: 99, priority: 9 },
  ];

  for (const c of defaults) {
    const existingCategory = await prisma.guestCategory.findFirst({
      where: {
        name: c.name,
        invitationId: null,
      },
    });

    if (existingCategory) {
      await prisma.guestCategory.update({
        where: { id: existingCategory.id },
        data: {
          order: c.order,
          priority: c.priority,
          enabled: true,
        },
      });
    } else {
      await prisma.guestCategory.create({
        data: {
          ...c,
          enabled: true,
        },
      });
    }
  }

  console.log("Ensuring built-in sample template...");
  const storageRoot =
    process.env.STORAGE_ROOT || "/app/digital-invitation-platform/storage";
  const sampleSlug = "elegant-brown";
  const sampleDir = path.join(storageRoot, "templates", sampleSlug);
  if (
    fs.existsSync(path.join(sampleDir, "index.html")) &&
    fs.existsSync(path.join(sampleDir, "manifest.json"))
  ) {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(sampleDir, "manifest.json"), "utf8"),
    );
    await prisma.template.upsert({
      where: { slug: sampleSlug },
      update: {
        name: manifest.name || "Elegant Brown",
        manifest,
        enabled: true,
        folderPath: `templates/${sampleSlug}`,
        previewImage: fs.existsSync(path.join(sampleDir, "preview.jpg"))
          ? `templates/${sampleSlug}/preview.jpg`
          : null,
      },
      create: {
        name: manifest.name || "Elegant Brown",
        slug: sampleSlug,
        description:
          manifest.description || "A luxurious elegant wedding template",
        folderPath: `templates/${sampleSlug}`,
        previewImage: fs.existsSync(path.join(sampleDir, "preview.jpg"))
          ? `templates/${sampleSlug}/preview.jpg`
          : null,
        manifest,
        enabled: true,
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
