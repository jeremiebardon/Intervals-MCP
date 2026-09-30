import type { Onboarding, SlotId, SportId } from '@/mocks/db';
import { apiRequest } from '@/shared/api/client';

export type { Onboarding, SlotId, SportId };

export function getOnboarding(): Promise<Onboarding> {
  return apiRequest<Onboarding>('/api/onboarding');
}

export function saveOnboarding(
  patch: Partial<Onboarding>,
): Promise<Onboarding> {
  return apiRequest<Onboarding>('/api/onboarding', {
    method: 'PATCH',
    body: patch,
  });
}

export function connectIntervals(key: string): Promise<Onboarding> {
  return apiRequest<Onboarding>('/api/onboarding/intervals-key', {
    method: 'POST',
    body: { key },
  });
}
