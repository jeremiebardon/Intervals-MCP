import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOllama } from '@langchain/ollama';
import { AppConfig } from '../../config/configuration';

@Injectable()
export class LlmProviderService {
  private readonly model: ChatOllama;

  constructor(config: ConfigService<AppConfig, true>) {
    const { baseUrl, model } = config.get('ollama', { infer: true });
    this.model = new ChatOllama({
      temperature: 0.1,
      maxRetries: 3,
      model,
      baseUrl,
    });
  }

  getModel(): ChatOllama {
    return this.model;
  }
}
