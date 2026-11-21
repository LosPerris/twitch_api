/** Fragmento i18n: alerts (en). */
export const alerts = {
alerts: {
        bitsRoulette: {
            title: 'Bits',
            desc: 'When someone cheers the amount you set, react on OBS with a wheel, message, or image.',
            reactionMode: 'Reaction',
            reactionModeRoulette: 'Roulette',
            reactionModeMessage: 'Message',
            reactionModeImage: 'Image',
            imageUrl: 'Image URL (https)',
            imageUrlPlaceholder: 'https://example.com/image.png',
            imageUrlHint: 'Imgur, Discord CDN, or another public host. HTTPS only.',
            imageUrlError: 'Use a public URL starting with https:// (max 500 characters).',
            imageCaption: 'Caption under the image',
            imageCaptionPlaceholder: '{name} cheered {bits} bits',
            imageCaptionHint: 'Optional. Placeholders: {name} and {bits}. Leave empty for image only.',
            messageTemplate: 'Message template',
            messageTemplateHint: 'Placeholders: {name} and {bits}',
            triggerTitle: 'Trigger',
            enabled: 'Enable alert',
            threshold: 'Bits',
            matchMode: 'Mode',
            matchExact: 'Exact',
            matchMin: 'Minimum',
            cooldown: 'Cooldown (s)',
            triggerHint:
                'Here: trigger and content (prizes, message, or image). In Overlay: color, size, donor, confetti, sound, and hold time.',
            optionsTitle: 'Prizes',
            addOption: 'Add',
            removeOption: 'Remove',
            optionsMin: 'Add at least 2 prizes.',
            optionsMaxHint: 'Max {max} ({plan} plan).',
            save: 'Save',
            saving: 'Saving…',
            saved: 'Alert saved',
            savedLocal: 'Config ready: open Overlay for appearance and update the URL in OBS',
            enabledOn: 'Bits listening enabled',
            enabledOff: 'Bits listening disabled',
            saveError: 'Could not save the alert',
            permissionsNeeded:
                'Listening for real bits needs a Twitch permission. If enabling fails, update it here and try again.',
            permissionsError:
                'Bits permission is missing. Update Twitch permissions and enable the alert again.',
            loadError: 'Could not load the alert',
            testSpin: 'Test on OBS',
            testing: 'Sending…',
            testOk: 'Test cheer sent (overlay uses its URL)',
            testError: 'Could not test the spin',
            announceChat: 'Send the winning prize in chat',
            announceChatHint: 'When the spin ends, the channel posts the prize and who won it.',
            announceChatOn: 'Chat announcement enabled',
            announceChatOff: 'Chat announcement disabled',
            appearanceTitle: 'Overlay',
            showDonor: 'Who cheered on the card',
            showDonorHint: 'Under the prize when it ends.',
            confetti: 'Confetti on win',
            confettiSound: 'Win sound',
            confettiSoundHint:
                'Plays when the prize is revealed. Re-copy the overlay URL if you changed the sound. In OBS, raise the Browser Source volume.',
            confettiSoundPreview: 'Preview',
            confettiSounds: {
                none: 'No sound',
                confetti: 'Confetti',
                pop: 'Pop',
                chime: 'Chime',
                fanfare: 'Fanfare',
                sparkle: 'Sparkle'
            },
            cardStyle: 'Card',
            cardGlass: 'Transparent',
            cardSolid: 'Solid',
            winnerHold: 'Visible time (s)',
            winnerHoldHint: 'How long the winner card stays. From 3 to 15 seconds.',
            donorLabel: 'Cheer from {name}',
            spinBanner: 'Text while spinning',
            spinBannerHint: '{name} and {bits}',
            spinBannerText: 'Text',
            spinBannerVars: 'Available variables:',
            spinBannerInsertVar: 'Insert {var}',
            spinBannerDefault: '{name} spun the wheel with {bits} bits'
        },
        eventAlert: {
            comingSoon: {
                title: 'Still under construction',
                body: 'Still figuring out how these will work. Questions or feedback? Message me on Discord: ponsschiquito.',
                discordCta: 'Open Discord'
            },
            follow: {
                title: 'Follows',
                desc: 'Alerts when someone new follows you.'
            },
            subscribe: {
                title: 'Subs',
                desc: 'Alerts on new subscriptions.'
            },
            raid: {
                title: 'Raids',
                desc: 'Alerts when you receive a raid.'
            }
        }
    }
};
