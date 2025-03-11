export class Playlist {
    constructor(player) {
        this.player = player;
        this.favorites = [];
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

        // Favorites switch handler
        const favoritesSwitch = document.getElementById('favorites-switch');
        favoritesSwitch.addEventListener('change', () => this.updateFavoritesButtons());

        // Search input handler
        const searchInput = document.getElementById('channelSearch');
        searchInput.addEventListener('input', () => this.filterChannels());

        // Load stored favorites
        const storedFavorites = localStorage.getItem('favorites');
        if (storedFavorites) {
            this.favorites = JSON.parse(storedFavorites);
            this.updateFavoritesButtons();
        }
    }

    async loadPlaylistFromUrl() {
        const url = document.getElementById('m3uUrl').value;
        if (!url) {
            alert("Inserisci un URL M3U valido!");
            return;
        }

        try {
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const m3uContent = await response.text();
            this.parseM3U(m3uContent);
            localStorage.setItem('m3uPlaylist', m3uContent);
            localStorage.setItem('m3uUrl', url);
        } catch (error) {
            alert("Errore nel caricamento della playlist: " + error.message);
        }
    }

    loadPlaylistFromFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            this.parseM3U(content);
            localStorage.setItem('m3uPlaylist', content);
        };
        reader.readAsText(file);
    }

    parseM3U(m3u) {
        const lines = m3u.split("\n");
        const playlistDiv = document.getElementById("playlist");
        playlistDiv.innerHTML = "";
        
        this.hideInputElements();

        let name = "";
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith("#EXTINF")) {
                name = line.split(",")[1] || "Canale Sconosciuto";
            } else if (line.startsWith("http")) {
                this.createChannelElement(name, line, i);
            }
        }

        if (playlistDiv.innerHTML === "") {
            playlistDiv.innerHTML = "<p style='color: red;'>Nessun canale trovato!</p>";
        }
    }

    createChannelElement(name, url, index) {
        const channelContainer = document.createElement("div");
        channelContainer.className = "channel";
        channelContainer.textContent = name;
        channelContainer.dataset.channelName = name;
        channelContainer.onclick = () => {
            this.player.play(url, channelContainer, index, name);
            
            const favoritesSwitch = document.getElementById('favorites-switch');
            if (favoritesSwitch.checked) {
                this.addToFavorites(name, url, index);
            }
        };
        document.getElementById("playlist").appendChild(channelContainer);
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
            const channelName = channel.textContent.toLowerCase();
            if (channelName.includes(searchTerm)) {
                channel.style.display = '';
                channel.dataset.visibleIndex = visibleIndex;
                visibleIndex++;
            } else {
                channel.style.display = 'none';
            }
        });
    }

    addToFavorites(name, url, index) {
        if (this.favorites.some(f => f.url === url)) {
            return;
        }
        
        if (this.favorites.length >= 3) {
            this.favorites.shift();
        }
        
        this.favorites.push({ name, url, index });
        localStorage.setItem('favorites', JSON.stringify(this.favorites));
        this.updateFavoritesButtons();
    }

    removeFavorite(url) {
        this.favorites = this.favorites.filter(f => f.url !== url);
        localStorage.setItem('favorites', JSON.stringify(this.favorites));
        this.updateFavoritesButtons();
    }

    updateFavoritesButtons() {
        const videoContainer = document.getElementById('video-favorites-buttons');
        videoContainer.innerHTML = '';
        videoContainer.style.display = 'flex';
        videoContainer.style.justifyContent = 'center';
        videoContainer.style.gap = '20px';

        this.createToggleButton(videoContainer);
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
    }

    createFavoriteButtons(container) {
        const favoritesSwitch = document.getElementById('favorites-switch');
        const showDeleteButtons = favoritesSwitch.checked;
        
        this.favorites.forEach(fav => {
            const videoWrapper = document.createElement('div');
            videoWrapper.style.display = 'flex';
            videoWrapper.style.flexDirection = 'column';
            videoWrapper.style.alignItems = 'center';
            videoWrapper.style.gap = '5px';

            const videoBtn = document.createElement('button');
            videoBtn.className = 'favorite-button';
            videoBtn.style.width = 'auto';
            videoBtn.style.margin = '0';
            videoBtn.style.padding = '10px 20px';
            videoBtn.textContent = fav.name;
            videoBtn.dataset.channelName = fav.name;
            videoBtn.onclick = () => this.player.play(fav.url, videoBtn, fav.index, fav.name);

            videoWrapper.appendChild(videoBtn);

            if (showDeleteButtons) {
                const deleteBtn = document.createElement('button');
                deleteBtn.style.padding = '5px 10px';
                deleteBtn.style.marginTop = '-3px';
                deleteBtn.innerHTML = '🗑️';
                deleteBtn.onclick = () => this.removeFavorite(fav.url);
                videoWrapper.appendChild(deleteBtn);
            }

            container.appendChild(videoWrapper);
        });
    }

    clearPlaylist() {
        localStorage.clear();
        document.getElementById('playlist').innerHTML = "Nessuna playlist caricata";
        
        const m3uUrl = document.getElementById('m3uUrl');
        m3uUrl.value = '';
        m3uUrl.style.display = '';
        
        const fileInput = document.getElementById('fileInput');
        if (fileInput) fileInput.style.display = '';
        
        const loadButton = document.querySelector('button:nth-of-type(1)');
        if (loadButton) loadButton.style.display = '';
        
        document.getElementById('current-channel-name').textContent = '';
        
        document.getElementById('favorites-buttons').innerHTML = '';
        document.getElementById('video-favorites-buttons').innerHTML = '';
        
        this.favorites = [];
        localStorage.removeItem('favorites');
        this.updateFavoritesButtons();
        
        document.getElementById('favorites-switch').checked = false;
        
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