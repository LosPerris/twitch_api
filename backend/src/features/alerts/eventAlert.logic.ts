import type { EventAlertKind } from './eventAlert.types';

export function renderEventAlertMessage(
    template: string,
    vars: { name?: string; viewers?: number; tier?: string }
): string {
    const name = (vars.name || 'alguien').trim().slice(0, 25) || 'alguien';
    const viewers = typeof vars.viewers === 'number' && vars.viewers > 0 ? String(vars.viewers) : '0';
    const tier = (vars.tier || '').trim().slice(0, 12);
    return template
        .replace(/\{name\}/gi, name)
        .replace(/\{viewers\}/gi, viewers)
        .replace(/\{tier\}/gi, tier)
        .trim()
        .slice(0, 500);
}

export function eventsubTypeToKind(type: string): EventAlertKind | null {
    if (type === 'channel.follow') return 'follow';
    if (type === 'channel.subscribe') return 'subscribe';
    if (type === 'channel.raid') return 'raid';
    return null;
}