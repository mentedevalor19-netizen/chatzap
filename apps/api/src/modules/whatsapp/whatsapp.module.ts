import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { FunnelAdminController } from './funnel-admin.controller';
import { FunnelController } from './funnel.controller';
import { FunnelService } from './funnel.service';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { WhatsappWebhookService } from './whatsapp-webhook.service';

@Module({
  imports: [RealtimeModule],
  controllers: [WhatsappController, FunnelController, FunnelAdminController],
  providers: [WhatsappService, WhatsappWebhookService, FunnelService],
  exports: [WhatsappService, FunnelService],
})
export class WhatsappModule {}
