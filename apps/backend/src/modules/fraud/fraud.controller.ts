import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { FraudService } from './fraud.service';
import { JwtGuard } from '../../guards/jwt.guard';
import { ZeroTrustGuard } from '../../guards/zero-trust.guard';

@Controller('fraud')
@UseGuards(JwtGuard, ZeroTrustGuard)
export class FraudController {
  constructor(private readonly fraud: FraudService) {}

  @Post('flag')
  async flag(@Req() req: any, @Body() body: {
    userId: string;
    reason: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    autoFreeze?: boolean;
  }) {
    if (req.user.role !== 'OWNER') {
      throw new Error('Owner only');
    }

    return await this.fraud.flagUser(body);
  }

  @Post('unfreeze')
  async unfreeze(@Req() req: any, @Body() body: { userId: string }) {
    if (req.user.role !== 'OWNER') {
      throw new Error('Owner only');
    }

    await this.fraud.freezeUser(body.userId, 'OWNER_OVERRIDE');
    return { status: 'UNFROZEN_LOGGED' };
  }
}
