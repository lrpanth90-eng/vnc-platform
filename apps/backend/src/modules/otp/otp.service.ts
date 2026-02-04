import { Injectable, ForbiddenException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { AuditService } from '../audit/audit.service';
import { v4 as uuid } from 'uuid';
import * as crypto from 'crypto';

@Injectable()
export class OtpService {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService
  ) {}

  private hashOtp(otp: string) {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async requestOtp(mobile: string) {
    const rate = await this.db.query(
      `SELECT * FROM otp_rate_limits WHERE mobile = $1`,
      [mobile]
    );

    if (rate.rows[0]?.blocked_until && new Date(rate.rows[0].blocked_until) > new Date()) {
      throw new ForbiddenException('OTP temporarily blocked');
    }

    const otp = this.generateOtp();
    const otpHash = this.hashOtp(otp);

    await this.db.query(
      `INSERT INTO otp_requests
       (id, mobile, otp_hash, purpose, expires_at)
       VALUES ($1, $2, $3, 'LOGIN', now() + interval '5 minutes')`,
      [uuid(), mobile, otpHash]
    );

    await this.db.query(
      `INSERT INTO otp_rate_limits (mobile, attempts)
       VALUES ($1, 1)
       ON CONFLICT (mobile)
       DO UPDATE SET attempts = otp_rate_limits.attempts + 1`,
      [mobile]
    );

    // 🔐 AUDIT
    this.audit.log({
      actorId: mobile,
      actorRole: 'USER',
      action: 'OTP_REQUESTED'
    });

    // 🔥 REAL SMS SEND (ENV BASED)
    await fetch(process.env.SMS_GATEWAY_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SMS_API_KEY}`
      },
      body: JSON.stringify({
        to: mobile,
        message: `Your VNC OTP is ${otp}. Valid for 5 minutes.`
      })
    });
  }

  async verifyOtp(mobile: string, otp: string) {
    const otpHash = this.hashOtp(otp);

    const result = await this.db.query(
      `SELECT * FROM otp_requests
       WHERE mobile = $1
       AND otp_hash = $2
       AND consumed = false
       AND expires_at > now()
       ORDER BY created_at DESC
       LIMIT 1`,
      [mobile, otpHash]
    );

    if (result.rows.length === 0) {
      throw new ForbiddenException('Invalid or expired OTP');
    }

    await this.db.query(
      `UPDATE otp_requests SET consumed = true WHERE id = $1`,
      [result.rows[0].id]
    );

    this.audit.log({
      actorId: mobile,
      actorRole: 'USER',
      action: 'OTP_VERIFIED'
    });

    return true;
  }
}
