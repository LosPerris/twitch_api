import type { Response } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../../types/twitch';
import { jsonError } from '../../core/utils/jsonResponse';
import { MESSAGES } from '../../core/config/messages';
import { EVENT_ALERT_KINDS } from './eventAlert.types';
import {
    disableEventAlert,
    enableEventAlert,
    getEventAlertSubscription,
    saveEventAlertConfig
} from './eventAlert.service';

const kindParam = z.enum(EVENT_ALERT_KINDS);

export const eventAlertPutSchema = z.object({
    body: z.object({
        enabled: z.boolean().optional(),
        reactionMode: z.enum(['message', 'image']).optional(),
        messageTemplate: z.string().trim().max(500).optional(),
        imageUrl: z.string().trim().max(500).optional()
    })
});

function parseKind(raw: string): z.infer<typeof kindParam> | null {
    const parsed = kindParam.safeParse(raw);
    return parsed.success ? parsed.data : null;
}

export const getEventAlertHandler = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId;
    if (!userId) return jsonError(res, 401, MESSAGES.SYSTEM.USER_NOT_FOUND);
    const kind = parseKind(String(req.params.kind || ''));
    if (!kind) return jsonError(res, 400, 'Tipo de alerta no válido.');
    const subscription = await getEventAlertSubscription(userId, kind);
    return res.json({ subscription });
};

export const putEventAlertHandler = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId;
    if (!userId) return jsonError(res, 401, MESSAGES.SYSTEM.USER_NOT_FOUND);
    const kind = parseKind(String(req.params.kind || ''));
    if (!kind) return jsonError(res, 400, 'Tipo de alerta no válido.');

    const body = req.body as {
        enabled?: boolean;
        reactionMode?: 'message' | 'image';
        messageTemplate?: string;
        imageUrl?: string;
    };

    try {
        if (
            body.reactionMode !== undefined ||
            body.messageTemplate !== undefined ||
            body.imageUrl !== undefined
        ) {
            await saveEventAlertConfig(userId, kind, {
                reactionMode: body.reactionMode,
                messageTemplate: body.messageTemplate,
                imageUrl: body.imageUrl
            });
        }

        if (body.enabled === true) {
            const { subscription, localOnly } = await enableEventAlert(userId, kind);
            return res.json({
                subscription,
                localOnly,
                message: localOnly
                    ? 'Activado en modo local: EventSub solo funciona con la API pública en HTTPS.'
                    : undefined
            });
        }
        if (body.enabled === false) {
            const subscription = await disableEventAlert(userId, kind);
            return res.json({ subscription, localOnly: false });
        }

        const subscription = await getEventAlertSubscription(userId, kind);
        return res.json({ subscription, localOnly: false });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'CONFIG_ERROR';
        if (msg === 'EVENTSUB_CREATE_FAILED') {
            return jsonError(
                res,
                403,
                'No se pudo crear la suscripción EventSub. Revisa permisos de Twitch y el callback HTTPS.'
            );
        }
        if (msg === 'KV_UNAVAILABLE') {
            return jsonError(res, 503, 'Almacenamiento temporalmente no disponible.');
        }
        return jsonError(res, 500, 'No se pudo actualizar la alerta.');
    }
};