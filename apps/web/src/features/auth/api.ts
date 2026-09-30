import { apiRequest } from '@/shared/api/client';

export type Athlete = {
  id: string;
  email: string;
  name: string;
  initials: string;
  plan: string;
};

export type LoginResult = {
  token: string;
  athlete: Athlete;
};

export function login(email: string, password: string): Promise<LoginResult> {
  return apiRequest<LoginResult>('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}
