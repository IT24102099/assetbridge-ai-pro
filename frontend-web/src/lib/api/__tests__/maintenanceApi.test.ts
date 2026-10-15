import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from '../../api';
import { maintenanceApi } from '../maintenanceApi';

vi.mock('../../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('maintenanceApi.getJobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should forward search, status, and pagination parameters to the backend', async () => {
    const mockResponse = {
      data: {
        success: true,
        data: {
          items: [],
          pageNumber: 2,
          pageSize: 10,
          totalCount: 25,
          totalPages: 3,
        },
      },
    };

    (apiClient.get as any).mockResolvedValue(mockResponse);

    const queryParams = {
      searchTerm: 'Roof Leak',
      status: 'Planned',
      pageNumber: 2,
      pageSize: 10,
    };

    const result = await maintenanceApi.getJobs(queryParams);

    expect(apiClient.get).toHaveBeenCalledWith('/maintenance-jobs', {
      params: {
        searchTerm: 'Roof Leak',
        search: 'Roof Leak',
        status: 'Planned',
        pageNumber: 2,
        pageSize: 10,
      },
    });

    expect(result.success).toBe(true);
    expect(result.data?.totalPages).toBe(3);
    expect(result.data?.totalCount).toBe(25);
  });

  it('should handle call without search term or filters', async () => {
    const mockResponse = {
      data: {
        success: true,
        data: {
          items: [],
          pageNumber: 1,
          pageSize: 10,
          totalCount: 0,
          totalPages: 1,
        },
      },
    };

    (apiClient.get as any).mockResolvedValue(mockResponse);

    const result = await maintenanceApi.getJobs({ pageNumber: 1, pageSize: 10 });

    expect(apiClient.get).toHaveBeenCalledWith('/maintenance-jobs', {
      params: {
        pageNumber: 1,
        pageSize: 10,
      },
    });

    expect(result.success).toBe(true);
  });
});
