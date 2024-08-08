require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, getVoiceConnection } = require('@discordjs/voice');
const { google } = require('googleapis');
const ytdl = require('@distube/ytdl-core');
const token = process.env.DISCORD_BOT_TOKEN;
const youtubeApiKey = process.env.YOUTUBE_API_KEY;

const youtube = google.youtube({
    version: 'v3',
    auth: youtubeApiKey
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

let queue = [];
let player = null;
let connection = null;

client.once('ready', () => {
    console.log('Pai está on!');
});

// Play a playlist music or just a music
client.on('messageCreate', async (message) => {
    if (message.content.startsWith('!play')) {
        const args = message.content.split(' ');
        const query = args.slice(1).join(' ');

        if (!query) {
            return message.channel.send('Coloque uma URL válida, burro.');
        }

        if (message.member.voice.channel) {
            try {
                let videoUrls = [];

                if (query.includes('list=')) {
                    const playlistId = new URLSearchParams(new URL(query).search).get('list');
                    const response = await youtube.playlistItems.list({
                        part: 'snippet',
                        playlistId,
                        maxResults: 50
                    });

                    videoUrls = response.data.items.map(item => `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`);
                } else {
                    const response = await youtube.search.list({
                        part: 'snippet',
                        q: query,
                        type: 'video',
                        maxResults: 1
                    });

                    const video = response.data.items[0];
                    if (!video) {
                        return message.channel.send('Nenhum vídeo encontrado.');
                    }

                    videoUrls = [`https://www.youtube.com/watch?v=${video.id.videoId}`];
                }

                if (!connection) {
                    connection = joinVoiceChannel({
                        channelId: message.member.voice.channel.id,
                        guildId: message.guild.id,
                        adapterCreator: message.guild.voiceAdapterCreator,
                    });
                }

                if (!player) {
                    player = createAudioPlayer();
                    connection.subscribe(player);
                }

                queue.push(...videoUrls);

                if (queue.length === videoUrls.length) {
                    playNext(message.member.voice.channel, message.channel);
                }
            } catch (error) {
                message.channel.send('Ocorreu um erro ao tentar buscar ou reproduzir a música.');
                console.log('Erro: ', error);
            }
        } else {
            message.channel.send('Você precisa estar em um canal de voz para tocar música, burro.');
        }
    }
});

// Add to queue (fixed to not overriding current song)
client.on('messageCreate', async (message) => {
    if (message.content.startsWith('!add')) {
        const args = message.content.split(' ');
        const query = args.slice(1).join(' ');

        if (!query) {
            return message.channel.send('Informe uma URL válida, burro.');
        }

        if (message.member.voice.channel) {
            try {
                const response = await youtube.search.list({
                    part: 'snippet',
                    q: query,
                    type: 'video',
                    maxResults: 1
                });

                const video = response.data.items[0];
                if (!video) {
                    return message.channel.send('Nenhum vídeo encontrado.');
                }

                const videoUrl = `https://www.youtube.com/watch?v=${video.id.videoId}`;
                queue.push(videoUrl);

                message.channel.send(`🎶 Adicionado à fila: ${video.snippet.title}`);
            } catch (error) {
                message.channel.send('Ocorreu um erro ao tentar buscar ou adicionar à fila.');
                console.log('Erro: ', error);
            }
        } else {
            message.channel.send('Você precisa estar em um canal de voz para adicionar música à fila, burro.');
        }
    }
});

async function playNext(voiceChannel, textChannel) {
    if (queue.length === 0) {
        connection?.destroy();
        connection = null;
        player = null;
        return;
    }

    if (!connection || !player) {
        connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });

        player = createAudioPlayer();
        connection.subscribe(player);
    }

    const url = queue.shift();
    const resource = createAudioResource(ytdl(url, { filter: 'audioonly', quality: 'highestaudio' }));
    player.play(resource);

    player.on(AudioPlayerStatus.Playing, () => {
        console.log(`🎶 Tocando música: ${url}`);
        textChannel.send(`🎶 Tocando música: ${url}`);
    });

    player.on(AudioPlayerStatus.Idle, () => {
        console.log('🚫 Música parou.');
        if (queue.length > 0) {
            playNext(voiceChannel, textChannel);
        } else {
            connection?.destroy();
            connection = null;
            player = null;
        }
    });

    player.on('error', error => {
        console.error('Erro no player:', error);
        connection.destroy();
        connection = null;
        player = null;
        textChannel.send('🚫 Ocorreu um erro e o bot desconectou.');
    });
}

// skip a song
client.on('messageCreate', (message) => {
    if (message.content === '!skip') {
        if (connection && player) {
            player.stop();
            message.channel.send('⏭ Música pulada.');
        } else {
            message.channel.send('Não há música para pular, burro.');
        }
    }
});

// Pause and resume a song
client.on('messageCreate', (message) => {
    if (message.content === '!pause') {
        if (connection && player) {
            if (player.state.status === AudioPlayerStatus.Playing) {
                player.pause();
                message.channel.send('⏸ Música pausada.');
            } else {
                message.channel.send('Não há música tocando para pausar, burro.');
            }
        } else {
            message.channel.send('Não há música para pausar ou não estou em um canal de voz, burro.');
        }
    }

    if (message.content === '!resume') {
        if (connection && player) {
            if (player.state.status === AudioPlayerStatus.Paused) {
                player.unpause();
                message.channel.send('▶ Música retomada.');
            } else {
                message.channel.send('Não há música pausada no momento, burro.');
            }
        } else {
            message.channel.send('Não há música para retomar ou não estou em um canal de voz, burro.');
        }
    }
});

// stop a music
client.on('messageCreate', (message) => {
    if(message.content === '!stop') {
        const connection = getVoiceConnection(message.guild.id);
        if(connection) {
            const player = connection.state.subscription.player;
            player.stop();
            queue.length = 0; // clean queue
            connection.destroy();
            message.channel.send('⏹ Música parada e bot desconectado.');
        } else {
            message.channel.send('Não há música para parar, burro.');
        }
    }
});

client.login(token);
