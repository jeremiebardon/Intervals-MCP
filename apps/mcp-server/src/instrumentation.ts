import { registerTelemetry } from '@intervals/instrumentation';
import { MCPInstrumentation } from '@arizeai/openinference-instrumentation-mcp';

// Must run before the MCP SDK is imported so the instrumentation can patch it.
// `main.ts` therefore imports this file first, before anything else.
registerTelemetry({ projectName: 'intervals-icu-mcp' });

new MCPInstrumentation().enable();
