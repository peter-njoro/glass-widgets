/*
 * glass-widgets - Desktop glassmorphism widgets for GNOME Shell
 * Copyright (C) 2026 Peter Njoroge
 * https://github.com/peter-njoro/glass-widgets
 */

'use strict';

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Shell from 'gi://Shell';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {GlassClockWidget} from './widgets/clock.js';
import {GlassStatsWidget} from './widgets/stats.js';
import {GlassLocation} from './widgets/location.js';
import {GlassForecast} from './widgets/forecast.js';
import {GlassHourlyWeather} from './widgets/hourly-weather.js';
import {GlassWeeklyWeather} from './widgets/weekly-weather.js';

const OPACITY_KEY = 'widget-opacity';
const BLUR_KEY = 'blur-enabled';
const SHOW_CLOCK_KEY = 'show-clock';
const SHOW_STATS_KEY = 'show-stats';
const SHOW_WEATHER_KEY = 'show-weather';
const SHOW_HOURLY_KEY = 'show-hourly-weather';
const SHOW_WEEKLY_KEY = 'show-weekly-weather';
const POSITION_KEYS = {
    clock: ['clock-x', 'clock-y'],
    stats: ['stats-x', 'stats-y'],
    hourly: ['hourly-x', 'hourly-y'],
    weekly: ['weekly-x', 'weekly-y'],
};

const STRUCTURAL_KEYS = [
    SHOW_CLOCK_KEY, SHOW_STATS_KEY, SHOW_WEATHER_KEY,
    SHOW_HOURLY_KEY, SHOW_WEEKLY_KEY,
];

