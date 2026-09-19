import { register } from '@arizeai/phoenix-otel';

export interface TelemetryOptions {
  /** Phoenix project the spans are grouped under, e.g. "intervals-icu-mcp". */
  projectName: string;
}

// Returns void rather than the NodeTracerProvider: no caller needs the
// provider, and naming it here would drag @opentelemetry/sdk-trace-node into
// this package's public types.
export function registerTelemetry(options: TelemetryOptions): void {
  register({ projectName: options.projectName });
}
