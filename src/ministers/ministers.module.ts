import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Minister } from './entities/minister.entity.js';
import { MinistersService } from './ministers.service.js';
import { MinistersController } from './ministers.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Minister])],
  controllers: [MinistersController],
  providers: [MinistersService],
  exports: [MinistersService],
})
export class MinistersModule {}
