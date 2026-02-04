import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('bootstrap')
  async bootstrap(@Body() body: {
    mobile: string;
    deviceFingerprint: string;
    deviceModel: string;
    osVersion: string;
  }) {
    const user = await this.auth.registerOrFetchUser(body.mobile);

    await this.auth.bindDevice({
      userId: user.id,
      deviceFingerprint: body.deviceFingerprint,
      deviceModel: body.deviceModel,
      osVersion: body.osVersion
    });

    const token = this.auth.issueToken({
      userId: user.id,
      role: user.role,
      deviceFingerprint: body.deviceFingerprint
    });

    return {
      token,
      user: {
        id: user.id,
        role: user.role,
        kycLevel: user.kyc_level
      }
    };
  }
}
