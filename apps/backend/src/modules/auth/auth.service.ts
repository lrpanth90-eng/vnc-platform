import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DbService } from '../db/db.service';
import { v4 as uuid } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly db: DbService
  ) {}

  async registerOrFetchUser(mobile: string) {
    const result = await this.db.query(
      'SELECT * FROM users WHERE mobile = $1',
      [mobile]
    );

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    const userId = uuid();

    await this.db.query(
      `INSERT INTO users (id, mobile) VALUES ($1, $2)`,
      [userId, mobile]
    );

    const created = await this.db.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );

    return created.rows[0];
  }

  async bindDevice(params: {
    userId: string;
    deviceFingerprint: string;
    deviceModel: string;
    osVersion: string;
  }) {
    const deviceId = uuid();

    await this.db.query(
      `INSERT INTO devices
        (id, user_id, device_fingerprint, device_model, os_version)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, device_fingerprint)
       DO NOTHING`,
      [
        deviceId,
        params.userId,
        params.deviceFingerprint,
        params.deviceModel,
        params.osVersion
      ]
    );
  }

  issueToken(payload: {
    userId: string;
    role: string;
    deviceFingerprint: string;
  }) {
    return this.jwt.sign(payload);
  }

  async validateToken(payload: any) {
    const device = await this.db.query(
      `SELECT * FROM devices
       WHERE user_id = $1
       AND device_fingerprint = $2
       AND status = 'ACTIVE'`,
      [payload.userId, payload.deviceFingerprint]
    );

    if (device.rows.length === 0) {
      throw new UnauthorizedException('Device not trusted');
    }

    return payload;
  }
}
