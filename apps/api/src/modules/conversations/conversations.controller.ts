import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ConversationStatus } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AssignConversationDto } from './dto/assign-conversation.dto';
import { UpdateConversationStatusDto } from './dto/update-conversation-status.dto';
import { ConversationsService } from './conversations.service';

@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: ConversationStatus,
    @Query('search') search?: string,
  ) {
    return this.conversationsService.findAll(user, status, search);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.conversationsService.findOne(user, id);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateConversationStatusDto,
  ) {
    return this.conversationsService.updateStatus(user, id, dto);
  }

  @Patch(':id/assign')
  assign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AssignConversationDto,
  ) {
    return this.conversationsService.assign(user, id, dto);
  }

  @Post(':id/read')
  markRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.conversationsService.markRead(user, id);
  }
}
