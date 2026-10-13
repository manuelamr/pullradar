// Generated with AI for personal use.
// Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
// and can maintain this code.

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Soup from 'gi://Soup?version=3.0';

Gio._promisify(Soup.Session.prototype, 'send_and_read_async');

const GRAPHQL_URL = 'https://api.github.com/graphql';

const PULL_REQUESTS_QUERY = `
query($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    pullRequests(states: OPEN, first: 100, orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes {
        number
        title
        url
        isDraft
        createdAt
        author { login }
        reviewDecision
        mergeable
        mergeStateStatus
        commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }
      }
    }
  }
}`;

export class AuthError extends Error {
    constructor() {
        super('GitHub token is invalid or expired');
        this.name = 'AuthError';
    }
}

function toPullRequest(node) {
    return {
        number: node.number,
        title: node.title,
        url: node.url,
        isDraft: node.isDraft,
        createdAt: node.createdAt,
        author: node.author ? node.author.login : 'ghost',
        workflowState: node.commits.nodes[0]?.commit.statusCheckRollup?.state ?? null,
        reviewDecision: node.reviewDecision,
        mergeable: node.mergeable,
        mergeStateStatus: node.mergeStateStatus,
    };
}

export class GitHubClient {
    constructor(token) {
        this._token = token;
        this._session = new Soup.Session({user_agent: 'gnome-shell-github-prs'});
        this._encoder = new TextEncoder();
        this._decoder = new TextDecoder('utf-8');
        this.tokenExpiration = null;
    }

    async listOpenPullRequests(repository, cancellable) {
        const [owner, name] = repository.split('/');
        const body = JSON.stringify({query: PULL_REQUESTS_QUERY, variables: {owner, name}});

        const message = Soup.Message.new('POST', GRAPHQL_URL);
        message.request_headers.append('Authorization', `Bearer ${this._token}`);
        message.request_headers.append('Accept', 'application/vnd.github.merge-info-preview+json');
        message.set_request_body_from_bytes('application/json', new GLib.Bytes(this._encoder.encode(body)));

        const bytes = await this._session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, cancellable);
        if (message.get_status() === Soup.Status.UNAUTHORIZED)
            throw new AuthError();
        if (message.get_status() !== Soup.Status.OK)
            throw new Error(`${repository}: HTTP ${message.get_status()} ${message.get_reason_phrase()}`);

        const expiration = message.response_headers.get_one('github-authentication-token-expiration');
        if (expiration)
            this.tokenExpiration = new Date(expiration.replace(' UTC', 'Z').replace(' ', 'T'));

        const response = JSON.parse(this._decoder.decode(bytes.get_data()));
        if (response.errors)
            throw new Error(`${repository}: ${response.errors.map(error => error.message).join('; ')}`);

        return response.data.repository.pullRequests.nodes.map(toPullRequest);
    }

    destroy() {
        this._session.abort();
        this._session = null;
    }
}
