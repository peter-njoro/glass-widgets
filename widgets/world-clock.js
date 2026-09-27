'use strict';

import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import GLib from 'gi://GLib';

const HAND_COLORS = {
    hour: 'rgba(255,255,255,0.9)',
    minute: 'rgba(255,255,255,0.85)',
    second: 'rgba(255,118,118,0.9)',
};

export const GlassWorldClockWidget = GObject.registerClass(
class GlassWorldClockWidget extends St.BoxLayout {
    _init(settings = null) {
        super._init({
            style_class: 'glass-card glass-world-clock-card',
            vertical: true,
            x_align: Clutter.ActorAlign.CENTER,
        });

        this._settings = settings;
        this._settingsChangedId = null;
        this._timeout = null;

        if (this._settings) {
            this._settingsChangedId = this._settings.connect(
                'changed::world-clock-entries', () => this._render());
        }

        this._render();
        this._timeout = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT, 1, () => {
                this._render();
                return GLib.SOURCE_CONTINUE;
            });
    }

    _getEntries() {
        if (!this._settings)
            return [];

        const entries = [];
        for (const raw of this._settings.get_strv('world-clock-entries')) {
            try {
                const parsed = JSON.parse(raw);
                if (!parsed || typeof parsed.tz !== 'string')
                    continue;
                entries.push({
                    tz: parsed.tz,
                    label: typeof parsed.label === 'string' && parsed.label.trim()
                        ? parsed.label.trim()
                        : parsed.tz.split('/').pop().replace(/_/g, ' '),
                });
            } catch (e) {
                continue;
            }
        }
        return entries;
    }

    _makeClockFace(entry) {
        const tz = GLib.TimeZone.new(entry.tz);
        const dateTime = GLib.DateTime.new_now(tz);
        const hour = dateTime.get_hour();
        const minute = dateTime.get_minute();
        const second = dateTime.get_second();

        const wrap = new St.BoxLayout({
            vertical: true,
            style_class: 'glass-world-clock-item',
            x_align: Clutter.ActorAlign.CENTER,
        });

        const label = new St.Label({
            style_class: 'glass-world-clock-label',
            text: entry.label,
            x_align: Clutter.ActorAlign.CENTER,
        });
        wrap.add_child(label);

        const dial = new St.Widget({
            style_class: 'glass-world-clock-dial',
            width: 68,
            height: 68,
            layout_manager: new Clutter.BinLayout(),
        });

        const face = new St.Widget({
            style_class: 'glass-world-clock-face',
            width: 68,
            height: 68,
        });
        dial.add_child(face);

        for (let i = 0; i < 12; i++) {
            const isCardinal = i === 0 || i === 3 || i === 6 || i === 9;
            const tick = new St.Widget({
                width: isCardinal ? 3 : 2,
                height: isCardinal ? 10 : i % 3 === 0 ? 7 : 5,
                style: `background-color: ${isCardinal ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.45)'}; border-radius: 999px;`,
            });
            tick.set_pivot_point(0.5, 0.5);
            tick.set_position(34 - tick.width / 2, 0);
            tick.rotation_angle_z = i * 30;
            dial.add_child(tick);
        }

        const hourAngle = ((hour % 12) + minute / 60 + second / 3600) * 30;
        const minuteAngle = (minute + second / 60) * 6;
        const secondAngle = second * 6;

        const hourHand = this._makeHand(8, 18, HAND_COLORS.hour, hourAngle);
        const minuteHand = this._makeHand(6, 26, HAND_COLORS.minute, minuteAngle);
        const secondHand = this._makeHand(2, 24, HAND_COLORS.second, secondAngle);
        dial.add_child(hourHand);
        dial.add_child(minuteHand);
        dial.add_child(secondHand);

        const centerDot = new St.Widget({
            style_class: 'glass-world-clock-center',
            width: 6,
            height: 6,
        });
        dial.add_child(centerDot);

        wrap.add_child(dial);
        return wrap;
    }

    _makeHand(width, height, color, angle) {
        const hand = new St.Widget({
            width,
            height,
            style: `background-color: ${color}; border-radius: 999px;`,
        });
        hand.set_pivot_point(0.5, 1.0);
        hand.set_position((68 - width) / 2, 34 - height);
        hand.rotation_angle_z = angle;
        return hand;
    }

    _render() {
        for (const child of this.get_children())
            child.destroy();

        const entries = this._getEntries();
        this.visible = entries.length > 0;
        if (!entries.length)
            return;

        const title = new St.Label({
            style_class: 'glass-world-clock-title',
            text: 'World Clock',
            x_expand: true,
            x_align: Clutter.ActorAlign.CENTER,
        });
        this.add_child(title);

        const row = new St.BoxLayout({
            style_class: 'glass-world-clock-row',
            x_align: Clutter.ActorAlign.CENTER,
        });
        for (const entry of entries) {
            row.add_child(this._makeClockFace(entry));
        }
        this.add_child(row);
        this.width = Math.max(180, 90 * entries.length + 20);
        this.height = Math.max(140, 86 + (entries.length > 4 ? 24 : 0));
    }

    destroy() {
        if (this._timeout) {
            GLib.Source.remove(this._timeout);
            this._timeout = null;
        }
        if (this._settingsChangedId) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = null;
        }
        super.destroy();
    }
});
