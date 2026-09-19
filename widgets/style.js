import GObject from 'gi://GObject';

export function applyDynamicStyle(actor, css) {
    if (!actor || !css) return;
    actor.set_style(css);
}
