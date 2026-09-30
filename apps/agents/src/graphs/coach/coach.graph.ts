import { Injectable, OnModuleInit } from '@nestjs/common';
import { END, START, StateGraph } from '@langchain/langgraph';
import { CheckpointService } from '../../infrastructure/persistence/checkpoint.service';
import { AnalystNode } from './nodes/analyst.node';
import { CoachNode } from './nodes/coach.node';
import { CoachAnnotation } from './state';

function buildGraph(
  analyst: AnalystNode,
  coach: CoachNode,
  checkpoints: CheckpointService,
) {
  const graph = new StateGraph(CoachAnnotation)
    .addNode('analyst', (state, config) => analyst.run(state, config))
    .addNode('coach', (state, config) => coach.run(state, config))
    .addEdge(START, 'analyst')
    .addEdge('analyst', 'coach')
    .addEdge('coach', END)
    .compile({ checkpointer: checkpoints.getSaver() });
  graph.name = 'coach';
  return graph;
}

export type CoachGraph = ReturnType<typeof buildGraph>;

/** The coach graph: analyst (tools) → coach (answer). */
@Injectable()
export class CoachGraphService implements OnModuleInit {
  private graph!: CoachGraph;

  constructor(
    private readonly analyst: AnalystNode,
    private readonly coach: CoachNode,
    private readonly checkpoints: CheckpointService,
  ) {}

  onModuleInit(): void {
    this.graph = buildGraph(this.analyst, this.coach, this.checkpoints);
  }

  getCompiledGraph(): CoachGraph {
    return this.graph;
  }
}
