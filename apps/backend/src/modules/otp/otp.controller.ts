import { Body, Controller, Post } from '@nestjs/common';
import { OtpService } from './otp.service';

@Controller('otp')
export class OtpController {
  constructor(private readonly otp: OtpService) {}

  @Post('request')
  async request(@Body() body: { mobile: string }) {
    await this.otp.requestOtp(body.mobile);
    return { status: 'OTP_SENT' };
  }

  @Post('verify')
  async verify(@Body() body: { mobile: string; otp: string }) {
    await this.otp.verifyOtp(body.mobile, body.otp);
    return { status: 'OTP_VERIFIED' };
  }
}
