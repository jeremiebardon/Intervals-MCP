import type { Dashboard } from '@/mocks/fixtures/dashboard';
import { apiRequest } from '@/shared/api/client';

export type { Dashboard };

export function getDashboard(): Promise<Dashboard> {
  return apiRequest<Dashboard>('/api/dashboard');
}
