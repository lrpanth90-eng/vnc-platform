import { Injectable, ForbiddenException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { WalletService } from '../wallet/wallet.service';
import { AuditService } from '../audit/audit.service';
import { v4 as uuid } from 'uuid';

@Injectable()
export class MerchantService {
  constructor(
    private readonly db: DbService,
    private readonly wallet: WalletService,
    private readonly audit: AuditService
  ) {}

  async createMerchant(userId: string, data: {
    legalName: string;
    gstin?: string;
    pan?: string;
  }) {
    const id = uuid();

    await this.db.query(
      `INSERT INTO merchants
       (id, user_id, legal_name, gstin, pan)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, userId, data.legalName, data.gstin || null, data.pan || null]
    );

    await this.wallet.getOrCreateWallet(userId);

    this.audit.log({
      actorId: userId,
      actorRole: 'MERCHANT',
      action: 'MERCHANT_CREATED'
    });

    return { merchantId: id };
  }

  async createQr(merchantId: string, type: 'STATIC' | 'DYNAMIC', label?: string) {
    const qrId = uuid();

    await this.db.query(
      `INSERT INTO merchant_qr
       (id, merchant_id, qr_type, label)
       VALUES ($1, $2, $3, $4)`,
      [qrId, merchantId, type, label || null]
    );

    return { qrId };
  }

  async pay(params: {
    payerUserId: string;
    merchantId: string;
    amountPaise: number;
    gstPaise?: number;
  }) {
    const payerWallet = await this.wallet.getOrCreateWallet(params.payerUserId);

    const merchant = await this.db.query(
      `SELECT * FROM merchants WHERE id = $1`,
      [params.merchantId]
    );

    if (merchant.rows.length === 0) {
      throw new ForbiddenException('Merchant not found');
    }

    const merchantWallet = await this.wallet.getOrCreateWallet(
      merchant.rows[0].user_id
    );

    const total = params.amountPaise + (params.gstPaise || 0);

    await this.wallet.debit({
      walletId: payerWallet.id,
      amountPaise: total,
      referenceType: 'MERCHANT_PAY'
    });

    await this.wallet.credit({
      walletId: merchantWallet.id,
      amountPaise: params.amountPaise,
      referenceType: 'MERCHANT_RECEIVE'
    });

    if (params.gstPaise && params.gstPaise > 0) {
      // GST ledger handling can be routed later
    }

    const paymentId = uuid();

    await this.db.query(
      `INSERT INTO merchant_payments
       (id, payer_user_id, merchant_id, amount_paise, gst_paise, wallet_from, wallet_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        paymentId,
        params.payerUserId,
        params.merchantId,
        params.amountPaise,
        params.gstPaise || 0,
        payerWallet.id,
        merchantWallet.id
      ]
    );

    this.audit.log({
      actorId: params.payerUserId,
      actorRole: 'USER',
      action: 'MERCHANT_PAYMENT',
      metadata: { paymentId }
    });

    return { paymentId };
  }
}
