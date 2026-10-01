'use strict';

import GObject from 'gi://GObject';
import Geoclue from 'gi://Geoclue';
import GWeather from 'gi://GWeather';

const AUTO_LOCATION_KEY = 'weather-auto-location';
const LAT_KEY = 'weather-lat';
const LON_KEY = 'weather-lon';
const APP_ID = 'org.gnome.shell.extensions.glass-widgets';

export const GlassLocation = GObject.registerClass({
    Signals: {'location-changed': {param_types: [GObject.TYPE_OBJECT]}},
}, class GlassLocation extends GObject.Object {
    _init(settings) {
        super._init();

        this._settings = settings;
        this._location = null;
        this._gclueService = null;
        this._gclueLocId = 0;
        this._gclueStarting = false;
        this._destroyed = false;

        this._settingsChangedIds = [];
        this._settingsChangedIds.push(settings.connect(
            `changed::${AUTO_LOCATION_KEY}`, () => this._updateLocation()));
        this._settingsChangedIds.push(settings.connect(
            `changed::${LAT_KEY}`, () => this._updateLocation()));
        this._settingsChangedIds.push(settings.connect(
            `changed::${LON_KEY}`, () => this._updateLocation()));

        this._updateLocation();
    }

    get location() {
        return this._location;
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
                    if (this._destroyed)
                        return;
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
            this._setLocation(GWeather.Location.new_detached(''
                , null, geoLocation.latitude, geoLocation.longitude));
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

    _setLocation(location) {
        if (this._destroyed)
            return;

        if (this._location && location && this._location.equal(location))
            return;

        this._location = location;
        this.emit('location-changed', location);
    }

    destroy() {
        this._destroyed = true;
        for (const id of this._settingsChangedIds)
            this._settings.disconnect(id);
        this._settingsChangedIds = [];
        this._settings = null;
        this._stopGClue();
        this._location = null;
    }
});
