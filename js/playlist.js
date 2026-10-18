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

        // Export / import JSON (canali + preferiti)
        document.getElementById('export-json').onclick = () => this.exportJson();
        const importFile = document.getElementById('importFile');
        document.getElementById('import-json').onclick = () => importFile.click();
        importFile.onchange = (e) => {
            this.importJson(e.target.files[0]);
            e.target.value = '';
        };

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
        let logo = "";
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith("#EXTINF")) {
                // Il nome segue l'ultima virgola fuori dagli attributi tra virgolette
                id = (line.match(/tvg-id="([^"]*)"/) || [])[1] || "";
                logo = (line.match(/tvg-logo="([^"]*)"/) || [])[1] || "";
                name = line.replace(/"[^"]*"/g, '""').split(",").slice(1).join(",").trim() || "Canale Sconosciuto";
            } else if (/^https?:\/\//i.test(line)) {
                // Su pagina HTTPS gli stream http sono bloccati (mixed content): prova https
                const streamUrl = location.protocol === 'https:' ? line.replace(/^http:/i, 'https:') : line;
                this.createChannelElement(name, streamUrl, i, id, logo);
                name = "";
                id = "";
                logo = "";
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

    createChannelElement(name, url, index, tvgId, logo = "") {
        let id = this.favoriteId(name, tvgId);
        // Stesso tvg-id su più stream (es. varianti dello stesso canale): suffisso progressivo
        for (let n = 2; this.channels.has(id); n++) {
            id = `${this.favoriteId(name, tvgId)}#${n}`;
        }
        this.channels.set(id, { name, url, logo });

        const channelContainer = document.createElement("div");
        channelContainer.className = "channel";
        channelContainer.dataset.channelName = name;
        channelContainer.dataset.favoriteId = id;

        const star = document.createElement("span");
        star.className = "star";
        star.title = "Aggiungi/rimuovi dai preferiti";
        star.onclick = (e) => {
            e.stopPropagation();
            this.toggleFavorite(id, name, url, logo);
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

    toggleFavorite(id, name, url, logo = "") {
        if (this.isFavorite(id)) {
            this.favorites = this.favorites.filter(f => f.id !== id);
        } else {
            this.favorites.push({ id, name, url, logo });
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

    exportJson() {
        const data = {
            version: 1,
            m3uUrl: localStorage.getItem('m3uUrl') || '',
            channels: [...(this.channels || [])].map(([id, ch]) => ({ id, name: ch.name, url: ch.url, logo: ch.logo })),
            favorites: this.favorites
        };
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
        a.download = 'iptv-backup.json';
        a.click();
        URL.revokeObjectURL(a.href);
    }

    async importJson(file) {
        if (!file) return;
        try {
            const data = JSON.parse(await file.text());
            const channels = Array.isArray(data.channels) ? data.channels.filter(c => c && c.name && c.url) : [];
            const favorites = Array.isArray(data.favorites) ? data.favorites.filter(f => f && f.name && f.url) : [];
            if (!channels.length && !favorites.length) throw new Error('nessun canale o preferito nel file');

            this.favorites = favorites.map(f => ({ ...f, id: f.id || this.favoriteId(f.name, '') }));
            this.saveFavorites();

            if (channels.length) {
                // Ricostruisce una M3U con gli stessi id, così preferiti e canali restano collegati
                const m3u = '#EXTM3U\n' + channels.map(c =>
                    `#EXTINF:-1 tvg-id="${(c.id || '').replace(/"/g, '')}" tvg-logo="${(c.logo || '').replace(/"/g, '')}",${c.name.replace(/[\r\n]/g, ' ')}\n${c.url}`
                ).join('\n');
                this.parseM3U(m3u);
                try {
                    localStorage.setItem('m3uPlaylist', m3u);
                    if (data.m3uUrl) localStorage.setItem('m3uUrl', data.m3uUrl);
                } catch (e) {
                    console.warn('Playlist troppo grande per localStorage, non salvata');
                }
            } else {
                this.refreshStars();
                this.updateFavoritesButtons();
            }
        } catch (e) {
            alert('File JSON non valido: ' + e.message);
        }
    }

    // Favoriti salvati con id da nome (vecchio formato): li collega al tvg-id del canale
    relinkFavorites() {
        let changed = false;
        this.favorites.forEach(fav => {
            const cur = this.channels.get(fav.id);
            if (cur) {
                if (cur.logo && fav.logo !== cur.logo) {
                    fav.logo = cur.logo;
                    changed = true;
                }
                return;
            }
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
            if (fav.url !== current.url || (current.logo && fav.logo !== current.logo)) {
                fav.url = current.url;
                if (current.logo) fav.logo = current.logo;
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
            if (fav.logo) {
                const img = document.createElement('img');
                img.src = fav.logo;
                img.alt = '';
                img.loading = 'lazy';
                img.onerror = () => img.remove();
                videoBtn.appendChild(img);
            }
            videoBtn.appendChild(Object.assign(document.createElement('span'), { textContent: fav.name }));
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