'use strict';

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';

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
    }
}
