export class Playlist {
    constructor(player) {
        this.player = player;
        this.favorites = [];
        this.toggleButton = null;
        this.setupEventListeners();
        this.loadStoredPlaylist();
    }

    setupEventListeners() {
        // URL input handler
        const m3uUrlInput = document.getElementById('m3uUrl');
        m3uUrlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.loadPlaylistFromUrl();
            }
        });

        // Load playlist button handler
        const loadButton = document.querySelector('button:nth-of-type(1)');
        loadButton.onclick = () => this.loadPlaylistFromUrl();

        // Clear playlist button handler
        const clearButton = document.querySelector('button:nth-of-type(2)');
        clearButton.onclick = () => this.clearPlaylist();

        // Filter: only favorites
        this.onlyFavorites = false;
        const favFilter = document.getElementById('fav-filter');
        favFilter.onclick = () => {
            this.onlyFavorites = !this.onlyFavorites;
            favFilter.classList.toggle('on', this.onlyFavorites);
            this.filterChannels();
        };

        // Reset favorites handler
        document.getElementById('reset-favorites').onclick = () => this.resetFavorites();

        // Search input handler
        const searchInput = document.getElementById('channelSearch');
        searchInput.addEventListener('input', () => this.filterChannels());

        // Setup video favorites container and toggle button
        const videoContainer = document.getElementById('video-favorites-buttons');
        videoContainer.style.display = 'flex';
        videoContainer.style.justifyContent = 'center';
        videoContainer.style.gap = '20px';
        
        this.createToggleButton(videoContainer);

        // Load stored favorites
        this.loadFavorites();
    }

    async loadPlaylistFromUrl() {
        let url = document.getElementById('m3uUrl').value;
        if (!url) {
            alert("Inserisci un URL M3U valido!");
            return;
        }

        // Scorciatoia: "tv" carica la playlist italiana di Free-TV
        if (url.toLowerCase() === "tv") {
            url = "https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_italy.m3u8";
        }

        const proxies = [
            (u) => u,  // tentativo diretto (funziona con GitHub raw, ecc.)
            (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
            (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
            (u) => `https://cors-anywhere.herokuapp.com/${u}`,
        ];

        let lastError = null;
        for (const makeUrl of proxies) {
            try {
                const fetchUrl = makeUrl(url);
                const response = await fetch(fetchUrl);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                const m3uContent = await response.text();
                if (!m3uContent.trim().startsWith('#EXTM3U') && !m3uContent.includes('#EXTINF')) {
                    throw new Error('Risposta non è una playlist M3U valida');
                }
                this.parseM3U(m3uContent);
                try {
                    localStorage.setItem('m3uPlaylist', m3uContent);
                    localStorage.setItem('m3uUrl', url);
                } catch (e) {
                    console.warn('Playlist troppo grande per localStorage, non salvata');
                }
                return;
            } catch (error) {
                lastError = error;
            }
        }
        alert("Errore nel caricamento della playlist: " + lastError.message);
    }

    loadPlaylistFromFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            this.parseM3U(content);
            try {
                localStorage.setItem('m3uPlaylist', content);
            } catch (e) {
                console.warn('Playlist troppo grande per localStorage, non salvata');
            }
        };
        reader.readAsText(file);
    }

    parseM3U(m3u) {
        const lines = m3u.split(/\r?\n/);
        this.channels = new Map(); // id preferito -> { name, url }
        const playlistDiv = document.getElementById("playlist");
        playlistDiv.innerHTML = "";
        
        this.hideInputElements();

        let name = "";
        let id = "";
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith("#EXTINF")) {
                // Il nome segue l'ultima virgola fuori dagli attributi tra virgolette
                id = (line.match(/tvg-id="([^"]*)"/) || [])[1] || "";
                name = line.replace(/"[^"]*"/g, '""').split(",").slice(1).join(",").trim() || "Canale Sconosciuto";
            } else if (/^https?:\/\//i.test(line)) {
                // Su pagina HTTPS gli stream http sono bloccati (mixed content): prova https
                const streamUrl = location.protocol === 'https:' ? line.replace(/^http:/i, 'https:') : line;
                this.createChannelElement(name, streamUrl, i, id);
                name = "";
                id = "";
            }
        }

        this.relinkFavorites();
        this.refreshStars();
        this.updateFavoritesButtons();

        if (playlistDiv.innerHTML === "") {
            playlistDiv.innerHTML = "<p style='color: red;'>Nessun canale trovato!</p>";
        }
    }

    // Identificatore stabile: tvg-id se presente, altrimenti nome senza qualità/tag
    favoriteId(name, tvgId) {
        return tvgId || name.replace(/\([^)]*\)|\[[^\]]*\]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    createChannelElement(name, url, index, tvgId) {
        let id = this.favoriteId(name, tvgId);
        // Stesso tvg-id su più stream (es. varianti dello stesso canale): suffisso progressivo
        for (let n = 2; this.channels.has(id); n++) {
            id = `${this.favoriteId(name, tvgId)}#${n}`;
        }
        this.channels.set(id, { name, url });

        const channelContainer = document.createElement("div");
        channelContainer.className = "channel";
        channelContainer.dataset.channelName = name;
        channelContainer.dataset.favoriteId = id;

        const star = document.createElement("span");
        star.className = "star";
        star.title = "Aggiungi/rimuovi dai preferiti";
        star.onclick = (e) => {
            e.stopPropagation();
            this.toggleFavorite(id, name, url);
        };
        const label = document.createElement("span");
        label.className = "channel-name";
        label.textContent = name;
        channelContainer.append(star, label);

        channelContainer.onclick = () => {
            this.player.play(url, channelContainer, index, name);

            // Update toggle button state whenever a channel is played
            if (this.toggleButton) {
                this.toggleButton.disabled = !this.player.previousClickedFavorite;
                this.toggleButton.style.opacity = this.player.previousClickedFavorite ? '1' : '0.5';
            }
        };
        document.getElementById("playlist").appendChild(channelContainer);
        this.refreshStar(channelContainer);
    }

    hideInputElements() {
        const m3uUrl = document.getElementById('m3uUrl');
        const fileInput = document.getElementById('fileInput');
        const loadButton = document.querySelector('button:nth-of-type(1)');
        
        if (m3uUrl) m3uUrl.style.display = 'none';
        if (fileInput) fileInput.style.display = 'none';
        if (loadButton) loadButton.style.display = 'none';
    }

    filterChannels() {
        const searchTerm = document.getElementById('channelSearch').value.toLowerCase();
        const channels = document.querySelectorAll('.channel');
        let visibleIndex = 0;

        channels.forEach(channel => {
            const channelName = channel.dataset.channelName.toLowerCase();
            const favOk = !this.onlyFavorites || this.isFavorite(channel.dataset.favoriteId);
            if (favOk && channelName.includes(searchTerm)) {
                channel.style.display = '';
                channel.dataset.visibleIndex = visibleIndex;
                visibleIndex++;
            } else {
                channel.style.display = 'none';
            }
        });
    }

    loadFavorites() {
        try {
            const stored = JSON.parse(localStorage.getItem('favorites')) || [];
            // Migra il vecchio formato { name, url, index } aggiungendo l'id
            this.favorites = stored.map(f => ({ ...f, id: f.id || this.favoriteId(f.name, '') }));
        } catch (e) {
            this.favorites = [];
        }
        this.updateFavoritesButtons();
    }

    saveFavorites() {
        localStorage.setItem('favorites', JSON.stringify(this.favorites));
    }

    isFavorite(id) {
        return this.favorites.some(f => f.id === id);
    }

    toggleFavorite(id, name, url) {
        if (this.isFavorite(id)) {
            this.favorites = this.favorites.filter(f => f.id !== id);
        } else {
            this.favorites.push({ id, name, url });
        }
        this.saveFavorites();
        this.refreshStars();
        this.updateFavoritesButtons();
        this.filterChannels();
    }

    refreshStar(channelEl) {
        const on = this.isFavorite(channelEl.dataset.favoriteId);
        const star = channelEl.querySelector('.star');
        star.classList.toggle('on', on);
        star.textContent = on ? '★' : '☆';
    }

    refreshStars() {
        document.querySelectorAll('.channel').forEach(el => this.refreshStar(el));
    }

    resetFavorites() {
        if (!this.favorites.length || !confirm('Rimuovere tutti i preferiti?')) return;
        this.favorites = [];
        this.saveFavorites();
        this.refreshStars();
        this.updateFavoritesButtons();
    }

    // Favoriti salvati con id da nome (vecchio formato): li collega al tvg-id del canale
    relinkFavorites() {
        let changed = false;
        this.favorites.forEach(fav => {
            if (this.channels.has(fav.id)) return;
            for (const [id, ch] of this.channels) {
                if (this.favoriteId(ch.name, '') === fav.id) {
                    fav.id = id;
                    changed = true;
                    break;
                }
            }
        });
        if (changed) this.saveFavorites();
    }

    // URL aggiornato dalla playlist corrente, con fallback su quello salvato
    resolveFavorite(fav) {
        const current = this.channels && this.channels.get(fav.id);
        if (current) {
            if (fav.url !== current.url) {
                fav.url = current.url;
                this.saveFavorites();
            }
            return current.url;
        }
        return fav.url;
    }

    updateFavoritesButtons() {
        const videoContainer = document.getElementById('video-favorites-buttons');
        const oldToggle = this.toggleButton ? this.toggleButton.parentElement : null;
        videoContainer.innerHTML = '';
        videoContainer.style.display = 'flex';
        videoContainer.style.justifyContent = 'center';
        videoContainer.style.gap = '20px';

        // Restore toggle button if it exists
        if (oldToggle) {
            videoContainer.appendChild(oldToggle);
        }

        this.createFavoriteButtons(videoContainer);
    }

    createToggleButton(container) {
        const toggleWrapper = document.createElement('div');
        toggleWrapper.style.display = 'flex';
        toggleWrapper.style.flexDirection = 'column';
        toggleWrapper.style.alignItems = 'center';
        toggleWrapper.style.gap = '5px';

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'favorite-button';
        toggleBtn.style.width = 'auto';
        toggleBtn.style.margin = '0';
        toggleBtn.style.padding = '10px 20px';
        toggleBtn.innerHTML = '🔄';
        toggleBtn.title = 'Switch between last two channels';
        toggleBtn.onclick = () => this.player.toggleLastChannels();
        toggleBtn.disabled = !this.player.previousClickedFavorite;
        toggleBtn.style.opacity = this.player.previousClickedFavorite ? '1' : '0.5';
        
        toggleWrapper.appendChild(toggleBtn);
        container.appendChild(toggleWrapper);
        
        // Store reference to toggle button
        this.toggleButton = toggleBtn;
    }

    createFavoriteButtons(container) {
        this.favorites.forEach(fav => {
            const videoBtn = document.createElement('button');
            videoBtn.className = 'favorite-button';
            videoBtn.style.width = 'auto';
            videoBtn.style.margin = '0';
            videoBtn.style.padding = '10px 20px';
            videoBtn.textContent = fav.name;
            videoBtn.dataset.channelName = fav.name;
            if (this.player.currentChannel && this.player.currentChannel.name === fav.name) {
                videoBtn.classList.add('active');
            }
            videoBtn.onclick = () => this.player.play(this.resolveFavorite(fav), videoBtn, 0, fav.name);
            container.appendChild(videoBtn);
        });
    }

    clearPlaylist() {
        // I preferiti restano: si cancellano solo con "Reset preferiti"
        localStorage.removeItem('m3uPlaylist');
        localStorage.removeItem('m3uUrl');
        this.channels = new Map();
        document.getElementById('playlist').innerHTML = "Nessuna playlist caricata";
        
        const m3uUrl = document.getElementById('m3uUrl');
        m3uUrl.value = '';
        m3uUrl.style.display = '';
        
        const fileInput = document.getElementById('fileInput');
        if (fileInput) fileInput.style.display = '';
        
        const loadButton = document.querySelector('button:nth-of-type(1)');
        if (loadButton) loadButton.style.display = '';
        
        document.getElementById('current-channel-name').textContent = '';
        
        // Update toggle button state
        if (this.toggleButton) {
            this.toggleButton.disabled = true;
            this.toggleButton.style.opacity = '0.5';
        }

        const video = document.getElementById('player');
        video.pause();
        video.src = '';
    }

    loadStoredPlaylist() {
        const storedPlaylist = localStorage.getItem('m3uPlaylist');
        const storedUrl = localStorage.getItem('m3uUrl');
        
        if (storedPlaylist) {
            console.log('Loading saved playlist...');
            this.parseM3U(storedPlaylist);
            if (storedUrl) {
                document.getElementById('m3uUrl').value = storedUrl;
            }
        }
    }
}

export default Playlist;