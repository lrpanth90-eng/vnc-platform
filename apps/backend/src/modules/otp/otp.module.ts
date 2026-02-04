import { Module } from '@nestjs/common';
import { OtpService } from './otp.service';
import { OtpController } from './otp.controller';
import { DbModule } from '../db/db.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [DbModule, AuditModule],
  providers: [OtpService],
  controllers: [OtpController]
})
export class OtpModule {}
