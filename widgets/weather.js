'use strict';

import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
import GWeather from 'gi://GWeather';
import Geoclue from 'gi://Geoclue';

const AUTO_LOCATION_KEY = 'weather-auto-location';
const LAT_KEY = 'weather-lat';
const LON_KEY = 'weather-lon';

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
        this._gclueService = null;
        this._gclueLocId = 0;
        this._gclueStarting = false;
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
        this._info.connect('updated', () => this._onInfoUpdated());

        this._settingsChangedIds = [];
        this._settingsChangedIds.push(settings.connect(
            `changed::${AUTO_LOCATION_KEY}`, () => this._updateLocation()));
        this._settingsChangedIds.push(settings.connect(
            `changed::${LAT_KEY}`, () => this._updateLocation()));
        this._settingsChangedIds.push(settings.connect(
            `changed::${LON_KEY}`, () => this._updateLocation()));

        this._updateLocation();
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

    _updateLocation() {
        if (this._settings.get_boolean(AUTO_LOCATION_KEY)) {
            if (this._gclueService)
                this._updateGClueMonitoring();
            else
                this._startGClue();
        } else {
            this._stopGClue();
            this._setLocation(this._makeManualLocation());
        }
    }

    _makeManualLocation() {
        const lat = this._settings.get_double(LAT_KEY);
        const lon = this._settings.get_double(LON_KEY);
        if (lat === 0 && lon === 0)
            return null;
        return GWeather.Location.new_detached('', null, lat, lon);
    }

    _startGClue() {
        if (this._gclueService || this._gclueStarting)
            return;

        this._gclueStarting = true;
        try {
            Geoclue.Simple.new(APP_ID, Geoclue.AccuracyLevel.CITY, null,
                (source, result) => {
                    this._gclueStarting = false;
                    try {
                        this._gclueService = Geoclue.Simple.new_finish(result);
                        this._updateGClueMonitoring();
                    } catch (e) {
                        console.error(`glass-widgets: failed to get geolocation: ${e}`);
                        this._gclueService = null;
                        this._setLocation(this._makeManualLocation());
                    }
                });
        } catch (e) {
            this._gclueStarting = false;
            console.error(`glass-widgets: failed to start geolocation: ${e}`);
            this._setLocation(this._makeManualLocation());
        }
    }

    _onGClueLocationChanged() {
        const geoLocation = this._gclueService.location;
        if (geoLocation)
            this._setLocation(GWeather.Location.new_detached('',
                null, geoLocation.latitude, geoLocation.longitude));
    }

    _updateGClueMonitoring() {
        if (this._gclueLocId === 0 && this._gclueService) {
            this._gclueLocId = this._gclueService.connect('notify::location',
                () => this._onGClueLocationChanged());
        }
        this._onGClueLocationChanged();
    }

    _stopGClue() {
        if (this._gclueLocId) {
            this._gclueService.disconnect(this._gclueLocId);
            this._gclueLocId = 0;
        }
        this._gclueService = null;
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
        if (this._info.is_valid()) {
            this._iconName = this._info.get_icon_name();
            this._temperature = this._formatTemperature(this._info.get_temp());
        } else {
            this._clearWeather();
        }
        this.emit('weather-updated');
    }

    _formatTemperature(str) {
        const match = String(str).match(/(-?\d+(?:[.,]\d+)?)/);
        if (!match)
            return null;
        return `${Math.round(parseFloat(match[1].replace(',', '.')))}°`;
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
        this._stopGClue();
        if (this._info) {
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
