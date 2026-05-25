import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:8081';

export const USER = {
  name: 'E2E User',
  email: 'e2e-user@example.test',
  password: 'E2e-Password!123',
};

export const ADMIN = {
  name: 'E2E Admin',
  email: 'e2e-admin@example.test',
  password: 'E2e-Password!123',
};

export const SEED = {
  documentTitle: 'E2E Seed Document',
  documentDescription: 'Created by Playwright global setup',
};

export const SAMPLE_PAGE = path.resolve(__dirname, 'sample-page.png');

export const AUTH_DIR = path.resolve(__dirname, '..', '.auth');
export const USER_STATE = path.join(AUTH_DIR, 'user.json');
export const ADMIN_STATE = path.join(AUTH_DIR, 'admin.json');
