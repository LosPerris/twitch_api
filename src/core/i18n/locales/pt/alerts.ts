/** Fragmento i18n: alerts (pt). */
export const alerts = {
alerts: {
        bitsRoulette: {
            title: 'Bits',
            desc: 'Quando alguém cheer a quantidade que escolheres, reage no OBS: roleta, mensagem ou imagem.',
            reactionMode: 'Reação',
            reactionModeRoulette: 'Roleta',
            reactionModeMessage: 'Mensagem',
            reactionModeImage: 'Imagem',
            imageUrl: 'URL da imagem (https)',
            imageUrlPlaceholder: 'https://exemplo.com/imagem.png',
            imageUrlHint: 'Imgur, Discord CDN ou outro host público. Só https.',
            imageUrlError: 'Usa um URL público que comece por https:// (máx. 500 caracteres).',
            imageCaption: 'Texto sob a imagem',
            imageCaptionPlaceholder: '{name} cheerou {bits} bits',
            imageCaptionHint: 'Opcional. Marcadores: {name} e {bits}. Deixa vazio para só imagem.',
            messageTemplate: 'Modelo da mensagem',
            messageTemplateHint: 'Marcadores: {name} e {bits}',
            triggerTitle: 'Disparo',
            enabled: 'Ativar alerta',
            threshold: 'Bits',
            matchMode: 'Modo',
            matchExact: 'Exato',
            matchMin: 'Mínimo',
            cooldown: 'Cooldown (s)',
            triggerHint:
                'Aqui: disparo e conteúdo (prémios, mensagem ou imagem). No Overlay: cor, tamanho, quem cheerou, confete, som e tempo visível.',
            optionsTitle: 'Prémios',
            addOption: 'Adicionar',
            removeOption: 'Remover',
            optionsMin: 'Põe pelo menos 2 prémios.',
            optionsMaxHint: 'Máximo {max} (plano {plan}).',
            save: 'Guardar',
            saving: 'A guardar…',
            saved: 'Alerta guardada',
            savedLocal: 'Config pronta: abre Overlay para aparência e atualiza a URL no OBS',
            enabledOn: 'Escuta de bits ativada',
            enabledOff: 'Escuta de bits desativada',
            saveError: 'Não foi possível guardar a alerta',
            permissionsNeeded:
                'Para ouvir bits reais é preciso uma permissão da Twitch. Se ao ativar falhar, atualiza-a aqui e tenta de novo.',
            permissionsError:
                'Falta a permissão de bits. Atualiza as permissões da Twitch e volta a ativar.',
            loadError: 'Não foi possível carregar a alerta',
            testSpin: 'Testar no OBS',
            testing: 'A enviar…',
            testOk: 'Cheer de teste enviado (o overlay usa a sua URL)',
            testError: 'Não foi possível testar o spin',
            announceChat: 'Enviar prémio vencedor no chat',
            announceChatHint: 'Quando a roleta para, o canal escreve no chat o prémio e quem ganhou.',
            announceChatOn: 'Anúncio no chat ativado',
            announceChatOff: 'Anúncio no chat desativado',
            appearanceTitle: 'Overlay',
            showDonor: 'Quem fez cheer no cartão',
            showDonorHint: 'Abaixo do prémio quando termina.',
            confetti: 'Confete ao ganhar',
            confettiSound: 'Som ao ganhar',
            confettiSoundHint:
                'Toca ao revelar o prémio. Volta a copiar o URL do overlay se mudaste o som. No OBS, sobe o volume do Browser Source.',
            confettiSoundPreview: 'Testar',
            confettiSounds: {
                none: 'Sem som',
                confetti: 'Confete',
                pop: 'Pop',
                chime: 'Sinos',
                fanfare: 'Fanfarra',
                sparkle: 'Brilho'
            },
            cardStyle: 'Cartão',
            cardGlass: 'Transparente',
            cardSolid: 'Sólido',
            winnerHold: 'Tempo visível (s)',
            winnerHoldHint: 'Quanto tempo o cartão do vencedor fica. De 3 a 15 segundos.',
            donorLabel: 'Cheer de {name}',
            spinBanner: 'Texto enquanto gira',
            spinBannerHint: '{name} e {bits}',
            spinBannerText: 'Texto',
            spinBannerVars: 'Variáveis disponíveis:',
            spinBannerInsertVar: 'Inserir {var}',
            spinBannerDefault: '{name} girou a roleta com {bits} bits'
        },
        eventAlert: {
            comingSoon: {
                title: 'Ainda em construção',
                body: 'Ainda estamos a definir como vão ser. Dúvidas ou comentários? Escreve-me no Discord: ponsschiquito.',
                discordCta: 'Abrir Discord'
            },
            follow: {
                title: 'Follows',
                desc: 'Alertas quando alguém novo te seguir.'
            },
            subscribe: {
                title: 'Subs',
                desc: 'Alertas em novas assinaturas.'
            },
            raid: {
                title: 'Raids',
                desc: 'Alertas quando receberes um raid.'
            }
        }
    }
};
