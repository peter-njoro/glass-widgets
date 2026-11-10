import {
    POSITION_CONFIG,
    GlassClockWidget,
    GlassStatsWidget,
    GlassCalendarWidget,
    GlassWorldClockWidget,
    GlassLocation,
    GlassForecast,
    GlassHourlyWeather,
    GlassWeeklyWeather,
    POSITION_KEYS,
    migratePositionSettings,
} from './widgets/index.js';
/*
 * glass-widgets - Desktop glassmorphism widgets for GNOME Shell
 * Copyright (C) 2026 Peter Njoroge
 * https://github.com/peter-njoro/glass-widgets
 */

'use strict';

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Shell from 'gi://Shell';
import Meta from 'gi://Meta';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

// Media player widget is intentionally deferred and kept out of the current
// stable build. It will ship later once the D-Bus sandboxing issues are sorted
// out, so it is not loaded here.
// import {GlassMediaPlayer} from './widgets/media-player.js';

const OPACITY_KEY = 'widget-opacity';
const BLUR_KEY = 'blur-enabled';
const REFLECTION_ENABLED_KEY = 'reflection-enabled';
const REFLECTION_STYLE_KEY = 'reflection-style';
const SHOW_CLOCK_KEY = 'show-clock';
const SHOW_STATS_KEY = 'show-stats';
const SHOW_HOURLY_KEY = 'show-hourly-weather';
const SHOW_WEEKLY_KEY = 'show-weekly-weather';
const SHOW_CALENDAR_KEY = 'show-calendar';
const SHOW_WORLD_CLOCK_KEY = 'show-world-clock';
// const SHOW_MEDIA_PLAYER_KEY = 'show-media-player';

const VISIBILITY_KEYS = [
    SHOW_CLOCK_KEY, SHOW_STATS_KEY, SHOW_HOURLY_KEY,
    SHOW_WEEKLY_KEY, SHOW_CALENDAR_KEY, SHOW_WORLD_CLOCK_KEY,
    // SHOW_MEDIA_PLAYER_KEY,
];

