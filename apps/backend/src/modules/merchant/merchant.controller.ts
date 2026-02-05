import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { MerchantService } from './merchant.service';
import { JwtGuard } from '../../guards/jwt.guard';
import { ZeroTrustGuard } from '../../guards/zero-trust.guard';

@Controller('merchant')
@UseGuards(JwtGuard, ZeroTrustGuard)
export class MerchantController {
  constructor(private readonly merchant: MerchantService) {}

  @Post('create')
  async create(@Req() req: any, @Body() body: {
    legalName: string;
    gstin?: string;
    pan?: string;
  }) {
    return await this.merchant.createMerchant(req.user.userId, body);
  }

  @Post('qr')
  async qr(@Body() body: {
    merchantId: string;
    type: 'STATIC' | 'DYNAMIC';
    label?: string;
  }) {
    return await this.merchant.createQr(body.merchantId, body.type, body.label);
  }

  @Post('pay')
  async pay(@Req() req: any, @Body() body: {
    merchantId: string;
    amountPaise: number;
    gstPaise?: number;
  }) {
    return await this.merchant.pay({
      payerUserId: req.user.userId,
      merchantId: body.merchantId,
      amountPaise: body.amountPaise,
      gstPaise: body.gstPaise
    });
  }
}
