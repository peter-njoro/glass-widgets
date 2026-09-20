'use strict';

import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
import GWeather from 'gi://GWeather';
import {GlassLocation} from './location.js';

const TEMP_UNIT_KEY = 'weather-temperature-unit';
const TEMP_UNIT_CELSIUS = 0;
const TEMP_UNIT_FAHRENHEIT = 1;
const UPDATE_INTERVAL_SECONDS = 30 * 60;
const APP_ID = 'org.gnome.shell.extensions.glass-widgets';

export const GlassWeather = GObject.registerClass({
    Signals: {'weather-updated': {}},
}, class GlassWeather extends GObject.Object {
    _init(settings) {
        super._init();

        this._settings = settings;
        this._location = null;
        this._info = null;
        this._timerId = null;
        this._iconName = null;
        this._temperature = null;

        this._info = new GWeather.Info({
            application_id: APP_ID,
            contact_info: 'https://github.com/peter-njoro/glass-widgets',
            enabled_providers: GWeather.Provider.METAR |
                GWeather.Provider.MET_NO |
                GWeather.Provider.OWM,
        });
        this._infoUpdatedId = this._info.connect('updated', () => this._onInfoUpdated());

        this._settingsChangedIds = [];
        this._settingsChangedIds.push(settings.connect(
            `changed::${TEMP_UNIT_KEY}`, () => this._onTempUnitChanged()));
        this._locationHelper = new GlassLocation(settings);
        this._locationChangedId = this._locationHelper.connect(
            'location-changed', (_, loc) => this._setLocation(loc));

        this._startTimer();
    }

    get iconName() {
        return this._iconName;
    }

    get temperature() {
        return this._temperature;
    }

    get hasWeather() {
        return this._iconName != null && this._temperature != null;
    }

    get locationName() {
        if (!this._location)
            return null;
        return this._info.get_location_name();
    }

    _setLocation(location) {
        if (this._location && location && this._location.equal(location))
            return;

        this._location = location;
        if (!location) {
            this._clearWeather();
            this.emit('weather-updated');
            return;
        }

        this._info.abort();
        this._info.set_location(location);
        this._info.update();
    }

    _onInfoUpdated() {
        if (!this._info)
            return;

        if (this._info.is_valid()) {
            this._iconName = this._info.get_icon_name();
            this._temperature = this._formatTemperature();
        } else {
            this._clearWeather();
        }
        this.emit('weather-updated');
    }

    _onTempUnitChanged() {
        if (this._info && this._info.is_valid()) {
            this._temperature = this._formatTemperature();
            this.emit('weather-updated');
        }
    }

    _formatTemperature() {
        if (!this._info || !this._info.is_valid())
            return null;

        const targetUnit = this._settings
            ? this._settings.get_int(TEMP_UNIT_KEY)
            : TEMP_UNIT_CELSIUS;

        // Try getting numeric temperature directly from GWeather if available
        if (typeof this._info.get_value_temp === 'function') {
            const [ok, valC] = this._info.get_value_temp(GWeather.TemperatureUnit.CENTIGRADE);
            if (ok) {
                if (targetUnit === TEMP_UNIT_FAHRENHEIT) {
                    const valF = (valC * 9) / 5 + 32;
                    return `${Math.round(valF)}°F`;
                }
                return `${Math.round(valC)}°C`;
            }
        }

        // Fallback: parse string from get_temp()
        const tempStr = this._info.get_temp();
        if (!tempStr)
            return null;

        const match = String(tempStr).match(/(-?\d+(?:[.,]\d+)?)/);
        if (!match)
            return null;

        const num = parseFloat(match[1].replace(',', '.'));
        const isSourceFahrenheit = /°F|℉|[\s°]F\b/i.test(tempStr);

        let tempC;
        if (isSourceFahrenheit)
            tempC = (num - 32) * 5 / 9;
        else
            tempC = num;

        if (targetUnit === TEMP_UNIT_FAHRENHEIT) {
            const valF = isSourceFahrenheit ? num : (tempC * 9) / 5 + 32;
            return `${Math.round(valF)}°F`;
        }

        return `${Math.round(tempC)}°C`;
    }

    _clearWeather() {
        this._iconName = null;
        this._temperature = null;
    }

    _startTimer() {
        this._timerId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT, UPDATE_INTERVAL_SECONDS, () => {
                if (this._location)
                    this._info.update();
                return GLib.SOURCE_CONTINUE;
            });
    }

    destroy() {
        if (this._timerId) {
            GLib.Source.remove(this._timerId);
            this._timerId = null;
        }
        if (this._locationHelper) {
            this._locationHelper.disconnect(this._locationChangedId);
            this._locationHelper.destroy();
            this._locationHelper = null;
        }
        if (this._info) {
            this._info.disconnect(this._infoUpdatedId);
            this._info.abort();
            this._info = null;
        }
        for (const id of this._settingsChangedIds)
            this._settings.disconnect(id);
        this._settingsChangedIds = [];
        this._settings = null;
        this._location = null;
    }
});
