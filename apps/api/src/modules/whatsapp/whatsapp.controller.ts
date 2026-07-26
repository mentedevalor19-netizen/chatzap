import { Controller, Get, Post, Query, Body, Res, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { WhatsappWebhookService } from './whatsapp-webhook.service';

@Controller('webhooks/whatsapp')
export class WhatsappController {
  constructor(
    private readonly config: ConfigService,
    private readonly webhookService: WhatsappWebhookService,
  ) {}

  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() response: Response,
  ) {
    const verifyToken = this.config.get<string>('WHATSAPP_WEBHOOK_VERIFY_TOKEN');

    if (mode === 'subscribe' && token === verifyToken) {
      return response.status(HttpStatus.OK).send(challenge);
    }

    return response.status(HttpStatus.FORBIDDEN).send('Forbidden');
  }

  @Post()
  async receiveWebhook(@Body() payload: unknown) {
    await this.webhookService.handle(payload);
    return { ok: true };
  }
}
