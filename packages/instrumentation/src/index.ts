import { register } from '@arizeai/phoenix-otel';

export interface TelemetryOptions {
  /** Phoenix project the spans are grouped under, e.g. "intervals-icu-mcp". */
  projectName: string;
}

export interface TelemetryHandle {
  /** Flushes buffered spans immediately. Call before a short-lived process exits. */
  forceFlush(): Promise<void>;
  shutdown(): Promise<void>;
}

// Exposes only forceFlush/shutdown rather than the NodeTracerProvider itself,
// so this package's public types stay free of @opentelemetry/sdk-trace-node.
export function registerTelemetry(options: TelemetryOptions): TelemetryHandle {
  const provider = register({ projectName: options.projectName });
  return {
    forceFlush: () => provider.forceFlush(),
    shutdown: () => provider.shutdown(),
  };
}
