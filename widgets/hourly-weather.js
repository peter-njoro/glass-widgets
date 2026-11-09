'use strict';

import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import GLib from 'gi://GLib';

import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import {FORECAST_CONFIG} from './forecast-config.js';
import {createWeatherPlaceholder} from './weather-placeholder.js';

export const GlassHourlyWeather = GObject.registerClass(
class GlassHourlyWeather extends St.BoxLayout {
    _init(forecast) {
        super._init({
            style_class: 'glass-card glass-forecast-card glass-hourly-card',
            vertical: true,
            width: FORECAST_CONFIG.cardWidthPx,
            height: FORECAST_CONFIG.cardHeightPx,
        });
        this._forecast = forecast;
        this._forecastId = forecast.connect(
            'forecast-updated', () => this._render());
        this._render();
    }

    _render() {
        for (const child of this.get_children())
            child.destroy();
        let items = this._forecast.hourly;
        const loading = !items.length;
        if (loading) {
            const now = GLib.DateTime.new_now_local();
            items = Array.from({length: this._forecast.hourlyHours}, (_, index) => ({
                time: now.add_hours(index).format(FORECAST_CONFIG.hourLabelFormat),
            }));
        }
        const title = new St.Label({
            style_class: 'glass-forecast-title',
            text: _('Hourly'),
            x_expand: true,
            x_align: Clutter.ActorAlign.CENTER,
        });
        this.add_child(title);

        const row = new St.BoxLayout({
            style_class: 'glass-forecast-row',
            x_align: Clutter.ActorAlign.CENTER,
        });
        this.add_child(row);
        for (const item of items) {
            const column = new St.BoxLayout({
                style_class: 'glass-forecast-item',
                vertical: true,
            });
            column.add_child(new St.Label({
                style_class: 'glass-forecast-time',
                text: item.time,
                x_align: Clutter.ActorAlign.CENTER,
            }));
            if (!loading) {
                column.add_child(new St.Icon({
                    style_class: 'glass-forecast-icon',
                    icon_name: item.icon,
                    icon_size: FORECAST_CONFIG.weatherIconSizePx,
                }));
                column.add_child(new St.Label({
                    style_class: 'glass-forecast-temperature',
                    text: item.temperature,
                    x_align: Clutter.ActorAlign.CENTER,
                }));
            }
            row.add_child(column);
        }
        if (loading)
            this.add_child(createWeatherPlaceholder());
    }

    destroy() {
        this._forecast.disconnect(this._forecastId);
        this._forecast = null;
        super.destroy();
    }
});
