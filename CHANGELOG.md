# Changelog

## Latest release

- Draw pipeline-arc and change based on accent color
- Added blur effect to the extension utilizing Shell.BlurEffect (no external extension dependency needed)
- Added clock style preferences for 12/24-hour format, font weight, size ratio, and color
- Added hourly and seven-day weather forecast widgets using Open-Meteo
- Added an optional calendar widget and analog world clock with configurable timezones
- Added independent positioning controls for each desktop widget
- Added a configurable glass reflection sheen and refined card shadows
- Deferred the MPRIS media-player widget to a later release; it is intentionally disabled in the current stable build because of D-Bus/AppArmor sandboxing issues
- Shared location resolution between current weather and forecasts

## Temperature units

- Added temperature unit preference (Celsius or Fahrenheit) to the weather widget ([#6](https://github.com/peter-njoro/glass-widgets/pull/6)) - thanks [@aditya-git0503](https://github.com/aditya-git0503)

## Bug fixes

- Fixed widget position drifting on boot/restart by centering only after the widget is attached to the stage, and re-centering on size/monitor changes ([#4](https://github.com/peter-njoro/glass-widgets/pull/4)) - thanks [@reximus-bbs](https://github.com/reximus-bbs)
- Fixed decimal precision in weather coordinate and opacity preferences


## Weather & doughnut gauges

- Added weather to the clock widget (condition icon + temperature)
- Automatic location detection with manual latitude/longitude fallback
- New weather settings page with per-widget toggle
- Replaced system stats progress bars with doughnut gauges

## Internationalization

- Added internationalization (i18n) support
- Added Russian translation (locale/ru) - thanks [@NaumovSN](https://github.com/NaumovSN) and [@svarg](https://github.com/svarg)
- Translated stats widget labels (System, RAM, CPU)

## Initial release

- Initial release
- Clock widget with glassmorphism styling
- System stats widget (RAM/CPU)
- Settings UI for position, opacity, and widget toggles
