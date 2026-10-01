/*
 * Deferred MPRIS media-player widget.
 *
 * The media player widget is intentionally disabled in the current stable build and
 * will be shipped in a later release after the D-Bus/AppArmor and sandboxing issues
 * are resolved. The original implementation has been left here as a historical
 * reference only and is not wired into the extension runtime.
 */

// The original implementation was intentionally commented out to avoid unsafe
// session-bus access and to keep the extension stable for users running sandboxed
// players such as Snap-based Spotify.

// 'use strict';
//
// import GObject from 'gi://GObject';
// import Clutter from 'gi://Clutter';
// import Gio from 'gi://Gio';
// import GLib from 'gi://GLib';
// import St from 'gi://St';
//
// import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
//
// const MPRIS_PREFIX = 'org.mpris.MediaPlayer2.';
// const OBJECT_PATH = '/org/mpris/MediaPlayer2';
// const PLAYER_INTERFACE = 'org.mpris.MediaPlayer2.Player';
//
// export const GlassMediaPlayer = GObject.registerClass(
// class GlassMediaPlayer extends St.BoxLayout {
//     _init() {
//         ...
//     }
// });
