import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const useAuthMock = vi.fn();
vi.mock('@/hooks', () => ({
  useAuth: () => useAuthMock(),
}));

import ProtectedRoute from './ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<div>login page</div>} />
      <Route path="/documents" element={<div>documents page</div>} />
      <Route
        path="/protected"
        element={
          <ProtectedRoute>
            <div>secret</div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="Admin">
            <div>admin area</div>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders a spinner while loading', () => {
    useAuthMock.mockReturnValue({ isAuthenticated: false, isLoading: true, user: null });
    const { container } = renderAt('/protected');
    expect(container.querySelector('.animate-spin')).not.toBeNull();
  });

  it('redirects to /login when not authenticated', () => {
    useAuthMock.mockReturnValue({ isAuthenticated: false, isLoading: false, user: null });
    renderAt('/protected');
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    useAuthMock.mockReturnValue({ isAuthenticated: true, isLoading: false, user: { id: 'u', role: 'User' } });
    renderAt('/protected');
    expect(screen.getByText('secret')).toBeInTheDocument();
  });

  it('redirects to /documents when role does not match requiredRole', () => {
    useAuthMock.mockReturnValue({ isAuthenticated: true, isLoading: false, user: { id: 'u', role: 'User' } });
    renderAt('/admin');
    expect(screen.getByText('documents page')).toBeInTheDocument();
  });

  it('renders children when requiredRole matches', () => {
    useAuthMock.mockReturnValue({ isAuthenticated: true, isLoading: false, user: { id: 'u', role: 'Admin' } });
    renderAt('/admin');
    expect(screen.getByText('admin area')).toBeInTheDocument();
  });
});
