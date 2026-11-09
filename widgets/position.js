import {POSITION_CONFIG} from './settings.js';
export const POSITION_KEYS = {
    clock: ['clock-x-percent', 'clock-y-percent'],
    stats: ['stats-x-percent', 'stats-y-percent'],
    calendar: ['calendar-x-percent', 'calendar-y-percent'],
    worldclock: ['world-clock-x-percent', 'world-clock-y-percent'],
    hourly: ['hourly-x-percent', 'hourly-y-percent'],
    weekly: ['weekly-x-percent', 'weekly-y-percent'],
};

export function migratePositionSettings(settings) {
    if (settings.get_boolean(POSITION_CONFIG.migratedKey))
        return;

    for (const key of Object.values(POSITION_KEYS).flat()) {
        if (settings.get_user_value(key) !== null)
            continue;

        const legacyValue = settings.get_user_value(key.replace(/-percent$/, ''));
        if (legacyValue !== null && !settings.set_double(key, legacyValue.get_int32()))
            return;
    }
    settings.set_boolean(POSITION_CONFIG.migratedKey, true);
}