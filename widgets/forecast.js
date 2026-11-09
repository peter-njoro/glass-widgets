'use strict';

import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Soup from 'gi://Soup';

import {FORECAST_CONFIG, getHourlyForecastRange} from './forecast-config.js';
import {HOURLY_FORECAST_CONFIG} from './settings.js';

const TEMP_UNIT_KEY = 'weather-temperature-unit';
const UPDATE_INTERVAL_SECONDS = 30 * 60;

export const GlassForecast = GObject.registerClass({
    Signals: {'forecast-updated': {}},
}, class GlassForecast extends GObject.Object {
    _init(settings, locationHelper, networkMonitor = null) {
        super._init();

        this._settings = settings;
        this._locationHelper = locationHelper;
        this._locationChangedId = locationHelper.connect(
            'location-changed', (_, location) => this._setLocation(location));
        this._temperatureChangedId = settings.connect(
            `changed::${TEMP_UNIT_KEY}`, () => this._formatData());
        this._session = Soup.Session.new();
        this._location = null;
        this._hourlyItems = [];
        this._hourly = [];
        this._daily = [];
        this._maximumHourlyHours = getHourlyForecastRange(settings).maximumHours;
        this._hourlyHoursChangedId = settings.connect(
            `changed::${HOURLY_FORECAST_CONFIG.hoursKey}`, () => this._updateHourly());
        this._lastFetch = 0;
        this._requestSerial = 0;
        this._timerId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT, UPDATE_INTERVAL_SECONDS,
            () => {
                this._fetch(true);
                return GLib.SOURCE_CONTINUE;
            });

        this._networkMonitor = networkMonitor ?? Gio.NetworkMonitor.get_default();
        this._networkChangedId = this._networkMonitor.connect(
            'network-changed', (_monitor, available) => {
                if (available)
                    this._fetch(true);
            });

        if (locationHelper.location)
            this._setLocation(locationHelper.location);
    }

    get hourly() {
        return this._hourly;
    }

    get hourlyHours() {
        return this._settings.get_int(HOURLY_FORECAST_CONFIG.hoursKey);
    }

    get daily() {
        return this._daily;
    }

    _setLocation(location) {
        if (this._location && location && this._location.equal(location))
            return;

        this._location = location;
        this._hourlyItems = [];
        this._hourly = [];
        this._daily = [];
        this._lastFetch = 0;
        this.emit('forecast-updated');
        this._fetch(true);
    }

    _getCoordinates() {
        if (!this._location)
            return null;

        if (typeof this._location.get_coords === 'function') {
            const coords = this._location.get_coords();
            if (coords && coords.length >= 2)
                return {latitude: coords[0], longitude: coords[1]};
        }

        if (typeof this._location.latitude === 'number' &&
            typeof this._location.longitude === 'number') {
            return {
                latitude: this._location.latitude,
                longitude: this._location.longitude,
            };
        }

        return null;
    }

    _fetch(force = false) {
        const coordinates = this._getCoordinates();
        if (!coordinates)
            return;

        const now = GLib.get_monotonic_time();
        if (!force && now - this._lastFetch < UPDATE_INTERVAL_SECONDS * GLib.TIME_SPAN_SECOND)
            return;

        this._lastFetch = now;
        const serial = ++this._requestSerial;
        const query = [
            ['latitude', coordinates.latitude.toFixed(4)],
            ['longitude', coordinates.longitude.toFixed(4)],
            ['hourly', 'temperature_2m,weather_code'],
            ['daily', 'weather_code,temperature_2m_max,temperature_2m_min'],
            ['forecast_days', String(FORECAST_CONFIG.dailyDays)],
            ['timezone', 'auto'],
        ].map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&');
        const message = Soup.Message.new(
            'GET', `https://api.open-meteo.com/v1/forecast?${query}`);

        this._session.send_and_read_async(
            message, GLib.PRIORITY_DEFAULT, null, (session, result) => {
                try {
                    const bytes = session.send_and_read_finish(result);
                    if (serial !== this._requestSerial)
                        return;
                    if (message.get_status() < Soup.Status.OK || message.get_status() >= Soup.Status.MULTIPLE_CHOICES)
                        throw new Error(`HTTP ${message.get_status()}`);
                    const payload = JSON.parse(new TextDecoder().decode(bytes.get_data()));
                    this._setData(payload);
                } catch (error) {
                    if (serial !== this._requestSerial)
                        return;
                    console.error(`glass-widgets: forecast request failed: ${error}`);
                    this._hourlyItems = [];
                    this._hourly = [];
                    this._daily = [];
                    this.emit('forecast-updated');
                }
            });
    }

    _setData(payload) {
        const hourly = payload.hourly;
        const daily = payload.daily;
        if (!hourly || !daily)
            throw new Error('Forecast response is missing data');

        const currentTime = GLib.DateTime.new_now_local().format('%Y-%m-%dT%H:00');
        let start = hourly.time.findIndex(time => time >= currentTime);
        if (start < 0)
            start = 0;

        this._hourlyItems = hourly.time.slice(start, start + this._maximumHourlyHours).map((time, index) => ({
            time: time.slice(11, 16),
            temperature: this._formatTemperature(hourly.temperature_2m[start + index]),
            icon: weatherCodeIcon(hourly.weather_code[start + index]),
        }));
        this._daily = daily.time.slice(0, FORECAST_CONFIG.dailyDays).map((date, index) => ({
            date: date.slice(5),
            min: this._formatTemperature(daily.temperature_2m_min[index]),
            max: this._formatTemperature(daily.temperature_2m_max[index]),
            icon: weatherCodeIcon(daily.weather_code[index]),
        }));
        this._updateHourly();
    }

    _updateHourly() {
        this._hourly = this._hourlyItems.slice(0, this.hourlyHours);
        this.emit('forecast-updated');
    }

    _formatData() {
        if (this._hourly.length === 0 && this._daily.length === 0)
            return;
        this._fetch(true);
    }

    _formatTemperature(celsius) {
        if (celsius === null || celsius === undefined)
            return '--';
        if (this._settings.get_int(TEMP_UNIT_KEY) === 1)
            return `${Math.round(celsius * 9 / 5 + 32)}°`;
        return `${Math.round(celsius)}°`;
    }

    destroy() {
        ++this._requestSerial;
        if (this._timerId) {
            GLib.Source.remove(this._timerId);
            this._timerId = null;
        }
        this._networkMonitor.disconnect(this._networkChangedId);
        this._networkMonitor = null;
        this._locationHelper.disconnect(this._locationChangedId);
        this._settings.disconnect(this._temperatureChangedId);
        this._settings.disconnect(this._hourlyHoursChangedId);
        this._session = null;
        this._locationHelper = null;
        this._settings = null;
    }
});

function weatherCodeIcon(code) {
    if (code === 0)
        return FORECAST_CONFIG.clearWeatherIconName;
    if ([1, 2].includes(code))
        return 'weather-few-clouds-symbolic';
    if (code === 3)
        return 'weather-overcast-symbolic';
    if ([45, 48].includes(code))
        return 'weather-fog-symbolic';
    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code))
        return 'weather-showers-symbolic';
    if ([71, 73, 75, 77, 85, 86].includes(code))
        return 'weather-snow-symbolic';
    if ([95, 96, 99].includes(code))
        return 'weather-storm-symbolic';
    return 'weather-overcast-symbolic';
}
