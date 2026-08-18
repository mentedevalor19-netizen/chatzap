import { Module } from '@nestjs/common';
import { MetaModule } from '../meta/meta.module';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  imports: [MetaModule],
  controllers: [SalesController, ExpensesController, MetricsController],
  providers: [SalesService, ExpensesService, MetricsService],
})
export class FinanceModule {}
