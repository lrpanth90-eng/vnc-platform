import { Module } from '@nestjs/common';
import { TradeService } from './trade.service';
import { TradeController } from './trade.controller';
import { DbModule } from '../db/db.module';
import { WalletModule } from '../wallet/wallet.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [DbModule, WalletModule, AuditModule],
  providers: [TradeService],
  controllers: [TradeController]
})
export class TradeModule {}
