import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateQuickReplyDto } from './dto/create-quick-reply.dto';
import { UpdateQuickReplyDto } from './dto/update-quick-reply.dto';
import { QuickRepliesService } from './quick-replies.service';

@UseGuards(JwtAuthGuard)
@Controller('quick-replies')
export class QuickRepliesController {
  constructor(private readonly quickRepliesService: QuickRepliesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query('search') search?: string) {
    return this.quickRepliesService.findAll(user, search);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateQuickReplyDto) {
    return this.quickRepliesService.create(user, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateQuickReplyDto) {
    return this.quickRepliesService.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.quickRepliesService.remove(user, id);
  }
}
