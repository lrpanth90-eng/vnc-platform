import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'OK',
      service: 'VNC Backend',
      version: 'v6.7.1.1',
      time: new Date().toISOString()
    };
  }
}
