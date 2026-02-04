import { Module } from '@nestjs/common';
import { AdsService } from './ads.service';
import { AdsController } from './ads.controller';
import { DbModule } from '../db/db.module';
import { WalletModule } from '../wallet/wallet.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [DbModule, WalletModule, AuditModule],
  providers: [AdsService],
  controllers: [AdsController]
})
export class AdsModule {}
