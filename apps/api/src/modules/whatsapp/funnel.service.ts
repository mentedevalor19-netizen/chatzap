import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Contact,
  Conversation,
  ConversationFunnelRun,
  Funnel,
  FunnelRunStatus,
  FunnelStep,
  FunnelStepType,
  MessageStatus,
  MessageType,
  Prisma,
  UserRole,
} from '@prisma/client';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { UpsertActiveFunnelDto, UpsertFunnelStepDto } from './dto/upsert-funnel.dto';
import { WhatsappService } from './whatsapp.service';

type FunnelConversation = Conversation & { contact: Contact };
type FunnelWithSteps = Funnel & { steps: FunnelStep[] };
type OpenFunnelRun = ConversationFunnelRun & { funnel: FunnelWithSteps };

@Injectable()
export class FunnelService {
  private readonly logger = new Logger(FunnelService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsappService,
    private readonly realtime: RealtimeGateway,
    private readonly config: ConfigService,
  ) {}

  async findActiveForUser(user: AuthenticatedUser) {
    this.assertAdmin(user);
    const funnel = await this.getEditableFunnel(user.organizationId);
    return this.serializeFunnel(funnel);
  }

  async upsertActiveForUser(user: AuthenticatedUser, dto: UpsertActiveFunnelDto) {
    this.assertAdmin(user);
    this.validateFunnelPayload(dto);

    const funnel = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.funnel.findFirst({
        where: { organizationId: user.organizationId, isActive: true },
        orderBy: { updatedAt: 'desc' },
      });

      if (dto.isActive) {
        await tx.funnel.updateMany({
          where: { organizationId: user.organizationId },
          data: { isActive: false },
        });
      }

      const savedFunnel = existing
        ? await tx.funnel.update({
            where: { id: existing.id },
            data: {
              name: dto.name.trim(),
              isActive: dto.isActive,
              handoffMessage: this.optionalString(dto.handoffMessage),
            },
          })
        : await tx.funnel.create({
            data: {
              organizationId: user.organizationId,
              name: dto.name.trim(),
              isActive: dto.isActive,
              handoffMessage: this.optionalString(dto.handoffMessage),
            },
          });

      await tx.funnelStep.deleteMany({
        where: { funnelId: savedFunnel.id },
      });

      if (dto.steps.length) {
        await tx.funnelStep.createMany({
          data: dto.steps.map((step, index) => ({
            organizationId: user.organizationId,
            funnelId: savedFunnel.id,
            position: index + 1,
            type: step.type,
            body: this.optionalString(step.body),
            mediaId: this.optionalString(step.mediaId),
            mediaUrl: this.optionalString(step.mediaUrl),
            mimeType: this.optionalString(step.mimeType),
            fileName: this.optionalString(step.fileName),
            caption: this.optionalString(step.caption),
            delaySeconds: this.normalizeDelay(step.delaySeconds),
            waitForReply: step.waitForReply,
          })),
        });
      }

      return tx.funnel.findUniqueOrThrow({
        where: { id: savedFunnel.id },
        include: {
          steps: {
            orderBy: { position: 'asc' },
          },
        },
      });
    });

    return this.serializeFunnel(funnel);
  }

  async startForConversation(user: AuthenticatedUser, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        organizationId: user.organizationId,
      },
      include: { contact: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const { run, funnel } = await this.createRun(conversation);

    void this.processRun(run, conversation, funnel, user.id).catch((error) => {
      this.logger.error(
        `Failed to run manual funnel for conversation ${conversationId}`,
        error instanceof Error ? error.stack : undefined,
      );
    });

    return { started: true, runId: run.id };
  }

  async startAfterFirstInbound(conversationId: string) {
    if (!this.enabled) {
      return;
    }

    const openRun = await this.findOpenRun(conversationId);

    if (openRun) {
      if (!openRun.awaitingReply) {
        return;
      }

      const conversation = await this.findConversation(openRun.organizationId, conversationId);
      if (!conversation) {
        return;
      }

      await this.continueRun(openRun, conversation).catch((error) => {
        this.logger.error(
          `Failed to continue funnel for conversation ${conversationId}`,
          error instanceof Error ? error.stack : undefined,
        );
      });
      return;
    }

    const inboundCount = await this.prisma.message.count({
      where: {
        conversationId,
        direction: 'INBOUND',
      },
    });
    const outboundCount = await this.prisma.message.count({
      where: {
        conversationId,
        direction: 'OUTBOUND',
      },
    });

    if (inboundCount !== 1 || outboundCount > 0) {
      return;
    }

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { contact: true },
    });

    if (!conversation) {
      return;
    }

    await this.startNewRun(conversation).catch((error) => {
      this.logger.error(
        `Failed to start funnel for conversation ${conversationId}`,
        error instanceof Error ? error.stack : undefined,
      );
    });
  }

  private async startNewRun(conversation: FunnelConversation, senderUserId?: string) {
    const { run, funnel } = await this.createRun(conversation);
    return this.processRun(run, conversation, funnel, senderUserId);
  }

  private async createRun(conversation: FunnelConversation) {
    const funnel = await this.findActiveFunnel(conversation.organizationId);

    if (!funnel) {
      throw new BadRequestException('No active funnel configured');
    }

    await this.prisma.conversationFunnelRun.updateMany({
      where: {
        conversationId: conversation.id,
        status: { in: [FunnelRunStatus.RUNNING, FunnelRunStatus.WAITING_FOR_REPLY] },
      },
      data: {
        status: FunnelRunStatus.CANCELLED,
        awaitingReply: false,
      },
    });

    const run = await this.prisma.conversationFunnelRun.create({
      data: {
        organizationId: conversation.organizationId,
        conversationId: conversation.id,
        funnelId: funnel.id,
        status: FunnelRunStatus.RUNNING,
        awaitingReply: false,
        nextStepPosition: 1,
      },
    });

    return { run, funnel };
  }

  private async continueRun(run: OpenFunnelRun, conversation: FunnelConversation) {
    await this.prisma.conversationFunnelRun.update({
      where: { id: run.id },
      data: {
        status: FunnelRunStatus.RUNNING,
        awaitingReply: false,
      },
    });

    return this.processRun(run, conversation, run.funnel);
  }

  private async processRun(
    run: ConversationFunnelRun,
    conversation: FunnelConversation,
    funnel: FunnelWithSteps,
    senderUserId?: string,
  ) {
    const pendingSteps = funnel.steps.filter((step) => step.position >= run.nextStepPosition);
    let sent = 0;

    if (!pendingSteps.length) {
      const assignedToId = await this.completeRun(run.id, conversation, funnel, senderUserId);
      return { sent, assignedToId, awaitingReply: false };
    }

    for (const step of pendingSteps) {
      const shouldContinue = await this.waitBeforeStep({
        organizationId: conversation.organizationId,
        conversationId: conversation.id,
        runId: run.id,
        delaySeconds: step.delaySeconds,
      });

      if (!shouldContinue) {
        return { sent, assignedToId: conversation.assignedToId, awaitingReply: false };
      }

      const savedMessage = await this.sendAndPersistStep({
        organizationId: conversation.organizationId,
        conversationId: conversation.id,
        contactId: conversation.contactId,
        to: conversation.contact.waId,
        step,
        senderUserId,
      });

      if (savedMessage.status === MessageStatus.SENT) {
        sent += 1;
      }

      if (step.waitForReply) {
        await this.prisma.conversationFunnelRun.update({
          where: { id: run.id },
          data: {
            status: FunnelRunStatus.WAITING_FOR_REPLY,
            awaitingReply: true,
            nextStepPosition: step.position + 1,
          },
        });
        await this.emitConversation(conversation.id);
        return { sent, assignedToId: conversation.assignedToId, awaitingReply: true };
      }
    }

    const assignedToId = await this.completeRun(run.id, conversation, funnel, senderUserId);
    return { sent, assignedToId, awaitingReply: false };
  }

  private async completeRun(
    runId: string,
    conversation: FunnelConversation,
    funnel: FunnelWithSteps,
    senderUserId?: string,
  ) {
    const assignedToId = await this.assignHuman(conversation);
    await this.createHandoffMessage(conversation, senderUserId, assignedToId, funnel.handoffMessage);
    await this.prisma.conversationFunnelRun.update({
      where: { id: runId },
      data: {
        status: FunnelRunStatus.COMPLETED,
        awaitingReply: false,
        completedAt: new Date(),
      },
    });
    await this.emitConversation(conversation.id);
    return assignedToId;
  }

  private async sendAndPersistStep(options: {
    organizationId: string;
    conversationId: string;
    contactId: string;
    to: string;
    step: FunnelStep;
    senderUserId?: string;
  }) {
    const draft = await this.prisma.message.create({
      data: {
        organization: { connect: { id: options.organizationId } },
        conversation: { connect: { id: options.conversationId } },
        contact: { connect: { id: options.contactId } },
        ...(options.senderUserId ? { senderUser: { connect: { id: options.senderUserId } } } : {}),
        direction: 'OUTBOUND',
        type: this.toMessageType(options.step.type),
        status: 'QUEUED',
        body: options.step.type === FunnelStepType.TEXT ? options.step.body : null,
        mediaId: options.step.mediaId,
        mediaUrl: options.step.mediaUrl,
        mimeType: options.step.mimeType,
        fileName: options.step.fileName,
        caption:
          options.step.type === FunnelStepType.TEXT
            ? null
            : options.step.caption ?? options.step.body,
        rawPayload: {
          automation: 'FUNNEL',
          funnelId: options.step.funnelId,
          stepId: options.step.id,
          step: options.step.position,
          delaySeconds: options.step.delaySeconds,
        } as Prisma.InputJsonValue,
      },
    });

    let savedMessage = draft;

    try {
      const waMessageId = await this.sendStepThroughWhatsapp(options.to, options.step);
      savedMessage = await this.prisma.message.update({
        where: { id: draft.id },
        data: {
          waMessageId,
          status: 'SENT',
          sentAt: new Date(),
        },
      });
    } catch (error) {
      savedMessage = await this.prisma.message.update({
        where: { id: draft.id },
        data: {
          status: 'FAILED',
          rawPayload: {
            automation: 'FUNNEL',
            funnelId: options.step.funnelId,
            stepId: options.step.id,
            step: options.step.position,
            delaySeconds: options.step.delaySeconds,
            error: error instanceof Error ? error.message : 'Unknown funnel send error',
          },
        },
      });
    }

    await this.prisma.conversation.update({
      where: { id: options.conversationId },
      data: {
        status: 'OPEN',
        lastMessageAt: savedMessage.createdAt,
      },
    });

    this.realtime.emitToConversation(
      options.organizationId,
      options.conversationId,
      'message.created',
      savedMessage,
    );

    return savedMessage;
  }

  private sendStepThroughWhatsapp(to: string, step: FunnelStep) {
    if (step.type === FunnelStepType.TEXT) {
      return this.whatsapp.sendText(to, step.body ?? '');
    }

    return this.whatsapp.sendMedia({
      type: this.toMediaMessageType(step.type),
      to,
      mediaId: step.mediaId ?? undefined,
      mediaUrl: step.mediaUrl ?? undefined,
      caption: step.caption ?? step.body ?? undefined,
      fileName: step.fileName ?? undefined,
    });
  }

  private async assignHuman(conversation: FunnelConversation) {
    const shouldAssign = this.config.get<string>('FUNNEL_ASSIGN_TO_HUMAN') !== 'false';

    if (!shouldAssign || conversation.assignedToId) {
      return conversation.assignedToId;
    }

    const assignee = await this.prisma.user.findFirst({
      where: {
        organizationId: conversation.organizationId,
        role: { in: [UserRole.ADMIN, UserRole.AGENT] },
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      select: { id: true },
    });

    if (!assignee) {
      return null;
    }

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        assignedToId: assignee.id,
        status: 'OPEN',
      },
    });

    return assignee.id;
  }

  private async createHandoffMessage(
    conversation: FunnelConversation,
    senderUserId?: string,
    assignedToId?: string | null,
    handoffMessage?: string | null,
  ) {
    const body =
      this.optionalString(handoffMessage) ??
      this.config.get<string>('FUNNEL_HANDOFF_MESSAGE') ??
      'Atendimento humano iniciado.';

    const message = await this.prisma.message.create({
      data: {
        organization: { connect: { id: conversation.organizationId } },
        conversation: { connect: { id: conversation.id } },
        contact: { connect: { id: conversation.contactId } },
        ...(senderUserId ? { senderUser: { connect: { id: senderUserId } } } : {}),
        direction: 'OUTBOUND',
        type: 'SYSTEM',
        status: 'SENT',
        body,
        rawPayload: {
          automation: 'FUNNEL_HANDOFF',
          assignedToId,
        } as Prisma.InputJsonValue,
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        status: 'OPEN',
        assignedToId: assignedToId ?? undefined,
        lastMessageAt: message.createdAt,
      },
    });

    this.realtime.emitToConversation(
      conversation.organizationId,
      conversation.id,
      'message.created',
      message,
    );
  }

  private async emitConversation(conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        contact: {
          include: { tags: { include: { tag: true } } },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!conversation) {
      return;
    }

    this.realtime.emitToOrganization(conversation.organizationId, 'conversation.upsert', {
      ...conversation,
      contact: {
        ...conversation.contact,
        tags: conversation.contact.tags.map((contactTag) => contactTag.tag),
      },
      lastMessage: conversation.messages[0] ?? null,
      messages: undefined,
    });
  }

  private async findConversation(organizationId: string, conversationId: string) {
    return this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        organizationId,
      },
      include: { contact: true },
    });
  }

  private findOpenRun(conversationId: string) {
    return this.prisma.conversationFunnelRun.findFirst({
      where: {
        conversationId,
        status: { in: [FunnelRunStatus.RUNNING, FunnelRunStatus.WAITING_FOR_REPLY] },
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        funnel: {
          include: {
            steps: {
              orderBy: { position: 'asc' },
            },
          },
        },
      },
    });
  }

  private async getEditableFunnel(organizationId: string): Promise<FunnelWithSteps> {
    const funnel = await this.prisma.funnel.findFirst({
      where: { organizationId },
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
      include: {
        steps: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (funnel) {
      return funnel;
    }

    return this.createDefaultFunnel(organizationId);
  }

  private async findActiveFunnel(organizationId: string): Promise<FunnelWithSteps | null> {
    const funnel = await this.prisma.funnel.findFirst({
      where: {
        organizationId,
        isActive: true,
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        steps: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (funnel) {
      return funnel;
    }

    const existingFunnelCount = await this.prisma.funnel.count({
      where: { organizationId },
    });

    if (existingFunnelCount > 0) {
      return null;
    }

    return this.createDefaultFunnel(organizationId);
  }

  private createDefaultFunnel(organizationId: string) {
    return this.prisma.funnel.create({
      data: {
        organizationId,
        name: 'Funil inicial',
        isActive: true,
        handoffMessage: this.defaultHandoffMessage,
        steps: {
          create: this.defaultTextMessages.map((body, index) => ({
            organizationId,
            position: index + 1,
            type: FunnelStepType.TEXT,
            body,
            delaySeconds: 0,
            waitForReply: index === 0,
          })),
        },
      },
      include: {
        steps: {
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  private validateFunnelPayload(dto: UpsertActiveFunnelDto) {
    if (!dto.name.trim()) {
      throw new BadRequestException('Funnel name is required');
    }

    if (dto.isActive && dto.steps.length === 0) {
      throw new BadRequestException('Active funnel requires at least one step');
    }

    for (const step of dto.steps) {
      this.validateFunnelStep(step);
    }
  }

  private validateFunnelStep(step: UpsertFunnelStepDto) {
    this.normalizeDelay(step.delaySeconds);

    if (step.type === FunnelStepType.TEXT && !step.body?.trim()) {
      throw new BadRequestException('Text funnel step requires a message');
    }

    if (step.type !== FunnelStepType.TEXT && !step.mediaId?.trim() && !step.mediaUrl?.trim()) {
      throw new BadRequestException('Media funnel step requires a file or media URL');
    }
  }

  private serializeFunnel(funnel: FunnelWithSteps) {
    return {
      ...funnel,
      steps: funnel.steps.sort((a, b) => a.position - b.position),
    };
  }

  private toMessageType(type: FunnelStepType): MessageType {
    switch (type) {
      case FunnelStepType.IMAGE:
        return MessageType.IMAGE;
      case FunnelStepType.VIDEO:
        return MessageType.VIDEO;
      case FunnelStepType.AUDIO:
        return MessageType.AUDIO;
      case FunnelStepType.DOCUMENT:
        return MessageType.DOCUMENT;
      case FunnelStepType.TEXT:
      default:
        return MessageType.TEXT;
    }
  }

  private toMediaMessageType(
    type: FunnelStepType,
  ): Extract<MessageType, 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT'> {
    switch (type) {
      case FunnelStepType.IMAGE:
        return MessageType.IMAGE;
      case FunnelStepType.VIDEO:
        return MessageType.VIDEO;
      case FunnelStepType.AUDIO:
        return MessageType.AUDIO;
      case FunnelStepType.DOCUMENT:
        return MessageType.DOCUMENT;
      case FunnelStepType.TEXT:
      default:
        throw new BadRequestException('Text step cannot be sent as media');
    }
  }

  private assertAdmin(user: AuthenticatedUser) {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can manage funnels');
    }
  }

  private async waitBeforeStep(options: {
    organizationId: string;
    conversationId: string;
    runId: string;
    delaySeconds: number;
  }) {
    const delaySeconds = this.normalizeDelay(options.delaySeconds);

    if (delaySeconds === 0) {
      return true;
    }

    this.realtime.emitToConversation(options.organizationId, options.conversationId, 'typing.start', {
      conversationId: options.conversationId,
      automation: 'FUNNEL',
      delaySeconds,
    });

    await this.sleep(delaySeconds * 1000);

    this.realtime.emitToConversation(options.organizationId, options.conversationId, 'typing.stop', {
      conversationId: options.conversationId,
      automation: 'FUNNEL',
    });

    const run = await this.prisma.conversationFunnelRun.findUnique({
      where: { id: options.runId },
      select: { status: true },
    });

    return run?.status === FunnelRunStatus.RUNNING;
  }

  private normalizeDelay(delaySeconds?: number | null) {
    if (!delaySeconds) {
      return 0;
    }

    if (!Number.isInteger(delaySeconds) || delaySeconds < 0 || delaySeconds > 3600) {
      throw new BadRequestException('Funnel step delay must be between 0 and 3600 seconds');
    }

    return delaySeconds;
  }

  private sleep(milliseconds: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }

  private optionalString(value?: string | null) {
    const normalized = value?.trim();
    return normalized ? normalized.replace(/\\n/g, '\n') : null;
  }

  private get enabled() {
    return this.config.get<string>('FUNNEL_ENABLED') !== 'false';
  }

  private get defaultHandoffMessage() {
    return this.config.get<string>('FUNNEL_HANDOFF_MESSAGE') ?? 'Atendimento humano iniciado.';
  }

  private get defaultTextMessages() {
    const configured = [
      this.config.get<string>('FUNNEL_MESSAGE_1'),
      this.config.get<string>('FUNNEL_MESSAGE_2'),
      this.config.get<string>('FUNNEL_MESSAGE_3'),
      this.config.get<string>('FUNNEL_MESSAGE_4'),
      this.config.get<string>('FUNNEL_MESSAGE_5'),
    ]
      .map((message) => message?.replace(/\\n/g, '\n').trim())
      .filter(Boolean) as string[];

    if (configured.length) {
      return configured;
    }

    return [
      'Ola! Recebemos sua mensagem. Para agilizar, responda com uma opcao: 1 - Comercial, 2 - Suporte, 3 - Financeiro.',
      'Perfeito. Ja estou chamando um especialista para continuar seu atendimento por aqui.',
    ];
  }
}
