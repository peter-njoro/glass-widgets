import {LOCATION_NAME_CHANGED_SIGNAL} from './settings.js';
'use strict';

import GObject from 'gi://GObject';
import {WEATHER_SIGNALS} from './forecast-config.js';

export const GlassWeather = GObject.registerClass({
    Signals: {[WEATHER_SIGNALS.weatherUpdated]: {}},
}, class GlassWeather extends GObject.Object {
    _init(forecast, locationHelper) {
        super._init();

        this._forecast = forecast;
        this._locationHelper = locationHelper;
        this._forecastChangedId = forecast.connect(
            WEATHER_SIGNALS.forecastUpdated, () => this.emit(WEATHER_SIGNALS.weatherUpdated));
        this._locationNameChangedId = this._locationHelper.connect(
            LOCATION_NAME_CHANGED_SIGNAL, () => this.emit(WEATHER_SIGNALS.weatherUpdated));
    }

    get loading() {
        return this._forecast.loading;
    }

    get iconName() {
        return this._forecast.current?.icon ?? null;
    }

    get temperature() {
        return this._forecast.current?.temperature ?? null;
    }

    get hasWeather() {
        return this._forecast.current !== null;
    }

    get locationName() {
        const location = this._locationHelper.location;
        if (!location)
            return null;
        return this._locationHelper.locationName ?? location.get_name();
    }

    destroy() {
        this._forecast.disconnect(this._forecastChangedId);
        this._locationHelper.disconnect(this._locationNameChangedId);
        this._forecast = null;
        this._locationHelper = null;
    }
});
