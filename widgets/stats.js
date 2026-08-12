'use strict';

import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

import {GlassDoughnut} from './doughnut.js';

const GAUGE_SIZE = 140;

export const GlassStatsWidget = GObject.registerClass(
class GlassStatsWidget extends St.BoxLayout {
    _init() {
        super._init({
            style_class: 'glass-card',
            vertical: true,
            x_expand: true,
            y_expand: true,
        });

        this._titleLabel = new St.Label({
            style_class: 'glass-stats-title',
            text: _('System'),
            x_align: Clutter.ActorAlign.CENTER,
        });
        this.add_child(this._titleLabel);

        this._gaugesBox = new St.BoxLayout({style_class: 'glass-stats-gauges'});
        this.add_child(this._gaugesBox);

        this._ramGauge = this._buildGauge(_('RAM'));
        this._gaugesBox.add_child(this._ramGauge.box);

        this._cpuGauge = this._buildGauge(_('CPU'));
        this._gaugesBox.add_child(this._cpuGauge.box);

        this._timeout = null;
        this._prevCpuIdle = 0;
        this._prevCpuTotal = 0;

        this._updateStats();
        this._startTimer();
    }

    _buildGauge(labelText) {
        const box = new St.BoxLayout({vertical: true});

        const ringBox = new St.Widget({
            layout_manager: new Clutter.BinLayout(),
            width: GAUGE_SIZE,
            height: GAUGE_SIZE,
        });

        const ring = new GlassDoughnut({
            width: GAUGE_SIZE,
            height: GAUGE_SIZE,
            x_expand: true,
            y_expand: true,
        });
        ringBox.add_child(ring);

        const valueLabel = new St.Label({
            style_class: 'glass-stats-value',
            text: '--',
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
        });
        ringBox.add_child(valueLabel);

        box.add_child(ringBox);

        const label = new St.Label({
            style_class: 'glass-stats-label',
            text: labelText,
            x_align: Clutter.ActorAlign.CENTER,
        });
        box.add_child(label);

        return {box, ring, valueLabel};
    }

    _readRamUsage() {
        const file = Gio.File.new_for_path('/proc/meminfo');
        file.load_contents_async(null, (source, result) => {
            let contents;
            try {
                [, contents] = source.load_contents_finish(result);
            } catch (e) {
                console.error(`glass-widgets: failed to read /proc/meminfo: ${e}`);
                return;
            }

            const text = new TextDecoder().decode(contents);
            const lines = text.split('\n');
            let total = 0, available = 0;
            for (const line of lines) {
                if (line.startsWith('MemTotal:'))
                    total = parseInt(line.split(/\s+/)[1]);
                if (line.startsWith('MemAvailable:'))
                    available = parseInt(line.split(/\s+/)[1]);
            }
            if (total <= 0)
                return;

            const used = total - available;
            const percent = Math.round((used / total) * 100);
            this._renderRam(used, total, percent);
        });
    }

    _readCpuUsage() {
        const file = Gio.File.new_for_path('/proc/stat');
        file.load_contents_async(null, (source, result) => {
            let contents;
            try {
                [, contents] = source.load_contents_finish(result);
            } catch (e) {
                console.error(`glass-widgets: failed to read /proc/stat: ${e}`);
                return;
            }

            const text = new TextDecoder().decode(contents);
            const line = text.split('\n')[0];
            const parts = line.split(/\s+/).slice(1).map(Number);
            const idle = parts[3] + (parts[4] || 0);
            const total = parts.reduce((a, b) => a + b, 0);

            let percent = 0;
            if (this._prevCpuTotal > 0) {
                const dTotal = total - this._prevCpuTotal;
                const dIdle = idle - this._prevCpuIdle;
                if (dTotal > 0)
                    percent = Math.round(((dTotal - dIdle) / dTotal) * 100);
            }
            this._prevCpuIdle = idle;
            this._prevCpuTotal = total;
            this._renderCpu(percent);
        });
    }

    _renderRam(used, total, percent) {
        this._ramGauge.ring.value = percent;
        this._ramGauge.valueLabel.text = `${percent}%`;
    }

    _renderCpu(percent) {
        this._cpuGauge.ring.value = percent;
        this._cpuGauge.valueLabel.text = `${percent}%`;
    }

    _updateStats() {
        this._readRamUsage();
        this._readCpuUsage();
    }

    _startTimer() {
        this._timeout = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT, 2, () => {
                this._updateStats();
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
