import {FORECAST_CONFIG} from './forecast-config.js';
import {WORLD_CLOCK_KEYS} from './settings.js';
'use strict';

import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import GLib from 'gi://GLib';
import Pango from 'gi://Pango';

import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';


const CLOCK_REFRESH_INTERVAL_SECONDS = 1;
const ANCHOR_FRACTION = {center: 0.5, end: 1};
const CLOCK_BORDER_RADIUS_PX = 999;
const CLOCK_SIZE = 78;
const FACE_SIZE = 68;
const FACE_CENTER = FACE_SIZE * ANCHOR_FRACTION.center;
const CENTER_DOT_SIZE = 6;
const TICK_RADIUS = 32;
const NUMBER_RADIUS = 24;
const NUMBER_SIZE = {width: 16, height: 14};
const TICK_SIZES = {
    cardinal: {width: 2, height: 4},
    regular: {width: 1, height: 3},
};
const HAND_SIZES = {
    hour: {width: 4, height: 18},
    minute: {width: 3, height: 25},
    second: {width: 1, height: 26},
};
const HOURS_PER_DIAL = 12;
const DIAL_QUADRANTS = 4;
const HOURS_PER_QUARTER = HOURS_PER_DIAL / DIAL_QUADRANTS;
const FIRST_DIAL_NUMBER = 1;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = MINUTES_PER_HOUR * SECONDS_PER_MINUTE;
const DEGREES_PER_ROTATION = 360;
const DEGREES_PER_HOUR = DEGREES_PER_ROTATION / HOURS_PER_DIAL;
const DEGREES_PER_MINUTE = DEGREES_PER_ROTATION / MINUTES_PER_HOUR;
const DEGREES_PER_SECOND = DEGREES_PER_ROTATION / SECONDS_PER_MINUTE;
const RADIANS_PER_ROTATION = 2 * Math.PI;
const RADIANS_PER_HOUR = RADIANS_PER_ROTATION / HOURS_PER_DIAL;
const MAX_FIXED_WIDTH_CLOCKS = 4;
const CARD_WIDTH = FORECAST_CONFIG.cardWidthPx;
const NATURAL_WIDTH = -1;
const MIDNIGHT = {hour: 0, minute: 0, second: 0};
const LOCAL_OFFSET_HOURS = 0;
const LOCALE_DATE_FORMAT = '%x';
const RELATIVE_DAY_OFFSET = {today: 0, tomorrow: 1, yesterday: -1};
const RELATIVE_DAY_LABELS = new Map([
    [RELATIVE_DAY_OFFSET.today, () => _('Today')],
    [RELATIVE_DAY_OFFSET.tomorrow, () => _('Tomorrow')],
    [RELATIVE_DAY_OFFSET.yesterday, () => _('Yesterday')],
]);

const TICK_COLORS = {
    cardinal: 'rgba(255,255,255,0.8)',
    regular: 'rgba(255,255,255,0.45)',
};

const HAND_COLORS = {
    hour: 'rgba(255,255,255,0.9)',
    minute: 'rgba(255,255,255,0.85)',
    second: 'rgba(255,118,118,0.9)',
};

