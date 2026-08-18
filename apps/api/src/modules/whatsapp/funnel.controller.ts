import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FunnelService } from './funnel.service';

@UseGuards(JwtAuthGuard)
@Controller('conversations/:conversationId/funnel')
export class FunnelController {
  constructor(private readonly funnelService: FunnelService) {}

  @Post('start')
  start(@CurrentUser() user: AuthenticatedUser, @Param('conversationId') conversationId: string) {
    return this.funnelService.startForConversation(user, conversationId);
  }
}
