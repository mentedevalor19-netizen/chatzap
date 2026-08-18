import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { SaleStatus } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { SalesService } from './sales.service';

@UseGuards(JwtAuthGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('sellerId') sellerId?: string,
    @Query('status') status?: SaleStatus,
    @Query('search') search?: string,
  ) {
    return this.salesService.findAll(user, { from, to, sellerId, status, search });
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSaleDto) {
    return this.salesService.create(user, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateSaleDto) {
    return this.salesService.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.salesService.remove(user, id);
  }
}
