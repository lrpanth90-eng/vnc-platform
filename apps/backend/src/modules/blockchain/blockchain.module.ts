import { Module } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { BlockchainController } from './blockchain.controller';
import { DbModule } from '../db/db.module';
import { WalletModule } from '../wallet/wallet.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [DbModule, WalletModule, AuditModule],
  providers: [BlockchainService],
  controllers: [BlockchainController]
})
export class BlockchainModule {}
