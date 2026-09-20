import { registerTelemetry } from '@intervals/instrumentation';
import { LangChainInstrumentation } from '@arizeai/openinference-instrumentation-langchain';
import * as CallbackManagerModule from '@langchain/core/callbacks/manager';

// Must run before the LangGraph adapter (or anything else) imports LangChain so the callback
// manager is patched first. main.ts and cli.ts therefore import this file
// first, before anything else.
export const telemetry = registerTelemetry({ projectName: 'intervals-agent' });

// LangChain must be manually instrumented; it doesn't have a traditional
// module structure the standard OTel auto-instrumentation can patch.
new LangChainInstrumentation().manuallyInstrument(CallbackManagerModule);
