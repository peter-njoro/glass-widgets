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

const POS_X_KEY = 'widget-x';
const POS_Y_KEY = 'widget-y';
const OPACITY_KEY = 'widget-opacity';
const BLUR_KEY = 'blur-enabled';
const SHOW_CLOCK_KEY = 'show-clock';
const SHOW_STATS_KEY = 'show-stats';
const SHOW_WEATHER_KEY = 'show-weather';

const STRUCTURAL_KEYS = [SHOW_CLOCK_KEY, SHOW_STATS_KEY, SHOW_WEATHER_KEY];

export default class GlassWidgetsExtension extends Extension {
    enable() {
        this._settings = this.getSettings('org.gnome.shell.extensions.glass-widgets');
        this._widgetContainer = null;
        this._widgets = [];
        this._updateId = null;

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
        this._settings = null;
    }

    _buildWidgets() {
        this._destroyWidgets();

        if (this._settings.get_boolean(SHOW_CLOCK_KEY)) {
            this._widgets.push(new GlassClockWidget(this._settings));
        }
        if (this._settings.get_boolean(SHOW_STATS_KEY)) {
            this._widgets.push(new GlassStatsWidget());
        }
    }

    _destroyWidgets() {
        for (const w of this._widgets) {
            w.destroy();
        }
        this._widgets = [];
    }

    _addToDesktop() {
        this._removeFromDesktop();

        this._widgetContainer = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            reactive: true,
            can_focus: false,
        });

        for (const w of this._widgets) {
            this._widgetContainer.add_child(w);
        }

        this._updatePosition();
        this._updateOpacity();
        this._updateBlur();

        Main.layoutManager._backgroundGroup.add_child(this._widgetContainer);

        this._posChangedId = this._settings.connect(`changed::${POS_X_KEY}`, () => this._updatePosition());
        this._posYChangedId = this._settings.connect(`changed::${POS_Y_KEY}`, () => this._updatePosition());
        this._opacityChangedId = this._settings.connect(`changed::${OPACITY_KEY}`, () => this._updateOpacity());
        this._blurChangedId = this._settings.connect(`changed::${BLUR_KEY}`, () => this._updateBlur());
    }

    _removeFromDesktop() {
        if (this._posChangedId) {
            this._settings.disconnect(this._posChangedId);
            this._posChangedId = null;
        }
        if (this._posYChangedId) {
            this._settings.disconnect(this._posYChangedId);
            this._posYChangedId = null;
        }
        if (this._opacityChangedId) {
            this._settings.disconnect(this._opacityChangedId);
            this._opacityChangedId = null;
        }
        if (this._blurChangedId) {
            this._settings.disconnect(this._blurChangedId);
            this._blurChangedId = null;
        }

        if (this._widgetContainer) {
            this._widgetContainer.destroy();
            this._widgetContainer = null;
        }
    }

    _updatePosition() {
        if (!this._widgetContainer)
            return;

        const monitor = Main.layoutManager.primaryMonitor;
        if (!monitor)
            return;

        const xPercent = this._settings.get_int(POS_X_KEY) / 100;
        const yPercent = this._settings.get_int(POS_Y_KEY) / 100;

        const x = monitor.x + Math.round(monitor.width * xPercent);
        const y = monitor.y + Math.round(monitor.height * yPercent);

        this._widgetContainer.set_position(
            Math.round(x - this._widgetContainer.width / 2),
            Math.round(y - this._widgetContainer.height / 2));
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

        if (blurEnabled) {
            if (!this._widgetContainer.get_effect('blur')) {
                const effect = new Shell.BlurEffect({
                    brightness: 0.6,
                    radius: 30,
                    mode: Shell.BlurMode.BACKGROUND,
                });
                this._widgetContainer.add_effect_with_name('blur', effect);
            }
        } else {
            const effect = this._widgetContainer.get_effect('blur');
            if (effect)
                this._widgetContainer.remove_effect(effect);
        }
    }

    _rebuildWidgets() {
        this._destroyWidgets();
        this._buildWidgets();
        if (this._widgetContainer) {
            for (const w of this._widgets) {
                this._widgetContainer.add_child(w);
            }
            this._updateBlur();
        }
    }
}
