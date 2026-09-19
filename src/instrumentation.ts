import { register } from '@arizeai/phoenix-otel';
import { MCPInstrumentation } from '@arizeai/openinference-instrumentation-mcp';

// Must be imported before the MCP SDK so the instrumentation can patch it.
register({ projectName: 'intervals-icu-mcp' });

new MCPInstrumentation().enable();
