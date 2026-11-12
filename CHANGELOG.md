# Changelog

## v14 - 2026-11-13

### Added

- Current conditions are now fetched alongside hourly and daily forecasts in a single Open-Meteo request ([#37](https://github.com/peter-njoro/glass-widgets/pull/37)) - thanks [@HofiOne](https://github.com/HofiOne)

### Changed

- The clock now uses the shared forecast source and shares its loading, unavailable, refresh, and recovery lifecycle instead of making separate GWeather requests ([#37](https://github.com/peter-njoro/glass-widgets/pull/37)) - thanks [@HofiOne](https://github.com/HofiOne)
- Hourly forecast width now adapts dynamically to its contents ([#37](https://github.com/peter-njoro/glass-widgets/pull/37)) - thanks [@HofiOne](https://github.com/HofiOne)

### Fixed

- Incomplete current-weather responses now follow the common failure path ([#37](https://github.com/peter-njoro/glass-widgets/pull/37)) - thanks [@HofiOne](https://github.com/HofiOne)
- Clock and hourly forecasts now use the appropriate night icons ([#37](https://github.com/peter-njoro/glass-widgets/pull/37)) - thanks [@HofiOne](https://github.com/HofiOne)
- Sponsor QR code now resides at the path used by preferences, so it loads from source checkouts and manually built bundles ([#37](https://github.com/peter-njoro/glass-widgets/pull/38))

## v13 - 2026-11-10

### Added

- Two-decimal widget position percentages, with existing integer positions migrated automatically ([#29](https://github.com/peter-njoro/glass-widgets/pull/29)) - thanks [@HofiOne](https://github.com/HofiOne)
- Optional Nominatim and Photon location-name providers for automatic and manual coordinates; GWeather stays the default and fallback. Privacy: the selected service receives your coordinates ([#29](https://github.com/peter-njoro/glass-widgets/pull/29))
- Configurable number of hours (3–7) in the hourly forecast ([#29](https://github.com/peter-njoro/glass-widgets/pull/29))
- Configurable number of days (3–7, default 7) in the daily forecast, below the hourly forecast settings ([#31](https://github.com/peter-njoro/glass-widgets/pull/31)) - thanks [@HofiOne](https://github.com/HofiOne)
- Independent world-clock toggles for hour marks, dial numbers, second hand and relative day/hour offset, on a new World Clock preferences tab, with fractional hour offsets supported ([#29](https://github.com/peter-njoro/glass-widgets/pull/29))

### Changed

- Weather placeholders update in place and distinguish active requests from unavailable data, with an automatic-retry hint ([#31](https://github.com/peter-njoro/glass-widgets/pull/31))
- World clocks reuse their faces and labels, repainting hands instead of rebuilding the widget every second ([#31](https://github.com/peter-njoro/glass-widgets/pull/31))
- Network reconnections reuse complete forecasts and only retry when hourly or daily data is missing ([#31](https://github.com/peter-njoro/glass-widgets/pull/31))
- Privacy: coordinates sent to Nominatim and Photon are rounded to four decimal places; original weather coordinates stay unchanged ([#31](https://github.com/peter-njoro/glass-widgets/pull/31))
- The weekly forecast is now labelled "Daily" throughout the UI ([#31](https://github.com/peter-njoro/glass-widgets/pull/31))
- Weather widgets stay visible with a loading placeholder while data loads, and retry when connectivity returns ([#29](https://github.com/peter-njoro/glass-widgets/pull/29))
- Toggling or resizing one widget no longer rebuilds or repositions the others; each keeps its own saved position ([#29](https://github.com/peter-njoro/glass-widgets/pull/29))
- Redesigned world-clock layout, showing the city, relative day and hour difference under each dial ([#29](https://github.com/peter-njoro/glass-widgets/pull/29))

### Translations

- Updated Hungarian translation ([#29](https://github.com/peter-njoro/glass-widgets/pull/29))

## Earlier releases

*These entries predate the versioned format and aren't grouped by release.*

### Features

- Draw pipeline-arc and change based on accent color
- Added blur effect to the extension utilizing Shell.BlurEffect (no external extension dependency needed)
- Added clock style preferences for 12/24-hour format, font weight, size ratio, and color
- Added hourly and seven-day weather forecast widgets using Open-Meteo
- Added an optional calendar widget and analog world clock with configurable timezones
- Added independent positioning controls for each desktop widget
- Added a configurable glass reflection sheen and refined card shadows
- Deferred the MPRIS media-player widget to a later release; it is intentionally disabled in the current stable build because of D-Bus/AppArmor sandboxing issues
- Shared location resolution between current weather and forecasts
- Added temperature unit preference (Celsius or Fahrenheit) to the weather widget ([#6](https://github.com/peter-njoro/glass-widgets/pull/6)) - thanks [@aditya-git0503](https://github.com/aditya-git0503)
- Added weather to the clock widget (condition icon + temperature)
- Automatic location detection with manual latitude/longitude fallback
- New weather settings page with per-widget toggle
- Replaced system stats progress bars with doughnut gauges

### Bug fixes

- Fixed widget destruction order during extension shutdown to avoid `has already been disposed` errors ([#23](https://github.com/peter-njoro/glass-widgets/pull/23)) - thanks [@HofiOne](https://github.com/HofiOne)
- Fixed missing `accent-color` setting handling on GNOME 46 by falling back safely when the key is unavailable ([#22](https://github.com/peter-njoro/glass-widgets/pull/22)) - thanks [@HofiOne](https://github.com/HofiOne)
- Fixed widget position drifting on boot/restart by centering only after the widget is attached to the stage, and re-centering on size/monitor changes ([#4](https://github.com/peter-njoro/glass-widgets/pull/4)) - thanks [@reximus-bbs](https://github.com/reximus-bbs)
- Fixed decimal precision in weather coordinate and opacity preferences

### Internationalization

- Added internationalization (i18n) support
- Added Russian translation (locale/ru) - thanks [@NaumovSN](https://github.com/NaumovSN) and [@svarg](https://github.com/svarg)
- Added Hungarian localization (locale/hu), packaged locale resources, and made calendar weekday names translatable ([#24](https://github.com/peter-njoro/glass-widgets/pull/24)) - thanks [@HofiOne](https://github.com/HofiOne)
- Translated stats widget labels (System, RAM, CPU)

### Initial release

- Initial release
- Clock widget with glassmorphism styling
- System stats widget (RAM/CPU)
- Settings UI for position, opacity, and widget toggles
