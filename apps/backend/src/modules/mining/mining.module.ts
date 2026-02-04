import { Module } from '@nestjs/common';
import { MiningService } from './mining.service';
import { MiningController } from './mining.controller';
import { DbModule } from '../db/db.module';
import { WalletModule } from '../wallet/wallet.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [DbModule, WalletModule, AuditModule],
  providers: [MiningService],
  controllers: [MiningController]
})
export class MiningModule {}
