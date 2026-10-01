'use strict';

import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import GLib from 'gi://GLib';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const GlassCalendarWidget = GObject.registerClass(
class GlassCalendarWidget extends St.BoxLayout {
    _init(settings = null) {
        super._init({
            style_class: 'glass-card glass-calendar-card',
            vertical: true,
            x_align: Clutter.ActorAlign.CENTER,
        });

        this._settings = settings;
        this._settingsChangedIds = [];
        if (this._settings) {
            this._settingsChangedIds.push(this._settings.connect(
                'changed::clock-format-24h', () => this._render()));
        }

        this._render();
        this._timeout = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT, 60, () => {
                this._render();
                return GLib.SOURCE_CONTINUE;
            });
    }

    _render() {
        for (const child of this.get_children())
            child.destroy();

        const now = new Date();
        const title = new St.Label({
            style_class: 'glass-calendar-title',
            text: now.toLocaleString(undefined, {month: 'long', year: 'numeric'}),
            x_expand: true,
            x_align: Clutter.ActorAlign.CENTER,
        });
        this.add_child(title);

        const weekdayRow = new St.BoxLayout({
            style_class: 'glass-calendar-weekdays',
            x_align: Clutter.ActorAlign.CENTER,
        });

        for (const day of DAY_NAMES) {
            weekdayRow.add_child(new St.Label({
                style_class: 'glass-calendar-weekday',
                text: day,
                x_align: Clutter.ActorAlign.CENTER,
            }));
        }
        this.add_child(weekdayRow);

        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const startOffset = (firstOfMonth.getDay() + 6) % 7;
        const daysInMonth = lastOfMonth.getDate();

        const monthGrid = new St.BoxLayout({
            style_class: 'glass-calendar-grid',
            vertical: true,
        });

        let currentDay = 1;
        for (let row = 0; row < 5; row++) {
            const rowBox = new St.BoxLayout({
                style_class: 'glass-calendar-row',
                x_align: Clutter.ActorAlign.CENTER,
            });

            for (let col = 0; col < 7; col++) {
                const label = new St.Label({
                    style_class: 'glass-calendar-day',
                    text: ' ',
                    x_align: Clutter.ActorAlign.CENTER,
                    y_align: Clutter.ActorAlign.CENTER,
                });

                if (row === 0 && col < startOffset) {
                    label.text = ' ';
                } else if (currentDay > daysInMonth) {
                    label.text = ' ';
                } else {
                    label.text = String(currentDay);
                    if (currentDay === now.getDate())
                        label.style_class = 'glass-calendar-day glass-calendar-today';
                    currentDay += 1;
                }

                rowBox.add_child(label);
            }

            monthGrid.add_child(rowBox);
            if (currentDay > daysInMonth)
                break;
        }

        this.add_child(monthGrid);
    }

    destroy() {
        if (this._timeout) {
            GLib.Source.remove(this._timeout);
            this._timeout = null;
        }
        for (const id of this._settingsChangedIds)
            this._settings.disconnect(id);
        this._settingsChangedIds = [];
        super.destroy();
    }
});
