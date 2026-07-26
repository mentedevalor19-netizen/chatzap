import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { WhatsappWebhookService } from './whatsapp-webhook.service';

@Module({
  imports: [RealtimeModule],
  controllers: [WhatsappController],
  providers: [WhatsappService, WhatsappWebhookService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
