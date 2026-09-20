import { Question } from '../../domain/question';
import { Answer } from '../../domain/answer';

export abstract class AgentInvokerPort {
  abstract invoke(question: Question): Promise<Answer>;
}
