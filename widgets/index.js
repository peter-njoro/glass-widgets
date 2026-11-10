'use strict';

// Configuration constants
export {
    POSITION_CONFIG,
    HOURLY_FORECAST_CONFIG,
    WEEKLY_FORECAST_CONFIG,
    LOCATION_NAME_KEYS,
    LOCATION_NAME_PROVIDER,
    WORLD_CLOCK_KEYS,
    LOCATION_CHANGED_SIGNAL,
    LOCATION_NAME_CHANGED_SIGNAL,
} from './settings.js';

// Position helpers
export {
    POSITION_KEYS,
    migratePositionSettings,
} from './position.js';

// Preference icons
export {
    PREFERENCES_ICON,
    findPreferencesIcon,
} from './preferences-icons.js';

// Forecast configuration
export {
    FORECAST_CONFIG,
    getHourlyForecastRange,
    getWeeklyForecastRange,
} from './forecast-config.js';

// Location
export {GlassLocation} from './location.js';

// Metadata
export {PROJECT_URL} from './metadata.js';

// Widgets
export {GlassClockWidget} from './clock.js';
export {GlassStatsWidget} from './stats.js';
export {GlassCalendarWidget} from './calendar.js';
export {GlassWorldClockWidget} from './world-clock.js';
export {GlassWeather} from './weather.js';
export {GlassForecast} from './forecast.js';
export {GlassHourlyWeather} from './hourly-weather.js';
export {GlassWeeklyWeather} from './weekly-weather.js';
export {GlassDoughnut} from './doughnut.js';

// UI helpers
export {createWeatherPlaceholder} from './weather-placeholder.js';
export {applyDynamicStyle} from './style.js';
