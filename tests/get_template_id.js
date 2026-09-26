// Simple script to get the template ID for 'elegant-brown' using Prisma
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    const template = await prisma.template.findFirst({
      where: { slug: 'elegant-brown' }
    });
    
    if (template) {
      console.log(template.id);
    } else {
      console.error('Template not found');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
