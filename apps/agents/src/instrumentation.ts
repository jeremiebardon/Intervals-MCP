import { register } from '@arizeai/phoenix-otel';
import { LangChainInstrumentation } from '@arizeai/openinference-instrumentation-langchain';
import * as CallbackManagerModule from '@langchain/core/callbacks/manager';

// Sends LangChain traces (agent runs, model calls, tool calls) to Phoenix.
// Must be imported before anything else loads LangChain, so main.ts imports
// this file first.
export const tracerProvider = register({ projectName: 'intervals-agent' });

new LangChainInstrumentation().manuallyInstrument(CallbackManagerModule);
