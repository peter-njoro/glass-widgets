'use strict';

import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import GLib from 'gi://GLib';

export const GlassClockWidget = GObject.registerClass(
class GlassClockWidget extends St.BoxLayout {
    _init() {
        super._init({
            style_class: 'glass-card',
            vertical: true,
            x_expand: true,
            y_expand: true,
        });

        this._timeLabel = new St.Label({
            style_class: 'glass-clock-time',
            x_align: Clutter.ActorAlign.CENTER,
        });
        this.add_child(this._timeLabel);

        this._dateLabel = new St.Label({
            style_class: 'glass-clock-date',
            x_align: Clutter.ActorAlign.CENTER,
        });
        this.add_child(this._dateLabel);

        this._timeout = null;
        this._updateTime();
        this._startTimer();
    }

    _updateTime() {
        const now = GLib.DateTime.new_now_local();
        this._timeLabel.text = now.format('%H:%M');
        this._dateLabel.text = now.format('%A, %B %e');
    }

    _startTimer() {
        this._timeout = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT, 1, () => {
                this._updateTime();
                return GLib.SOURCE_CONTINUE;
            });
    }

    destroy() {
        if (this._timeout) {
            GLib.Source.remove(this._timeout);
            this._timeout = null;
        }
        super.destroy();
    }
});
