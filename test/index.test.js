import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyConditions, publish } from '../index.js';
import JiraClient from '../JiraClient.js';
import { extractJiraKeys } from '../utils.js';

vi.mock('../JiraClient.js');
vi.mock('../utils.js');

describe('semantic-release-jira plugin', () => {
  const mockLogger = {
    log: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe('verifyConditions', () => {
    it('should throw error when required environment variables are missing', async () => {
      // when
      const verifyPromise = verifyConditions({}, { logger: mockLogger, env: {} });

      // then
      await expect(verifyPromise).rejects.toThrow('[semantic-release-jira] Missing environment variable : JIRA_HOST, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT');
    });

    it('should pass when all required environment variables are present and connection is successful', async () => {
      // given
      const env = {
        JIRA_HOST: 'https://jira.example.com',
        JIRA_EMAIL: 'test@example.com',
        JIRA_API_TOKEN: 'fake-token',
        JIRA_PROJECT: 'TEST'
      };

      JiraClient.prototype.test.mockResolvedValue();

      // when
      await verifyConditions({}, { logger: mockLogger, env });

      // then
      expect(mockLogger.log).toHaveBeenCalledWith('[semantic-release-jira] Jira connection successful ✅');
    });

    it('should throw error when Jira connection fails', async () => {
      // given
      const env = {
        JIRA_HOST: 'https://jira.example.com',
        JIRA_EMAIL: 'test@example.com',
        JIRA_API_TOKEN: 'fake-token',
        JIRA_PROJECT: 'TEST'
      };

      const error = new Error('Connection failed');
      JiraClient.prototype.test.mockRejectedValue(error);

      // when
      const verifyPromise = verifyConditions({}, { logger: mockLogger, env });

      // then
      await expect(verifyPromise).rejects.toThrow('[semantic-release-jira] Jira connection error : Connection failed');
    });
  });

  describe('publish', () => {
    const defaultEnv = {
      JIRA_HOST: 'https://jira.example.com',
      JIRA_EMAIL: 'test@example.com',
      JIRA_API_TOKEN: 'fake-token',
      JIRA_PROJECT: 'TEST'
    };

    const context = {
      nextRelease: { version: '1.0.0' },
      commits: [
        { message: '[FEATURE] Add new user page (PIX-123)' },
        { message: '[FIX] Fix login error (PIX-456)' }
      ],
      logger: mockLogger,
      env: defaultEnv
    };

    it('should create version and update issues when commits contain Jira tickets', async () => {
      // given
      const mockVersion = { id: '1', name: '1.0.0' };
      JiraClient.prototype.ensureVersion.mockResolvedValue(mockVersion);
      JiraClient.prototype.addFixVersionToIssue.mockResolvedValue({});
      extractJiraKeys.mockReturnValue(['PIX-123', 'PIX-456']);

      // when
      await publish({}, context);

      // then
      expect(JiraClient.prototype.ensureVersion).toHaveBeenCalledWith({ name: '1.0.0' });
      expect(mockLogger.log).toHaveBeenCalledWith('[semantic-release-jira] Jira version « 1.0.0 » ready (id=1)');
      expect(mockLogger.log).toHaveBeenCalledWith('[semantic-release-jira] Tickets found : PIX-123, PIX-456');
      expect(JiraClient.prototype.addFixVersionToIssue).toHaveBeenCalledTimes(2);
      expect(JiraClient.prototype.addFixVersionToIssue).toHaveBeenCalledWith({
        issueKey: 'PIX-123',
        versionId: '1'
      });
      expect(JiraClient.prototype.addFixVersionToIssue).toHaveBeenCalledWith({
        issueKey: 'PIX-456',
        versionId: '1'
      });
    });

    it('should handle case when no Jira tickets are found in commits', async () => {
      // given
      const mockVersion = { id: '1', name: '1.0.0' };
      JiraClient.prototype.ensureVersion.mockResolvedValue(mockVersion);
      extractJiraKeys.mockReturnValue([]);

      // when
      await publish({}, context);

      // then
      expect(JiraClient.prototype.ensureVersion).toHaveBeenCalledWith({ name: '1.0.0' });
      expect(mockLogger.log).toHaveBeenCalledWith('[semantic-release-jira] No Jira ticket detected.');
      expect(JiraClient.prototype.addFixVersionToIssue).not.toHaveBeenCalled();
    });

    it('should log error but continue when updating an issue fails', async () => {
      // given
      const mockVersion = { id: '1', name: '1.0.0' };
      const error = new Error('Update failed');
      JiraClient.prototype.ensureVersion.mockResolvedValue(mockVersion);
      JiraClient.prototype.addFixVersionToIssue.mockRejectedValue(error);
      extractJiraKeys.mockReturnValue(['TEST-123']);

      // when
      await publish({}, context);

      // then
      expect(mockLogger.error).toHaveBeenCalledWith('[semantic-release-jira] ⚠️ Error updating TEST-123 : Update failed');
    });

    it('should use custom ticket regex when provided', async () => {
      // given
      const customRegex = 'CUSTOM-\\d+';
      const contextWithCustomRegex = {
        ...context,
        env: {
          ...defaultEnv,
          JIRA_TICKET_REGEX: customRegex
        }
      };
      const mockVersion = { id: '1', name: '1.0.0' };
      JiraClient.prototype.ensureVersion.mockResolvedValue(mockVersion);
      extractJiraKeys.mockReturnValue(['CUSTOM-123']);

      // when
      await publish({}, contextWithCustomRegex);

      // then
      expect(extractJiraKeys).toHaveBeenCalledWith(contextWithCustomRegex.commits, customRegex);
    });
  });
}); 