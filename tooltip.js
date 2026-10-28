// Generated with AI for personal use.
// Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
// and can maintain this code.

import Clutter from 'gi://Clutter';
import Pango from 'gi://Pango';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const TOOLTIP_STYLE = [
    'background-color: rgba(30, 30, 34, 0.95)',
    'color: #ffffff',
    'border-radius: 8px',
    'padding: 5px 10px',
    'font-size: 0.9em',
    'border: 1px solid rgba(255, 255, 255, 0.12)',
].join('; ');

const TOOLTIP_OFFSET = 6;
const TOOLTIP_MAX_WIDTH = 600;

export class Tooltip {
    constructor() {
        this._label = new St.Label({style: TOOLTIP_STYLE, visible: false, opacity: 0});
        this._label.clutter_text.line_wrap = true;
        this._label.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
        Main.uiGroup.add_child(this._label);
    }

    attach(actor, textOrProvider) {
        actor.reactive = true;
        actor.track_hover = true;
        actor.connect('notify::hover', () => {
            const text = typeof textOrProvider === 'string' ? textOrProvider : textOrProvider();
            if (actor.hover && text)
                this._show(actor, text);
            else
                this.hide();
        });
    }

    _show(actor, text) {
        this._label.text = text;
        Main.uiGroup.set_child_above_sibling(this._label, null);

        const [actorX, actorY] = actor.get_transformed_position();
        const [actorWidth, actorHeight] = actor.get_transformed_size();
        const monitor = Main.layoutManager.findMonitorForActor(actor);

        this._label.set_width(-1);
        const maxWidth = Math.min(TOOLTIP_MAX_WIDTH, monitor.width);
        if (this._label.get_preferred_width(-1)[1] > maxWidth)
            this._label.set_width(maxWidth);
        const labelWidth = this._label.get_preferred_width(-1)[1];

        const centeredX = Math.round(actorX + (actorWidth - labelWidth) / 2);
        const x = Math.min(Math.max(centeredX, monitor.x), monitor.x + monitor.width - labelWidth);
        this._label.set_position(x, Math.round(actorY + actorHeight + TOOLTIP_OFFSET));

        this._label.remove_all_transitions();
        this._label.show();
        this._label.ease({opacity: 255, duration: 120, mode: Clutter.AnimationMode.EASE_OUT_QUAD});
    }

    hide() {
        this._label.remove_all_transitions();
        this._label.opacity = 0;
        this._label.hide();
    }

    destroy() {
        this._label.destroy();
        this._label = null;
    }
}
