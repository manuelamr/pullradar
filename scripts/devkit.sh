#!/bin/sh
# Launch a nested GNOME Shell (devkit window) to test the extension without logging out.
# Requires the mutter-devel package (provides /usr/libexec/mutter-devkit).
#
# Usage:
#   scripts/devkit.sh          Open the devkit window and show extension-related log lines
#   scripts/devkit.sh --check  Headless-friendly check: start, report extension state and errors, then exit
set -eu

UUID="github-prs@manuelamr"
EXTENSION_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_FILE="${TMPDIR:-/tmp}/pullradar-devkit.log"
LOG_FILTER="$UUID|JS ERROR|JS WARNING|Unhandled promise|extension\.js|indicator\.js|githubClient\.js|pullRequestItem\.js|tooltip\.js|prefs\.js"

if [ ! -x /usr/libexec/mutter-devkit ]; then
    echo "mutter-devkit not found. Install it with: sudo dnf install -y mutter-devel" >&2
    exit 1
fi

glib-compile-schemas "$EXTENSION_DIR/schemas"

if [ "${1:-}" != "--check" ]; then
    echo "Log: $LOG_FILE (close the devkit window to finish)"
    exec dbus-run-session -- sh -c "gnome-shell --devkit --wayland 2>&1 | tee '$LOG_FILE' | grep --line-buffered -iE '$LOG_FILTER'"
fi

exec dbus-run-session -- sh -c '
    UUID="$1"; LOG_FILE="$2"; LOG_FILTER="$3"
    gnome-shell --devkit --wayland > "$LOG_FILE" 2>&1 &
    SHELL_PID=$!
    trap "kill $SHELL_PID 2>/dev/null; wait $SHELL_PID 2>/dev/null" EXIT

    info() {
        gdbus call --session --dest org.gnome.Shell --object-path /org/gnome/Shell \
            --method org.gnome.Shell.Extensions.GetExtensionInfo "$UUID" 2>/dev/null
    }

    for _ in $(seq 1 60); do
        info | grep -q "'"'"'state'"'"'" && break
        sleep 1
    done
    sleep 20

    echo "Extension info:"
    info | grep -oE "'"'"'(name|state|enabled|error)'"'"': <[^>]*>" || echo "  extension not found"
    echo "Extension log lines:"
    grep -iE "$LOG_FILTER" "$LOG_FILE" || echo "  none"
    info | grep -qE "'"'"'state'"'"': <1(\.0)?>"
' sh "$UUID" "$LOG_FILE" "$LOG_FILTER"
