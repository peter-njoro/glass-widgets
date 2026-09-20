'use strict';

import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import GLib from 'gi://GLib';

import {GlassWeather} from './weather.js';
import {applyDynamicStyle} from './style.js';

export const GlassClockWidget = GObject.registerClass(
class GlassClockWidget extends St.BoxLayout {
    _init(settings = null) {
        super._init({
            style_class: 'glass-card glass-clock-card',
            vertical: false,
        });

        this._settings = settings;
        this._settingsChangedIds = [];
        this._settingsChangedIds.push(this._settings.connect('changed::clock-style-override-enabled', () => this._updateTime()));
        this._settingsChangedIds.push(this._settings.connect('changed::clock-format-24h', () => this._updateTime()));
        this._settingsChangedIds.push(this._settings.connect('changed::clock-font-weight', () => this._applyStyle()));
        this._settingsChangedIds.push(this._settings.connect('changed::clock-hour-minute-size-ratio', () => this._updateTime()));
        this._settingsChangedIds.push(this._settings.connect('changed::clock-color', () => this._applyStyle()));
        this._weather = null;

        this._leftBox = new St.BoxLayout({
            vertical: true,
            style_class: 'glass-clock-left',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this.add_child(this._leftBox);

        this._timeLabel = new St.Label({
            style_class: 'glass-clock-time',
            x_align: Clutter.ActorAlign.CENTER,
        });
        this._leftBox.add_child(this._timeLabel);

        this._dateLabel = new St.Label({
            style_class: 'glass-clock-date',
            x_align: Clutter.ActorAlign.CENTER,
        });
        this._leftBox.add_child(this._dateLabel);

        if (settings && settings.get_boolean('show-weather'))
            this._buildWeather();

        this._timeout = null;
        this._updateTime();
        this._startTimer();
    }

    _buildWeather() {
        this._weatherBox = new St.BoxLayout({
            vertical: true,
            style_class: 'glass-clock-weather-col',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this.add_child(this._weatherBox);

        this._weatherRow = new St.BoxLayout({
            style_class: 'glass-weather-row',
            x_align: Clutter.ActorAlign.CENTER,
        });
        this._weatherBox.add_child(this._weatherRow);

        this._weatherIcon = new St.Icon({
            style_class: 'glass-weather-icon',
            icon_size: 40,
        });
        this._weatherRow.add_child(this._weatherIcon);

        this._weatherTemp = new St.Label({
            style_class: 'glass-clock-weather',
            text: '--',
        });
        this._weatherRow.add_child(this._weatherTemp);

        this._weatherLoc = new St.Label({
            style_class: 'glass-clock-weather-loc',
            text: '',
            x_align: Clutter.ActorAlign.CENTER,
        });
        this._weatherBox.add_child(this._weatherLoc);

        this._weatherBox.hide();

        this._weather = new GlassWeather(this._settings);
        this._weatherId = this._weather.connect('weather-updated',
            () => this._updateWeather());
    }

    _updateWeather() {
        if (!this._weatherBox)
            return;

        if (this._weather.hasWeather) {
            this._weatherIcon.icon_name = this._weather.iconName;
            this._weatherTemp.text = this._weather.temperature;
            this._weatherLoc.text = this._weather.locationName
                ? this._weather.locationName
                : '';
            this._weatherBox.show();
        } else {
            this._weatherBox.hide();
        }
    }

    _updateTime() {
        const now = GLib.DateTime.new_now_local();
        const format24h = this._settings.get_boolean('clock-format-24h');
        const ratio = Math.max(0.5, Math.min(1.5,
            this._settings.get_double('clock-hour-minute-size-ratio')));

        const hour = format24h ? now.format('%H') : now.format('%I');
        const minute = now.format('%M');
        const suffix = format24h ? '' : now.format(' %p');

        if (this._settings.get_boolean('clock-style-override-enabled') &&
            Math.abs(ratio - 1.0) > 0.01) {
            const sizeHour = Math.round(40 * ratio);
            const sizeMinute = 40;
            const clutterText = this._timeLabel.clutterText;
            clutterText.use_markup = true;
            clutterText.set_markup(
                `<span size="${sizeHour}pt">${hour}</span>` +
                `<span size="${sizeMinute}pt">:${minute}${suffix}</span>`);
        } else {
            const clutterText = this._timeLabel.clutterText;
            clutterText.use_markup = false;
            this._timeLabel.text = `${hour}:${minute}${suffix}`;
        }

        this._dateLabel.text = now.format('%a %e %b');
        this._applyStyle();
    }

    _applyStyle() {
        if (!this._settings.get_boolean('clock-style-override-enabled')) {
            this._timeLabel.set_style('');
            return;
        }
        const color = this._settings.get_string('clock-color') || '#ffffff';
        const weight = this._settings.get_int('clock-font-weight');
        applyDynamicStyle(this._timeLabel,
            `font-weight: ${weight}; color: ${color};`);
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
        for (const id of this._settingsChangedIds)
            this._settings.disconnect(id);
        this._settingsChangedIds = [];
        if (this._weather) {
            this._weather.disconnect(this._weatherId);
            this._weather.destroy();
            this._weather = null;
        }
        super.destroy();
    }
});
