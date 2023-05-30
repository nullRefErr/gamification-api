import {Controller, Get} from '@nestjs/common';

import {AppService} from './app.service';
import {CustomBodyParser} from "@gamification-api/decorators";
import {SignUpDTO} from "@gamification-api/models";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {
  }

  @Get('/test')
  getData(@CustomBodyParser() params: SignUpDTO) {
    console.log(params)
    return this.appService.getData();
  }
}
