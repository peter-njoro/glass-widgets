import Gtk from 'gi://Gtk?version=4.0';
import Gdk from 'gi://Gdk?version=4.0';
import {FORECAST_CONFIG} from './forecast-config.js';

export const PREFERENCES_ICON = Object.freeze({
    GENERAL: 'general',
    WORLD_CLOCK: 'world-clock',
    CLOCK_STYLE: 'clock-style',
    WEATHER: 'weather',
    POSITION: 'position',
    EFFECTS: 'effects',
    SPONSOR: 'sponsor',
});

const ICON_NAMES = Object.freeze({
    GENERAL: 'preferences-other-symbolic',
    LEGACY_CLOCK: 'preferences-clock-symbolic',
    LEGACY_POSITION: 'preferences-position-symbolic',
    WORLD_CLOCK: 'clock-world-symbolic',
    CLOCK_APPLICATION: 'org.gnome.clocks-symbolic',
    CLOCK: 'preferences-system-time-symbolic',
    WEATHER: FORECAST_CONFIG.clearWeatherIconName,
    POSITION: 'view-fullscreen-symbolic',
    EFFECTS: 'preferences-desktop-display-symbolic',
    SPONSOR: 'emblem-favorite-symbolic',
});

const PRIMARY_ICONS = new Map([
    [PREFERENCES_ICON.GENERAL, ICON_NAMES.GENERAL],
    [PREFERENCES_ICON.WORLD_CLOCK, ICON_NAMES.LEGACY_CLOCK],
    [PREFERENCES_ICON.CLOCK_STYLE, ICON_NAMES.LEGACY_CLOCK],
    [PREFERENCES_ICON.WEATHER, ICON_NAMES.WEATHER],
    [PREFERENCES_ICON.POSITION, ICON_NAMES.LEGACY_POSITION],
    [PREFERENCES_ICON.EFFECTS, ICON_NAMES.EFFECTS],
    [PREFERENCES_ICON.SPONSOR, ICON_NAMES.SPONSOR],
]);

const FALLBACK_ICONS = new Map([
    [PREFERENCES_ICON.GENERAL, [ICON_NAMES.GENERAL]],
    [PREFERENCES_ICON.WORLD_CLOCK, [ICON_NAMES.WORLD_CLOCK, ICON_NAMES.CLOCK_APPLICATION, ICON_NAMES.CLOCK]],
    [PREFERENCES_ICON.CLOCK_STYLE, [ICON_NAMES.CLOCK]],
    [PREFERENCES_ICON.WEATHER, [ICON_NAMES.WEATHER]],
    [PREFERENCES_ICON.POSITION, [ICON_NAMES.POSITION]],
    [PREFERENCES_ICON.EFFECTS, [ICON_NAMES.EFFECTS]],
    [PREFERENCES_ICON.SPONSOR, [ICON_NAMES.SPONSOR]],
]);

export function findPreferencesIcon(icon, iconTheme = null) {
    if (!PRIMARY_ICONS.has(icon) || !FALLBACK_ICONS.has(icon))
        throw new Error(`Unknown preferences icon: ${icon}`);

    const theme = iconTheme ?? Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
    const primaryIcon = PRIMARY_ICONS.get(icon);
    const candidates = new Set([primaryIcon, ...FALLBACK_ICONS.get(icon)]);
    for (const name of candidates) {
        if (theme.has_icon(name))
            return name;
    }
    return primaryIcon;
}