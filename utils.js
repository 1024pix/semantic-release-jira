import JiraClient from './JiraClient.js';

export function extractJiraKeys(commits, pattern) {
  const regex = new RegExp(pattern, 'gi');
  return [
    ...new Set(
      commits.flatMap(({ message }) => message.match(regex) || []).map(k => k.toUpperCase())
    ),
  ];
}
