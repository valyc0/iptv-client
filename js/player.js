export class Player {
    constructor() {
        this.currentHls = null;
        this.currentChannel = null;
        this.lastClickedFavorite = null;
        this.previousClickedFavorite = null;
        this.maxStallCount = 3;
        this.maxRetries = 5;
        this.retries = 0;
        this.streamToken = 0; // invalida timer e callback di stream precedenti
        this.retryTimer = null;
        this.videoElement = document.getElementById('player');
        this.createStatusElement();
        this.setupVideoEvents();
        this.startWatchdog();
        this.setupKeyboardControls();
        this.setupMediaControls();
        this.onChannelChange = null; // Callback for program info updates
    }

    setupMediaControls() {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('previoustrack', () => {
                this.previousChannel();
            });
            navigator.mediaSession.setActionHandler('nexttrack', () => {
                this.nextChannel();
            });
        }
    }

    async play(url, element, index, name) {
        this.updateLastClickedChannels(url, element, index, name);
        this.updateActiveChannel(element, name);
        this.retries = 0;
        this.startStream(url);
        
        // Call the program info update callback
        if (this.onChannelChange) {
            await this.onChannelChange(name);
        }
    }

    updateLastClickedChannels(url, element, index, name) {
        this.previousClickedFavorite = this.lastClickedFavorite;
        this.lastClickedFavorite = { url, element, index, name };
        this.currentChannel = { url, element, index, name };
    }

    updateActiveChannel(element, name) {
        document.querySelectorAll('.channel').forEach(el => el.classList.remove('active'));
        element.classList.add('active');
        document.querySelectorAll('.favorite-button').forEach(el => {
            el.classList.toggle('active', el.dataset.channelName === name);
        });
        
        const channelName = document.getElementById('current-channel-name');
        channelName.textContent = name;
        channelName.style.fontSize = '24px';
        channelName.style.marginTop = '20px';
        channelName.style.color = '#3a9bff';

        if (!element.classList.contains('favorite-button')) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: name,
                artist: 'IPTV Player',
                artwork: [
                    { src: './icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }
                ]
            });
        }
    }

    createStatusElement() {
        this.statusElement = document.createElement('div');
        this.statusElement.id = 'player-status';
        this.statusElement.style.cssText = 'min-height: 1.4em; margin-top: 8px; color: #ffb347; text-align: center;';
        this.videoElement.insertAdjacentElement('afterend', this.statusElement);
    }

    setStatus(text) {
        this.statusElement.textContent = text;
    }

    // Ferma timer e hls.js dello stream corrente, senza toccare il canale selezionato
    teardown() {
        this.streamToken++;
        clearTimeout(this.retryTimer);
        if (this.currentHls) {
            this.currentHls.destroy();
            this.currentHls = null;
        }
    }

    startStream(url) {
        this.teardown();
        const token = this.streamToken;
        this.stallCount = 0;
        this.lastTime = -1;
        this.healthyTicks = 0;
        this.setStatus('Caricamento...');

        if (!window.Hls || !Hls.isSupported()) {
            if (this.videoElement.canPlayType('application/vnd.apple.mpegurl')) {
                this.videoElement.src = url;
                this.playVideo(token);
            } else {
                this.setStatus('Browser non compatibile con HLS');
            }
            return;
        }

        const hls = new Hls(this.getHlsConfig());
        this.currentHls = hls;
        this.setupHlsErrorHandling(hls, token);

        hls.on(Hls.Events.MANIFEST_PARSED, () => this.playVideo(token));
        hls.loadSource(url);
        hls.attachMedia(this.videoElement);
    }

    getHlsConfig() {
        return {
            lowLatencyMode: false,
            // Avvio rapido: parte dalla qualità più bassa e sale con l'ABR, scarica subito
            // il primo frammento e si posiziona più vicino al live
            startLevel: 0,
            startFragPrefetch: true,
            liveSyncDurationCount: 2,
            capLevelToPlayerSize: true,
            backBufferLength: 30,
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
            manifestLoadingTimeOut: 10000,
            manifestLoadingMaxRetry: 1,
            manifestLoadingRetryDelay: 500,
            levelLoadingTimeOut: 15000,
            levelLoadingMaxRetry: 3,
            levelLoadingRetryDelay: 500,
            fragLoadingTimeOut: 20000,
            fragLoadingMaxRetry: 4,
            fragLoadingRetryDelay: 500
        };
    }

    setupHlsErrorHandling(hls, token) {
        let networkRecoveries = 0;
        let mediaRecoveries = 0;

        hls.on(Hls.Events.ERROR, (event, data) => {
            if (!data.fatal || token !== this.streamToken) return;
            console.log('Fatal HLS error:', data.type, data.details);

            if (data.type === Hls.ErrorTypes.NETWORK_ERROR && networkRecoveries++ < 2) {
                hls.startLoad();
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRecoveries++ < 2) {
                if (mediaRecoveries === 2) hls.swapAudioCodec();
                hls.recoverMediaError();
            } else {
                this.recover(data.details);
            }
        });
    }

    async playVideo(token) {
        try {
            await this.videoElement.play();
        } catch (error) {
            if (token !== this.streamToken) return;
            if (error.name === 'NotAllowedError') {
                // Autoplay bloccato: riprova senza audio invece di riavviare lo stream
                this.videoElement.muted = true;
                this.videoElement.play().catch(() => this.setStatus('Premi play per avviare'));
            } else if (error.name !== 'AbortError') {
                this.recover(error.name);
            }
        }
    }

    // Riprova lo stream corrente con backoff; dopo maxRetries tentativi si ferma
    recover(reason) {
        if (!this.currentChannel) return;
        if (this.retries >= this.maxRetries) {
            this.teardown();
            this.setStatus('Canale non raggiungibile, prova un altro canale');
            return;
        }
        this.retries++;
        const delay = Math.min(1000 * 2 ** (this.retries - 1), 10000);
        console.log(`Recover (${reason}): tentativo ${this.retries}/${this.maxRetries} tra ${delay}ms`);
        this.setStatus(`Riconnessione... (${this.retries}/${this.maxRetries})`);

        const { url } = this.currentChannel;
        this.teardown();
        const token = this.streamToken;
        this.retryTimer = setTimeout(() => {
            if (token === this.streamToken) this.startStream(url);
        }, delay);
    }

    // Tiene lo schermo acceso durante la riproduzione (utile in auto)
    async requestWakeLock() {
        try {
            if (!('wakeLock' in navigator) || (this.wakeLock && !this.wakeLock.released)) return;
            this.wakeLock = await navigator.wakeLock.request('screen');
        } catch (e) {
            // non concesso (batteria scarica, tab in background): si ignora
        }
    }

    releaseWakeLock() {
        if (this.wakeLock) {
            this.wakeLock.release().catch(() => {});
            this.wakeLock = null;
        }
    }

    // Listener registrati una sola volta
    setupVideoEvents() {
        const video = this.videoElement;
        video.addEventListener('playing', () => {
            this.setStatus('');
            this.requestWakeLock();
        });
        video.addEventListener('pause', () => this.releaseWakeLock());
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && !video.paused) this.requestWakeLock();
        });
        video.addEventListener('waiting', () => {
            if (this.currentChannel && !video.paused) this.setStatus('Buffering...');
        });
        video.addEventListener('error', () => {
            // hls.js gestisce i propri errori; qui solo il player nativo (Safari)
            if (!this.currentHls && this.currentChannel && video.getAttribute('src')) {
                this.recover('video error');
            }
        });
    }

    // Controlla ogni 5s che la riproduzione avanzi; se resta ferma riavvia lo stream
    startWatchdog() {
        setInterval(() => {
            const video = this.videoElement;
            if (!this.currentChannel || !this.streamToken || video.paused || video.seeking) {
                return;
            }
            if (!this.currentHls && !video.getAttribute('src')) return;

            if (video.currentTime === this.lastTime) {
                this.healthyTicks = 0;
                if (++this.stallCount >= this.maxStallCount) {
                    this.stallCount = 0;
                    this.recover('stall');
                }
            } else {
                this.stallCount = 0;
                // Stream stabile da ~15s: azzera i tentativi di riconnessione
                if (++this.healthyTicks >= 3) this.retries = 0;
            }
            this.lastTime = video.currentTime;
        }, 5000);
    }

    setupKeyboardControls() {
        document.addEventListener('keydown', (event) => {
            if (event.code === 'ArrowDown') {
                event.preventDefault();
                this.nextChannel();
            } else if (event.code === 'ArrowUp') {
                event.preventDefault();
                this.previousChannel();
            }
        });
        
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('previoustrack', () => {
                this.previousChannel();
            });
            
            navigator.mediaSession.setActionHandler('nexttrack', () => {
                this.nextChannel();
            });
        }
    }

    async nextChannel() {
        const activeChannel = document.querySelector('.channel.active');
        if (activeChannel) {
            const nextChannel = activeChannel.nextElementSibling;
            if (nextChannel && nextChannel.classList.contains('channel')) {
                nextChannel.click();
            }
        } else {
            const firstChannel = document.querySelector('.channel');
            if (firstChannel) {
                firstChannel.click();
            }
        }
    }

    async previousChannel() {
        const activeChannel = document.querySelector('.channel.active');
        if (activeChannel) {
            const prevChannel = activeChannel.previousElementSibling;
            if (prevChannel && prevChannel.classList.contains('channel')) {
                prevChannel.click();
            }
        } else {
            const firstChannel = document.querySelector('.channel');
            if (firstChannel) {
                firstChannel.click();
            }
        }
    }

    async toggleLastChannels() {
        if (!this.lastClickedFavorite || !this.previousClickedFavorite) {
            return;
        }

        await this.play(
            this.previousClickedFavorite.url,
            this.previousClickedFavorite.element,
            this.previousClickedFavorite.index,
            this.previousClickedFavorite.name
        );
    }
}

export default Player;