import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Check API Health' })
  @ApiResponse({ status: 200, description: 'The API is up and running.' })
  checkHealth() {
    return {
      status: 'ok',
      service: 'FamilyOS Backend',
      version: '1.0.0',
    };
  }
}
