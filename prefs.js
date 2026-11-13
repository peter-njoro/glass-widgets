import {HOURLY_FORECAST_CONFIG, LOCATION_NAME_KEYS, LOCATION_NAME_PROVIDER, POSITION_CONFIG, WEEKLY_FORECAST_CONFIG, WORLD_CLOCK_KEYS} from './widgets/settings.js';
'use strict';

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {POSITION_KEYS, migratePositionSettings} from './widgets/position.js';
import {PREFERENCES_ICON, findPreferencesIcon} from './widgets/preferences-icons.js';
import {getHourlyForecastRange, getWeeklyForecastRange} from './widgets/forecast-config.js';

const SPONSOR_QR_CODE_PATH = 'sponsor/qr-code.png';

export default class GlassWidgetsPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        migratePositionSettings(settings);

        // General page
        const generalPage = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: findPreferencesIcon(PREFERENCES_ICON.GENERAL),
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
            subtitle: _('Show hourly weather forecasts'),
        });
        settings.bind('show-hourly-weather', showHourlyRow, 'active', 0);
        widgetsGroup.add(showHourlyRow);

        const showWeeklyRow = new Adw.SwitchRow({
            title: _('Daily weather forecast'),
            subtitle: _('Show daily weather forecasts'),
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

        // Media player widget is deliberately deferred and kept disabled in the
        // current build. It will be shipped later once the D-Bus sandboxing issues
        // have been addressed and tested.
        // const showMediaPlayerRow = new Adw.SwitchRow({
        //     title: _('Media player widget'),
        //     subtitle: _('Show controls and track information for a running media player'),
        // });
        // settings.bind('show-media-player', showMediaPlayerRow, 'active', 0);
        // widgetsGroup.add(showMediaPlayerRow);

        const worldClockPage = new Adw.PreferencesPage({
            title: _('World Clock'),
            icon_name: findPreferencesIcon(PREFERENCES_ICON.WORLD_CLOCK),
        });
        window.add(worldClockPage);

        const worldClockGroup = new Adw.PreferencesGroup({title: _('World Clock')});
        worldClockPage.add(worldClockGroup);

        const worldClockEntriesRow = new Adw.EntryRow({
            title: _('World clock timezones'),
            text: settings.get_strv(WORLD_CLOCK_KEYS.entries).map((value) => {
                try {
                    return JSON.parse(value).tz;
                } catch {
                    return '';
                }
            }).filter(Boolean).join(', '),
        });
        const worldClockHelp = new Adw.ActionRow({
            title: _('Example: UTC, Africa/Nairobi, Europe/London, Asia/Tokyo, America/Sao_Paulo, America/New_York'),
        });
        worldClockGroup.add(worldClockHelp);
        const refreshWorldClockEntries = () => {
            const text = worldClockEntriesRow.text.trim();
            if (!text) {
                settings.set_strv(WORLD_CLOCK_KEYS.entries, []);
                return;
            }
            const entries = text.split(',').map((value) => value.trim()).filter(Boolean);
            settings.set_strv(WORLD_CLOCK_KEYS.entries, entries.map((tz) => JSON.stringify({
                tz,
                label: tz.split('/').pop().replace(/_/g, ' '),
            })));
        };
        worldClockEntriesRow.connect('notify::text', refreshWorldClockEntries);
        worldClockGroup.add(worldClockEntriesRow);

        for (const {key, title} of [
            {key: WORLD_CLOCK_KEYS.showTicks, title: _('World clock hour marks')},
            {key: WORLD_CLOCK_KEYS.showSeconds, title: _('World clock second hand')},
            {key: WORLD_CLOCK_KEYS.showNumbers, title: _('World clock dial numbers')},
            {key: WORLD_CLOCK_KEYS.showRelativeTime, title: _('World clock relative time')},
        ]) {
            const row = new Adw.SwitchRow({title});
            settings.bind(key, row, 'active', Gio.SettingsBindFlags.DEFAULT);
            worldClockGroup.add(row);
        }

        // Clock Style page
        const clockStylePage = new Adw.PreferencesPage({
            title: _('Clock Style'),
            icon_name: findPreferencesIcon(PREFERENCES_ICON.CLOCK_STYLE),
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
            icon_name: findPreferencesIcon(PREFERENCES_ICON.WEATHER),
        });
        window.add(weatherPage);

        const locationGroup = new Adw.PreferencesGroup({
            title: _('Location'),
            description: _('Online name services receive your coordinates. Data: OpenStreetMap contributors (ODbL).'),
        });
        weatherPage.add(locationGroup);

        const autoLocationRow = new Adw.SwitchRow({
            title: _('Automatic location'),
            subtitle: _('Detect your location automatically. Falls back to the manual coordinates below when unavailable.'),
        });
        settings.bind('weather-auto-location', autoLocationRow, 'active', 0);
        locationGroup.add(autoLocationRow);

        const nameProviderModel = new Gtk.StringList();
        for (const [id, label] of new Map([
            [LOCATION_NAME_PROVIDER.LOCAL, _('Local - GWeather')],
            [LOCATION_NAME_PROVIDER.NOMINATIM, _('Nominatim')],
            [LOCATION_NAME_PROVIDER.PHOTON, _('Photon')],
        ])) {
            if (nameProviderModel.get_n_items() !== id)
                throw new Error('Location provider order must match stored identifiers');
            nameProviderModel.append(label);
        }

        const nameProviderRow = new Adw.ComboRow({
            title: _('Location name provider'),
            subtitle: _('Coordinate lookup'),
            model: nameProviderModel,
        });
        settings.bind(LOCATION_NAME_KEYS.provider, nameProviderRow, 'selected', Gio.SettingsBindFlags.DEFAULT);
        locationGroup.add(nameProviderRow);

        const latRow = new Adw.SpinRow({
            title: _('Latitude'),
            subtitle: _('Used when automatic location is unavailable'),
            digits: 4,
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
            digits: 4,
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

        const hourlyGroup = new Adw.PreferencesGroup({title: _('Hourly weather forecast')});
        weatherPage.add(hourlyGroup);
        const {minimumHours, maximumHours} = getHourlyForecastRange(settings);
        const hourlyHoursRow = new Adw.SpinRow({
            title: _('Hours to show'),
            snap_to_ticks: true,
            adjustment: new Gtk.Adjustment({
                lower: minimumHours,
                upper: maximumHours,
                step_increment: HOURLY_FORECAST_CONFIG.stepHours,
                page_increment: HOURLY_FORECAST_CONFIG.stepHours,
                value: settings.get_int(HOURLY_FORECAST_CONFIG.hoursKey),
            }),
        });
        settings.bind(HOURLY_FORECAST_CONFIG.hoursKey, hourlyHoursRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        hourlyGroup.add(hourlyHoursRow);

        const weeklyGroup = new Adw.PreferencesGroup({title: _('Daily weather forecast')});
        weatherPage.add(weeklyGroup);
        const {minimumDays, maximumDays} = getWeeklyForecastRange(settings);
        const weeklyDaysRow = new Adw.SpinRow({
            title: _('Days to show'),
            snap_to_ticks: true,
            adjustment: new Gtk.Adjustment({
                lower: minimumDays,
                upper: maximumDays,
                step_increment: WEEKLY_FORECAST_CONFIG.stepDays,
                page_increment: WEEKLY_FORECAST_CONFIG.stepDays,
                value: settings.get_int(WEEKLY_FORECAST_CONFIG.daysKey),
            }),
        });
        settings.bind(WEEKLY_FORECAST_CONFIG.daysKey, weeklyDaysRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        weeklyGroup.add(weeklyDaysRow);

        // Position page
        const positionPage = new Adw.PreferencesPage({
            title: _('Position'),
            icon_name: findPreferencesIcon(PREFERENCES_ICON.POSITION),
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
                digits: POSITION_CONFIG.decimalPlaces,
                snap_to_ticks: false,
                adjustment: new Gtk.Adjustment({lower: POSITION_CONFIG.minimumPercent, upper: POSITION_CONFIG.maximumPercent, step_increment: POSITION_CONFIG.stepPercent, page_increment: POSITION_CONFIG.pageStepPercent, value: settings.get_double(xKey)}),
            });
            settings.bind(xKey, xRow, 'value', Gio.SettingsBindFlags.DEFAULT);
            group.add(xRow);
            const yRow = new Adw.SpinRow({
                title: _('Vertical position (%)'),
                subtitle: _('0 = top edge, 100 = bottom edge'),
                digits: POSITION_CONFIG.decimalPlaces,
                snap_to_ticks: false,
                adjustment: new Gtk.Adjustment({lower: POSITION_CONFIG.minimumPercent, upper: POSITION_CONFIG.maximumPercent, step_increment: POSITION_CONFIG.stepPercent, page_increment: POSITION_CONFIG.pageStepPercent, value: settings.get_double(yKey)}),
            });
            settings.bind(yKey, yRow, 'value', Gio.SettingsBindFlags.DEFAULT);
            group.add(yRow);
        };

        addPositionRows(_('Clock position'), ...POSITION_KEYS.clock);
        addPositionRows(_('Stats position'), ...POSITION_KEYS.stats);
        addPositionRows(_('Calendar position'), ...POSITION_KEYS.calendar);
        addPositionRows(_('World clock position'), ...POSITION_KEYS.worldclock);
        addPositionRows(_('Hourly forecast position'), ...POSITION_KEYS.hourly);
        addPositionRows(_('Daily forecast position'), ...POSITION_KEYS.weekly);
        // Media player position is intentionally not exposed in the stable build.
        // The widget will ship later after the app sandboxing issues are resolved.
        // addPositionRows(_('Media player position'), 'media-x', 'media-y');

        const opacityRow = new Adw.SpinRow({
            title: _('Opacity'),
            subtitle: _('Widget transparency (0 = invisible, 1 = opaque)'),
            digits: 2,
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

        const effectsPage = new Adw.PreferencesPage({
            title: _('Effects'),
            icon_name: findPreferencesIcon(PREFERENCES_ICON.EFFECTS),
        });
        window.add(effectsPage);

        const effectsGroup = new Adw.PreferencesGroup({title: _('Visual effects')});
        effectsPage.add(effectsGroup);

        const blurRow = new Adw.SwitchRow({
            title: _('Blur effect'),
            subtitle: _('Apply a frosted glass blur behind the widgets'),
        });
        settings.bind('blur-enabled', blurRow, 'active', 0);
        effectsGroup.add(blurRow);

        const reflectionRow = new Adw.SwitchRow({
            title: _('Glass reflection'),
            subtitle: _('Add a subtle sheen across the top of each widget'),
        });
        settings.bind('reflection-enabled', reflectionRow, 'active', 0);
        effectsGroup.add(reflectionRow);

        const reflectionStyleRow = new Adw.ComboRow({
            title: _('Reflection style'),
            subtitle: _('Choose the kind of glass reflection to apply'),
            model: (() => {
                const model = new Gtk.StringList();
                model.append(_('Sheen'));
                model.append(_('Mirror'));
                return model;
            })(),
        });
        settings.bind('reflection-style', reflectionStyleRow, 'selected', 0);
        effectsGroup.add(reflectionStyleRow);

        const sponsorPage = new Adw.PreferencesPage({
            title: _('Sponsor'),
            icon_name: findPreferencesIcon(PREFERENCES_ICON.SPONSOR),
        });
        window.add(sponsorPage);

        const sponsorGroup = new Adw.PreferencesGroup({title: _('Support Glass Widgets')});
        sponsorPage.add(sponsorGroup);

        const sponsorContent = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 16,
            margin_top: 12,
            margin_bottom: 12,
            margin_start: 12,
            margin_end: 12,
        });
        const sponsorMessage = new Gtk.Label({
            label: _('Glass-widgets is free, if you\'d like to support it, a coffee goes toward keeping it working through GNOME Shell updates.'),
            wrap: true,
            justify: Gtk.Justification.CENTER,
        });
        sponsorContent.append(sponsorMessage);

        const qrCode = Gtk.Picture.new_for_filename(`${this.path}/${SPONSOR_QR_CODE_PATH}`);
        qrCode.set_size_request(240, 240);
        qrCode.set_can_shrink(true);
        qrCode.set_halign(Gtk.Align.CENTER);
        qrCode.set_valign(Gtk.Align.CENTER);
        qrCode.set_alternative_text(_('QR code to buy the developer a coffee'));
        sponsorContent.append(qrCode);

        const qrCaption = new Gtk.Label({
            label: _('Scan to buy me a coffee, it keeps glass-widgets running through GNOME Shell updates.'),
            wrap: true,
            justify: Gtk.Justification.CENTER,
        });
        sponsorContent.append(qrCaption);
        sponsorGroup.add(sponsorContent);
    }
}
