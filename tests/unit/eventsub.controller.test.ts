import crypto from 'crypto';
import type { Request, Response } from 'express';

const mockRevoke = jest.fn().mockResolvedValue(undefined);
const mockHandleCheer = jest.fn().mockResolvedValue(undefined);
const mockSetIfAbsent = jest.fn().mockResolvedValue('ok');
const mockDel = jest.fn().mockResolvedValue(undefined);

jest.mock('../../backend/src/features/alerts/bitsRoulette.service', () => ({
    eventSubSecret: () => 'test_eventsub_secret_value',
    handleCheerNotification: (...args: unknown[]) => mockHandleCheer(...args)
}));

jest.mock('../../backend/src/features/alerts/bitsRoulette.store', () => ({
    revokeBitsAlertSubscription: (...args: unknown[]) => mockRevoke(...args)
}));

jest.mock('../../backend/src/core/database/cacheService', () => ({
    setIfAbsent: (...args: unknown[]) => mockSetIfAbsent(...args),
    del: (...args: unknown[]) => mockDel(...args)
}));

import { twitchEventSubWebhook } from '../../backend/src/features/alerts/eventsub.controller';

const SECRET = 'test_eventsub_secret_value';

function sign(messageId: string, timestamp: string, body: string): string {
    return (
        'sha256=' +
        crypto.createHmac('sha256', SECRET).update(messageId + timestamp + body).digest('hex')
    );
}

function mockRes(): Response {
    const res = {
        statusCode: 200,
        headers: {} as Record<string, string>
    } as unknown as Response & { statusCode: number };
    res.status = jest.fn((code: number) => {
        res.statusCode = code;
        return res;
    }) as Response['status'];
    res.end = jest.fn().mockReturnValue(res) as Response['end'];
    res.send = jest.fn().mockReturnValue(res) as Response['send'];
    res.setHeader = jest.fn((k: string, v: string) => {
        (res as unknown as { headers: Record<string, string> }).headers[k] = v;
        return res;
    }) as Response['setHeader'];
    return res;
}

function signedReq(opts: {
    messageType: string;
    body: Record<string, unknown>;
    messageId?: string;
}): Request {
    const messageId = opts.messageId || `msg-${Math.random().toString(36).slice(2)}`;
    const timestamp = new Date().toISOString();
    const raw = JSON.stringify(opts.body);
    const signature = sign(messageId, timestamp, raw);
    return {
        header: (name: string) => {
            const map: Record<string, string> = {
                'Twitch-Eventsub-Message-Id': messageId,
                'Twitch-Eventsub-Message-Timestamp': timestamp,
                'Twitch-Eventsub-Message-Signature': signature,
                'Twitch-Eventsub-Message-Type': opts.messageType,
                'Twitch-Eventsub-Subscription-Type': String(
                    (opts.body.subscription as { type?: string } | undefined)?.type || ''
                )
            };
            return map[name];
        },
        body: opts.body,
        rawBody: Buffer.from(raw, 'utf8')
    } as unknown as Request;
}

describe('twitchEventSubWebhook', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSetIfAbsent.mockResolvedValue('ok');
    });

    it('no revoca ante notification firmada con status=enabled', async () => {
        const res = mockRes();
        const req = signedReq({
            messageType: 'notification',
            body: {
                subscription: {
                    type: 'channel.cheer',
                    status: 'enabled',
                    condition: { broadcaster_user_id: 'b1' }
                },
                event: {
                    bits: 100,
                    broadcaster_user_id: 'b1',
                    user_name: 'viewer'
                }
            }
        });

        await twitchEventSubWebhook(req, res);

        expect(mockRevoke).not.toHaveBeenCalled();
        expect(mockHandleCheer).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(204);
    });

    it('revoca solo con Message-Type=revocation y status de revocación', async () => {
        const res = mockRes();
        const req = signedReq({
            messageType: 'revocation',
            body: {
                subscription: {
                    type: 'channel.cheer',
                    status: 'authorization_revoked',
                    condition: { broadcaster_user_id: 'b99' }
                }
            }
        });

        await twitchEventSubWebhook(req, res);

        expect(mockRevoke).toHaveBeenCalledWith('b99');
        expect(mockHandleCheer).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(204);
    });

    it('ignora revocation firmada con status=enabled (no debe tocar DB)', async () => {
        const res = mockRes();
        const req = signedReq({
            messageType: 'revocation',
            body: {
                subscription: {
                    type: 'channel.cheer',
                    status: 'enabled',
                    condition: { broadcaster_user_id: 'b2' }
                }
            }
        });

        await twitchEventSubWebhook(req, res);

        expect(mockRevoke).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(204);
    });
});
