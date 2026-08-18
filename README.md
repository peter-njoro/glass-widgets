https://extensions.gnome.org/extension/10416/glass-widgets/

# Glass Widgets

by Peter Njoroge

Frosted glass desktop widgets for GNOME Shell - clock, system stats, and more.

![Glass Widgets screenshot](screenshots/demo.png)

## Features

- **Clock widget** - live clock with frosted glass styling
- **System stats widget** - RAM and CPU usage with progress bars
- Configurable position, opacity, blur, and per-widget toggles
- Tier 1 CSS-only glassmorphism (no shader dependencies)
- Optional blur effect via [Blur My Shell](https://extensions.gnome.org/extension/3193/blur-my-shell/) extension

## Install

### From extensions.gnome.org

1. Visit [Glass Widgets on extensions.gnome.org](https://extensions.gnome.org/extension/10416/glass-widgets/)
2. Toggle on

### Manual

```bash
git clone https://github.com/peter-njoro/glass-widgets.git
cd glass-widgets
gnome-extensions pack --extra-source=widgets --extra-source=stylesheet.css
gnome-extensions install glass-widgets@peter-njoro.github.io.zip
```

Then log out and back in, or restart GNOME Shell.

## Optional Dependencies

### Blur My Shell

For enhanced blur effects on the glass cards, install [Blur My Shell](https://extensions.gnome.org/extension/3193/blur-my-shell/):

1. Install from extensions.gnome.org or your package manager
2. Enable the "Blur effect" toggle in Glass Widgets preferences
3. Adjust blur strength in Blur My Shell's settings

Without Blur My Shell, cards will still display with frosted glass styling, but without the dynamic blur backdrop.

### Development

```bash
git clone https://github.com/peter-njoro/glass-widgets.git
ln -s $(pwd) ~/.local/share/gnome-shell/extensions/glass-widgets-dev@peter-njoro.github.io
```

## License

GPL-3.0 - see [LICENSE](LICENSE).