export default class GlassWidgetsExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._locationHelper = new GlassLocation(this._settings);
        this._forecast = null;
        this._widgetContainer = null;
        this._widgets = [];
        this._widgetPositionKeys = new Map();
        this._widgetSizeChangedIds = new Map();
        this._updateId = null;
        this._widthChangedId = null;
        this._heightChangedId = null;
        this._monitorsChangedId = null;

        this._buildWidgets();
        this._addToDesktop();

        this._updateId = this._settings.connect('changed', (_settings, key) => {
            if (STRUCTURAL_KEYS.includes(key))
                this._rebuildWidgets();
        });
    }

    disable() {
        if (this._updateId) {
            this._settings.disconnect(this._updateId);
            this._updateId = null;
        }

        this._removeFromDesktop();
        this._destroyWidgets();
        this._destroyForecast();
        this._locationHelper.destroy();
        this._locationHelper = null;
        this._settings = null;
    }

    _buildWidgets() {
        this._destroyWidgets();
        this._destroyForecast();

        if (this._settings.get_boolean(SHOW_CLOCK_KEY)) {
            this._addWidget(new GlassClockWidget(this._settings, this._locationHelper), 'clock');
        }
        if (this._settings.get_boolean(SHOW_STATS_KEY)) {
            this._addWidget(new GlassStatsWidget(), 'stats');
        }

        const showHourly = this._settings.get_boolean(SHOW_HOURLY_KEY);
        const showWeekly = this._settings.get_boolean(SHOW_WEEKLY_KEY);
        if (showHourly || showWeekly) {
            this._forecast = new GlassForecast(this._settings, this._locationHelper);
            if (showHourly)
                this._addWidget(new GlassHourlyWeather(this._forecast), 'hourly');
            if (showWeekly)
                this._addWidget(new GlassWeeklyWeather(this._forecast), 'weekly');
        }
    }

    _addWidget(widget, positionName) {
        this._widgets.push(widget);
        this._widgetPositionKeys.set(widget, POSITION_KEYS[positionName]);
    }

    _destroyWidgets() {
        for (const w of this._widgets) {
            const sizeChangedIds = this._widgetSizeChangedIds.get(w);
            if (sizeChangedIds) {
                for (const id of sizeChangedIds)
                    w.disconnect(id);
                this._widgetSizeChangedIds.delete(w);
            }
            w.destroy();
        }
        this._widgets = [];
        this._widgetPositionKeys.clear();
    }

    _destroyForecast() {
        if (this._forecast) {
            this._forecast.destroy();
            this._forecast = null;
        }
    }

    _addToDesktop() {
        this._removeFromDesktop();

        this._widgetContainer = new St.Widget({
            style_class: 'glass-widget-container',
            layout_manager: new Clutter.FixedLayout(),
            reactive: true,
            can_focus: false,
        });

        for (const w of this._widgets)
            this._attachWidget(w);

        this._updateOpacity();
        this._updateBlur();

        Main.layoutManager._backgroundGroup.add_child(this._widgetContainer);

        this._updatePosition();

        this._monitorsChangedId = Main.layoutManager.connect('monitors-changed', () => this._updatePosition());

        this._positionChangedIds = [];
        for (const [xKey, yKey] of Object.values(POSITION_KEYS)) {
            this._positionChangedIds.push(this._settings.connect(
                `changed::${xKey}`, () => this._updatePosition()));
            this._positionChangedIds.push(this._settings.connect(
                `changed::${yKey}`, () => this._updatePosition()));
        }
        this._opacityChangedId = this._settings.connect(`changed::${OPACITY_KEY}`, () => this._updateOpacity());
        this._blurChangedId = this._settings.connect(`changed::${BLUR_KEY}`, () => this._updateBlur());
    }

    _attachWidget(widget) {
        const sizeChangedIds = [
            widget.connect('notify::width', () => this._updatePosition()),
            widget.connect('notify::height', () => this._updatePosition()),
        ];
        this._widgetSizeChangedIds.set(widget, sizeChangedIds);
        this._widgetContainer.add_child(widget);
    }

    _removeFromDesktop() {
        if (this._positionChangedIds) {
            for (const id of this._positionChangedIds)
                this._settings.disconnect(id);
            this._positionChangedIds = null;
        }
        if (this._opacityChangedId) {
            this._settings.disconnect(this._opacityChangedId);
            this._opacityChangedId = null;
        }
        if (this._blurChangedId) {
            this._settings.disconnect(this._blurChangedId);
            this._blurChangedId = null;
        }
        if (this._monitorsChangedId) {
            Main.layoutManager.disconnect(this._monitorsChangedId);
            this._monitorsChangedId = null;
        }

        if (this._widgetContainer) {
            const container = this._widgetContainer;
            this._widgetContainer = null;

            container.destroy();
        }
        this._widgetSizeChangedIds.clear();
    }

    _updatePosition() {
        if (!this._widgetContainer)
            return;

        const monitor = Main.layoutManager.primaryMonitor;
        if (!monitor)
            return;

        this._widgetContainer.set_position(monitor.x, monitor.y);
        this._widgetContainer.set_size(monitor.width, monitor.height);

        for (const widget of this._widgets) {
            const [xKey, yKey] = this._widgetPositionKeys.get(widget);
            const x = Math.round(monitor.width * this._settings.get_int(xKey) / 100);
            const y = Math.round(monitor.height * this._settings.get_int(yKey) / 100);
            widget.set_position(
                Math.round(x - widget.width / 2),
                Math.round(y - widget.height / 2));
        }
    }

    _updateOpacity() {
        if (!this._widgetContainer)
            return;

        const opacity = this._settings.get_double(OPACITY_KEY);
        this._widgetContainer.opacity = Math.round(opacity * 255);
    }

    _updateBlur() {
        if (!this._widgetContainer)
            return;

        const blurEnabled = this._settings.get_boolean(BLUR_KEY);

        for (const w of this._widgets) {
            if (blurEnabled)
                w.add_style_class_name('blur-my-shell');
            else
                w.remove_style_class_name('blur-my-shell');

            if (w.setBlurActive)
                w.setBlurActive(blurEnabled);
        }

        for (const widget of this._widgets) {
            const effect = widget.get_effect('blur');
            if (blurEnabled && !effect) {
                widget.add_effect_with_name('blur', new Shell.BlurEffect({
                    brightness: 0.6,
                    radius: 30,
                    mode: Shell.BlurMode.BACKGROUND,
                }));
            } else if (!blurEnabled && effect) {
                widget.remove_effect(effect);
            }
        }
    }

    _rebuildWidgets() {
        this._destroyWidgets();
        this._buildWidgets();
        if (this._widgetContainer) {
            for (const w of this._widgets)
                this._attachWidget(w);
            this._updateBlur();
            this._updatePosition();
        }
    }
}
