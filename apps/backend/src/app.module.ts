import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './modules/health/health.module';
import { AuditModule } from './modules/audit/audit.module';
import { DbModule } from './modules/db/db.module';
import { AuthModule } from './modules/auth/auth.module';
import { OtpModule } from './modules/otp/otp.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { MiningModule } from './modules/mining/mining.module';
import { AdsModule } from './modules/ads/ads.module';
import { TradeModule } from './modules/trade/trade.module';
import { MerchantModule } from './modules/merchant/merchant.module';
import { EscrowModule } from './modules/escrow/escrow.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DbModule,
    AuditModule,
    AuthModule,
    OtpModule,
    WalletModule,
    MiningModule,
    AdsModule,
    TradeModule,
    MerchantModule,
    EscrowModule,
    HealthModule
  ]
})
export class AppModule {}
