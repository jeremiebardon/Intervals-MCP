import { Module } from '@nestjs/common';

export const CLOCK = Symbol('CLOCK');

export type Clock = () => Date;

@Module({
  providers: [{ provide: CLOCK, useValue: (() => new Date()) satisfies Clock }],
  exports: [CLOCK],
})
export class ClockModule {}
