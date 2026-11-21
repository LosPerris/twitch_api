import axios from 'axios';
import { kv } from '../../core/database/redisClient';
import { isKvWriteAvailable } from '../../core/database/cacheService';
import { CONFIG } from '../../core/config/env';
import { logger } from '../../core/utils/logger';

const APP_TOKEN_KEY = 'twitch:app_token';

export async function getTwitchAppToken(): Promise<string | null> {
    if (isKvWriteAvailable()) {
        const cached = await kv.get<string>(APP_TOKEN_KEY);
        if (cached) return cached;
    }
    try {
        const tokenRes = await axios.post(
            'https://id.twitch.tv/oauth2/token',
            new URLSearchParams({
                client_id: CONFIG.TWITCH_CLIENT_ID as string,
                client_secret: CONFIG.TWITCH_CLIENT_SECRET as string,
                grant_type: 'client_credentials'
            }).toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        const appToken = tokenRes.data?.access_token as string | undefined;
        if (!appToken) return null;
        if (isKvWriteAvailable()) {
            await kv.set(APP_TOKEN_KEY, appToken, { ex: 24 * 60 * 60 });
        }
        return appToken;
    } catch (err) {
        logger.error('event alert: app token', err);
        return null;
    }
}