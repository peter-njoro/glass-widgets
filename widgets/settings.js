'use strict';

export const LOCATION_NAME_PROVIDER = Object.freeze({LOCAL: 0, NOMINATIM: 1, PHOTON: 2});
export const LOCATION_NAME_KEYS = Object.freeze({provider: 'weather-location-name-provider'});
export const LOCATION_NAME_CHANGED_SIGNAL = 'location-name-changed';
export const HOURLY_FORECAST_CONFIG = Object.freeze({hoursKey: 'weather-hourly-hours', stepHours: 1});
export const POSITION_CONFIG = Object.freeze({
    migratedKey: 'position-values-migrated', minimumPercent: 0, maximumPercent: 100,
    decimalPlaces: 2, stepPercent: 0.5, pageStepPercent: 10, centerAnchor: 0.5,
});
export const WORLD_CLOCK_KEYS = Object.freeze({
    entries: 'world-clock-entries', showTicks: 'world-clock-show-ticks', showSeconds: 'world-clock-show-seconds',
    showNumbers: 'world-clock-show-numbers', showRelativeTime: 'world-clock-show-relative-time',
});
