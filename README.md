# Discord Music Bot !!!!!

## Overview

This discord bot plays, adds, skips, pauses, resumes, and stops music in a Discord voice channel. It uses the YouTube API to fetch video URLs and `@discordjs/voice` for audio handling.

## Requirements

- Node.js
- Node.js 
- `discord.js` library 
- -`@discordjs/voice` library
- `googleapis` library
- `@distube/ytdl-core` library
- Environment variables: `DISCORD_BOT_TOKEN`, `YOUTUBE_API_KEY`

## Setup

1. **Clone the respository**

``` bash
git clone https://github.com/Nanashii76/youBot
```

2. **Install the dependences**

``` bash
npm install
```

3. **Create a .env int the root directory**

```plaintext
DISCORD_BOT_TOKEN=your-discord-bot-token 
YOUTUBE_API_KEY=your-youtube-api-key
```

4. **Run the bot**

``` bash
node index.js
```
## Commands

- **`!play <URL or search query>`**: Play a song or playlist.
- **`!add <URL or search query>`**: Add a song to the queue.
- **`!skip`**: Skip the current song.
- **`!pause`**: Pause the current song.
- **`!resume`**: Resume a paused song.
- **`!stop`**: Stop the current song and clear the queue.
