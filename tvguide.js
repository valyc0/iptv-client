class TvGuide {
    static async fetchM3uPlaylist(url) {
        try {
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.text();
        } catch (error) {
            throw new Error('Errore nel caricamento della playlist: ' + error.message);
        }
    }

    constructor() {
        this.channelUrls = {
            'Rai 1': { number: 1, url: 'programmi_stasera_rai1.html' },
            'Rai 2': { number: 2, url: 'programmi_stasera_rai2.html' },
            'Rai 3': { number: 3, url: 'programmi_stasera_rai3.html' },
            'Rete 4': { number: 4, url: 'programmi_stasera_rete4.html' },
            'Canale 5': { number: 5, url: 'programmi_stasera_canale5.html' },
            'Italia 1': { number: 6, url: 'programmi_stasera_italia1.html' },
            'LA7': { number: 7, url: 'programmi_stasera_la7.html' },
            'TV8': { number: 8, url: 'programmi_stasera_tv8.html' },
            'NOVE': { number: 9, url: 'programmi_stasera_nove.html' },
            '20 Mediaset': { number: 20, url: 'programmi_stasera_20.html' },
            'Rai 4': { number: 21, url: 'programmi_stasera_rai4.html' },
            'Iris': { number: 22, url: 'programmi_stasera_iris.html' },
            'Rai 5': { number: 23, url: 'programmi_stasera_rai5.html' },
            'Rai Movie': { number: 24, url: 'programmi_stasera_raimovie.html' },
            'Rai Premium': { number: 25, url: 'programmi_stasera_raipremium.html' },
            'Cielo': { number: 26, url: 'programmi_stasera_cielo.html' },
            'Twenty Seven': { number: 27, url: 'programmi_stasera_twentyseven.html' },
            'TV2000': { number: 28, url: 'programmi_stasera_tv2000.html' },
            'LA7d': { number: 29, url: 'programmi_stasera_la7d.html' },
            'La 5': { number: 30, url: 'programmi_stasera_la5.html' },
            'Real Time': { number: 31, url: 'programmi_stasera_realtime.html' },
            'QVC': { number: 32, url: 'programmi_stasera_qvc.html' },
            'Food Network': { number: 33, url: 'programmi_stasera_food_network.html' },
            'Cine34': { number: 34, url: 'programmi_stasera_cine34.html' },
            'Focus': { number: 35, url: 'programmi_stasera_focustv.html' },
            'RTL 102.5': { number: 36, url: 'programmi_stasera_rtl1025.html' },
            'Warner TV': { number: 37, url: 'programmi_stasera_warnertv.html' },
            'Giallo': { number: 38, url: 'programmi_stasera_giallo.html' },
            'Top Crime': { number: 39, url: 'programmi_stasera_topcrime.html' },
            'Boing': { number: 40, url: 'programmi_stasera_boing.html' },
            'K2': { number: 41, url: 'programmi_stasera_k2.html' },
            'Rai Gulp': { number: 42, url: 'programmi_stasera_raigulp.html' },
            'Rai Yoyo': { number: 43, url: 'programmi_stasera_raiyoyo.html' },
            'Frisbee': { number: 44, url: 'programmi_stasera_frisbee.html' },
            'Cartoonito': { number: 46, url: 'programmi_stasera_cartoonito.html' },
            'Super!': { number: 47, url: 'programmi_stasera_super.html' },
            'Rai News 24': { number: 48, url: 'programmi_stasera_rainews24.html' },
            'Italia 2': { number: 49, url: 'programmi_stasera_italia2.html' },
            'Sky TG24': { number: 50, url: 'programmi_stasera_skytg24.html' },
            'TGCOM 24': { number: 51, url: 'programmi_stasera_tgcom24.html' },
            'DMAX': { number: 52, url: 'programmi_stasera_dmax.html' },
            'Rai Storia': { number: 54, url: 'programmi_stasera_raistoria.html' },
            'Mediaset Extra': { number: 55, url: 'programmi_stasera_mediasetextra.html' },
            'HGTV': { number: 56, url: 'programmi_stasera_hgtv.html' },
            'Rai Scuola': { number: 57, url: 'programmi_stasera_raiscuola.html' },
            'Rai Sport': { number: 58, url: 'programmi_stasera_raisport.html' },
            'Motor Trend': { number: 59, url: 'programmi_stasera_motortrend.html' },
            'Sportitalia': { number: 60, url: 'programmi_stasera_sportitalia.html' }
        };
        this.baseUrl = 'https://www.staseraintv.com/';
    }

    async fetchHtml(url) {
        try {
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.text();
        } catch (error) {
            throw new Error('Errore di rete: ' + error.message);
        }
    }

    parseSchedule(html) {
        const programs = [];
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Look for all text that contains time patterns
        const content = doc.body.textContent;
        const timeRegex = /(\d{2}[:\.]\d{2})\s*[-–]\s*([^(]+?)(?=\d{2}[:\.]\d{2}|\n|$)/g;
        let match;

        while ((match = timeRegex.exec(content)) !== null) {
            const time = match[1].replace('.', ':');
            const title = match[2].trim();
            
            // Skip entries that are just times or empty titles
            if (title && !title.match(/^\d{2}[:\.]\d{2}$/)) {
                programs.push({
                    time: time,
                    title: title
                });
            }
        }

        if (programs.length === 0) {
            throw new Error('Nessun programma trovato');
        }

        // Sort programs by time
        programs.sort((a, b) => {
            const [aHours, aMinutes] = a.time.split(':').map(Number);
            const [bHours, bMinutes] = b.time.split(':').map(Number);
            return (aHours * 60 + aMinutes) - (bHours * 60 + bMinutes);
        });

        return programs;
    }

    findCurrentProgram(programs) {
        if (!programs || programs.length === 0) {
            return { currentProgram: null, nextProgram: null };
        }

        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTimeInMinutes = currentHour * 60 + currentMinute;

        console.log(`Current time: ${currentHour}:${currentMinute} (${currentTimeInMinutes} minutes)`);
        
        // Find the first program that starts after current time
        for (let i = 0; i < programs.length; i++) {
            const program = programs[i];
            const [hours, minutes] = program.time.split(':').map(Number);
            const programTimeInMinutes = hours * 60 + minutes;

            console.log(`Checking program: ${program.time} (${programTimeInMinutes} minutes) - ${program.title}`);

            if (programTimeInMinutes > currentTimeInMinutes) {
                // Found a program that starts after current time
                const currentProg = i > 0 ? programs[i - 1] : programs[programs.length - 1];
                console.log(`Found next program at ${program.time}, current program is ${currentProg.time}`);
                return {
                    currentProgram: currentProg,
                    nextProgram: program
                };
            }
        }

        // If we get here, we're after the last program of the day
        const lastProgram = programs[programs.length - 1];
        const firstProgram = programs[0];
        console.log(`After last program ${lastProgram.time}, next is first program ${firstProgram.time}`);
        return {
            currentProgram: lastProgram,
            nextProgram: firstProgram
        };
    }

    async getCurrentProgram(channel) {
        try {
            // Extract channel number if present (e.g., "[41] K2" -> "41")
            const numberMatch = channel.match(/\[(\d+)\]/);
            const channelNumber = numberMatch ? parseInt(numberMatch[1]) : null;
            
            // Clean channel name by removing number and brackets
            const cleanChannelName = channel.replace(/\[\d+\]/g, '').trim();
            
            let channelKey = null;
            
            // First try to find by channel number
            if (channelNumber) {
                channelKey = Object.keys(this.channelUrls).find(key =>
                    this.channelUrls[key].number === channelNumber
                );
            }
            
            // If not found by number, try by name
            if (!channelKey) {
                channelKey = Object.keys(this.channelUrls).find(key =>
                    cleanChannelName.toLowerCase().includes(key.toLowerCase()) ||
                    key.toLowerCase().includes(cleanChannelName.toLowerCase())
                );
            }
            
            if (!channelKey) {
                const availableChannels = Object.entries(this.channelUrls)
                    .map(([name, data]) => `[${data.number}] ${name}`)
                    .join('\n');
                throw new Error(`Canale non supportato.\nCanali disponibili:\n${availableChannels}`);
            }

            const url = this.baseUrl + this.channelUrls[channelKey].url;
            
            try {
                const html = await this.fetchHtml(url);
                const programs = this.parseSchedule(html);
                const { currentProgram, nextProgram } = this.findCurrentProgram(programs);

                if (!currentProgram) {
                    throw new Error('Programmazione non trovata');
                }

                return {
                    channel,
                    current: {
                        time: currentProgram.time,
                        title: currentProgram.title
                    },
                    next: nextProgram ? {
                        time: nextProgram.time,
                        title: nextProgram.title
                    } : null
                };
            } catch (error) {
                console.error('Error fetching program data:', error);
                throw error;
            }
        } catch (error) {
            throw new Error(`Errore: ${error.message}`);
        }
    }

    getAvailableChannels() {
        return Object.entries(this.channelUrls)
            .map(([name, data]) => `[${data.number}] ${name}`)
            .sort((a, b) => {
                const aNum = parseInt(a.match(/\[(\d+)\]/)[1]);
                const bNum = parseInt(b.match(/\[(\d+)\]/)[1]);
                return aNum - bNum;
            });
    }
}

export default TvGuide;