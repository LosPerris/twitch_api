export const EVENT_ALERT_KINDS = ['follow', 'subscribe', 'raid'] as const;
export type EventAlertKind = (typeof EVENT_ALERT_KINDS)[number];

export type EventReactionMode = 'message' | 'image';

export interface EventAlertSubscription {
    userId: string;
    kind: EventAlertKind;
    enabled: boolean;
    eventsubId: string | null;
    reactionMode: EventReactionMode;
    messageTemplate: string;
    imageUrl: string;
    updatedAt?: string;
}

export const EVENTSUB_TYPE_BY_KIND: Record<
    EventAlertKind,
    { type: string; version: string; conditionKey: 'broadcaster' | 'raid' | 'follow' }
> = {
    follow: { type: 'channel.follow', version: '2', conditionKey: 'follow' },
    subscribe: { type: 'channel.subscribe', version: '1', conditionKey: 'broadcaster' },
    raid: { type: 'channel.raid', version: '1', conditionKey: 'raid' }
};