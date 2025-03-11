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
            'Rai1': { number: 1, url: 'programmi_stasera_rai1.html' },
            'Rai2': { number: 2, url: 'programmi_stasera_rai2.html' },
            'Rai3': { number: 3, url: 'programmi_stasera_rai3.html' },
            'Rete4': { number: 4, url: 'programmi_stasera_rete4.html' },
            'Canale5': { number: 5, url: 'programmi_stasera_canale5.html' },
            'Italia 1': { number: 6, url: 'programmi_stasera_italia1.html' },
            'La7': { number: 7, url: 'programmi_stasera_la7.html' },
            'TV8': { number: 8, url: 'programmi_stasera_tv8.html' },
            'NOVE': { number: 9, url: 'programmi_stasera_nove.html' },
            'Canale 20 Mediaset': { number: 20, url: 'programmi_stasera_canale20mediaset.html' },
            'Rai4': { number: 21, url: 'programmi_stasera_rai4.html' },
            'Iris': { number: 22, url: 'programmi_stasera_iris.html' },
            'Rai5': { number: 23, url: 'programmi_stasera_rai5.html' },
            'Rai Movie': { number: 24, url: 'programmi_stasera_raimovie.html' },
            'Rai Premium': { number: 25, url: 'programmi_stasera_rai_premium.html' },
            'Cielo': { number: 26, url: 'programmi_stasera_cielo.html' },
            'TwentySeven': { number: 27, url: 'programmi_stasera_twentyseven.html' },
            'TV2000': { number: 28, url: 'programmi_stasera_tv2000.html' },
            'La7d': { number: 29, url: 'programmi_stasera_la7d.html' },
            'La5': { number: 30, url: 'programmi_stasera_la5.html' },
            'Real Time': { number: 31, url: 'programmi_stasera_realtime.html' },
            'Food Network': { number: 33, url: 'programmi_stasera_food_network.html' },
            'Cine 34': { number: 34, url: 'programmi_stasera_cine34.html' },
            'Focus TV': { number: 35, url: 'programmi_stasera_focustv.html' },
            'Warner TV': { number: 37, url: 'programmi_stasera_warner_tv.html' },
            'GialloTV': { number: 38, url: 'programmi_stasera_giallotv.html' },
            'TopCrime': { number: 39, url: 'programmi_stasera_topcrime.html' },
            'Boing': { number: 40, url: 'programmi_stasera_boing.html' },
            'K2': { number: 41, url: 'programmi_stasera_k2.html' },
            'Rai Gulp': { number: 42, url: 'programmi_stasera_rai_gulp.html' },
            'Rai YoYo': { number: 43, url: 'programmi_stasera_rai_yoyo.html' },
            'Frisbee': { number: 44, url: 'programmi_stasera_frisbee.html' },
            'Cartoonito': { number: 46, url: 'programmi_stasera_cartoonito.html' },
            'Super!': { number: 47, url: 'programmi_stasera_super.html' },
            'Italia 2': { number: 49, url: 'programmi_stasera_italia2.html' },
            'DMAX': { number: 52, url: 'programmi_stasera_dmax.html' },
            'Rai Storia': { number: 54, url: 'programmi_stasera_rai_storia.html' },
            'Mediaset Extra': { number: 55, url: 'programmi_stasera_mediaset_extra.html' },
            'HGTV': { number: 56, url: 'programmi_stasera_hgtv.html' },
            'Rai Scuola': { number: 57, url: 'programmi_stasera_rai_scuola.html' },
            'Rai Sport +HD': { number: 58, url: 'programmi_stasera_rai_sport_hd.html' },
            'Motor Trend Italia': { number: 59, url: 'programmi_stasera_motor_trend.html' },
            'SportItalia': { number: 60, url: 'programmi_stasera_sportitalia.html' },
            'Euro Sport': { number: 61, url: 'programmi_stasera_euro_sport.html' },
            'Italia7 Gold': { number: 62, url: 'programmi_stasera_italia7_gold.html' },
            'DonnaTV': { number: 63, url: 'programmi_stasera_donnatv.html' },
            'Travel TV': { number: 64, url: 'programmi_stasera_travel_tv.html' },
            'DEAKIDS': { number: 65, url: 'programmi_stasera_deakids.html' },
            'Discovery Channel': { number: 66, url: 'programmi_stasera_discovery_channel.html' },
            'TeleCampione Svizzera Italiana': { number: 67, url: 'programmi_stasera_telecampione.html' },
            'La1 RSI': { number: 68, url: 'programmi_stasera_la1.html' },
            'La2 RSI': { number: 69, url: 'programmi_stasera_la2.html' },
            'SuperTennis': { number: 70, url: 'programmi_stasera_supertennis.html' },
            'Telereporter': { number: 71, url: 'programmi_stasera_telereporter.html' },
            'ALMATV': { number: 72, url: 'programmi_stasera_almatv.html' }
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