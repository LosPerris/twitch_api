import axios from 'axios';
import { CONFIG } from '../../core/config/env';
import { setIfAbsent } from '../../core/database/cacheService';
import { logger } from '../../core/utils/logger';
import { getUser } from '../../core/database/userService';
import { getValidTokenForUser } from '../auth/auth.service';
import { apiClient, getHeaders } from '../twitch/twitchClient';
import { sendChatMessage } from '../twitch/twitch.service';
import { renderEventAlertMessage } from './eventAlert.logic';
import {
    canCreateEventSubWebhook,
    deleteEventSubSubscription,
    eventSubCallbackUrl,
    eventSubSecret
} from './bitsRoulette.service';
import { getTwitchAppToken } from './eventAlert.eventsub';
import type { EventAlertKind } from './eventAlert.types';
import { EVENTSUB_TYPE_BY_KIND } from './eventAlert.types';
import {
    getEventAlertSubscription,
    saveEventAlertSubscription
} from './eventAlert.store';

export { getEventAlertSubscription };

type SubAlive = 'alive' | 'dead' | 'unknown';

function subscriptionCondition(
    kind: EventAlertKind,
    broadcasterUserId: string
): Record<string, string> {
    const meta = EVENTSUB_TYPE_BY_KIND[kind];
    if (meta.conditionKey === 'raid') {
        return { to_broadcaster_user_id: broadcasterUserId };
    }
    if (meta.conditionKey === 'follow') {
        return { broadcaster_user_id: broadcasterUserId, moderator_user_id: broadcasterUserId };
    }
    return { broadcaster_user_id: broadcasterUserId };
}

async function createKindSubscription(
    kind: EventAlertKind,
    broadcasterUserId: string
): Promise<string | null> {
    if (!canCreateEventSubWebhook()) {
        logger.warn('event alert: EventSub omitido (callback no público)', {
            kind,
            callback: eventSubCallbackUrl()
        });
        return null;
    }
    const token = await getTwitchAppToken();
    if (!token) return null;
    const secret = eventSubSecret();
    if (secret.length < 10 || secret.length > 100) {
        logger.error('event alert: EVENTSUB_SECRET debe tener 10–100 caracteres');
        return null;
    }
    const meta = EVENTSUB_TYPE_BY_KIND[kind];
    try {
        const res = await apiClient.post(
            'https://api.twitch.tv/helix/eventsub/subscriptions',
            {
                type: meta.type,
                version: meta.version,
                condition: subscriptionCondition(kind, broadcasterUserId),
                transport: {
                    method: 'webhook',
                    callback: eventSubCallbackUrl(),
                    secret
                }
            },
            { headers: getHeaders(token) }
        );
        return (res.data?.data?.[0]?.id as string | undefined) ?? null;
    } catch (err) {
        const detail = axios.isAxiosError(err)
            ? (err.response?.data as { message?: string })?.message || err.message
            : err instanceof Error
              ? err.message
              : 'unknown';
        logger.error('event alert: create EventSub', { kind, detail });
        return null;
    }
}

async function subscriptionAlive(subscriptionId: string): Promise<SubAlive> {
    const token = await getTwitchAppToken();
    if (!token) return 'unknown';
    try {
        const res = await apiClient.get(
            `https://api.twitch.tv/helix/eventsub/subscriptions?id=${encodeURIComponent(subscriptionId)}`,
            { headers: getHeaders(token) }
        );
        const row = (res.data?.data?.[0] || null) as { status?: string } | null;
        if (!row) return 'dead';
        const status = row.status || '';
        if (status === 'enabled' || status === 'webhook_callback_verification_pending') {
            return 'alive';
        }
        return 'dead';
    } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) return 'dead';
        logger.warn('event alert: no se pudo comprobar EventSub', err);
        return 'unknown';
    }
}

