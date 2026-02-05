import { Injectable, ForbiddenException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class OwnerService {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService
  ) {}

  async getFlags() {
    const res = await this.db.query(
      `SELECT * FROM owner_flags WHERE id = 1`
    );
    return res.rows[0];
  }

  async updateFlags(actorRole: string, updates: any) {
    if (actorRole !== 'OWNER') {
      throw new ForbiddenException('Owner only');
    }

    await this.db.query(
      `UPDATE owner_flags
       SET
         platform_paused = COALESCE($1, platform_paused),
         mining_enabled = COALESCE($2, mining_enabled),
         ads_enabled = COALESCE($3, ads_enabled),
         trade_enabled = COALESCE($4, trade_enabled),
         merchant_enabled = COALESCE($5, merchant_enabled),
         escrow_enabled = COALESCE($6, escrow_enabled),
         blockchain_enabled = COALESCE($7, blockchain_enabled),
         pricing_override = COALESCE($8, pricing_override),
         ui_visibility = COALESCE($9, ui_visibility),
         updated_at = now()
       WHERE id = 1`,
      [
        updates.platformPaused,
        updates.miningEnabled,
        updates.adsEnabled,
        updates.tradeEnabled,
        updates.merchantEnabled,
        updates.escrowEnabled,
        updates.blockchainEnabled,
        updates.pricingOverride,
        updates.uiVisibility
      ]
    );

    this.audit.log({
      actorId: 'OWNER',
      actorRole: 'OWNER',
      action: 'OWNER_FLAGS_UPDATED',
      metadata: updates
    });

    return { status: 'UPDATED' };
  }
}
