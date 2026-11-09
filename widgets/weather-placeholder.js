'use strict';

import Clutter from 'gi://Clutter';
import St from 'gi://St';

import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

const REFRESH_ICON = {name: 'view-refresh-symbolic', sizePx: 16};

export function createWeatherPlaceholder() {
    const placeholder = new St.BoxLayout({
        style_class: 'glass-weather-placeholder',
        x_align: Clutter.ActorAlign.CENTER,
        y_align: Clutter.ActorAlign.CENTER,
    });
    placeholder.add_child(new St.Icon({
        icon_name: REFRESH_ICON.name,
        icon_size: REFRESH_ICON.sizePx,
    }));
    placeholder.add_child(new St.Label({
        text: _('Refreshing...'),
        y_align: Clutter.ActorAlign.CENTER,
    }));
    return placeholder;
}