#!/usr/bin/env node
/**
 * Post-deploy canary: compare package.json version with live /api/system/health.
 * Exit 0 if match; exit 1 if production lags. Optional Discord notify on diverge.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const expected = String(pkg.version || '').trim();
const base = (process.env.CANARY_BASE_URL || 'https://ttv.losperris.dev').replace(/\/$/, '');
const url = `${base}/api/system/health?probe=live`;
const discordWebhook =
    process.env.CANARY_DISCORD_WEBHOOK_URL ||
    process.env.DISCORD_HEALTH_WEBHOOK_URL ||
    '';

async function notifyDiscord(content) {
    if (!discordWebhook) return;
    try {
        await fetch(discordWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: content.slice(0, 1900) })
        });
    } catch (err) {
        console.error('canary: discord notify failed', err?.message || err);
    }
}

async function fail(message) {
    console.error(message);
    await notifyDiscord(`🚨 Canary ttv.losperris.dev\n\`\`\`\n${message}\n\`\`\``);
    process.exit(1);
}

if (!expected) {
    await fail('canary: package.json version missing');
}

const res = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
if (!res.ok) {
    await fail(`canary: health HTTP ${res.status} (${url})`);
}

const body = await res.json();
const live = String(body?.version ?? body?.appVersion ?? '').trim();
if (!live) {
    await fail(`canary: health JSON missing version ${JSON.stringify(body)}`);
}

if (live !== expected) {
    await fail(`canary: production ${live} !== package ${expected}`);
}

console.log(`canary: ok ${live} @ ${base}`);
