import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const organization = await prisma.organization.upsert({
    where: { id: 'demo-org' },
    update: {},
    create: {
      id: 'demo-org',
      name: 'WhatsApp Cloud CRM',
    },
  });

  const passwordHash = await bcrypt.hash('admin123', 12);

  await prisma.user.upsert({
    where: { email: 'admin@crm.local' },
    update: { passwordHash, organizationId: organization.id },
    create: {
      email: 'admin@crm.local',
      name: 'Administrador',
      passwordHash,
      role: UserRole.ADMIN,
      organizationId: organization.id,
    },
  });

  const tagDefinitions = [
    { name: 'Novo lead', color: '#2f80ed' },
    { name: 'VIP', color: '#16a34a' },
    { name: 'Financeiro', color: '#f97316' },
  ];

  for (const tag of tagDefinitions) {
    await prisma.tag.upsert({
      where: {
        organizationId_name: {
          organizationId: organization.id,
          name: tag.name,
        },
      },
      update: tag,
      create: {
        ...tag,
        organizationId: organization.id,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
