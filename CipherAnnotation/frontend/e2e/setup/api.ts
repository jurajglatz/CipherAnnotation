import { APIRequestContext, expect } from '@playwright/test';
import fs from 'fs';
import { SAMPLE_PAGE } from '../fixtures/constants';

export interface Creds { name: string; email: string; password: string; }
export interface AuthResult { accessToken: string; accessTokenExpiresAt: string; user: any; }

/** Register a user; ignore "already exists" so seeding is idempotent across reused servers. */
export async function ensureRegistered(api: APIRequestContext, c: Creds): Promise<void> {
  const res = await api.post('/api/auth/register', {
    data: { name: c.name, email: c.email, password: c.password },
  });
  // 200/201 = created; 400/409 = already exists from a previous reused-server run; 429 = rate-limited (also means exists).
  expect([200, 201, 400, 409, 429]).toContain(res.status());
}

export async function login(api: APIRequestContext, c: Creds): Promise<AuthResult> {
  // Retry on 429 (rate-limited) — auth policy allows 5 req/min/IP; rapid re-runs can hit it.
  for (let attempt = 0; attempt < 12; attempt++) {
    const res = await api.post('/api/auth/login', {
      data: { email: c.email, password: c.password },
    });
    if (res.status() === 429) {
      await new Promise((r) => setTimeout(r, 6_000));
      continue;
    }
    expect(res.ok()).toBeTruthy();
    return (await res.json()) as AuthResult;
  }
  throw new Error('login: still rate-limited after retries');
}

/** Fetch the current user's documents. */
export async function getDocuments(api: APIRequestContext, accessToken: string): Promise<any[]> {
  const res = await api.get('/api/documents', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as any[];
}

/** Create the seed document only if one with the given title doesn't already exist. */
export async function ensureSeedDocument(
  api: APIRequestContext, accessToken: string, title: string, description: string,
): Promise<void> {
  const docs = await getDocuments(api, accessToken);
  if (docs.some((d) => d?.title === title)) return;
  await createSeedDocument(api, accessToken, title, description);
}

/** Create a document with one uploaded page. Returns the created document JSON. */
export async function createSeedDocument(
  api: APIRequestContext, accessToken: string, title: string, description: string,
): Promise<any> {
  const res = await api.post('/api/documents', {
    headers: { Authorization: `Bearer ${accessToken}` },
    multipart: {
      title,
      description,
      files: {
        name: 'sample-page.png',
        mimeType: 'image/png',
        buffer: fs.readFileSync(SAMPLE_PAGE),
      },
    },
  });
  expect(res.ok()).toBeTruthy();
  return await res.json();
}
