const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Setting up test data...');

  // Create test user (owner)
  const hashedPassword = await bcrypt.hash('User@12345', 10);
  
  let user = await prisma.user.findUnique({
    where: { email: 'user@example.com' }
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        id: 'test-user-001',
        email: 'user@example.com',
        password: hashedPassword,
        name: 'Test User',
        role: 'USER',
      }
    });
    console.log('✅ Created test user: user@example.com');
  } else {
    console.log('✅ Test user already exists: user@example.com');
  }

  // Update admin password
  const adminHashedPassword = await bcrypt.hash('Admin@12345', 10);
  await prisma.user.updateMany({
    where: { email: 'admin@example.com' },
    data: { password: adminHashedPassword }
  });
  console.log('✅ Updated admin password');

  // Get or create a template
  let template = await prisma.template.findFirst();
  if (!template) {
    console.log('❌ No template found, cannot create invitation');
    return;
  }

  // Create invitation
  let invitation = await prisma.invitation.findUnique({
    where: { id: 'cmttsv9yu0001facvgz54fzn2' }
  });

  if (!invitation) {
    invitation = await prisma.invitation.create({
      data: {
        id: 'cmttsv9yu0001facvgz54fzn2',
        userId: user.id,
        templateId: template.id,
        slug: 'ahmad-siti-test01',
        brideName: 'Siti',
        groomName: 'Ahmad',
        status: 'PUBLISHED',
        weddingDate: new Date('2025-12-31'),
      }
    });
    console.log('✅ Created invitation: ahmad-siti-test01');
  } else {
    console.log('✅ Invitation already exists: ahmad-siti-test01');
  }

  // Get default category
  const defaultCategory = await prisma.guestCategory.findFirst({
    where: { invitationId: null }
  });

  // Create guests
  const guests = [
    {
      id: 'cmttsv9yx0003facvvvs874ph',
      name: 'Budi Santoso',
      token: 'budi-tok-01',
      guestType: 'INDIVIDUAL',
      quota: 1,
    },
    {
      id: 'test-guest-dewi',
      name: 'Keluarga Dewi',
      token: 'dewi-tok-02',
      guestType: 'GROUP',
      quota: 5,
    },
    {
      id: 'test-guest-rina',
      name: 'Rina Walkin',
      token: 'rina-tok-03',
      guestType: 'INDIVIDUAL',
      quota: 1,
    }
  ];

  for (const guestData of guests) {
    const existing = await prisma.guest.findUnique({
      where: { id: guestData.id }
    });

    if (!existing) {
      await prisma.guest.create({
        data: {
          ...guestData,
          invitationId: invitation.id,
          categoryId: defaultCategory?.id || null,
        }
      });
      console.log(`✅ Created guest: ${guestData.name}`);
    } else {
      console.log(`✅ Guest already exists: ${guestData.name}`);
    }
  }

  console.log('✅ Test data setup complete');
}

main()
  .catch((e) => {
    console.error('❌ Error setting up test data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
