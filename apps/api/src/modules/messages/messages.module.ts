import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  imports: [WhatsappModule, RealtimeModule],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
