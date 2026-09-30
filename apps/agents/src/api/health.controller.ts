import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('ok')
  ok(): { ok: true } {
    return { ok: true };
  }
}
