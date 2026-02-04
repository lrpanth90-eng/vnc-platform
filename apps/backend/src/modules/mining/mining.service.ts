import { Injectable, ForbiddenException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { WalletService } from '../wallet/wallet.service';
import { AuditService } from '../audit/audit.service';
import { v4 as uuid } from 'uuid';

@Injectable()
export class MiningService {
  constructor(
    private readonly db: DbService,
    private readonly wallet: WalletService,
    private readonly audit: AuditService
  ) {}

  async mine(userId: string) {
    const configRes = await this.db.query(
      `SELECT * FROM mining_config WHERE id = 1`
    );

    const config = configRes.rows[0];

    if (!config.mining_enabled) {
      throw new ForbiddenException('Mining disabled by owner');
    }

    // cooldown check
    const last = await this.db.query(
      `SELECT started_at FROM mining_sessions
       WHERE user_id = $1
       ORDER BY started_at DESC
       LIMIT 1`,
      [userId]
    );

    if (last.rows.length > 0) {
      const lastTime = new Date(last.rows[0].started_at).getTime();
      const now = Date.now();
      const diffMinutes = (now - lastTime) / 60000;

      if (diffMinutes < config.cooldown_minutes) {
        throw new ForbiddenException('Mining cooldown active');
      }
    }

    // daily cap check
    const today = await this.db.query(
      `SELECT COALESCE(SUM(reward_paise),0) AS total
       FROM mining_sessions
       WHERE user_id = $1
       AND started_at::date = now()::date`,
      [userId]
    );

    if (Number(today.rows[0].total) + config.base_reward_paise > config.daily_cap_paise) {
      throw new ForbiddenException('Daily mining cap reached');
    }

    // wallet
    const wallet = await this.wallet.getOrCreateWallet(userId);

    // ledger credit
    await this.wallet.credit({
      walletId: wallet.id,
      amountPaise: config.base_reward_paise,
      referenceType: 'MINING'
    });

    // mining session log
    await this.db.query(
      `INSERT INTO mining_sessions
        (id, user_id, wallet_id, reward_paise)
       VALUES ($1, $2, $3, $4)`,
      [uuid(), userId, wallet.id, config.base_reward_paise]
    );

    // audit
    this.audit.log({
      actorId: userId,
      actorRole: 'USER',
      action: 'MINING_REWARD_GRANTED',
      metadata: { rewardPaise: config.base_reward_paise }
    });

    return {
      rewardPaise: config.base_reward_paise
    };
  }
}
