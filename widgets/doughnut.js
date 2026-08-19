'use strict';

import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import St from 'gi://St';
import Cairo from 'gi://cairo';

const ACCENT_PALETTE = {
    'standard': [0.47, 0.78, 1.0],
    'blue': [0.35, 0.67, 1.0],
    'teal': [0.28, 0.76, 0.68],
    'green': [0.34, 0.78, 0.46],
    'yellow': [0.95, 0.78, 0.27],
    'orange': [0.96, 0.62, 0.24],
    'red': [0.92, 0.35, 0.41],
    'pink': [0.93, 0.47, 0.78],
    'purple': [0.62, 0.52, 0.97],
    'brown': [0.72, 0.53, 0.39],
    'slate': [0.58, 0.67, 0.8],
};

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function mixColor(a, b, amount) {
    return a.map((channel, index) => channel + (b[index] - channel) * amount);
}

function adjustColor(rgb, factor) {
    return rgb.map(channel => clamp(channel * factor, 0, 1));
}

function getAccentColor() {
    const settings = Gio.Settings.new('org.gnome.desktop.interface');
    const accent = settings.get_string('accent-color');
    const base = ACCENT_PALETTE[accent] ?? ACCENT_PALETTE.standard;
    return base;
}

function drawPipeArc(cr, x, y, radius, width, startAngle, endAngle, color, alpha, lineCap = Cairo.LineCap.ROUND) {
    cr.setLineCap(lineCap);
    cr.setSourceRGBA(color[0], color[1], color[2], alpha);
    cr.setLineWidth(width);
    cr.arc(x, y, radius, startAngle, endAngle);
    cr.stroke();
}

export const GlassDoughnut = GObject.registerClass({
    Properties: {
        'value': GObject.ParamSpec.double(
            'value', null, null,
            GObject.ParamFlags.READWRITE,
            0, 100, 0),
        'blur-active': GObject.ParamSpec.boolean(
            'blur-active', null, null,
            GObject.ParamFlags.READWRITE,
            false),
    },
}, class GlassDoughnut extends St.DrawingArea {
    _init(params = {}) {
        const {value = 0, 'blur-active': blurActive = false, ...rest} = params;
        this._value = value;
        this._blurActive = blurActive;
        this._accentColor = getAccentColor();
        super._init(rest);
    }

    get value() {
        return this._value;
    }

    set value(value) {
        value = Math.max(0, Math.min(100, value));
        if (this._value === value)
            return;
        this._value = value;
        this.notify('value');
        this.queue_repaint();
    }

    get blur_active() {
        return this._blurActive;
    }

    set blur_active(active) {
        if (this._blurActive === active)
            return;
        this._blurActive = active;
        this.notify('blur-active');
        this.queue_repaint();
    }

    vfunc_repaint() {
        const [width, height] = this.get_surface_size();
        const cr = this.get_context();
        const size = Math.min(width, height);
        const lineWidth = Math.max(8, size * 0.11);
        const inset = 12;
        const radius = (size - lineWidth) / 2 - inset;
        const centerX = width / 2;
        const centerY = height / 2;
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + (this._value / 100) * 2 * Math.PI;
        const accent = this._accentColor;
        const lightAccent = mixColor(accent, [1, 1, 1], 0.38);
        const darkAccent = adjustColor(accent, 0.68);

        cr.setLineCap(Cairo.LineCap.ROUND);
        cr.setSourceRGBA(1, 1, 1, this._blurActive ? 0.03 : 0.08);
        cr.setLineWidth(lineWidth + 2);
        cr.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        cr.stroke();

        if (endAngle > startAngle) {
            drawPipeArc(cr, centerX, centerY, radius, lineWidth + 3, startAngle, endAngle, darkAccent, 0.9);
            drawPipeArc(cr, centerX, centerY, radius, lineWidth * 0.72, startAngle, endAngle, lightAccent, 0.82);
            drawPipeArc(cr, centerX, centerY, radius, lineWidth * 0.42, startAngle, endAngle, accent, 1.0);
        }

        cr.$dispose();
    }
});
