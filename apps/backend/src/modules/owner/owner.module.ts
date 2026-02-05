import { Module } from '@nestjs/common';
import { OwnerService } from './owner.service';
import { OwnerController } from './owner.controller';
import { DbModule } from '../db/db.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [DbModule, AuditModule],
  providers: [OwnerService],
  controllers: [OwnerController],
  exports: [OwnerService]
})
export class OwnerModule {}
