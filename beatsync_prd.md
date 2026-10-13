# [Technical PRD] Spotify-Integrated Multi-Mode Music Party Game: "BeatSync (비트싱크)"

## 1. System Architecture & Core Concept
- **Service Name**: BeatSync (비트싱크)
- **Core Concept**: A real-time multiplayer web game utilizing the Spotify Web API to generate synchronized music quiz sessions. Players can choose between a **Speed Quiz Mode** (Title/Artist matching) and a **Tactical Timeline Mode** (Release year sequencing).
- **Tech Stack**: 
  - *Frontend*: Next.js (React) + Tailwind CSS + Zustand (Real-time state)
  - *Real-time Communication*: Socket.io (WebSocket for multiplayer sync)
  - *Backend*: Node.js (Express) + Spotify Web API SDK

---

## 2. Spotify API Integration & Playlist Scoping

### 2.1. Account Connection & Scoping
- **Auth Flow**: Spotify OAuth 2.0 Authorization Code Flow. Host connects their Spotify Premium account (required for Web Playback SDK music streaming).
- **Scope Configuration**:
  - `user-read-private`, `user-read-email`
  - `streaming`, `user-read-playback-state`, `user-modify-playback-state`
  - `playlist-read-private`, `user-library-read`
- **Range Selection UI**: Host can scope the music pool by:
  1. Specific Public/Private Playlists
  2. Liked Songs (Saved Tracks)
  3. Artist/Genre Top Tracks

---

## 3. Game Mode 1: Title & Artist Speed Quiz Mode

### 3.1. Rules & Flow
- **Goal**: First player to correctly type the title, artist, or both wins the round. Player with the most correct answers at the end wins.
- **Configurable Options**:
  - *Target Scope*: Title only / Artist only / Both Title & Artist
  - *Total Rounds*: e.g., 10, 20, 30 tracks
  - *Audio Snippet Length*: e.g., 15 seconds preview per track

### 3.2. Real-time Multiplayer Logic (Socket.io)
1. **Server**: Randomly selects a track from the scoped Spotify playlist, seeks to a random chorus point, and triggers playback across connected clients.
2. **Client (Player)**: Submits a text answer via the chat/input box.
3. **Server (Fuzzy Matching)**: Compares input using Levenshtein distance algorithm (allowing minor typos).
4. **Scoring**: First exact/fuzzy match triggers a `ROUND_WIN` event, awards 1 point, pauses playback, and shows the full track details before the next round.

---

## 4. Game Mode 2: Release Year Timeline Mode (Tactical Card Game)

### 4.1. Rules & Flow
- **Goal**: Be the first player to successfully collect and correctly order **10 cards** on your timeline.
- **Initial State**: Each player receives **2 starting cards** (displayed with Title, Artist, and Release Year) placed in chronological order on their personal timeline.
- **Turn-based Gameplay**:
  1. On your turn, a random song from the scoped pool is played as a 15-second snippet.
  2. You must guess its release year and **insert it into the correct chronological slot** among your existing cards.
  3. **Evaluation**:
     - *Correct*: The card is successfully locked into your timeline (+1 card towards the 10-card goal).
     - *Incorrect*: The card is discarded, and your turn ends.
  4. First player to reach 10 cards wins.

---

## 5. Production-Ready Backend Architecture (Node.js / Socket.io)

```javascript
// Server-side core event handler for BeatSync
const express = require('express');
const { Server } = require('socket.io');

const io = new Server(server, { cors: { origin: "*" } });

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Mode 1: Speed Quiz Answer Submission
  socket.on('submit_answer', ({ roomId, guess, trackMeta }) => {
    const room = getRoom(roomId);
    const isCorrect = evaluateGuess(guess, trackMeta, room.targetMode); // 'title', 'artist', 'both'
    
    if (isCorrect && !room.roundWon) {
      room.roundWon = true;
      room.scores[socket.id] = (room.scores[socket.id] || 0) + 1;
      
      io.to(roomId).emit('correct_answer', {
        winnerId: socket.id,
        scores: room.scores,
        trackInfo: trackMeta
      });
      
      setTimeout(() => startNextRound(roomId), 4000); // 4s break before next song
    }
  });

  // Mode 2: Timeline Year Insertion Check
  socket.on('submit_timeline_guess', ({ roomId, cardId, targetIndex, guessedYear }) => {
    const room = getRoom(roomId);
    const actualYear = getTrackYear(cardId);
    
    const isCorrect = (guessedYear === actualYear); // Can add a +/- 1 year tolerance if desired
    
    if (isCorrect) {
      room.playerTimelines[socket.id].insertCard(targetIndex, cardId);
      const hasWon = room.playerTimelines[socket.id].length >= 10;
      
      socket.emit('timeline_result', { success: true, hasWon });
      if (hasWon) io.to(roomId).emit('game_over', { winnerId: socket.id });
    } else {
      socket.emit('timeline_result', { success: false, discarded: cardId });
    }
  });
});
```

---

## 6. Non-Functional Requirements (NFR)
- **Audio Synchronization**: Spotify Web Playback SDK ensures all players hear the exact same audio frame (within ~200ms network latency threshold).
- **Fuzzy Matching**: Answers like "BTS" vs "방탄소년단" or minor spacing typos are handled via string similarity checks to prevent frustrating misses.

---
**작성자**: 시모에 코하루 (선생님의 프로페셔널한 비서)
**작성일**: 2026-07-20
