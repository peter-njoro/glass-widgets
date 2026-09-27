'use strict';

import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';

import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

const MPRIS_PREFIX = 'org.mpris.MediaPlayer2.';
const OBJECT_PATH = '/org/mpris/MediaPlayer2';
const PLAYER_INTERFACE = 'org.mpris.MediaPlayer2.Player';

export const GlassMediaPlayer = GObject.registerClass(
class GlassMediaPlayer extends St.BoxLayout {
    _init() {
        super._init({
            style_class: 'glass-card glass-media-player-card',
            vertical: true,
        });

        this._destroyed = false;
        this._bus = Gio.bus_get_sync(Gio.BusType.SESSION, null);
        this._players = new Map();
        this._pendingPlayers = new Set();
        this._unavailablePlayers = new Set();
        this._serviceGenerations = new Map();
        this._activeProxy = null;

        this._titleLabel = new St.Label({
            style_class: 'glass-media-player-title',
            text: _('No track information'),
            x_expand: true,
        });
        this.add_child(this._titleLabel);

        this._artistLabel = new St.Label({
            style_class: 'glass-media-player-artist',
            text: '',
            x_expand: true,
        });
        this.add_child(this._artistLabel);

        const controls = new St.BoxLayout({
            style_class: 'glass-media-player-controls',
            x_align: Clutter.ActorAlign.CENTER,
        });
        this.add_child(controls);

        this._previousButton = this._makeButton(
            'media-skip-backward-symbolic', 'Previous', controls);
        this._playButton = this._makeButton(
            'media-playback-start-symbolic', 'PlayPause', controls);
        this._nextButton = this._makeButton(
            'media-skip-forward-symbolic', 'Next', controls);

        this._titleLabel.text = _('No media playing');
        this._setControlsEnabled(false);
        this.visible = true;
        this._nameOwnerChangedId = this._bus.signal_subscribe(
            'org.freedesktop.DBus',
            'org.freedesktop.DBus',
            'NameOwnerChanged',
            '/org/freedesktop/DBus',
            null,
            Gio.DBusSignalFlags.NONE,
            (_connection, _sender, _path, _interface, _signal, parameters) => {
                const [name, _oldOwner, newOwner] = parameters.deep_unpack();
                if (!name.startsWith(MPRIS_PREFIX))
                    return;
                if (newOwner)
                    this._addPlayer(name);
                else
                    this._removePlayer(name);
            });
        this._discoverPlayers();
    }

    _makeButton(iconName, method, controls) {
        const icon = new St.Icon({
            icon_name: iconName,
            icon_size: 18,
        });
        const button = new St.Button({
            style_class: 'glass-media-player-control',
            child: icon,
            can_focus: true,
            reactive: true,
        });
        button.connect('clicked', () => this._callMethod(method));
        controls.add_child(button);
        return button;
    }

    _discoverPlayers() {
        this._bus.call(
            'org.freedesktop.DBus',
            '/org/freedesktop/DBus',
            'org.freedesktop.DBus',
            'ListNames',
            null,
            new GLib.VariantType('(as)'),
            Gio.DBusCallFlags.NONE,
            3000,
            null,
            (connection, result) => {
                if (this._destroyed)
                    return;
                try {
                    const [names] = connection.call_finish(result).deep_unpack();
                    for (const name of names) {
                        if (name.startsWith(MPRIS_PREFIX))
                            this._addPlayer(name);
                    }
                } catch (error) {
                    console.error(`glass-widgets: failed to discover media players: ${error}`);
                }
            });
    }

    _addPlayer(serviceName) {
        if (this._destroyed || this._players.has(serviceName) ||
            this._pendingPlayers.has(serviceName))
            return;

        this._pendingPlayers.add(serviceName);
        const generation = (this._serviceGenerations.get(serviceName) ?? 0) + 1;
        this._serviceGenerations.set(serviceName, generation);

        Gio.DBusProxy.new(
            this._bus,
            Gio.DBusProxyFlags.NONE,
            null,
            serviceName,
            OBJECT_PATH,
            PLAYER_INTERFACE,
            null,
            (_connection, result) => {
                this._pendingPlayers.delete(serviceName);
                let proxy;
                try {
                    proxy = Gio.DBusProxy.new_finish(result);
                } catch (error) {
                    if (!this._destroyed &&
                        this._serviceGenerations.get(serviceName) === generation) {
                        this._unavailablePlayers.add(serviceName);
                        console.error(`glass-widgets: cannot access MPRIS player ${serviceName}: ${error}`);
                        this._refresh();
                    }
                    return;
                }

                if (this._destroyed ||
                    this._serviceGenerations.get(serviceName) !== generation ||
                    !proxy.get_name_owner())
                    return;

                const changedId = proxy.connect('g-properties-changed',
                    () => this._refresh());
                this._unavailablePlayers.delete(serviceName);
                this._players.set(serviceName, {proxy, changedId});
                this._refresh();
            });
    }

    _removePlayer(serviceName) {
        this._serviceGenerations.set(
            serviceName, (this._serviceGenerations.get(serviceName) ?? 0) + 1);
        this._pendingPlayers.delete(serviceName);
        this._unavailablePlayers.delete(serviceName);

        const player = this._players.get(serviceName);
        if (player) {
            player.proxy.disconnect(player.changedId);
            this._players.delete(serviceName);
        }
        this._refresh();
    }

    _refresh() {
        if (this._destroyed)
            return;

        const players = [...this._players.values()];
        if (players.length === 0) {
            this._activeProxy = null;
            const inaccessible = this._unavailablePlayers.size > 0;
            if (inaccessible) {
                this._titleLabel.text = _('Player access blocked');
                this._artistLabel.text = _('MPRIS is unavailable over D-Bus');
                this._setControlsEnabled(false);
            } else {
                this._titleLabel.text = _('No media playing');
                this._artistLabel.text = '';
                this._setControlsEnabled(false);
            }
            this.visible = true;
            return;
        }

        const playing = players.find(({proxy}) =>
            proxy.get_cached_property('PlaybackStatus')?.deep_unpack() === 'Playing');
        this._activeProxy = (playing ?? players[0]).proxy;

        let metadata = {};
        try {
            metadata = this._activeProxy.get_cached_property('Metadata')?.deep_unpack() ?? {};
        } catch {
            metadata = {};
        }

        const title = metadata['xesam:title'];
        const artists = metadata['xesam:artist'];
        const status = this._activeProxy.get_cached_property('PlaybackStatus')?.deep_unpack();
        const isStopped = status === 'Stopped';
        this._titleLabel.text = isStopped || !title ? _('No media playing') : title;
        this._artistLabel.text = isStopped
            ? ''
            : (Array.isArray(artists) ? artists.join(', ') : (artists || ''));
        this._playButton.child.icon_name = status === 'Playing'
            ? 'media-playback-pause-symbolic'
            : 'media-playback-start-symbolic';
        this._setControlsEnabled(true);
        this.visible = true;
    }

    _setControlsEnabled(enabled) {
        for (const button of [this._previousButton, this._playButton, this._nextButton]) {
            button.reactive = enabled;
            button.can_focus = enabled;
            button.opacity = enabled ? 255 : 128;
        }
    }

    _callMethod(method) {
        if (!this._activeProxy)
            return;

        this._activeProxy.call(
            method,
            null,
            Gio.DBusCallFlags.NONE,
            2000,
            null,
            (proxy, result) => {
                try {
                    proxy.call_finish(result);
                } catch (error) {
                    console.error(`glass-widgets: MPRIS ${method} failed: ${error}`);
                }
            });
    }

    destroy() {
        this._destroyed = true;
        if (this._nameOwnerChangedId) {
            this._bus.signal_unsubscribe(this._nameOwnerChangedId);
            this._nameOwnerChangedId = 0;
        }
        for (const {proxy, changedId} of this._players.values())
            proxy.disconnect(changedId);
        this._players.clear();
        this._pendingPlayers.clear();
        this._unavailablePlayers.clear();
        this._activeProxy = null;
        this._bus = null;
        super.destroy();
    }
});
