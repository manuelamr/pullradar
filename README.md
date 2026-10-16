# PullRadar

A GNOME Shell extension that keeps an eye on the open pull requests of your GitHub repositories, right from the top bar.

- Panel icon with the total number of pending PRs.
- Menu grouped by repository, ordered by the oldest pending PR first (repositories without PRs are hidden by default).
- Three status icons per PR, with tooltips:

| Icon | Green | Amber | Red | Grey |
|---|---|---|---|---|
| Workflow | Checks passed | Checks running / expected | Checks failed | No checks |
| Review | Approved | Review required | Changes requested | No review required |
| Merge | Ready to merge | Blocked / behind base / non-required checks failing | Conflicts | Draft / unknown |

- Click a PR to open it in the browser; click a repository to open its PR list.
- Warning when the token is invalid (`401`) and a configurable number of days before it expires.
- Resilient refresh: 15 s request timeout, **Refresh** cancels any pending attempt, automatic retry when the network comes back, and per-repository errors (`403`/`404`) without hiding the rest.

Requires **GNOME Shell 49 or 50**.

## Installation

```sh
git clone https://github.com/manuelamr/pullradar.git \
  ~/.local/share/gnome-shell/extensions/github-prs@manuelamr
cd ~/.local/share/gnome-shell/extensions/github-prs@manuelamr
glib-compile-schemas schemas/
```

Log out and log back in (required on Wayland so GNOME Shell discovers the new extension), then:

```sh
gnome-extensions enable github-prs@manuelamr
```

To update later: `git pull && glib-compile-schemas schemas/` and log out/in again.

## GitHub token

Create a [personal access token](https://github.com/settings/tokens):

- **Fine-grained**: read-only access to *Pull requests*, *Contents* and *Commit statuses* for the repositories you want to watch.
- **Classic**: `repo` scope.

If your organization uses SSO, authorize the token for it.

The extension looks for the token in this order:

1. **Environment variable** (default `GITHUB_TOKEN`). GNOME Shell does not inherit variables exported in `~/.zshrc`/`~/.bashrc`, so it must be set for the graphical session, e.g. in `~/.config/environment.d/github.conf`.
2. **Token file** (default `~/.config/github-prs/token`). The simplest option:

```sh
mkdir -p ~/.config/github-prs
printf '%s' 'YOUR_TOKEN' > ~/.config/github-prs/token
chmod 600 ~/.config/github-prs/token
```

When the token expires, overwrite the file with the new one and click **Refresh** in the menu. No restart needed.

## Configuration

Open the preferences window from the menu (**Settings**) or with:

```sh
gnome-extensions prefs github-prs@manuelamr
```

### Load the whole configuration at once with dconf

```sh
dconf load /org/gnome/shell/extensions/github-prs/ <<'EOF'
[/]
repositories=['myorg/reponame', 'myorg/another-repo']
refresh-interval=uint32 300
include-drafts=false
show-empty-repositories=false
expiration-warning-days=uint32 3
proxy-url=''
token-env-var='GITHUB_TOKEN'
token-file='~/.config/github-prs/token'
EOF
```

Back up or copy your current configuration to another machine:

```sh
dconf dump /org/gnome/shell/extensions/github-prs/ > pullradar.ini
dconf load /org/gnome/shell/extensions/github-prs/ < pullradar.ini
```

Reset to defaults: `dconf reset -f /org/gnome/shell/extensions/github-prs/`

| Key | Default | Description |
|---|---|---|
| `repositories` | `['myorg/reponame']` | Repositories to watch (`owner/name`) |
| `refresh-interval` | `300` | Seconds between updates (60–86400) |
| `include-drafts` | `false` | Include draft PRs |
| `show-empty-repositories` | `false` | List repositories without pending PRs |
| `expiration-warning-days` | `3` | Days before token expiration to warn (`0` disables) |
| `proxy-url` | `''` | HTTP proxy for GitHub requests, e.g. `http://user:pass@proxy:8080` (empty uses the system proxy settings) |
| `token-env-var` | `GITHUB_TOKEN` | Environment variable holding the token |
| `token-file` | `~/.config/github-prs/token` | Fallback token file |

## Troubleshooting

```sh
journalctl -f -o cat /usr/bin/gnome-shell
```

## License

[GPL-2.0-or-later](LICENSE)
