'use strict';

import GObject from 'gi://GObject';
import St from 'gi://St';
import Cairo from 'gi://cairo';

export const GlassDoughnut = GObject.registerClass({
    Properties: {
        'value': GObject.ParamSpec.double(
            'value', null, null,
            GObject.ParamFlags.READWRITE,
            0, 100, 0),
    },
}, class GlassDoughnut extends St.DrawingArea {
    _init(params = {}) {
        const {value = 0, ...rest} = params;
        this._value = value;
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

    vfunc_repaint() {
        const [width, height] = this.get_surface_size();
        const cr = this.get_context();
        const size = Math.min(width, height);
        const lineWidth = Math.max(8, size * 0.11);
        const radius = (size - lineWidth) / 2;
        const centerX = width / 2;
        const centerY = height / 2;

        cr.setLineCap(Cairo.LineCap.ROUND);

        cr.setSourceRGBA(1, 1, 1, 0.1);
        cr.setLineWidth(lineWidth);
        cr.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        cr.stroke();

        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + (this._value / 100) * 2 * Math.PI;
        if (endAngle > startAngle) {
            cr.setSourceRGBA(0.47, 0.78, 1, 0.8);
            cr.setLineWidth(lineWidth);
            cr.arc(centerX, centerY, radius, startAngle, endAngle);
            cr.stroke();
        }

        cr.$dispose();
    }
});