export const GlassWorldClockWidget = GObject.registerClass(
class GlassWorldClockWidget extends St.BoxLayout {
    _init(settings = null) {
        super._init({
            style_class: 'glass-card glass-world-clock-card',
            vertical: true,
            x_align: Clutter.ActorAlign.CENTER,
        });

        this._settings = settings;
        this._settingsChangedIds = [];
        this._timeout = null;

        if (this._settings) {
            this._settingsChangedIds = Object.values(WORLD_CLOCK_KEYS)
                .map(key => this._settings.connect(`changed::${key}`, () => this._render()));
        }

        this._render();
        this._timeout = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT, CLOCK_REFRESH_INTERVAL_SECONDS, () => {
                this._render();
                return GLib.SOURCE_CONTINUE;
            });
    }

    _getEntries() {
        if (!this._settings)
            return [];

        const entries = [];
        for (const raw of this._settings.get_strv(WORLD_CLOCK_KEYS.entries)) {
            try {
                const parsed = JSON.parse(raw);
                if (!parsed || typeof parsed.tz !== 'string')
                    continue;
                entries.push({
                    tz: parsed.tz,
                    label: typeof parsed.label === 'string' && parsed.label.trim()
                        ? parsed.label.trim()
                        : parsed.tz.split('/').pop().replace(/_/g, ' '),
                });
            } catch {
                continue;
            }
        }
        return entries;
    }

    _getTimeDetails(dateTime, localNow) {
        const date = GLib.DateTime.new_utc(
            dateTime.get_year(), dateTime.get_month(), dateTime.get_day_of_month(),
            MIDNIGHT.hour, MIDNIGHT.minute, MIDNIGHT.second);
        const localDate = GLib.DateTime.new_utc(
            localNow.get_year(), localNow.get_month(), localNow.get_day_of_month(),
            MIDNIGHT.hour, MIDNIGHT.minute, MIDNIGHT.second);
        const dayDifference = date.difference(localDate) / GLib.TIME_SPAN_DAY;
        const day = RELATIVE_DAY_LABELS.get(dayDifference)?.() ?? dateTime.format(LOCALE_DATE_FORMAT);

        const hours = (dateTime.get_utc_offset() - localNow.get_utc_offset()) / GLib.TIME_SPAN_HOUR;
        return {
            day,
            offset: `${hours > LOCAL_OFFSET_HOURS ? '+' : ''}${hours}${_('HRS')}`,
        };
    }

    _makeClockFace(entry, localNow) {
        const tz = GLib.TimeZone.new(entry.tz);
        const dateTime = localNow.to_timezone(tz);
        const hour = dateTime.get_hour();
        const minute = dateTime.get_minute();
        const second = dateTime.get_second();
        const showTicks = this._settings?.get_boolean(WORLD_CLOCK_KEYS.showTicks) ?? true;
        const showSeconds = this._settings?.get_boolean(WORLD_CLOCK_KEYS.showSeconds) ?? true;
        const showNumbers = this._settings?.get_boolean(WORLD_CLOCK_KEYS.showNumbers) ?? true;
        const showRelativeTime = this._settings?.get_boolean(WORLD_CLOCK_KEYS.showRelativeTime) ?? true;

        const wrap = new St.BoxLayout({
            vertical: true,
            style_class: 'glass-world-clock-item',
            x_align: Clutter.ActorAlign.CENTER,
            width: CLOCK_SIZE,
        });

        const dial = new St.Widget({
            style_class: 'glass-world-clock-dial',
            width: CLOCK_SIZE,
            height: CLOCK_SIZE,
            layout_manager: new Clutter.BinLayout(),
        });

        const face = new St.Widget({
            style_class: 'glass-world-clock-face',
            width: FACE_SIZE,
            height: FACE_SIZE,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            layout_manager: new Clutter.FixedLayout(),
        });
        dial.add_child(face);

        if (showTicks) {
            for (let index = 0; index < HOURS_PER_DIAL; index++) {
                const isCardinal = index % HOURS_PER_QUARTER === 0;
                const angle = index * RADIANS_PER_HOUR;
                const size = isCardinal ? TICK_SIZES.cardinal : TICK_SIZES.regular;
                const tick = new St.Widget({
                    width: size.width,
                    height: size.height,
                    style: `background-color: ${isCardinal ? TICK_COLORS.cardinal : TICK_COLORS.regular}; border-radius: ${CLOCK_BORDER_RADIUS_PX}px;`,
                });
                tick.set_pivot_point(ANCHOR_FRACTION.center, ANCHOR_FRACTION.center);
                tick.set_position(FACE_CENTER + TICK_RADIUS * Math.sin(angle) - tick.width * ANCHOR_FRACTION.center,
                    FACE_CENTER - TICK_RADIUS * Math.cos(angle) - tick.height * ANCHOR_FRACTION.center);
                tick.rotation_angle_z = index * DEGREES_PER_HOUR;
                face.add_child(tick);
            }
        }

        if (showNumbers) {
            for (let number = FIRST_DIAL_NUMBER; number <= HOURS_PER_DIAL; number++) {
                const angle = number * RADIANS_PER_HOUR;
                const label = new St.Label({
                    style_class: 'glass-world-clock-number',
                    text: String(number),
                    width: NUMBER_SIZE.width,
                    height: NUMBER_SIZE.height,
                });
                label.set_position(FACE_CENTER + NUMBER_RADIUS * Math.sin(angle) - NUMBER_SIZE.width * ANCHOR_FRACTION.center,
                    FACE_CENTER - NUMBER_RADIUS * Math.cos(angle) - NUMBER_SIZE.height * ANCHOR_FRACTION.center);
                face.add_child(label);
            }
        }

        const hourAngle = ((hour % HOURS_PER_DIAL) + minute / MINUTES_PER_HOUR +
            second / SECONDS_PER_HOUR) * DEGREES_PER_HOUR;
        const minuteAngle = (minute + second / SECONDS_PER_MINUTE) * DEGREES_PER_MINUTE;
        const secondAngle = second * DEGREES_PER_SECOND;

        const hourHand = this._makeHand(HAND_SIZES.hour.width, HAND_SIZES.hour.height, HAND_COLORS.hour, hourAngle);
        const minuteHand = this._makeHand(HAND_SIZES.minute.width, HAND_SIZES.minute.height, HAND_COLORS.minute, minuteAngle);
        face.add_child(hourHand);
        face.add_child(minuteHand);
        if (showSeconds)
            face.add_child(this._makeHand(HAND_SIZES.second.width, HAND_SIZES.second.height, HAND_COLORS.second, secondAngle));

        const centerDot = new St.Widget({
            style_class: 'glass-world-clock-center',
            width: CENTER_DOT_SIZE,
            height: CENTER_DOT_SIZE,
        });
        centerDot.set_position(FACE_CENTER - CENTER_DOT_SIZE * ANCHOR_FRACTION.center,
            FACE_CENTER - CENTER_DOT_SIZE * ANCHOR_FRACTION.center);
        face.add_child(centerDot);

        wrap.add_child(dial);

        const label = new St.Label({
            style_class: 'glass-world-clock-label',
            text: entry.label,
            width: CLOCK_SIZE,
            x_align: Clutter.ActorAlign.CENTER,
        });
        label.clutter_text.ellipsize = Pango.EllipsizeMode.END;
        wrap.add_child(label);

        if (showRelativeTime) {
            const details = this._getTimeDetails(dateTime, localNow);
            for (const text of [details.day, details.offset]) {
                wrap.add_child(new St.Label({
                    style_class: 'glass-world-clock-detail',
                    text,
                    width: CLOCK_SIZE,
                    x_align: Clutter.ActorAlign.CENTER,
                }));
            }
        }
        return wrap;
    }

    _makeHand(width, height, color, angle) {
        const hand = new St.Widget({
            width,
            height,
            style: `background-color: ${color}; border-radius: ${CLOCK_BORDER_RADIUS_PX}px;`,
        });
        hand.set_pivot_point(ANCHOR_FRACTION.center, ANCHOR_FRACTION.end);
        hand.set_position((FACE_SIZE - width) * ANCHOR_FRACTION.center, FACE_CENTER - height);
        hand.rotation_angle_z = angle;
        return hand;
    }

    _render() {
        for (const child of this.get_children())
            child.destroy();

        const entries = this._getEntries();
        this.width = entries.length > MAX_FIXED_WIDTH_CLOCKS ? NATURAL_WIDTH : CARD_WIDTH;
        this.visible = Boolean(entries.length);
        if (!entries.length)
            return;

        const title = new St.Label({
            style_class: 'glass-world-clock-title',
            text: _('World Clock'),
            x_expand: true,
            x_align: Clutter.ActorAlign.CENTER,
        });
        this.add_child(title);

        const row = new St.BoxLayout({
            style_class: 'glass-world-clock-row',
            x_align: Clutter.ActorAlign.CENTER,
        });
        const localNow = GLib.DateTime.new_now_local();
        for (const entry of entries) {
            row.add_child(this._makeClockFace(entry, localNow));
        }
        this.add_child(row);
    }

    destroy() {
        if (this._timeout) {
            GLib.Source.remove(this._timeout);
            this._timeout = null;
        }
        for (const id of this._settingsChangedIds)
            this._settings.disconnect(id);
        this._settingsChangedIds = [];
        super.destroy();
    }
});
