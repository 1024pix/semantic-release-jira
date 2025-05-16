import { Buffer } from 'node:buffer';

class JiraClient {
  constructor({ host, email, token, projectKey }) {
    this.host = host;
    this.email = email;
    this.token = token;
    this.projectKey = projectKey;
  }

  async request({ path, method, body }) {
    const fullUrl = `https://${this.host}${path}`;

    const headers = {
      'Authorization': `Basic ${Buffer.from(`${this.email}:${this.token}`).toString('base64')}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    const res = await fetch(fullUrl, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`HTTP ${res.status}: ${err}`);
    }

    return res.json();
  }
  
  async test() {
    return this.request({path: '/rest/api/3/myself'});
  }

  async ensureVersion({ name }) {
    const versions = await this.request({path: `/rest/api/3/project/${this.projectKey}/versions`});

    let version = versions.find(v => v.name === name);
    if (version) return version;

    return this.request({
      path: `/rest/api/3/version`,
      method: 'POST',
      body: {
        name,
        project: this.projectKey,
        released: true,
        releaseDate: new Date().toISOString().slice(0, 10),
      },
    });
  }

  async addFixVersionToIssue({ issueKey, versionId }) {
    return this.request({
      path: `/rest/api/3/issue/${issueKey}`,
      method: 'PUT',
      body: {
        update: {
          fixVersions: [{ add: { id: versionId } }],
        },
      },
    });
  }
}

export default JiraClient;
