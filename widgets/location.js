import {LOCATION_NAME_CHANGED_SIGNAL, LOCATION_NAME_KEYS, LOCATION_NAME_PROVIDER} from './settings.js';
'use strict';

import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Geoclue from 'gi://Geoclue';
import GWeather from 'gi://GWeather';
import Soup from 'gi://Soup';

import {PROJECT_URL} from './metadata.js';

const AUTO_LOCATION_KEY = 'weather-auto-location';
const NAME_PROVIDER_KEY = LOCATION_NAME_KEYS.provider;
const LAT_KEY = 'weather-lat';
const LON_KEY = 'weather-lon';
const APP_ID = 'org.gnome.shell.extensions.glass-widgets';
const NAME_REQUEST_TIMEOUT_SECONDS = 10;
const NAME_LOOKUP_DEBOUNCE_MS = 1000;
const NAME_LOOKUP_COORDINATE_DECIMALS = 4;
const NAME_CACHE_LIMIT = 32;

export {LOCATION_NAME_PROVIDER} from './settings.js';

const LOCATION_NAME_SERVICES = new Map([
    [LOCATION_NAME_PROVIDER.NOMINATIM, {
        url: 'https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=15&addressdetails=1&layer=address',
        getAddress: payload => payload.address ?? {},
    }],
    [LOCATION_NAME_PROVIDER.PHOTON, {
        url: 'https://photon.komoot.io/reverse?limit=1',
        getAddress: payload => {
            const [feature] = payload.features ?? [];
            return feature?.properties ?? {};
        },
    }],
]);

export const GlassLocation = GObject.registerClass({
    Signals: {
        'location-changed': {param_types: [GObject.TYPE_OBJECT]},
        [LOCATION_NAME_CHANGED_SIGNAL]: {},
    },
}, class GlassLocation extends GObject.Object {
    _init(settings, networkMonitor = null) {
        super._init();

        this._settings = settings;
        this._location = null;
        this._locationName = null;
        this._nameCache = new Map();
        this._nameLookupId = 0;
        this._nameRequestSerial = 0;
        this._nameCancellable = null;
        this._session = new Soup.Session({
            user_agent: `Glass-Widgets (${PROJECT_URL})`,
            timeout: NAME_REQUEST_TIMEOUT_SECONDS,
        });
        this._gclueService = null;
        this._gclueLocId = 0;
        this._gclueStarting = false;

        this._settingsChangedIds = [];
        this._settingsChangedIds.push(settings.connect(
            `changed::${AUTO_LOCATION_KEY}`, () => this._updateLocation()));
        this._settingsChangedIds.push(settings.connect(
            `changed::${NAME_PROVIDER_KEY}`, () => this._resolveLocationName()));
        this._settingsChangedIds.push(settings.connect(
            `changed::${LAT_KEY}`, () => this._updateLocation()));
        this._settingsChangedIds.push(settings.connect(
            `changed::${LON_KEY}`, () => this._updateLocation()));

        this._networkMonitor = networkMonitor ?? Gio.NetworkMonitor.get_default();
        this._networkChangedId = this._networkMonitor.connect(
            'network-changed', (_monitor, available) => {
                if (available && this._locationName === null)
                    this._resolveLocationName();
            });

        this._updateLocation();
    }

    get location() {
        return this._location;
    }

    get locationName() {
        return this._locationName;
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
                    if (this._settings === null)
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
        if (this._settings === null)
            return;

        if (this._location && location && this._location.equal(location))
            return;

        this._location = location;
        this._resolveLocationName();
        this.emit('location-changed', location);
    }

    _cancelNameLookup() {
        ++this._nameRequestSerial;
        if (this._nameLookupId) {
            GLib.Source.remove(this._nameLookupId);
            this._nameLookupId = 0;
        }
        if (this._nameCancellable) {
            this._nameCancellable.cancel();
            this._nameCancellable = null;
        }
    }

    _setLocationName(name) {
        if (this._locationName === name)
            return;
        this._locationName = name;
        this.emit(LOCATION_NAME_CHANGED_SIGNAL);
    }

    _resolveLocationName() {
        this._cancelNameLookup();
        this._setLocationName(null);
        const provider = this._settings.get_int(NAME_PROVIDER_KEY);
        if (!this._location || !LOCATION_NAME_SERVICES.has(provider))
            return;

        const [latitude, longitude] = this._location.get_coords();
        const cacheKey = `${provider}:${latitude.toFixed(NAME_LOOKUP_COORDINATE_DECIMALS)}:${longitude.toFixed(NAME_LOOKUP_COORDINATE_DECIMALS)}`;
        if (this._nameCache.has(cacheKey)) {
            this._setLocationName(this._nameCache.get(cacheKey));
            return;
        }

        const serial = this._nameRequestSerial;
        this._nameLookupId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, NAME_LOOKUP_DEBOUNCE_MS, () => {
            this._nameLookupId = 0;
            this._lookupLocationName(provider, latitude, longitude, cacheKey, serial);
            return GLib.SOURCE_REMOVE;
        });
    }

    _lookupLocationName(provider, latitude, longitude, cacheKey, serial) {
        const service = LOCATION_NAME_SERVICES.get(provider);
        if (!service)
            return;

        const query = [
            ['lat', latitude.toFixed(NAME_LOOKUP_COORDINATE_DECIMALS)],
            ['lon', longitude.toFixed(NAME_LOOKUP_COORDINATE_DECIMALS)],
        ].map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&');
        const message = Soup.Message.new('GET', `${service.url}&${query}`);
        this._nameCancellable = new Gio.Cancellable();
        this._session.send_and_read_async(message, GLib.PRIORITY_DEFAULT,
            this._nameCancellable, (session, result) => {
                try {
                    const bytes = session.send_and_read_finish(result);
                    if (this._settings === null || serial !== this._nameRequestSerial)
                        return;
                    this._nameCancellable = null;
                    if (message.get_status() < Soup.Status.OK || message.get_status() >= Soup.Status.MULTIPLE_CHOICES)
                        throw new Error(`HTTP ${message.get_status()}`);

                    const payload = JSON.parse(new TextDecoder().decode(bytes.get_data()));
                    const address = service.getAddress(payload);
                    const name = address.city || address.town || address.village ||
                        address.hamlet || address.locality || address.municipality ||
                        address.name || payload.name;
                    if (typeof name !== 'string' || !name.trim())
                        throw new Error('Location response is missing a place name');

                    if (this._nameCache.size >= NAME_CACHE_LIMIT)
                        this._nameCache.delete(this._nameCache.keys().next().value);
                    this._nameCache.set(cacheKey, name.trim());
                    this._setLocationName(name.trim());
                } catch (error) {
                    if (this._settings !== null && serial === this._nameRequestSerial) {
                        this._nameCancellable = null;
                        console.error(`glass-widgets: location name request failed: ${error}`);
                    }
                }
            });
    }

    destroy() {
        this._networkMonitor.disconnect(this._networkChangedId);
        this._networkMonitor = null;
        this._cancelNameLookup();
        this._session.abort();
        this._session = null;
        this._nameCache.clear();
        for (const id of this._settingsChangedIds)
            this._settings.disconnect(id);
        this._settingsChangedIds = [];
        this._settings = null;
        this._stopGClue();
        this._location = null;
        this._locationName = null;
    }
});
