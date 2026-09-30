import { Inject, Injectable } from '@nestjs/common';
import { IntervalsClient } from '../infrastructure/intervals/intervals.client';
import { CLOCK } from '../infrastructure/clock/clock.module';
import type { Clock } from '../infrastructure/clock/clock.module';
import { createTools } from './index';

// The tools stay plain functions (one file each, unit-tested without Nest);
// this provider binds them to the injected intervals.icu client and clock.
@Injectable()
export class TrainingToolsService {
  private readonly tools: ReturnType<typeof createTools>;

  constructor(intervals: IntervalsClient, @Inject(CLOCK) now: Clock) {
    this.tools = createTools({ intervals, now });
  }

  getTools() {
    return this.tools;
  }
}
