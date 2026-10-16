// Generated with AI for personal use.
// Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
// and can maintain this code.

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const REPOSITORY_PATTERN = /^[\w.-]+\/[\w.-]+$/;

export default class GitHubPullRequestsPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const page = new Adw.PreferencesPage();
        window.add(page);

        page.add(this._buildGeneralGroup(settings));
        page.add(this._buildTokenGroup(settings));
        page.add(this._buildRepositoriesGroup(settings));
    }

    _buildTokenGroup(settings) {
        const group = new Adw.PreferencesGroup({
            title: 'GitHub token',
            description: 'The environment variable is used first; the file is the fallback',
        });

        const envVarRow = new Adw.EntryRow({title: 'Environment variable'});
        settings.bind('token-env-var', envVarRow, 'text', Gio.SettingsBindFlags.DEFAULT);
        group.add(envVarRow);

        const fileRow = new Adw.EntryRow({title: 'Token file'});
        settings.bind('token-file', fileRow, 'text', Gio.SettingsBindFlags.DEFAULT);
        group.add(fileRow);

        return group;
    }

    _buildGeneralGroup(settings) {
        const group = new Adw.PreferencesGroup({title: 'General'});

        const intervalRow = new Adw.SpinRow({
            title: 'Refresh interval',
            subtitle: 'Seconds between updates',
            adjustment: new Gtk.Adjustment({lower: 60, upper: 86400, step_increment: 30, page_increment: 300}),
        });
        settings.bind('refresh-interval', intervalRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        group.add(intervalRow);

        const draftsRow = new Adw.SwitchRow({title: 'Include draft PRs'});
        settings.bind('include-drafts', draftsRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        group.add(draftsRow);

        const emptyRow = new Adw.SwitchRow({
            title: 'Show repositories without pending PRs',
            subtitle: 'When disabled, only repositories with open PRs are listed',
        });
        settings.bind('show-empty-repositories', emptyRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        group.add(emptyRow);

        const expirationRow = new Adw.SpinRow({
            title: 'Token expiration warning',
            subtitle: 'Days before the PAT expires to show a warning (0 disables)',
            adjustment: new Gtk.Adjustment({lower: 0, upper: 90, step_increment: 1, page_increment: 7}),
        });
        settings.bind('expiration-warning-days', expirationRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        group.add(expirationRow);

        const proxyRow = new Adw.EntryRow({title: 'HTTP proxy (empty = system settings)'});
        proxyRow.set_tooltip_text('e.g. http://proxy.example.com:8080 or http://user:pass@proxy.example.com:8080');
        settings.bind('proxy-url', proxyRow, 'text', Gio.SettingsBindFlags.DEFAULT);
        group.add(proxyRow);

        return group;
    }

    _buildRepositoriesGroup(settings) {
        const group = new Adw.PreferencesGroup({
            title: 'Repositories',
            description: 'Format: owner/name (e.g. myorg/reponame)',
        });

        const addRow = new Adw.EntryRow({title: 'Add repository', show_apply_button: true});
        addRow.connect('apply', () => {
            const repository = addRow.text.trim().replace(/^https:\/\/github\.com\//, '').replace(/\/$/, '');
            const repositories = settings.get_strv('repositories');
            if (!REPOSITORY_PATTERN.test(repository) || repositories.includes(repository)) {
                addRow.add_css_class('error');
                return;
            }
            addRow.remove_css_class('error');
            settings.set_strv('repositories', [...repositories, repository]);
            addRow.text = '';
        });
        group.add(addRow);

        let repositoryRows = [];
        const renderRepositories = () => {
            repositoryRows.forEach(row => group.remove(row));
            repositoryRows = settings.get_strv('repositories').map(repository => {
                const row = new Adw.ActionRow({title: repository});
                const removeButton = new Gtk.Button({
                    icon_name: 'user-trash-symbolic',
                    valign: Gtk.Align.CENTER,
                    css_classes: ['flat'],
                    tooltip_text: 'Remove',
                });
                removeButton.connect('clicked', () => {
                    settings.set_strv('repositories', settings.get_strv('repositories').filter(item => item !== repository));
                });
                row.add_suffix(removeButton);
                group.add(row);
                return row;
            });
        };

        const changedId = settings.connect('changed::repositories', renderRepositories);
        group.connect('destroy', () => settings.disconnect(changedId));
        renderRepositories();

        return group;
    }
}
