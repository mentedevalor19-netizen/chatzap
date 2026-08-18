import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MetricsService } from './metrics.service';

@UseGuards(JwtAuthGuard)
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('crm')
  overview(@CurrentUser() user: AuthenticatedUser, @Query('from') from?: string, @Query('to') to?: string) {
    return this.metricsService.overview(user, from, to);
  }
}
