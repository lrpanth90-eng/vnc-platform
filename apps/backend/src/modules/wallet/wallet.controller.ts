import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtGuard } from '../../guards/jwt.guard';
import { ZeroTrustGuard } from '../../guards/zero-trust.guard';

@Controller('wallet')
@UseGuards(JwtGuard, ZeroTrustGuard)
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get('balance')
  async balance(@Req() req: any) {
    const wallet = await this.wallet.getOrCreateWallet(req.user.userId);
    const balancePaise = await this.wallet.getBalance(wallet.id);

    return {
      currency: 'INR',
      balancePaise,
      balanceINR: (balancePaise / 100).toFixed(2)
    };
  }
}
