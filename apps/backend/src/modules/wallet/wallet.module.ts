import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { DbModule } from '../db/db.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [DbModule, AuditModule],
  providers: [WalletService],
  controllers: [WalletController],
  exports: [WalletService]
})
export class WalletModule {}
