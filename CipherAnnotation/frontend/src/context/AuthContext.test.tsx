import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { useContext } from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';

vi.mock('../services/authService', () => ({
  default: {
    getAccessToken: vi.fn(),
    getMe: vi.fn(),
    saveUser: vi.fn(),
    saveAuth: vi.fn(),
    clear: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    googleLogin: vi.fn(),
    logout: vi.fn(),
  },
}));

import { AuthContext, AuthProvider } from './AuthContext';
import authService from '../services/authService';

const mocked = authService as unknown as Record<string, ReturnType<typeof vi.fn>>;

function Probe({ onValue }: { onValue: (v: unknown) => void }) {
  const v = useContext(AuthContext);
  onValue(v);
  return (
    <div>
      <span data-testid="auth">{String(v?.isAuthenticated)}</span>
      <span data-testid="loading">{String(v?.isLoading)}</span>
      <span data-testid="error">{v?.error ?? ''}</span>
    </div>
  );
}

function renderWithProvider() {
  const onValue = vi.fn();
  const ui = render(
    <AuthProvider>
      <Probe onValue={onValue} />
    </AuthProvider>,
  );
  return { ...ui, onValue };
}

describe('AuthContext', () => {
  beforeEach(() => vi.clearAllMocks());

  it('initializes unauthenticated when there is no stored token', async () => {
    mocked.getAccessToken.mockReturnValue(null);

    renderWithProvider();

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('auth').textContent).toBe('false');
    expect(mocked.getMe).not.toHaveBeenCalled();
  });

  it('initializes authenticated from a stored token', async () => {
    mocked.getAccessToken.mockReturnValue('tok-1');
    mocked.getMe.mockResolvedValue({ id: 'u1', email: 'a@b' });

    renderWithProvider();

    await waitFor(() => expect(screen.getByTestId('auth').textContent).toBe('true'));
    expect(mocked.saveUser).toHaveBeenCalledWith({ id: 'u1', email: 'a@b' });
  });

  it('clears auth if getMe fails on init', async () => {
    mocked.getAccessToken.mockReturnValue('tok-1');
    mocked.getMe.mockRejectedValue(new Error('expired'));

    renderWithProvider();

    await waitFor(() => expect(mocked.clear).toHaveBeenCalled());
    expect(screen.getByTestId('auth').textContent).toBe('false');
  });

  it('login() success updates state via handleAuthResponse', async () => {
    mocked.getAccessToken.mockReturnValue(null);
    mocked.login.mockResolvedValue({
      accessToken: 'tok-new',
      accessTokenExpiresAt: 'never',
      user: { id: 'u1' },
    });

    const { onValue } = renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    const value = onValue.mock.calls.at(-1)![0] as {
      login: (d: unknown) => Promise<void>;
    };
    await act(async () => {
      await value.login({ email: 'a@b', password: 'x' });
    });

    expect(mocked.saveAuth).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId('auth').textContent).toBe('true'));
  });

  it('login() failure sets error and rethrows', async () => {
    mocked.getAccessToken.mockReturnValue(null);
    mocked.login.mockRejectedValue(new Error('bad creds'));

    const { onValue } = renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    const value = onValue.mock.calls.at(-1)![0] as {
      login: (d: unknown) => Promise<void>;
    };
    let caught: unknown;
    await act(async () => {
      try { await value.login({ email: '', password: '' }); } catch (e) { caught = e; }
    });
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toBe('bad creds');

    await waitFor(() => expect(screen.getByTestId('error').textContent).toBe('bad creds'));
  });

  it('logout() clears local state', async () => {
    mocked.getAccessToken.mockReturnValue('tok-1');
    mocked.getMe.mockResolvedValue({ id: 'u1' });
    mocked.logout.mockResolvedValue(undefined);

    const { onValue } = renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('auth').textContent).toBe('true'));

    const value = onValue.mock.calls.at(-1)![0] as { logout: () => Promise<void> };
    await act(async () => { await value.logout(); });

    await waitFor(() => expect(screen.getByTestId('auth').textContent).toBe('false'));
  });

  it('clearError() resets error', async () => {
    mocked.getAccessToken.mockReturnValue(null);
    mocked.login.mockRejectedValue(new Error('x'));

    const { onValue } = renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    const value = onValue.mock.calls.at(-1)![0] as {
      login: (d: unknown) => Promise<void>;
      clearError: () => void;
    };
    await act(async () => {
      try { await value.login({ email: '', password: '' }); } catch { /* swallow */ }
    });
    await waitFor(() => expect(screen.getByTestId('error').textContent).toBe('x'));

    act(() => value.clearError());
    expect(screen.getByTestId('error').textContent).toBe('');
  });
});
