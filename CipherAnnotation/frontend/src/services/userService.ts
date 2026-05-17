/**
 * User service
 * Lookups for user autocomplete (e.g. share dialog)
 */

import api from './api';
import { User } from '../types';

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
}

export default new UserService();
