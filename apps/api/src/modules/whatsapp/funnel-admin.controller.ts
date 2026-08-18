import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpsertActiveFunnelDto } from './dto/upsert-funnel.dto';
import { FunnelService } from './funnel.service';

@UseGuards(JwtAuthGuard)
@Controller('funnels')
export class FunnelAdminController {
  constructor(private readonly funnelService: FunnelService) {}

  @Get('active')
  findActive(@CurrentUser() user: AuthenticatedUser) {
    return this.funnelService.findActiveForUser(user);
  }

  @Put('active')
  upsertActive(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertActiveFunnelDto) {
    return this.funnelService.upsertActiveForUser(user, dto);
  }
}
