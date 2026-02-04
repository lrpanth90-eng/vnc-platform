import { Injectable, ForbiddenException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { WalletService } from '../wallet/wallet.service';
import { AuditService } from '../audit/audit.service';
import { v4 as uuid } from 'uuid';

@Injectable()
export class AdsService {
  constructor(
    private readonly db: DbService,
    private readonly wallet: WalletService,
    private readonly audit: AuditService
  ) {}

  async registerAdView(params: {
    userId: string;
    adUnitId: string;
    deviceId?: string;
  }) {
    const config = (await this.db.query(
      `SELECT * FROM ads_config WHERE id = 1`
    )).rows[0];

    if (!config.ads_enabled) {
      throw new ForbiddenException('Ads disabled by owner');
    }

    // daily limit
    const today = await this.db.query(
      `SELECT COUNT(*) FROM ad_events
       WHERE user_id = $1
       AND created_at::date = now()::date`,
      [params.userId]
    );

    if (Number(today.rows[0].count) >= config.daily_ad_limit) {
      throw new ForbiddenException('Daily ad limit reached');
    }

    // register event (NOT verified yet)
    const eventId = uuid();

    await this.db.query(
      `INSERT INTO ad_events
        (id, user_id, device_id, ad_network, ad_unit_id, reward_paise)
       VALUES ($1, $2, $3, 'ADMOB', $4, $5)`,
      [
        eventId,
        params.userId,
        params.deviceId || null,
        params.adUnitId,
        config.reward_per_ad_paise
      ]
    );

    this.audit.log({
      actorId: params.userId,
      actorRole: 'USER',
      action: 'AD_VIEW_RECORDED',
      metadata: { adUnitId: params.adUnitId }
    });

    return { eventId };
  }

  async verifyAd(params: {
    eventId: string;
    userId: string;
  }) {
    const event = await this.db.query(
      `SELECT * FROM ad_events
       WHERE id = $1
       AND user_id = $2
       AND verified = false`,
      [params.eventId, params.userId]
    );

    if (event.rows.length === 0) {
      throw new ForbiddenException('Invalid ad event');
    }

    const wallet = await this.wallet.getOrCreateWallet(params.userId);

    await this.wallet.credit({
      walletId: wallet.id,
      amountPaise: event.rows[0].reward_paise,
      referenceType: 'AD_REWARD',
      referenceId: params.eventId
    });

    // mark verified (DB trigger prevents UPDATE – intentional)
    // 👉 verification is LOGICAL via ledger reference

    this.audit.log({
      actorId: params.userId,
      actorRole: 'USER',
      action: 'AD_REWARD_GRANTED',
      metadata: { eventId: params.eventId }
    });

    return { rewardPaise: event.rows[0].reward_paise };
  }
}
