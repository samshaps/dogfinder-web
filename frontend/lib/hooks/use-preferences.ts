"use client";

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/lib/auth/user-context';

export interface UserPreferences {
  id?: string;
  zip_codes: string[];
  age_preferences: string[];
  size_preferences: string[];
  energy_level?: string;
  include_breeds: string[];
  exclude_breeds: string[];
  temperament_traits: string[];
  living_situation: {
    has_yard?: boolean;
    has_children?: boolean;
    has_other_pets?: boolean;
    activity_level?: string;
  };
  notification_preferences: {
    email_alerts?: boolean;
    frequency?: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface SearchHistoryItem {
  id: string;
  search_query: any;
  results_count?: number;
  search_duration_ms?: number;
  created_at: string;
}

export interface SearchHistoryResponse {
  search_history: SearchHistoryItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

export function usePreferences() {
  const { user, isAuthenticated } = useUser();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user preferences
  const fetchPreferences = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/preferences');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch preferences');
      }

      setPreferences(data.preferences);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching preferences:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Save user preferences
  const savePreferences = useCallback(async (newPreferences: Partial<UserPreferences>) => {
    if (!isAuthenticated) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPreferences),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save preferences');
      }

      setPreferences(data.preferences);
      return data.preferences;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error saving preferences:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Delete user preferences
  const deletePreferences = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/preferences', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete preferences');
      }

      setPreferences(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error deleting preferences:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch preferences when user changes
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchPreferences();
    } else {
      setPreferences(null);
    }
  }, [isAuthenticated, user, fetchPreferences]);

  return {
    preferences,
    loading,
    error,
    fetchPreferences,
    savePreferences,
    deletePreferences,
  };
}

export function useSearchHistory() {
  const { user, isAuthenticated } = useUser();
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<SearchHistoryResponse['pagination'] | null>(null);

  // Fetch search history
  const fetchSearchHistory = useCallback(async (limit = 10, offset = 0) => {
    if (!isAuthenticated) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/search-history?limit=${limit}&offset=${offset}`);
      const data: SearchHistoryResponse = await response.json();

      if (!response.ok) {
        throw new Error((data as any).error || 'Failed to fetch search history');
      }

      if (offset === 0) {
        // Replace the list for first page
        setSearchHistory(data.search_history);
      } else {
        // Append to the list for subsequent pages
        setSearchHistory(prev => [...prev, ...data.search_history]);
      }
      
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching search history:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Record a new search
  const recordSearch = useCallback(async (searchQuery: any, resultsCount?: number, durationMs?: number) => {
    if (!isAuthenticated) return;

    try {
      const response = await fetch('/api/search-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          search_query: searchQuery,
          results_count: resultsCount,
          search_duration_ms: durationMs,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to record search');
      }

      // Refresh search history to include the new search
      await fetchSearchHistory();
    } catch (err) {
      console.error('Error recording search:', err);
      // Don't throw error for recording search - it's not critical
    }
  }, [isAuthenticated, fetchSearchHistory]);

  // Clear search history
  const clearSearchHistory = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/search-history', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to clear search history');
      }

      setSearchHistory([]);
      setPagination(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error clearing search history:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Load more search history
  const loadMore = useCallback(async () => {
    if (!pagination?.has_more || loading) return;
    
    await fetchSearchHistory(pagination.limit, searchHistory.length);
  }, [pagination, loading, searchHistory.length, fetchSearchHistory]);

  // Fetch search history when user changes
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchSearchHistory();
    } else {
      setSearchHistory([]);
      setPagination(null);
    }
  }, [isAuthenticated, user, fetchSearchHistory]);

  return {
    searchHistory,
    pagination,
    loading,
    error,
    fetchSearchHistory,
    recordSearch,
    clearSearchHistory,
    loadMore,
  };
}
