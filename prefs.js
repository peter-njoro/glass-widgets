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

        const ratioRow = new Adw.SpinRow({
            title: _('Hour/minute size ratio'),
            subtitle: _('1.0 = equal size, >1 = hours bigger'),
            adjustment: new Gtk.Adjustment({
                lower: 0.5,
                upper: 3.0,
                step_increment: 0.1,
                page_increment: 0.5,
                value: settings.get_double('clock-hour-minute-size-ratio'),
            }),
        });
        settings.bind('clock-hour-minute-size-ratio', ratioRow, 'value', 0);
        clockStyleGroup.add(ratioRow);

        const colorButton = new Gtk.ColorDialogButton();
        clockStyleGroup.add(colorButton);
        colorButton.show();
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
        settings.connect('changed::clock-color', initColor);

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

        const xRow = new Adw.SpinRow({
            title: _('Horizontal Position (%)'),
            subtitle: _('0 = left edge, 100 = right edge'),
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 100,
                step_increment: 1,
                page_increment: 10,
                value: settings.get_int('widget-x'),
            }),
        });
        settings.bind('widget-x', xRow, 'value', 0);
        posGroup.add(xRow);

        const yRow = new Adw.SpinRow({
            title: _('Vertical Position (%)'),
            subtitle: _('0 = top edge, 100 = bottom edge'),
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 100,
                step_increment: 1,
                page_increment: 10,
                value: settings.get_int('widget-y'),
            }),
        });
        settings.bind('widget-y', yRow, 'value', 0);
        posGroup.add(yRow);

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
