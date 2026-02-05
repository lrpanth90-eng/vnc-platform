import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { JwtGuard } from '../../guards/jwt.guard';
import { ZeroTrustGuard } from '../../guards/zero-trust.guard';

@Controller('compliance')
@UseGuards(JwtGuard, ZeroTrustGuard)
export class ComplianceController {
  constructor(private readonly compliance: ComplianceService) {}

  @Post('generate')
  async generate(@Req() req: any, @Body() body: {
    reportType: 'AML_USER' | 'GST_MERCHANT' | 'RBI_LEDGER' | 'LAW_ENFORCEMENT';
    subjectId?: string;
  }) {
    return await this.compliance.generateReport({
      reportType: body.reportType,
      subjectId: body.subjectId,
      requesterId: req.user.userId,
      requesterRole: req.user.role
    });
  }
}
