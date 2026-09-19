import { register } from '@arizeai/phoenix-otel';
import { registerTelemetry } from '../index';

jest.mock('@arizeai/phoenix-otel', () => ({
  register: jest.fn(),
}));

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

    const params = (register as jest.Mock).mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(params).not.toHaveProperty('url');
  });
});
