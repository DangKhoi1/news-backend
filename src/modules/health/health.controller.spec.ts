import { HealthController } from './health.controller';
describe('HealthController', () => {
  it('returns an operational status', () => {
    const result = new HealthController().check();
    expect(result.data.status).toBe('ok');
    expect(result.data.service).toBe('nhip-tin-backend');
    expect(result.data.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });
});
