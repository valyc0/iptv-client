export class Player {
    constructor() {
        this.currentHls = null;
        this.currentChannel = null;
        this.stallInterval = null;
        this.lastClickedFavorite = null;
        this.previousClickedFavorite = null;
        this.maxStallCount = 3;
        this.videoElement = document.getElementById('player');
        this.setupKeyboardControls();
        this.onChannelChange = null; // Callback for program info updates
    }

    async play(url, element, index, name) {
        this.updateLastClickedChannels(url, element, index, name);
        this.updateActiveChannel(element, name);
        this.updateStallDetection();
        await this.initializePlayer(url);
        
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
        
        const channelName = document.getElementById('current-channel-name');
        channelName.textContent = name;
        channelName.style.fontSize = '24px';
        channelName.style.marginTop = '20px';
        channelName.style.color = '#3a9bff';

        if (!element.classList.contains('favorite-button')) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    async initializePlayer(url) {
        if (!Hls.isSupported()) {
            if (this.videoElement.canPlayType('application/vnd.apple.mpegurl')) {
                this.videoElement.src = url;
                await this.playVideo();
            } else {
                throw new Error('HLS not supported in this browser');
            }
            return;
        }

        if (this.currentHls) {
            this.currentHls.destroy();
        }

        const hls = new Hls(this.getHlsConfig());
        this.currentHls = hls;
        this.setupHlsErrorHandling(hls);

        hls.loadSource(url);
        hls.attachMedia(this.videoElement);
        hls.on(Hls.Events.MANIFEST_PARSED, () => this.playVideo());
    }

    getHlsConfig() {
        return {
            manifestLoadingTimeOut: 20000,
            manifestLoadingMaxRetry: 3,
            manifestLoadingRetryDelay: 500,
            levelLoadingTimeOut: 20000,
            levelLoadingMaxRetry: 3,
            levelLoadingRetryDelay: 500
        };
    }

    setupHlsErrorHandling(hls) {
        hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
                switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        console.log('Network error, trying to recover...');
                        hls.startLoad();
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        console.log('Media error, trying to recover...');
                        hls.recoverMediaError();
                        break;
                    default:
                        console.log('Fatal error, restarting stream...');
                        this.restartStream();
                        break;
                }
            }
        });
    }

    async playVideo() {
        try {
            await this.videoElement.play();
        } catch (error) {
            console.log('Play failed:', error);
            setTimeout(() => this.restartStream(), 2000);
        }
    }

    restartStream() {
        if (this.currentChannel) {
            const { url, element, index, name } = this.currentChannel;
            if (this.currentHls) {
                this.currentHls.destroy();
                this.currentHls = null;
            }
            setTimeout(() => this.play(url, element, index, name), 1000);
        }
    }

    updateStallDetection() {
        let stallCount = 0;
        let lastTime = 0;
        let stallTimeout;

        const checkStall = () => {
            if (this.videoElement.currentTime === lastTime && !this.videoElement.paused) {
                stallCount++;
                console.log('Stall detected:', stallCount);
                if (stallCount >= this.maxStallCount) {
                    console.log('Multiple stalls detected, restarting stream...');
                    this.restartStream();
                    stallCount = 0;
                }
            } else {
                stallCount = 0;
            }
            lastTime = this.videoElement.currentTime;
        };

        if (this.stallInterval) {
            clearInterval(this.stallInterval);
        }

        this.stallInterval = setInterval(checkStall, 3000);

        this.videoElement.addEventListener('stalled', () => {
            console.log('Stream stalled');
            if (stallTimeout) clearTimeout(stallTimeout);
            stallTimeout = setTimeout(() => this.restartStream(), 10000);
        });

        this.videoElement.addEventListener('playing', () => {
            if (stallTimeout) clearTimeout(stallTimeout);
        });

        this.videoElement.addEventListener('waiting', () => {
            console.log('Stream buffering');
            if (stallTimeout) clearTimeout(stallTimeout);
            stallTimeout = setTimeout(() => this.restartStream(), 10000);
        });
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