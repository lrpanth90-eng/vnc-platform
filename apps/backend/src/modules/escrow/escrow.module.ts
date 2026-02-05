import { Module } from '@nestjs/common';
import { EscrowService } from './escrow.service';
import { EscrowController } from './escrow.controller';
import { DbModule } from '../db/db.module';
import { WalletModule } from '../wallet/wallet.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [DbModule, WalletModule, AuditModule],
  providers: [EscrowService],
  controllers: [EscrowController]
})
export class EscrowModule {}
