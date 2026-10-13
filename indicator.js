// Generated with AI for personal use.
// Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
// and can maintain this code.

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';

import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {AuthError, GitHubClient} from './githubClient.js';
import {PullRequestItem} from './pullRequestItem.js';
import {Tooltip} from './tooltip.js';

function readToken(tokenEnvVar, tokenFile) {
    const fromEnv = GLib.getenv(tokenEnvVar);
    if (fromEnv)
        return fromEnv.trim();

    const path = tokenFile.replace(/^~/, GLib.get_home_dir());
    if (!GLib.file_test(path, GLib.FileTest.IS_REGULAR))
        return '';
    const [ok, contents] = GLib.file_get_contents(path);
    return ok ? new TextDecoder('utf-8').decode(contents).trim() : '';
}

export const PullRequestsIndicator = GObject.registerClass(
class PullRequestsIndicator extends PanelMenu.Button {
    _init(extension) {
        super._init(0.0, 'GitHub Pending PRs');

        this._extension = extension;
        this._settings = extension.getSettings();
        this._cancellable = new Gio.Cancellable();
        this._refreshSourceId = null;
        this._tooltip = new Tooltip();
        this._menuOpenChangedId = this.menu.connect('open-state-changed', () => this._tooltip.hide());

        const box = new St.BoxLayout({style_class: 'panel-status-menu-box'});
        box.add_child(new St.Icon({
            gicon: Gio.icon_new_for_string(`${extension.path}/icons/pull-request-symbolic.svg`),
            style_class: 'system-status-icon',
        }));
        this._countLabel = new St.Label({text: '…', y_align: Clutter.ActorAlign.CENTER});
        box.add_child(this._countLabel);
        this._warningIcon = new St.Icon({icon_name: 'dialog-warning-symbolic', style_class: 'system-status-icon', visible: false});
        box.add_child(this._warningIcon);
        this.add_child(box);

        this._settingsChangedId = this._settings.connect('changed', () => this._restartRefreshLoop());
        this._restartRefreshLoop();
    }

    _restartRefreshLoop() {
        if (this._refreshSourceId) {
            GLib.Source.remove(this._refreshSourceId);
            this._refreshSourceId = null;
        }
        this._refreshSourceId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, this._settings.get_uint('refresh-interval'), () => {
            this._refresh();
            return GLib.SOURCE_CONTINUE;
        });
        this._refresh();
    }

    async _refresh() {
        const token = readToken(this._settings.get_string('token-env-var'), this._settings.get_string('token-file'));
        if (!token) {
            this._renderError(`No GitHub token found (${this._settings.get_string('token-env-var')} or token file)`);
            return;
        }

        const client = new GitHubClient(token);
        const includeDrafts = this._settings.get_boolean('include-drafts');
        const repositories = this._settings.get_strv('repositories');

        try {
            const results = await Promise.all(repositories.map(async repository => {
                const pulls = await client.listOpenPullRequests(repository, this._cancellable);
                return {repository, pulls: pulls.filter(pull => includeDrafts || !pull.isDraft)};
            }));
            this._render(results, client.tokenExpiration);
        } catch (error) {
            if (error instanceof AuthError)
                this._renderError('GitHub token invalid or expired (401).\nUpdate ~/.config/github-prs/token with a new PAT.', 'auth!');
            else if (!(error instanceof GLib.Error && error.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED)))
                this._renderError(error.message);
        } finally {
            client.destroy();
        }
    }

    _render(results, tokenExpiration) {
        this._tooltip.hide();
        this.menu.removeAll();
        const total = results.reduce((sum, result) => sum + result.pulls.length, 0);
        this._countLabel.text = `${total}`;
        this._renderExpirationWarning(tokenExpiration);

        const showEmptyRepositories = this._settings.get_boolean('show-empty-repositories');
        const oldestCreation = pulls => Math.min(...pulls.map(pull => Date.parse(pull.createdAt)));
        const visibleResults = results
            .filter(result => showEmptyRepositories || result.pulls.length > 0)
            .sort((a, b) => oldestCreation(a.pulls) - oldestCreation(b.pulls));

        if (visibleResults.length === 0) {
            this.menu.addMenuItem(new PopupMenu.PopupMenuItem('No pending PRs', {reactive: false}));
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        }

        for (const {repository, pulls} of visibleResults) {
            const header = new PopupMenu.PopupMenuItem(`${repository} (${pulls.length})`);
            header.label.style = 'font-weight: bold;';
            header.connect('activate', () => this._openUri(`https://github.com/${repository}/pulls`));
            this.menu.addMenuItem(header);

            if (pulls.length === 0)
                this.menu.addMenuItem(new PopupMenu.PopupMenuItem('No pending PRs', {reactive: false}));

            for (const pull of pulls) {
                const item = new PullRequestItem(pull, `${this._extension.path}/icons`, this._tooltip);
                item.connect('activate', () => this._openUri(pull.url));
                this.menu.addMenuItem(item);
            }
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        }
        this._addRefreshItem();
    }

    _renderExpirationWarning(tokenExpiration) {
        const warningDays = this._settings.get_uint('expiration-warning-days');
        const remainingMs = tokenExpiration ? tokenExpiration.getTime() - Date.now() : Infinity;
        const showWarning = warningDays > 0 && remainingMs <= warningDays * 86400000;
        this._warningIcon.visible = showWarning;
        if (!showWarning)
            return;

        const remainingDays = Math.max(0, Math.floor(remainingMs / 86400000));
        const expirationText = GLib.DateTime.new_from_unix_local(Math.floor(tokenExpiration.getTime() / 1000)).format('%Y-%m-%d %H:%M');
        const warning = new PopupMenu.PopupImageMenuItem(
            `GitHub token expires in ${remainingDays} day(s) (${expirationText}). Renew it soon.`,
            'dialog-warning-symbolic');
        warning.connect('activate', () => this._openUri('https://github.com/settings/tokens'));
        this.menu.addMenuItem(warning);
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    }

    _renderError(text, panelText = '!') {
        this.menu.removeAll();
        this._countLabel.text = panelText;
        this._warningIcon.visible = false;
        this.menu.addMenuItem(new PopupMenu.PopupMenuItem(text, {reactive: false}));
        this._addRefreshItem();
    }

    _addRefreshItem() {
        const refresh = new PopupMenu.PopupMenuItem(`Refresh (updated ${GLib.DateTime.new_now_local().format('%H:%M')})`);
        refresh.connect('activate', () => this._refresh());
        this.menu.addMenuItem(refresh);

        const preferences = new PopupMenu.PopupMenuItem('Settings');
        preferences.connect('activate', () => this._extension.openPreferences());
        this.menu.addMenuItem(preferences);
    }

    _openUri(uri) {
        Gio.AppInfo.launch_default_for_uri(uri, null);
    }

    destroy() {
        if (this._refreshSourceId) {
            GLib.Source.remove(this._refreshSourceId);
            this._refreshSourceId = null;
        }
        this._cancellable.cancel();
        this._settings.disconnect(this._settingsChangedId);
        this._settings = null;
        this.menu.disconnect(this._menuOpenChangedId);
        this._tooltip.destroy();
        this._tooltip = null;
        this._extension = null;
        super.destroy();
    }
});
