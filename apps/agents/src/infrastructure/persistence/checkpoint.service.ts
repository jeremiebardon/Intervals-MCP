import { Injectable } from '@nestjs/common';
import { BaseCheckpointSaver, MemorySaver } from '@langchain/langgraph';

// Threads live in process memory and are lost on restart. To persist them,
// return a PostgresSaver (@langchain/langgraph-checkpoint-postgres) pointed at
// the Supabase connection string, opening it in onModuleInit and closing it
// in onModuleDestroy.
@Injectable()
export class CheckpointService {
  private readonly saver = new MemorySaver();

  getSaver(): BaseCheckpointSaver {
    return this.saver;
  }
}
