// Database seed script for development and testing

import { PrismaClient } from '@prisma/client';
import { hash } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create a demo account for testing
  const demoAccount = await prisma.account.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      id: 'demo-account-id',
      email: 'demo@example.com',
      name: 'Demo User',
      oauthState: null,
    },
  });

  console.log('✅ Demo account created:', demoAccount.email);

  // Create some sample Xero connections (for testing)
  const demoConnection = await prisma.xeroConnection.upsert({
    where: { tenantId: 'demo-tenant-id' },
    update: {},
    create: {
      tenantId: 'demo-tenant-id',
      tenantName: 'Demo Company',
      tenantType: 'ORGANISATION',
      accountId: demoAccount.id,
    },
  });

  console.log('✅ Demo Xero connection created:', demoConnection.tenantName);

  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });