/**
 * User service
 * Lookups for user autocomplete (e.g. share dialog)
 */

import api from './api';
import { User, UserRole, PaginatedResponse } from '../types';

export type UserSearchResult = Pick<User, 'id' | 'email' | 'name' | 'avatarUri'>;

class UserService {
  /**
   * Search users by name or email. Returns [] for queries shorter than 2 chars.
   */
  async search(query: string, limit = 10, signal?: AbortSignal): Promise<UserSearchResult[]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];

    const response = await api.get<UserSearchResult[]>('/users/search', {
      params: { q: trimmed, limit },
      signal,
    });
    return response.data;
  }

  /**
   * Admin-only: list all users (paginated, optional name/email filter).
   */
  async listAll(
    q: string,
    page: number,
    pageSize: number,
    signal?: AbortSignal,
  ): Promise<PaginatedResponse<User>> {
    const params: Record<string, string | number> = { page, pageSize };
    const trimmed = q.trim();
    if (trimmed) params.q = trimmed;

    const response = await api.get<PaginatedResponse<User>>('/admin/users', { params, signal });
    return response.data;
  }

  /**
   * Admin-only: change a user's role.
   */
  async updateRole(id: string, role: UserRole): Promise<void> {
    await api.put(`/admin/users/${id}/role`, { role });
  }
}

export default new UserService();
