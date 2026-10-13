// Generated with AI for personal use.
// Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
// and can maintain this code.

import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import St from 'gi://St';

import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

const MAX_TITLE_LENGTH = 70;
const STATUS_ICON_SIZE = 14;

const Color = {
    SUCCESS: '#57e389',
    FAILURE: '#ff7b72',
    PENDING: '#f8c349',
    NEUTRAL: '#8b8e94',
};

const WORKFLOW_STATUS = {
    SUCCESS: [Color.SUCCESS, 'Checks passed'],
    FAILURE: [Color.FAILURE, 'Checks failed'],
    ERROR: [Color.FAILURE, 'Checks errored'],
    PENDING: [Color.PENDING, 'Checks running'],
    EXPECTED: [Color.PENDING, 'Checks expected'],
};

const REVIEW_STATUS = {
    APPROVED: [Color.SUCCESS, 'Approved'],
    CHANGES_REQUESTED: [Color.FAILURE, 'Changes requested'],
    REVIEW_REQUIRED: [Color.PENDING, 'Review required'],
};

const MERGE_STATUS = {
    CLEAN: [Color.SUCCESS, 'Ready to merge'],
    HAS_HOOKS: [Color.SUCCESS, 'Ready to merge'],
    UNSTABLE: [Color.PENDING, 'Mergeable with failing non-required checks'],
    BLOCKED: [Color.PENDING, 'Merge blocked'],
    BEHIND: [Color.PENDING, 'Branch is behind base'],
    DIRTY: [Color.FAILURE, 'Merge conflicts'],
    DRAFT: [Color.NEUTRAL, 'Draft'],
};

function truncate(text) {
    const singleLine = text.replace(/\s+/g, ' ').trim();
    return singleLine.length > MAX_TITLE_LENGTH ? `${singleLine.slice(0, MAX_TITLE_LENGTH - 1)}…` : singleLine;
}

function ageOf(isoDate) {
    const elapsedMs = Date.now() - Date.parse(isoDate);
    const days = Math.floor(elapsedMs / 86400000);
    return days > 0 ? `${days}d` : `${Math.floor(elapsedMs / 3600000)}h`;
}

function mergeStatusOf(pullRequest) {
    if (pullRequest.mergeable === 'CONFLICTING')
        return MERGE_STATUS.DIRTY;
    return MERGE_STATUS[pullRequest.mergeStateStatus] ?? [Color.NEUTRAL, 'Merge status unknown'];
}

export const PullRequestItem = GObject.registerClass(
class PullRequestItem extends PopupMenu.PopupBaseMenuItem {
    _init(pullRequest, iconsPath, tooltip) {
        super._init();

        const statuses = [
            ['workflow', 'Workflow', WORKFLOW_STATUS[pullRequest.workflowState] ?? [Color.NEUTRAL, 'No checks']],
            ['review', 'Review', REVIEW_STATUS[pullRequest.reviewDecision] ?? [Color.NEUTRAL, 'No review required']],
            ['merge', 'Merge', mergeStatusOf(pullRequest)],
        ];

        const iconsBox = new St.BoxLayout({style: 'spacing: 6px; margin-right: 10px;', y_align: Clutter.ActorAlign.CENTER});
        for (const [kind, title, [color, description]] of statuses) {
            const icon = new St.Icon({
                gicon: Gio.icon_new_for_string(`${iconsPath}/${kind}-symbolic.svg`),
                icon_size: STATUS_ICON_SIZE,
                style: `color: ${color};`,
                accessible_name: `${title}: ${description}`,
            });
            tooltip.attach(icon, `${title}: ${description}`);
            iconsBox.add_child(icon);
        }
        this.add_child(iconsBox);

        const draftTag = pullRequest.isDraft ? '[draft] ' : '';
        this.add_child(new St.Label({
            text: `#${pullRequest.number} ${draftTag}${truncate(pullRequest.title)} · ${pullRequest.author} · ${ageOf(pullRequest.createdAt)}`,
            y_align: Clutter.ActorAlign.CENTER,
        }));
    }
});
