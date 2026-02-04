import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AdsService } from './ads.service';
import { JwtGuard } from '../../guards/jwt.guard';
import { ZeroTrustGuard } from '../../guards/zero-trust.guard';

@Controller('ads')
@UseGuards(JwtGuard, ZeroTrustGuard)
export class AdsController {
  constructor(private readonly ads: AdsService) {}

  @Post('view')
  async view(@Req() req: any, @Body() body: { adUnitId: string }) {
    return await this.ads.registerAdView({
      userId: req.user.userId,
      adUnitId: body.adUnitId,
      deviceId: req.headers['x-device-id']
    });
  }

  @Post('verify')
  async verify(@Req() req: any, @Body() body: { eventId: string }) {
    return await this.ads.verifyAd({
      eventId: body.eventId,
      userId: req.user.userId
    });
  }
}
