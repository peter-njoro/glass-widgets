'use strict';

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class GlassWidgetsPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        // General page
        const generalPage = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'preferences-other-symbolic',
        });
        window.add(generalPage);

        const widgetsGroup = new Adw.PreferencesGroup({title: _('Widgets')});
        generalPage.add(widgetsGroup);

        const showClockRow = new Adw.SwitchRow({
            title: _('Clock widget'),
            subtitle: _('Show a frosted glass clock on the desktop'),
        });
        settings.bind('show-clock', showClockRow, 'active', 0);
        widgetsGroup.add(showClockRow);

        const showStatsRow = new Adw.SwitchRow({
            title: _('System stats widget'),
            subtitle: _('Show RAM and CPU usage on the desktop'),
        });
        settings.bind('show-stats', showStatsRow, 'active', 0);
        widgetsGroup.add(showStatsRow);

        const showWeatherRow = new Adw.SwitchRow({
            title: _('Weather in clock widget'),
            subtitle: _('Show current conditions with the clock'),
        });
        settings.bind('show-weather', showWeatherRow, 'active', 0);
        widgetsGroup.add(showWeatherRow);

        const showHourlyRow = new Adw.SwitchRow({
            title: _('Hourly weather forecast'),
            subtitle: _('Show the next six hours of weather'),
        });
        settings.bind('show-hourly-weather', showHourlyRow, 'active', 0);
        widgetsGroup.add(showHourlyRow);

        const showWeeklyRow = new Adw.SwitchRow({
            title: _('Weekly weather forecast'),
            subtitle: _('Show the seven-day weather forecast'),
        });
        settings.bind('show-weekly-weather', showWeeklyRow, 'active', 0);
        widgetsGroup.add(showWeeklyRow);

        const showCalendarRow = new Adw.SwitchRow({
            title: _('Calendar widget'),
            subtitle: _('Show the current month calendar on the desktop'),
        });
        settings.bind('show-calendar', showCalendarRow, 'active', 0);
        widgetsGroup.add(showCalendarRow);

        const showWorldClockRow = new Adw.SwitchRow({
            title: _('World clock widget'),
            subtitle: _('Show a multi-timezone analog clock on the desktop'),
        });
        settings.bind('show-world-clock', showWorldClockRow, 'active', 0);
        widgetsGroup.add(showWorldClockRow);

        const worldClockEntriesRow = new Adw.EntryRow({
            title: _('World clock timezones'),
            text: settings.get_strv('world-clock-entries').map((value) => {
                try {
                    return JSON.parse(value).tz;
                } catch {
                    return '';
                }
            }).filter(Boolean).join(', '),
        });
        const worldClockHelp = new Adw.ActionRow({
            title: _('Example: UTC, Africa/Nairobi, America/New_York'),
        });
        widgetsGroup.add(worldClockHelp);
        const refreshWorldClockEntries = () => {
            const text = worldClockEntriesRow.text.trim();
            if (!text) {
                settings.set_strv('world-clock-entries', []);
                return;
            }
            const entries = text.split(',').map((value) => value.trim()).filter(Boolean);
            settings.set_strv('world-clock-entries', entries.map((tz) => JSON.stringify({
                tz,
                label: tz.split('/').pop().replace(/_/g, ' '),
            })));
        };
        worldClockEntriesRow.connect('notify::text', refreshWorldClockEntries);
        widgetsGroup.add(worldClockEntriesRow);

        // Clock Style page
        const clockStylePage = new Adw.PreferencesPage({
            title: _('Clock Style'),
            icon_name: 'preferences-clock-symbolic',
        });
        window.add(clockStylePage);

        const clockStyleGroup = new Adw.PreferencesGroup({title: _('Clock Style')});
        clockStylePage.add(clockStyleGroup);

        const overrideRow = new Adw.SwitchRow({
            title: _('Enable clock style override'),
            subtitle: _('Use custom clock styling instead of the stylesheet default'),
        });
        settings.bind('clock-style-override-enabled', overrideRow, 'active', 0);
        clockStyleGroup.add(overrideRow);

        const formatRow = new Adw.SwitchRow({
            title: _('24-hour format'),
            subtitle: _('Use a 24-hour clock instead of 12-hour'),
        });
        settings.bind('clock-format-24h', formatRow, 'active', 0);
        clockStyleGroup.add(formatRow);

        const weightRow = new Adw.SpinRow({
            title: _('Font weight'),
            subtitle: _('100 (thin) to 900 (black)'),
            adjustment: new Gtk.Adjustment({
                lower: 100,
                upper: 900,
                step_increment: 100,
                page_increment: 200,
                value: settings.get_int('clock-font-weight'),
            }),
        });
        settings.bind('clock-font-weight', weightRow, 'value', 0);
        clockStyleGroup.add(weightRow);

        const ratioValue = Math.max(0.5, Math.min(1.5,
            settings.get_double('clock-hour-minute-size-ratio')));
        const ratioRow = new Adw.SpinRow({
            title: _('Hour/minute size ratio'),
            subtitle: _('0.5 = smaller hours, 1.0 = equal size, 1.5 = bigger hours'),
            digits: 1,
            adjustment: new Gtk.Adjustment({
                lower: 0.5,
                upper: 1.5,
                step_increment: 0.1,
                page_increment: 0.5,
                value: ratioValue,
            }),
        });
        settings.bind('clock-hour-minute-size-ratio', ratioRow, 'value', 0);
        clockStyleGroup.add(ratioRow);

        const colorButton = new Gtk.ColorDialogButton({valign: Gtk.Align.CENTER});
        const colorRow = new Adw.ActionRow({
            title: _('Clock color'),
            subtitle: _('Color used when the clock style override is enabled'),
        });
        colorRow.add_suffix(colorButton);
        clockStyleGroup.add(colorRow);
        // GSettings has no native color type – bind the hex string manually.
        const syncColor = () => {
            const rgba = colorButton.get_rgba();
            const hex = `#${Math.round(rgba.red * 255).toString(16).padStart(2, '0')}` +
                `${Math.round(rgba.green * 255).toString(16).padStart(2, '0')}` +
                `${Math.round(rgba.blue * 255).toString(16).padStart(2, '0')}`;
            if (settings.get_string('clock-color') !== hex)
                settings.set_string('clock-color', hex);
        };
        colorButton.connect('notify::rgba', syncColor);
        const initColor = () => {
            const hex = settings.get_string('clock-color');
            const r = parseInt(hex.slice(1, 3), 16) / 255;
            const g = parseInt(hex.slice(3, 5), 16) / 255;
            const b = parseInt(hex.slice(5, 7), 16) / 255;
            colorButton.set_rgba(new Gdk.RGBA({red: r, green: g, blue: b, alpha: 1}));
        };
        initColor();
        const colorSettingsId = settings.connect('changed::clock-color', initColor);
        window.connect('close-request', () => {
            settings.disconnect(colorSettingsId);
            return false;
        });

        // Weather page
        const weatherPage = new Adw.PreferencesPage({
            title: _('Weather'),
            icon_name: 'weather-clear-symbolic',
        });
        window.add(weatherPage);

        const locationGroup = new Adw.PreferencesGroup({title: _('Location')});
        weatherPage.add(locationGroup);

        const autoLocationRow = new Adw.SwitchRow({
            title: _('Automatic location'),
            subtitle: _('Detect your location automatically. Falls back to the manual coordinates below when unavailable.'),
        });
        settings.bind('weather-auto-location', autoLocationRow, 'active', 0);
        locationGroup.add(autoLocationRow);

        const latRow = new Adw.SpinRow({
            title: _('Latitude'),
            subtitle: _('Used when automatic location is unavailable'),
            adjustment: new Gtk.Adjustment({
                lower: -90,
                upper: 90,
                step_increment: 0.01,
                page_increment: 1,
                value: settings.get_double('weather-lat'),
            }),
        });
        settings.bind('weather-lat', latRow, 'value', 0);
        locationGroup.add(latRow);

        const lonRow = new Adw.SpinRow({
            title: _('Longitude'),
            subtitle: _('Used when automatic location is unavailable'),
            adjustment: new Gtk.Adjustment({
                lower: -180,
                upper: 180,
                step_increment: 0.01,
                page_increment: 1,
                value: settings.get_double('weather-lon'),
            }),
        });
        settings.bind('weather-lon', lonRow, 'value', 0);
        locationGroup.add(lonRow);

        const tempGroup = new Adw.PreferencesGroup({title: _('Temperature')});
        weatherPage.add(tempGroup);

        const tempUnitModel = new Gtk.StringList();
        tempUnitModel.append(_('Celsius'));
        tempUnitModel.append(_('Fahrenheit'));

        const tempUnitRow = new Adw.ComboRow({
            title: _('Temperature unit'),
            subtitle: _('Choose how temperatures are displayed'),
            model: tempUnitModel,
        });
        settings.bind('weather-temperature-unit', tempUnitRow, 'selected', 0);
        tempGroup.add(tempUnitRow);

        // Position page
        const positionPage = new Adw.PreferencesPage({
            title: _('Position'),
            icon_name: 'preferences-position-symbolic',
        });
        window.add(positionPage);

        const posGroup = new Adw.PreferencesGroup({title: _('Widget Position')});
        positionPage.add(posGroup);
        const addPositionRows = (label, xKey, yKey) => {
            const group = new Adw.PreferencesGroup({title: label});
            positionPage.add(group);
            const xRow = new Adw.SpinRow({
                title: _('Horizontal position (%)'),
                subtitle: _('0 = left edge, 100 = right edge'),
                adjustment: new Gtk.Adjustment({lower: 0, upper: 100, step_increment: 1, page_increment: 10, value: settings.get_int(xKey)}),
            });
            settings.bind(xKey, xRow, 'value', 0);
            group.add(xRow);
            const yRow = new Adw.SpinRow({
                title: _('Vertical position (%)'),
                subtitle: _('0 = top edge, 100 = bottom edge'),
                adjustment: new Gtk.Adjustment({lower: 0, upper: 100, step_increment: 1, page_increment: 10, value: settings.get_int(yKey)}),
            });
            settings.bind(yKey, yRow, 'value', 0);
            group.add(yRow);
        };

        addPositionRows(_('Clock position'), 'clock-x', 'clock-y');
        addPositionRows(_('Stats position'), 'stats-x', 'stats-y');
        addPositionRows(_('Calendar position'), 'calendar-x', 'calendar-y');
        addPositionRows(_('World clock position'), 'world-clock-x', 'world-clock-y');
        addPositionRows(_('Hourly forecast position'), 'hourly-x', 'hourly-y');
        addPositionRows(_('Weekly forecast position'), 'weekly-x', 'weekly-y');

        const opacityRow = new Adw.SpinRow({
            title: _('Opacity'),
            subtitle: _('Widget transparency (0 = invisible, 1 = opaque)'),
            adjustment: new Gtk.Adjustment({
                lower: 0.1,
                upper: 1.0,
                step_increment: 0.05,
                page_increment: 0.1,
                value: settings.get_double('widget-opacity'),
            }),
        });
        settings.bind('widget-opacity', opacityRow, 'value', 0);
        posGroup.add(opacityRow);

        const blurGroup = new Adw.PreferencesGroup({title: _('Blur Effect')});
        positionPage.add(blurGroup);

        const blurRow = new Adw.SwitchRow({
            title: _('Blur effect'),
            subtitle: _('Apply a frosted glass blur behind the widgets'),
        });
        settings.bind('blur-enabled', blurRow, 'active', 0);
        blurGroup.add(blurRow);
    }
}
