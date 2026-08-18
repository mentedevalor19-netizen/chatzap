import { FunnelStepType, PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@crm.local').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin123';
  const adminName = process.env.ADMIN_NAME ?? 'Administrador';
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID ?? 'demo-org';

  const organization = await prisma.organization.upsert({
    where: { id: organizationId },
    update: {},
    create: {
      id: organizationId,
      name: 'WhatsApp Cloud CRM',
    },
  });

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash, organizationId: organization.id, name: adminName, role: UserRole.ADMIN },
    create: {
      email: adminEmail,
      name: adminName,
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

  const existingFunnel = await prisma.funnel.findFirst({
    where: { organizationId: organization.id },
    select: { id: true },
  });

  if (!existingFunnel) {
    const defaultMessages = [
      process.env.FUNNEL_MESSAGE_1 ??
        'Ola! Recebemos sua mensagem. Para agilizar, responda com uma opcao: 1 - Comercial, 2 - Suporte, 3 - Financeiro.',
      process.env.FUNNEL_MESSAGE_2 ??
        'Perfeito. Ja estou chamando um especialista para continuar seu atendimento por aqui.',
    ]
      .map((message) => message.replace(/\\n/g, '\n').trim())
      .filter(Boolean);

    await prisma.funnel.create({
      data: {
        organizationId: organization.id,
        name: 'Funil inicial',
        isActive: true,
        handoffMessage: process.env.FUNNEL_HANDOFF_MESSAGE ?? 'Atendimento humano iniciado.',
        steps: {
          create: defaultMessages.map((message, index) => ({
            organizationId: organization.id,
            position: index + 1,
            type: FunnelStepType.TEXT,
            body: message,
            waitForReply: index === 0,
          })),
        },
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
