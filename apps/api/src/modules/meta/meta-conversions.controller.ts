import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpsertMetaConversionsSettingsDto } from './dto/upsert-meta-conversions-settings.dto';
import { MetaConversionsService } from './meta-conversions.service';

@UseGuards(JwtAuthGuard)
@Controller('meta/conversions')
export class MetaConversionsController {
  constructor(private readonly metaConversionsService: MetaConversionsService) {}

  @Get('settings')
  getSettings(@CurrentUser() user: AuthenticatedUser) {
    return this.metaConversionsService.getSettings(user);
  }

  @Put('settings')
  upsertSettings(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertMetaConversionsSettingsDto) {
    return this.metaConversionsService.upsertSettings(user, dto);
  }

  @Get('events')
  listEvents(@CurrentUser() user: AuthenticatedUser) {
    return this.metaConversionsService.listEvents(user);
  }

  @Post('events/:id/retry')
  retryEvent(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.metaConversionsService.retryEvent(user, id);
  }

  @Post('sales/:saleId/send')
  sendSalePurchase(@CurrentUser() user: AuthenticatedUser, @Param('saleId') saleId: string) {
    return this.metaConversionsService.sendSalePurchase(user, saleId);
  }
}
