import { register } from '@arizeai/phoenix-otel';
import { registerTelemetry } from '../index';

jest.mock('@arizeai/phoenix-otel', () => ({
  register: jest.fn(),
}));

const mockRegister = register as jest.MockedFunction<typeof register>;

describe('registerTelemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers the Phoenix tracer provider under the given project name', () => {
    registerTelemetry({ projectName: 'intervals-icu-mcp' });

    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith({
      projectName: 'intervals-icu-mcp',
    });
  });

  it('passes no endpoint, leaving PHOENIX_COLLECTOR_ENDPOINT to decide', () => {
    registerTelemetry({ projectName: 'intervals-agent' });

    const params = mockRegister.mock.calls[0][0];
    expect(params).not.toHaveProperty('url');
  });

  it('returns a handle whose forceFlush delegates to the provider returned by register', async () => {
    const forceFlush = jest.fn().mockResolvedValue(undefined);
    mockRegister.mockReturnValue({ forceFlush } as never);

    const handle = registerTelemetry({ projectName: 'intervals-agent' });
    await handle.forceFlush();

    expect(forceFlush).toHaveBeenCalledTimes(1);
  });

  it('returns a handle whose shutdown delegates to the provider returned by register', async () => {
    const shutdown = jest.fn().mockResolvedValue(undefined);
    mockRegister.mockReturnValue({ shutdown } as never);

    const handle = registerTelemetry({ projectName: 'intervals-agent' });
    await handle.shutdown();

    expect(shutdown).toHaveBeenCalledTimes(1);
  });
});
