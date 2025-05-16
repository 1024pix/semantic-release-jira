import { env } from 'node:process';
import JiraClient from './JiraClient.js';
import { extractJiraKeys } from './utils.js';

export async function verifyConditions(pluginConfig, { logger }, envVars = env) {
  const required = ['JIRA_HOST', 'JIRA_EMAIL', 'JIRA_API_TOKEN', 'JIRA_PROJECT'];
  const missing = required.filter(name => !envVars[name]);

  if (missing.length) {
    throw new Error(`[semantic-release-jira] Missing environment variable : ${missing.join(', ')}`);
  }

  const jiraConfig = {
    host: envVars.JIRA_HOST,
    email: envVars.JIRA_EMAIL,
    token: envVars.JIRA_API_TOKEN,
  };

  try {
    await new JiraClient(jiraConfig).test();
    logger.log('[semantic-release-jira] Jira connection successful ✅');
  } catch (err) {
    throw new Error(`[semantic-release-jira] Jira connection error : ${err.message}`);
  }
}


export async function publish(pluginConfig, context, envVars = env) {
  const {
    nextRelease: { version },
    commits,
    logger,
  } = context;

  const jiraConfig = {
    host: envVars.JIRA_HOST,
    email: envVars.JIRA_EMAIL,
    token: envVars.JIRA_API_TOKEN,
    projectKey: envVars.JIRA_PROJECT,
    ticketRegex: envVars.JIRA_TICKET_REGEX || '[A-Z]+-\\d+',
  };

  const jiraClient = new JiraClient(jiraConfig);

  const jiraVersion = await jiraClient.ensureVersion({ name: version });
  logger.log(`[semantic-release-jira] Jira version « ${version} » ready (id=${jiraVersion.id})`);

  const issueKeys =  extractJiraKeys(commits, jiraConfig.ticketRegex);
  if (!issueKeys.length) {
    logger.log('[semantic-release-jira] No Jira ticket detected.');
    return;
  }
  logger.log(`[semantic-release-jira] Tickets found : ${issueKeys.join(', ')}`);

  await Promise.all(
    issueKeys.map(async key => {
      try {
        await jiraClient.addFixVersionToIssue({ issueKey: key, versionId: jiraVersion.id });
        logger.log(`[semantic-release-jira] ➜ ${key} updated with version ${version}.`);
      } catch (err) {
        logger.error(`[semantic-release-jira] ⚠️ Error updating ${key} : ${err.message}`);
      }
    })
  );
}