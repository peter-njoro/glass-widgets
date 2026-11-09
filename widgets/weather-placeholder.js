'use strict';

import Clutter from 'gi://Clutter';
import St from 'gi://St';

import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import {WEATHER_PLACEHOLDER_TYPE, WEATHER_SIGNALS} from './forecast-config.js';

const PLACEHOLDER_ICON = {
    loading: 'view-refresh-symbolic',
    unavailable: 'dialog-information-symbolic',
    sizePx: 16,
};

const PLACEHOLDER_TYPE_CONFIG = new Map([
    [WEATHER_PLACEHOLDER_TYPE.WEATHER, {
        signal: WEATHER_SIGNALS.weatherUpdated,
        unavailableText: () => _('Weather unavailable'),
    }],
    [WEATHER_PLACEHOLDER_TYPE.FORECAST, {
        signal: WEATHER_SIGNALS.forecastUpdated,
        unavailableText: () => _('Forecast unavailable'),
    }],
]);

export function createWeatherPlaceholder({source, type}) {
    const config = PLACEHOLDER_TYPE_CONFIG.get(type);
    if (!config)
        throw new TypeError('Unsupported weather placeholder type');

    const placeholder = new St.BoxLayout({
        style_class: 'glass-weather-placeholder',
        x_align: Clutter.ActorAlign.CENTER,
        y_align: Clutter.ActorAlign.CENTER,
    });
    const icon = new St.Icon({
        icon_size: PLACEHOLDER_ICON.sizePx,
    });
    placeholder.add_child(icon);
    const textColumn = new St.BoxLayout({
        style_class: 'glass-weather-placeholder-text',
        vertical: true,
        y_align: Clutter.ActorAlign.CENTER,
    });
    const message = new St.Label({
        style_class: 'glass-weather-placeholder-message',
        x_align: Clutter.ActorAlign.CENTER,
    });
    textColumn.add_child(message);
    const retry = new St.Label({
        style_class: 'glass-weather-placeholder-hint',
        text: _('Will retry automatically'),
        x_align: Clutter.ActorAlign.CENTER,
    });
    textColumn.add_child(retry);
    placeholder.add_child(textColumn);

    const update = () => {
        const loading = source.loading;
        const iconName = loading ? PLACEHOLDER_ICON.loading : PLACEHOLDER_ICON.unavailable;
        let text = _('Refreshing...');
        if (!loading)
            text = config.unavailableText();
        if (icon.icon_name !== iconName)
            icon.icon_name = iconName;
        if (message.text !== text)
            message.text = text;
        if (retry.visible === loading)
            retry.visible = !loading;
    };
    const signalId = source.connect(config.signal, update);
    placeholder.connect('destroy', () => source.disconnect(signalId));
    update();
    return placeholder;
}