'use strict';

export const LOCATION_NAME_PROVIDER = Object.freeze({LOCAL: 0, NOMINATIM: 1, PHOTON: 2});
export const LOCATION_NAME_KEYS = Object.freeze({provider: 'weather-location-name-provider'});
export const LOCATION_NAME_CHANGED_SIGNAL = 'location-name-changed';
