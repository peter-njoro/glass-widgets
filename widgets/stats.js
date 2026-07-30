'use strict';

import GObject from 'gi://GObject';
import St from 'gi://St';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

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
        });
        this.add_child(this._titleLabel);

        this._ramBox = new St.BoxLayout({vertical: true});
        this._ramLabel = new St.Label({style_class: 'glass-stats-label', text: _('RAM')});
        this._ramBox.add_child(this._ramLabel);
        this._ramValue = new St.Label({style_class: 'glass-stats-value', text: '--'});
        this._ramBox.add_child(this._ramValue);
        this._ramBar = new St.Widget({style_class: 'glass-progress-bar', x_expand: true});
        this._ramFill = new St.Widget({style_class: 'glass-progress-fill'});
        this._ramBar.add_child(this._ramFill);
        this._ramBox.add_child(this._ramBar);
        this.add_child(this._ramBox);

        this._cpuBox = new St.BoxLayout({vertical: true});
        this._cpuLabel = new St.Label({style_class: 'glass-stats-label', text: _('CPU')});
        this._cpuBox.add_child(this._cpuLabel);
        this._cpuValue = new St.Label({style_class: 'glass-stats-value', text: '--'});
        this._cpuBox.add_child(this._cpuValue);
        this._cpuBar = new St.Widget({style_class: 'glass-progress-bar', x_expand: true});
        this._cpuFill = new St.Widget({style_class: 'glass-progress-fill'});
        this._cpuBar.add_child(this._cpuFill);
        this._cpuBox.add_child(this._cpuBar);
        this.add_child(this._cpuBox);

        this._timeout = null;
        this._prevCpuIdle = 0;
        this._prevCpuTotal = 0;

        this._updateStats();
        this._startTimer();
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
        this._ramValue.text = `${Math.round(used / 1024)} MB / ${Math.round(total / 1024)} MB`;
        this._ramFill.width = Math.max(0, Math.min(100, percent));
        this._ramFill.style = `background-color: rgba(120, 200, 255, 0.8); border-radius: 4px; height: 6px; width: ${percent}%;`;
    }

    _renderCpu(percent) {
        this._cpuValue.text = `${percent}%`;
        this._cpuFill.style = `background-color: rgba(120, 200, 255, 0.8); border-radius: 4px; height: 6px; width: ${percent}%;`;
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