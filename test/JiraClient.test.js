import { describe, it, expect, vi, beforeEach } from 'vitest';
import JiraClient from '../JiraClient.js';

global.fetch = vi.fn();

describe('JiraClient', () => {
  let jiraClient;
  const mockConfig = {
    host: 'jira.example.com',
    email: 'test@example.com',
    token: 'fake-token',
    projectKey: 'TEST'
  };

  beforeEach(() => {
    jiraClient = new JiraClient(mockConfig);
    fetch.mockReset();
  });

  describe('#request', () => {
    it('should make a request with correct URL and headers', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true })
      };
      fetch.mockResolvedValue(mockResponse);

      // when
      const result = await jiraClient.request({ 
        path: '/rest/api/3/test', 
        method: 'GET' 
      });

      // then
      expect(fetch).toHaveBeenCalledWith(
        'https://jira.example.com/rest/api/3/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': expect.any(String),
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          })
        })
      );
      expect(result).toEqual({ success: true });
    });

    it('should throw an error when response is not ok', async () => {
      // given
      const mockResponse = {
        ok: false,
        status: 401,
        text: vi.fn().mockResolvedValue('Unauthorized')
      };
      fetch.mockResolvedValue(mockResponse);

      // when and expect error
      await expect(jiraClient.request({ 
        path: '/rest/api/3/test', 
        method: 'GET' 
      })).rejects.toThrow('HTTP 401: Unauthorized');
    });

    it('should include body when provided', async () => {
      // given
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true })
      };
      fetch.mockResolvedValue(mockResponse);

      const requestBody = { key: 'value' };

      // when
      await jiraClient.request({ 
        path: '/rest/api/3/test', 
        method: 'POST',
        body: requestBody
      });

      // then
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody)
        })
      );
    });
  });

  describe('#test', () => {
    it('should call request with correct path', async () => {
      // given
      jiraClient.request = vi.fn().mockResolvedValue({ name: 'Test User' });

      // when
      await jiraClient.test();

      // then
      expect(jiraClient.request).toHaveBeenCalledWith({
        path: '/rest/api/3/myself'
      });
    });
  });

  describe('#ensureVersion', () => {
    it('should return existing version when found', async () => {
      // given
      const mockVersions = [
        { id: '1', name: 'v1.0.0' },
        { id: '2', name: 'v2.0.0' }
      ];
      jiraClient.request = vi.fn().mockResolvedValueOnce(mockVersions);

      // when
      const result = await jiraClient.ensureVersion({ name: 'v1.0.0' });

      // then
      expect(jiraClient.request).toHaveBeenCalledWith({
        path: `/rest/api/3/project/${mockConfig.projectKey}/versions`
      });
      expect(result).toEqual(mockVersions[0]);
    });

    it('should create new version when not found', async () => {
      // given
      const mockVersions = [];
      const newVersion = { id: '3', name: 'v3.0.0' };
      
      jiraClient.request = vi.fn()
        .mockResolvedValueOnce(mockVersions)
        .mockResolvedValueOnce(newVersion);

      const mockDate = new Date('2025-05-15');
      const originalDate = global.Date;
      global.Date = class extends Date {
        constructor() {
          return mockDate;
        }
      };

      try {
        // when
        const result = await jiraClient.ensureVersion({ name: 'v3.0.0' });

        // then
        expect(jiraClient.request).toHaveBeenCalledTimes(2);
        expect(jiraClient.request).toHaveBeenNthCalledWith(1, {
          path: `/rest/api/3/project/${mockConfig.projectKey}/versions`
        });
        expect(jiraClient.request).toHaveBeenNthCalledWith(2, {
          path: '/rest/api/3/version',
          method: 'POST',
          body: {
            name: 'v3.0.0',
            project: mockConfig.projectKey,
            released: true,
            releaseDate: '2025-05-15'
          }
        });
        expect(result).toEqual(newVersion);
      } finally {
        // Restore original Date
        global.Date = originalDate;
      }
    });
  });

  describe('#addFixVersionToIssue', () => {
    it('should call request with correct parameters', async () => {
      // given
      const mockResponse = { success: true };
      jiraClient.request = vi.fn().mockResolvedValue(mockResponse);

      // when
      const result = await jiraClient.addFixVersionToIssue({ 
        issueKey: 'TEST-123', 
        versionId: '1' 
      });

      // then
      expect(jiraClient.request).toHaveBeenCalledWith({
        path: '/rest/api/3/issue/TEST-123',
        method: 'PUT',
        body: {
          update: {
            fixVersions: [{ add: { id: '1' } }]
          }
        }
      });
      expect(result).toEqual(mockResponse);
    });
  });
});
