export interface AppConfig {
  port: number;
  intervals: { apiKey: string | undefined; athleteId: string };
  ollama: { baseUrl: string; model: string };
}

export function configuration(): AppConfig {
  return {
    port: Number(process.env.PORT ?? 2024),
    intervals: {
      apiKey: process.env.INTERVALS_API_KEY,
      athleteId: process.env.INTERVALS_ATHLETE_ID ?? '0',
    },
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL ?? 'gemma4:12b',
    },
  };
}