export default class GlassWidgetsExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        migratePositionSettings(this._settings);
        this._locationHelper = new GlassLocation(this._settings);
        this._forecast = null;
        this._widgetContainer = null;
        this._widgets = [];
        this._widgetPositionKeys = new Map();
        this._widgetSizeChangedIds = new Map();
        this._widgetPositionLaterIds = new Map();
        this._updateId = null;
        this._widthChangedId = null;
        this._heightChangedId = null;
        this._monitorsChangedId = null;

        this._syncWidgets();
        this._addToDesktop();

        this._updateId = this._settings.connect('changed', (_settings, key) => {
            if (VISIBILITY_KEYS.includes(key))
                this._syncWidgets();
        });
    }

    disable() {
        if (this._updateId) {
            this._settings.disconnect(this._updateId);
            this._updateId = null;
        }

        this._destroyWidgets();
        this._removeFromDesktop();
        this._destroyForecast();
        this._locationHelper.destroy();
        this._locationHelper = null;
        this._settings = null;
    }

    _syncWidgets() {
        const needsForecast = this._settings.get_boolean(SHOW_HOURLY_KEY) ||
            this._settings.get_boolean(SHOW_WEEKLY_KEY);
        if (needsForecast && !this._forecast)
            this._forecast = new GlassForecast(this._settings, this._locationHelper);

        const definitions = [
            {positionKeys: POSITION_KEYS.clock, visibilityKey: SHOW_CLOCK_KEY,
                createWidget: () => new GlassClockWidget(this._settings, this._locationHelper)},
            {positionKeys: POSITION_KEYS.stats, visibilityKey: SHOW_STATS_KEY,
                createWidget: () => new GlassStatsWidget()},
            {positionKeys: POSITION_KEYS.calendar, visibilityKey: SHOW_CALENDAR_KEY,
                createWidget: () => new GlassCalendarWidget(this._settings)},
            {positionKeys: POSITION_KEYS.worldclock, visibilityKey: SHOW_WORLD_CLOCK_KEY,
                createWidget: () => new GlassWorldClockWidget(this._settings)},
            {positionKeys: POSITION_KEYS.hourly, visibilityKey: SHOW_HOURLY_KEY,
                createWidget: () => new GlassHourlyWeather(this._forecast)},
            {positionKeys: POSITION_KEYS.weekly, visibilityKey: SHOW_WEEKLY_KEY,
                createWidget: () => new GlassWeeklyWeather(this._forecast)},
        ];
        for (const {positionKeys, visibilityKey, createWidget} of definitions) {
            const current = this._widgets.find(
                widget => this._widgetPositionKeys.get(widget) === positionKeys);
            if (this._settings.get_boolean(visibilityKey)) {
                if (current)
                    continue;

                const widget = createWidget();
                this._addWidget(widget, positionKeys);
                if (this._widgetContainer) {
                    this._attachWidget(widget);
                    this._updateBlur([widget]);
                    this._updateReflection([widget]);
                    this._updatePosition([widget]);
                }
            } else if (current) {
                this._removeWidget(current);
            }
        }
        // The MPRIS media-player widget is deferred and intentionally disabled in
        // the current build. It will be shipped later after stability testing.
        // if (this._settings.get_boolean(SHOW_MEDIA_PLAYER_KEY))
        //     this._addWidget(new GlassMediaPlayer(), 'media');

        if (!needsForecast)
            this._destroyForecast();
    }

    _addWidget(widget, positionKeys) {
        this._widgets.push(widget);
        this._widgetPositionKeys.set(widget, positionKeys);
    }

    _removeWidget(widget) {
        this._cancelWidgetPosition(widget);
        const sizeChangedIds = this._widgetSizeChangedIds.get(widget) ?? [];
        for (const id of sizeChangedIds)
            widget.disconnect(id);
        this._widgetSizeChangedIds.delete(widget);
        this._widgetPositionKeys.delete(widget);
        this._widgets = this._widgets.filter(existing => existing !== widget);
        widget.destroy();
    }

    _destroyWidgets() {
        for (const widget of [...this._widgets])
            this._removeWidget(widget);
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
        for (const positionKeys of Object.values(POSITION_KEYS)) {
            const updateWidgetPosition = () => this._updatePosition(this._widgets.filter(
                widget => this._widgetPositionKeys.get(widget) === positionKeys));
            for (const key of positionKeys) {
                this._positionChangedIds.push(this._settings.connect(
                    `changed::${key}`, updateWidgetPosition));
            }
        }
        this._opacityChangedId = this._settings.connect(`changed::${OPACITY_KEY}`, () => this._updateOpacity());
        this._blurChangedId = this._settings.connect(`changed::${BLUR_KEY}`, () => this._updateBlur());
        this._reflectionChangedId = this._settings.connect(`changed::${REFLECTION_ENABLED_KEY}`, () => this._updateReflection());
        this._reflectionStyleChangedId = this._settings.connect(`changed::${REFLECTION_STYLE_KEY}`, () => this._updateReflection());
        this._updateReflection();
    }

    _attachWidget(widget) {
        const sizeChangedIds = [
            widget.connect('notify::width', () => this._queueWidgetPosition(widget)),
            widget.connect('notify::height', () => this._queueWidgetPosition(widget)),
            widget.connect('notify::allocation', () => this._queueWidgetPosition(widget)),
        ];
        this._widgetSizeChangedIds.set(widget, sizeChangedIds);
        this._widgetContainer.add_child(widget);
        this._queueWidgetPosition(widget);
    }

    _queueWidgetPosition(widget) {
        if (this._widgetPositionLaterIds.has(widget) || !this._widgetPositionKeys.has(widget))
            return;

        const id = global.compositor.get_laters().add(Meta.LaterType.BEFORE_REDRAW, () => {
            this._widgetPositionLaterIds.delete(widget);
            if (this._widgetPositionKeys.has(widget))
                this._updatePosition([widget]);
            return false;
        });
        this._widgetPositionLaterIds.set(widget, id);
    }

    _cancelWidgetPosition(widget) {
        const id = this._widgetPositionLaterIds.get(widget);
        if (id === undefined)
            return;

        global.compositor.get_laters().remove(id);
        this._widgetPositionLaterIds.delete(widget);
    }

    _removeFromDesktop() {
        for (const widget of this._widgetPositionLaterIds.keys())
            this._cancelWidgetPosition(widget);
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
        if (this._reflectionChangedId) {
            this._settings.disconnect(this._reflectionChangedId);
            this._reflectionChangedId = null;
        }
        if (this._reflectionStyleChangedId) {
            this._settings.disconnect(this._reflectionStyleChangedId);
            this._reflectionStyleChangedId = null;
        }
        if (this._monitorsChangedId) {
            Main.layoutManager.disconnect(this._monitorsChangedId);
            this._monitorsChangedId = null;
        }

        if (this._widgetContainer) {
            this._widgetContainer.destroy();
            this._widgetContainer = null;
        }
        this._widgetSizeChangedIds.clear();
    }

    _updatePosition(widgets = this._widgets) {
        if (!this._widgetContainer)
            return;

        const monitor = Main.layoutManager.primaryMonitor;
        if (!monitor)
            return;

        this._widgetContainer.set_position(monitor.x, monitor.y);
        this._widgetContainer.set_size(monitor.width, monitor.height);

        for (const widget of widgets) {
            const [xKey, yKey] = this._widgetPositionKeys.get(widget);
            const x = Math.round(monitor.width * this._settings.get_double(xKey) / POSITION_CONFIG.maximumPercent);
            const y = Math.round(monitor.height * this._settings.get_double(yKey) / POSITION_CONFIG.maximumPercent);
            const [, , width, height] = widget.get_preferred_size();
            const widgetX = Math.round(x - width * POSITION_CONFIG.centerAnchor);
            const widgetY = Math.round(y - height * POSITION_CONFIG.centerAnchor);
            const [positionSet, fixedX, fixedY] = widget.get_fixed_position();
            if (!positionSet || fixedX !== widgetX)
                widget.set_x(widgetX);
            if (!positionSet || fixedY !== widgetY)
                widget.set_y(widgetY);
        }
    }

    _updateOpacity() {
        if (!this._widgetContainer)
            return;

        const opacity = this._settings.get_double(OPACITY_KEY);
        this._widgetContainer.opacity = Math.round(opacity * 255);
    }

    _updateBlur(widgets = this._widgets) {
        if (!this._widgetContainer)
            return;

        const blurEnabled = this._settings.get_boolean(BLUR_KEY);

        for (const w of widgets) {
            if (blurEnabled)
                w.add_style_class_name('blur-my-shell');
            else
                w.remove_style_class_name('blur-my-shell');

            if (w.setBlurActive)
                w.setBlurActive(blurEnabled);
        }

        for (const widget of widgets) {
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

    _updateReflection(widgets = this._widgets) {
        if (!this._widgetContainer)
            return;

        const enabled = this._settings.get_boolean(REFLECTION_ENABLED_KEY);
        const style = this._settings.get_int(REFLECTION_STYLE_KEY);

        for (const w of widgets) {
            w.remove_style_class_name('glass-reflection-enabled');
            w.remove_style_class_name('glass-reflection-style-1');

            if (enabled) {
                w.add_style_class_name('glass-reflection-enabled');
                if (style === 1)
                    w.add_style_class_name('glass-reflection-style-1');
            }
        }
    }

}
