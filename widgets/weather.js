import {LOCATION_CHANGED_SIGNAL, LOCATION_NAME_CHANGED_SIGNAL} from './settings.js';
'use strict';

import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
import GWeather from 'gi://GWeather';
import {PROJECT_URL} from './metadata.js';
import {GlassLocation} from './location.js';
import {WEATHER_SIGNALS} from './forecast-config.js';

const TEMP_UNIT_KEY = 'weather-temperature-unit';
const TEMP_UNIT_CELSIUS = 0;
const TEMP_UNIT_FAHRENHEIT = 1;
const UPDATE_INTERVAL_SECONDS = 30 * 60;
const APP_ID = 'org.gnome.shell.extensions.glass-widgets';

export const GlassWeather = GObject.registerClass({
    Signals: {[WEATHER_SIGNALS.weatherUpdated]: {}},
}, class GlassWeather extends GObject.Object {
    _init(settings, locationHelper = null) {
        super._init();

        this._settings = settings;
        this._location = null;
        this._info = null;
        this._timerId = null;
        this._iconName = null;
        this._temperature = null;
        this._loading = true;

        this._info = new GWeather.Info({
            application_id: APP_ID,
            contact_info: PROJECT_URL,
            enabled_providers: GWeather.Provider.METAR |
                GWeather.Provider.MET_NO |
                GWeather.Provider.OWM,
        });
        this._infoUpdatedId = this._info.connect('updated', () => this._onInfoUpdated());

        this._settingsChangedIds = [];
        this._settingsChangedIds.push(settings.connect(
            `changed::${TEMP_UNIT_KEY}`, () => this._onTempUnitChanged()));
        this._locationHelper = locationHelper ?? new GlassLocation(settings);
        this._ownsLocationHelper = locationHelper === null;
        this._locationChangedId = this._locationHelper.connect(
            LOCATION_CHANGED_SIGNAL, (_, loc) => this._setLocation(loc));
        this._locationNameChangedId = this._locationHelper.connect(
            LOCATION_NAME_CHANGED_SIGNAL, () => this.emit(WEATHER_SIGNALS.weatherUpdated));
        this._setLocation(this._locationHelper.location);

        this._startTimer();
    }

    get loading() {
        return this._loading;
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
        return this._locationHelper.locationName ?? this._info.get_location_name();
    }

    _setLocation(location) {
        if (this._location && location && this._location.equal(location))
            return;

        this._info.abort();
        this._location = location;
        this._clearWeather();
        if (!location) {
            this._loading = this._locationHelper.resolving;
            this.emit(WEATHER_SIGNALS.weatherUpdated);
            return;
        }

        this._info.set_location(location);
        this._refresh();
    }

    _onInfoUpdated() {
        if (!this._info || !this._location)
            return;

        this._loading = false;
        if (this._info.is_valid()) {
            this._iconName = this._info.get_icon_name();
            this._temperature = this._formatTemperature();
        } else {
            this._clearWeather();
        }
        this.emit(WEATHER_SIGNALS.weatherUpdated);
    }

    _onTempUnitChanged() {
        if (this._info && this._info.is_valid()) {
            this._temperature = this._formatTemperature();
            this.emit(WEATHER_SIGNALS.weatherUpdated);
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

    _refresh() {
        if (!this._location || !this._info)
            return;
        this._loading = true;
        this.emit(WEATHER_SIGNALS.weatherUpdated);
        this._info.update();
    }

    _startTimer() {
        this._timerId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT, UPDATE_INTERVAL_SECONDS, () => {
                if (this._location)
                    this._refresh();
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
            this._locationHelper.disconnect(this._locationNameChangedId);
            if (this._ownsLocationHelper)
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
        this._loading = false;
    }
});
