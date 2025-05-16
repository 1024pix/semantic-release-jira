import { describe, it, expect } from 'vitest';
import { extractJiraKeys } from '../utils.js';

describe('utils', () => {
  describe('extractJiraKeys', () => {
    it('should extract Jira keys from commit messages using default pattern', () => {
      // given
      const commits = [
        { message: '[FEATURE] Add new user page (PIX-123)' },
        { message: '[FIX] Fix login error (PIX-456)' },
        { message: '[CHORE] Update dependencies' }
      ];
      const pattern = '[A-Z]+-\\d+';

      // when
      const result = extractJiraKeys(commits, pattern);

      // then
      expect(result).toEqual(['PIX-123', 'PIX-456']);
    });

    it('should handle multiple Jira keys in the same commit message', () => {
      // given
      const commits = [
        { message: '[FEATURE] Add new feature (PIX-123, PIX-456)' },
        { message: '[FIX] Related to PIX-789 and PIX-101' }
      ];
      const pattern = '[A-Z]+-\\d+';

      // when
      const result = extractJiraKeys(commits, pattern);

      // then
      expect(result).toEqual(['PIX-123', 'PIX-456', 'PIX-789', 'PIX-101']);
    });

    it('should return empty array when no Jira keys are found', () => {
      // given
      const commits = [
        { message: '[FEATURE] Add new feature' },
        { message: '[FIX] Fix bug' }
      ];
      const pattern = '[A-Z]+-\\d+';

      // when
      const result = extractJiraKeys(commits, pattern);

      // then
      expect(result).toEqual([]);
    });

    it('should handle custom ticket pattern', () => {
      // given
      const commits = [
        { message: '[FEATURE] Add new feature (CUSTOM-123)' },
        { message: '[FIX] Fix bug (CUSTOM-456)' }
      ];
      const pattern = 'CUSTOM-\\d+';

      // when
      const result = extractJiraKeys(commits, pattern);

      // then
      expect(result).toEqual(['CUSTOM-123', 'CUSTOM-456']);
    });

    it('should return unique keys even if they appear multiple times', () => {
      // given
      const commits = [
        { message: '[FEATURE] Initial implementation (PIX-123)' },
        { message: '[FIX] Fix implementation (PIX-123)' },
        { message: '[FEATURE] Another feature (PIX-456)' }
      ];
      const pattern = '[A-Z]+-\\d+';

      // when
      const result = extractJiraKeys(commits, pattern);

      // then
      expect(result).toEqual(['PIX-123', 'PIX-456']);
    });

    it('should handle case-insensitive matching and return uppercase keys', () => {
      // given
      const commits = [
        { message: '[FEATURE] Add feature (pix-123)' },
        { message: '[FIX] Fix bug (PIX-456)' }
      ];
      const pattern = '[A-Z]+-\\d+';

      // when
      const result = extractJiraKeys(commits, pattern);

      // then
      expect(result).toEqual(['PIX-123', 'PIX-456']);
    });

    it('should handle empty commits array', () => {
      // given
      const commits = [];
      const pattern = '[A-Z]+-\\d+';

      // when
      const result = extractJiraKeys(commits, pattern);

      // then
      expect(result).toEqual([]);
    });

    it('should handle invalid regex pattern gracefully', () => {
      // given
      const commits = [
        { message: '[FEATURE] Add feature (PIX-123)' }
      ];
      const pattern = '['; // Invalid regex pattern

      // when & then
      expect(() => extractJiraKeys(commits, pattern)).toThrow();
    });
  });
}); 