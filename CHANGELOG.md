# Changelog

## Latest release

- Draw pipeline-arc and change based on accent color
- Added blur effect to the extension utilizing Shell.BlurEffect (no external extension dependency needed)

## Temperature units

- Added temperature unit preference (Celsius or Fahrenheit) to the weather widget ([#6](https://github.com/peter-njoro/glass-widgets/pull/6)) - thanks [@aditya-git0503](https://github.com/aditya-git0503)

## Bug fixes

- Fixed widget position drifting on boot/restart by centering only after the widget is attached to the stage, and re-centering on size/monitor changes ([#4](https://github.com/peter-njoro/glass-widgets/pull/4)) - thanks [@reximus-bbs](https://github.com/reximus-bbs)


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
