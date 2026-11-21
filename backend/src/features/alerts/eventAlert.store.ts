import { get as cacheGet, setPersistent } from '../../core/database/cacheService';
import { logger } from '../../core/utils/logger';
import { normalizePublicHttpsImageUrl } from '../../core/utils/validationHelpers';
import type { EventAlertKind, EventAlertSubscription, EventReactionMode } from './eventAlert.types';

export function eventAlertSubKey(userId: string, kind: EventAlertKind): string {
    return `alerts:event-sub:${kind}:${userId}`;
}

const DEFAULT_MESSAGE: Record<EventAlertKind, string> = {
    follow: '¡Gracias por seguir, {name}!',
    subscribe: '¡Nueva suscripción de {name}!',
    raid: '¡Raid de {name} con {viewers} viewers!'
};

export function defaultEventSubscription(userId: string, kind: EventAlertKind): EventAlertSubscription {
    return {
        userId,
        kind,
        enabled: false,
        eventsubId: null,
        reactionMode: 'message',
        messageTemplate: DEFAULT_MESSAGE[kind],
        imageUrl: ''
    };
}

export async function getEventAlertSubscription(
    userId: string,
    kind: EventAlertKind
): Promise<EventAlertSubscription> {
    try {
        const raw = await cacheGet(eventAlertSubKey(userId, kind));
        if (!raw || typeof raw !== 'object') return defaultEventSubscription(userId, kind);
        const row = raw as Partial<EventAlertSubscription>;
        return {
            userId,
            kind,
            enabled: Boolean(row.enabled),
            eventsubId: typeof row.eventsubId === 'string' ? row.eventsubId : null,
            reactionMode: row.reactionMode === 'image' ? 'image' : 'message',
            messageTemplate:
                typeof row.messageTemplate === 'string' && row.messageTemplate.trim()
                    ? row.messageTemplate.trim().slice(0, 500)
                    : DEFAULT_MESSAGE[kind],
            imageUrl: normalizePublicHttpsImageUrl(row.imageUrl),
            updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : undefined
        };
    } catch (err) {
        logger.error('event alert sub get:', err);
        return defaultEventSubscription(userId, kind);
    }
}

export async function saveEventAlertSubscription(
    userId: string,
    kind: EventAlertKind,
    patch: {
        enabled?: boolean;
        eventsubId?: string | null;
        reactionMode?: EventReactionMode;
        messageTemplate?: string;
        imageUrl?: string;
    }
): Promise<EventAlertSubscription> {
    const current = await getEventAlertSubscription(userId, kind);
    const next: EventAlertSubscription = {
        ...current,
        enabled: patch.enabled ?? current.enabled,
        eventsubId: patch.eventsubId !== undefined ? patch.eventsubId : current.eventsubId,
        reactionMode: patch.reactionMode ?? current.reactionMode,
        messageTemplate:
            patch.messageTemplate !== undefined
                ? patch.messageTemplate.trim().slice(0, 500) || DEFAULT_MESSAGE[kind]
                : current.messageTemplate,
        imageUrl:
            patch.imageUrl !== undefined
                ? normalizePublicHttpsImageUrl(patch.imageUrl)
                : current.imageUrl,
        updatedAt: new Date().toISOString()
    };
    await setPersistent(eventAlertSubKey(userId, kind), next);
    return next;
}

export async function revokeEventAlertSubscription(
    userId: string,
    kind: EventAlertKind
): Promise<void> {
    await saveEventAlertSubscription(userId, kind, { enabled: false, eventsubId: null });
}