# semantic-release-jira

[**semantic-release**](https://github.com/semantic-release/semantic-release) plugin to update Jira tickets with version number.

## Install

```bash
npm install --save-dev semantic-release-jira
```

## Usage

The plugin can be configured in the [**semantic-release** configuration file](https://github.com/semantic-release/semantic-release/blob/master/docs/usage/configuration.md#configuration):

```json
{
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "semantic-release-jira"
  ]
}
```

## Configuration

### Environment variables

| Variable | Description |
|----------|-------------|
| `JIRA_HOST` | **Required.** The Jira instance host URL. |
| `JIRA_EMAIL` | **Required.** The email of the user used to authenticate. |
| `JIRA_API_TOKEN` | **Required.** The API token used to authenticate. See [Jira documentation](https://confluence.atlassian.com/cloud/api-tokens-938839638.html). |
| `JIRA_PROJECT` | **Required.** The Jira project key. |
| `JIRA_TICKET_REGEX` | Optional. The regex used to extract ticket numbers from commit messages. Default: `[A-Z]+-\d+` |

### How it works

1. The plugin will verify the Jira connection during the `verifyConditions` step.
2. During the `publish` step, it will:
   - Create a new version in Jira if it doesn't exist
   - Extract Jira ticket numbers from commit messages
   - Add the version to the "Fix Version" field of each ticket

### Example

With the following commits:

```
[FEATURE] Add new user page (PIX-123)
[FIX] Fix login error (PIX-456)
```

And the following configuration:

```json
{
  "plugins": ["semantic-release-jira"]
}
```

The plugin will:
1. Create a version in Jira (e.g., "1.0.0")
2. Add this version to the "Fix Version" field of tickets PIX-123 and PIX-456

## License

MIT 