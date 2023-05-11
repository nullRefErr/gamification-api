import {Body, Controller, Get} from '@nestjs/common';
import {SignUpDTO} from "@gamification-api/models";

import {AppService} from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {
  }

  @Get()
  getData(@Body() params: SignUpDTO) {
    return this.appService.getData();
  }
}
