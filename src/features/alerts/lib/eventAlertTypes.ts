export type EventAlertKind = 'follow' | 'subscribe' | 'raid';

export type EventReactionMode = 'message' | 'image';

export const EVENT_MESSAGE_TEMPLATE_MAX = 500;
export const EVENT_IMAGE_URL_MAX = 500;

export function isValidEventImageUrl(url: string): boolean {
    const trimmed = url.trim();
    if (!trimmed) return false;
    try {
        const parsed = new URL(trimmed);
        return parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

export function normalizeEventImageUrl(url: string): string {
    const trimmed = url.trim();
    if (!isValidEventImageUrl(trimmed)) return '';
    return trimmed.slice(0, EVENT_IMAGE_URL_MAX);
}

export function normalizeEventMessageTemplate(value: string): string {
    return value.trim().slice(0, EVENT_MESSAGE_TEMPLATE_MAX);
}