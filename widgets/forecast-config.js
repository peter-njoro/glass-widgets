'use strict';

import {HOURLY_FORECAST_CONFIG, WEEKLY_FORECAST_CONFIG} from './settings.js';

export const FORECAST_CONFIG = Object.freeze({
    cardWidthPx: 392,
    cardHeightPx: 140,
    weatherIconSizePx: 24,
    clearWeatherIconName: 'weather-clear-symbolic',
    hourLabelFormat: '%H:00',
    dayLabelFormat: '%m-%d',
});

export function getHourlyForecastRange(settings) {
    const [, bounds] = settings.settings_schema.get_key(HOURLY_FORECAST_CONFIG.hoursKey)
        .get_range().deep_unpack();
    const [minimumHours, maximumHours] = bounds.deep_unpack();
    return {minimumHours, maximumHours};
}

export function getWeeklyForecastRange(settings) {
    const [, bounds] = settings.settings_schema.get_key(WEEKLY_FORECAST_CONFIG.daysKey)
        .get_range().deep_unpack();
    const [minimumDays, maximumDays] = bounds.deep_unpack();
    return {minimumDays, maximumDays};
}