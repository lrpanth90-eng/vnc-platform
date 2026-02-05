import { Module } from '@nestjs/common';
import { FraudService } from './fraud.service';
import { FraudController } from './fraud.controller';
import { DbModule } from '../db/db.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [DbModule, AuditModule],
  providers: [FraudService],
  controllers: [FraudController],
  exports: [FraudService]
})
export class FraudModule {}