export async function enableEventAlert(
    userId: string,
    kind: EventAlertKind
): Promise<{
    subscription: Awaited<ReturnType<typeof saveEventAlertSubscription>>;
    localOnly: boolean;
}> {
    const current = await getEventAlertSubscription(userId, kind);
    if (current.eventsubId) {
        const alive = await subscriptionAlive(current.eventsubId);
        if (alive !== 'dead') {
            const subscription = await saveEventAlertSubscription(userId, kind, { enabled: true });
            return { subscription, localOnly: false };
        }
    }

    if (!canCreateEventSubWebhook()) {
        const subscription = await saveEventAlertSubscription(userId, kind, {
            enabled: true,
            eventsubId: null
        });
        return { subscription, localOnly: true };
    }

    const subId = await createKindSubscription(kind, userId);
    if (!subId) {
        if (CONFIG.NODE_ENV !== 'production') {
            const subscription = await saveEventAlertSubscription(userId, kind, {
                enabled: true,
                eventsubId: null
            });
            return { subscription, localOnly: true };
        }
        throw new Error('EVENTSUB_CREATE_FAILED');
    }
    const subscription = await saveEventAlertSubscription(userId, kind, {
        enabled: true,
        eventsubId: subId
    });
    return { subscription, localOnly: false };
}

export async function disableEventAlert(userId: string, kind: EventAlertKind) {
    const current = await getEventAlertSubscription(userId, kind);
    if (current.eventsubId) {
        await deleteEventSubSubscription(current.eventsubId);
    }
    return saveEventAlertSubscription(userId, kind, { enabled: false, eventsubId: null });
}

export async function saveEventAlertConfig(
    userId: string,
    kind: EventAlertKind,
    patch: {
        reactionMode?: 'message' | 'image';
        messageTemplate?: string;
        imageUrl?: string;
    }
) {
    return saveEventAlertSubscription(userId, kind, patch);
}

const ANNOUNCE_TTL_SEC = 60 * 60;

async function announceInChat(userId: string, messageId: string, message: string): Promise<boolean> {
    const claimKey = `alerts:event-announced:${userId}:${messageId}`;
    const claim = await setIfAbsent(claimKey, '1', ANNOUNCE_TTL_SEC);
    if (claim === 'exists') return false;
    if (claim === 'unavailable' && process.env.NODE_ENV === 'production') {
        throw new Error('KV_UNAVAILABLE');
    }

    const user = await getUser(userId);
    if (!user) return false;
    let token: string;
    try {
        token = (await getValidTokenForUser(user)).accessToken;
    } catch (err) {
        logger.warn('event alert: sin token Twitch para chat', err);
        return false;
    }

    try {
        await sendChatMessage(userId, userId, message, token);
        return true;
    } catch (err) {
        logger.error('event alert: sendChatMessage', err);
        throw err;
    }
}

export async function handleFollowNotification(payload: {
    messageId: string;
    broadcasterUserId: string;
    userName?: string;
}): Promise<'sent' | 'disabled' | 'skipped'> {
    const sub = await getEventAlertSubscription(payload.broadcasterUserId, 'follow');
    if (!sub.enabled) return 'disabled';
    if (sub.reactionMode !== 'message') return 'skipped';
    const message = renderEventAlertMessage(sub.messageTemplate, { name: payload.userName });
    if (!message) return 'skipped';
    const sent = await announceInChat(payload.broadcasterUserId, payload.messageId, message);
    return sent ? 'sent' : 'skipped';
}

export async function handleSubscribeNotification(payload: {
    messageId: string;
    broadcasterUserId: string;
    userName?: string;
    tier?: string;
}): Promise<'sent' | 'disabled' | 'skipped'> {
    const sub = await getEventAlertSubscription(payload.broadcasterUserId, 'subscribe');
    if (!sub.enabled) return 'disabled';
    if (sub.reactionMode !== 'message') return 'skipped';
    const message = renderEventAlertMessage(sub.messageTemplate, {
        name: payload.userName,
        tier: payload.tier
    });
    if (!message) return 'skipped';
    const sent = await announceInChat(payload.broadcasterUserId, payload.messageId, message);
    return sent ? 'sent' : 'skipped';
}

export async function handleRaidNotification(payload: {
    messageId: string;
    broadcasterUserId: string;
    userName?: string;
    viewers?: number;
}): Promise<'sent' | 'disabled' | 'skipped'> {
    const sub = await getEventAlertSubscription(payload.broadcasterUserId, 'raid');
    if (!sub.enabled) return 'disabled';
    if (sub.reactionMode !== 'message') return 'skipped';
    const message = renderEventAlertMessage(sub.messageTemplate, {
        name: payload.userName,
        viewers: payload.viewers
    });
    if (!message) return 'skipped';
    const sent = await announceInChat(payload.broadcasterUserId, payload.messageId, message);
    return sent ? 'sent' : 'skipped';
}