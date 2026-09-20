'use strict';

import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import St from 'gi://St';

export const GlassWeeklyWeather = GObject.registerClass(
class GlassWeeklyWeather extends St.BoxLayout {
    _init(forecast) {
        super._init({
            style_class: 'glass-card glass-forecast-card glass-weekly-card',
            vertical: true,
        });
        this._forecast = forecast;
        this._forecastId = forecast.connect(
            'forecast-updated', () => this._render());
        this._render();
    }

    _render() {
        for (const child of this.get_children())
            child.destroy();
        const items = this._forecast.daily;
        this.visible = items.length > 0;
        const title = new St.Label({
            style_class: 'glass-forecast-title',
            text: 'Weekly',
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
                text: item.date,
                x_align: Clutter.ActorAlign.CENTER,
            }));
            column.add_child(new St.Icon({
                style_class: 'glass-forecast-icon',
                icon_name: item.icon,
                icon_size: 24,
            }));
            column.add_child(new St.Label({
                style_class: 'glass-forecast-temperature',
                text: `${item.max}/${item.min}`,
                x_align: Clutter.ActorAlign.CENTER,
            }));
            row.add_child(column);
        }
    }

    destroy() {
        this._forecast.disconnect(this._forecastId);
        this._forecast = null;
        super.destroy();
    }
});
