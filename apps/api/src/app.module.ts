import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { FinanceModule } from './modules/finance/finance.module';
import { HealthController } from './modules/health/health.controller';
import { MessagesModule } from './modules/messages/messages.module';
import { MetaModule } from './modules/meta/meta.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { ProductsModule } from './modules/products/products.module';
import { QuickRepliesModule } from './modules/quick-replies/quick-replies.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { RedisModule } from './modules/redis/redis.module';
import { SearchModule } from './modules/search/search.module';
import { TagsModule } from './modules/tags/tags.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { UsersModule } from './modules/users/users.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule,
    RedisModule,
    RealtimeModule,
    AuthModule,
    ContactsModule,
    ConversationsModule,
    FinanceModule,
    MessagesModule,
    MetaModule,
    ProductsModule,
    QuickRepliesModule,
    TagsModule,
    UploadsModule,
    UsersModule,
    SearchModule,
    WhatsappModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
