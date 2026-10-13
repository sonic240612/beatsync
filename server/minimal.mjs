import express from 'express';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { Server } from 'socket.io';
import { Game } from './game.js';
import { createTrackProvider } from './preview-provider.js';
import { resolveAudioPreview, fetchSpotifyPlaylist } from './spotify-provider.js';
import { tracks as catalog } from '../shared/tracks.js';

const app = express();
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
const http = createServer(app);
const io = new Server(http, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});
const PORT = Number(process.env.PORT || 3001);
const rooms = new Map();
const dynamicTracksMap = new Map();
const GRACE_MS = Math.max(50, Number(process.env.ROOM_GRACE_MS) || 60000);

app.get('/health', (_req, res) => res.json({ ok: true, provider: 'spotify', rooms: rooms.size }));
app.get('/api/spotify/resolve', async (req, res) => {
  const title = String(req.query.title || '');
  const artist = String(req.query.artist || '');
  if (!title && !artist) return res.status(400).json({ ok: false, error: 'title or artist required' });
  const result = await resolveAudioPreview(title, artist);
  res.json({ ok: !!result, result });
});
app.get('/api/audio/:trackId', async (req, res) => {
  const trackId = req.params.trackId;
  const track = dynamicTracksMap.get(trackId) || catalog.find(t => t.id === trackId);
  if (!track) return res.status(404).send('Track not found');
  if (track.previewUrl) return res.redirect(track.previewUrl);
  try {
    const resolved = await resolveAudioPreview(track.title, track.artist);
    if (resolved?.previewUrl) return res.redirect(resolved.previewUrl);
  } catch {}
  return res.status(404).send('Audio preview not found');
});
app.get('/', (_req, res) => res.type('html').send(`<!doctype html><html lang="ko"><meta charset="utf-8"><title>BeatSync 최소 연결 검증</title><body><h1>BeatSync 데모 연결 검증</h1><p>실제 Spotify 음원을 사용하지 않습니다.</p><input id="name" aria-label="이름" value="플레이어"><button id="create">방 만들기</button><input id="code" aria-label="방 코드"><button id="join">입장</button><pre id="state"></pre><script src="/socket.io/socket.io.js"></script><script>
const socket=io(); const show=(v)=>document.querySelector('#state').textContent=JSON.stringify(v,null,2);
socket.on('room:state',show);
document.querySelector('#create').onclick=()=>socket.emit('room:create',{name:document.querySelector('#name').value},show);
document.querySelector('#join').onclick=()=>socket.emit('room:join',{name:document.querySelector('#name').value,code:document.querySelector('#code').value},show);
</script></body></html>`));

const publicRoom = room => ({
  code: room.code, phase: room.game ? room.game.phase : room.phase, hostId: room.hostId, settings: room.settings,
  players: room.players.map(({ id, name, connected }) => ({ id, name, connected })),
  ...(room.game ? { scores: Object.fromEntries(room.game.scores), roundId: room.game.roundId, turn: room.game.config.mode === 'timeline' ? room.game.currentTurn : undefined, endsAt: room.game.phase === 'playing' ? room.game.roundEndsAt : undefined, preview: room.game.phase === 'playing' ? room.game.current?.preview : undefined, track: room.game.phase !== 'playing' ? room.game.current?.track : undefined, solvers: room.game.roundSolvers, reveal: room.game.phase === 'reveal' ? room.game.lastReveal : undefined, timelines: room.game.config.mode === 'timeline' ? Object.fromEntries([...room.game.timelines].map(([id, cards]) => [id, cards])) : undefined, skipVotes: [...(room.game.skipVotes || [])] } : {}),
});
function emitState(room) {
  const connected = room.players.filter(p => p.connected);
  if (connected.length && !connected.some(p => p.id === room.hostId)) room.hostId = connected[0].id;
  io.to(room.code).emit('room:state', publicRoom(room));
}
function emitToSelf(socket, room) { socket.emit('room:state', publicRoom(room)); }
const readName = data => {
  if (!data || typeof data.name !== 'string') throw Error('이름은 1~20자입니다.');
  const name = data.name.trim();
  if (!name || name.length > 20) throw Error('이름은 1~20자입니다.');
  return name;
};
const readCode = value => String(value ?? '').trim().toUpperCase();
const identity = () => ({ playerId: randomBytes(8).toString('hex'), token: randomBytes(16).toString('hex') });

io.on('connection', (socket) => {
  const guard = (fn) => async (data, ack) => {
    if (typeof ack !== 'function') return;
    try {
      const result = await fn(data);
      ack({ ok: true, ...(result || {}) });
    } catch (error) {
      ack({ ok: false, error: error.message });
    }
  };
  const toAck = (result) => {
    if (result && typeof result === 'object' && 'ok' in result && result.ok === false) return result;
    return { ok: true };
  };
  const enter = (room, player) => {
    socket.data.code = room.code; socket.data.playerId = player.id; player.socketId = socket.id;
    socket.join(room.code); emitState(room);
  };

  socket.on('room:create', guard(data => {
    if (socket.data.code) throw Error('이미 방에 참가했습니다.');
    if (rooms.size >= 100) throw Error('방이 가득 찼습니다.');
    let code; do { code = randomBytes(3).toString('hex').toUpperCase(); } while (rooms.has(code));
    const { playerId, token } = identity();
    const room = { code, phase: 'lobby', hostId: playerId, creatorId: playerId, settings: { mode: 'speed', target: 'both', rounds: 10, targetCards: 10, snippetSeconds: 15, musicSource: data?.musicSource || 'kpop_hits', playlistUrl: '' }, players: [{ id: playerId, name: readName(data), token, connected: true, disconnectedAt: 0, socketId: '' }] };
    rooms.set(code, room);
    enter(room, room.players[0]);
    return { playerId, token, state: publicRoom(room) };
  }));

  socket.on('room:join', guard(data => {
    if (socket.data.code) throw Error('이미 방에 참가했습니다.');
    const room = rooms.get(readCode(data?.code));
    if (!room) throw Error('방을 찾을 수 없습니다.');
    if (room.phase !== 'lobby') throw Error('게임이 시작된 방에는 참가할 수 없습니다.');
    if (room.players.length >= 8) throw Error('방이 가득 찼습니다.');
    const { playerId, token } = identity();
    const player = { id: playerId, name: readName(data), token, connected: true, disconnectedAt: 0, socketId: '' };
    room.players.push(player);
    enter(room, player);
    return { playerId, token, state: publicRoom(room) };
  }));

  socket.on('room:resume', guard(data => {
    if (socket.data.code) throw Error('이미 방에 참가했습니다.');
    const room = rooms.get(readCode(data?.code));
    const player = room?.players.find(p => p.id === data?.playerId);
    if (!player || typeof data?.token !== 'string' || player.token !== data.token) throw Error('재접속 정보가 올바르지 않습니다.');
    player.connected = true; player.disconnectedAt = 0;
    if (room.creatorId === player.id) {
      room.hostId = player.id;
    }
    enter(room, player);
    return { playerId: player.id, token: player.token, state: publicRoom(room) };
  }));

  socket.on('room:leave', guard(() => {
    const room = rooms.get(socket.data.code);
    if (!room) throw Error('방에 참가하지 않았습니다.');
    const playerId = socket.data.playerId;
    socket.leave(room.code);
    socket.data.code = null; socket.data.playerId = null;
    room.players = room.players.filter(p => p.id !== playerId);
    if (!room.players.length) rooms.delete(room.code); else {
      if (room.hostId === playerId) {
        const connected = room.players.filter(p => p.connected);
        room.hostId = connected.length ? connected[0].id : room.players[0].id;
        if (room.creatorId === playerId) {
          room.creatorId = room.hostId;
        }
      }
      if (room.game) {
        room.game.handlePlayerLeave(playerId);
      }
      emitState(room);
    }
    return toAck({});
  }));

  socket.on('room:configure', guard(async data => {
    const room = rooms.get(socket.data.code);
    if (!room) throw Error('방에 참가하지 않았습니다.');
    if (room.hostId !== socket.data.playerId) throw Error('호스트만 설정할 수 있습니다.');
    if (room.phase !== 'lobby') throw Error('게임 중에는 설정을 변경할 수 없습니다.');
    const { mode, target, rounds, targetCards, snippetSeconds, musicSource, playlistUrl, spotifyUserToken, preferredGenres } = data || {};
    if (mode && !['speed', 'timeline'].includes(mode)) throw Error('게임 모드를 확인해주세요.');
    if (target && !['title', 'artist', 'both'].includes(target)) throw Error('정답 유형을 확인해주세요.');
    if (rounds && ![10, 20, 30, 50, 100].includes(rounds)) throw Error('라운드 수는 10, 20, 30, 50, 100 중 하나입니다.');
    if (targetCards !== undefined) {
      const tc = Number(targetCards);
      if (!Number.isInteger(tc) || tc < 8 || tc > 20) throw Error('타임라인 승리 목표 카드 수는 8~20장 사이여야 합니다.');
    }
    if (snippetSeconds && ![5, 15, 30].includes(snippetSeconds)) throw Error('재생 시간은 5, 15, 30초 중 하나입니다.');
    const validSources = ['kpop_hits', 'kpop_retro', 'kpop_all', 'pop_hits', 'jpop_hits', 'pop_all', 'jpop_all', 'spotify_random', 'spotify_playlist'];
    if (musicSource && !validSources.includes(musicSource)) throw Error('음악 소스를 확인해주세요.');

    if (playlistUrl !== undefined) {
      const trimmedUrl = String(playlistUrl).trim();
      if (trimmedUrl) {
        if (trimmedUrl !== room.settings.playlistUrl || !room.customTracks?.length) {
          const tokenToUse = spotifyUserToken || room.settings.spotifyUserToken;
          const tracks = await fetchSpotifyPlaylist(trimmedUrl, undefined, undefined, tokenToUse);
          if (!tracks || tracks.length === 0) {
            throw Error('Spotify 플레이리스트에서 곡을 찾을 수 없습니다.');
          }
          room.customTracks = tracks;
        }
      } else {
        room.customTracks = null;
      }
    }

    room.settings = {
      ...room.settings,
      ...(mode ? { mode } : {}),
      ...(target ? { target } : {}),
      ...(rounds ? { rounds } : {}),
      ...(targetCards !== undefined ? { targetCards: Number(targetCards) } : {}),
      ...(snippetSeconds ? { snippetSeconds } : {}),
      ...(musicSource ? { musicSource } : {}),
      ...(playlistUrl !== undefined ? { playlistUrl: String(playlistUrl).trim() } : {}),
      ...(spotifyUserToken !== undefined ? { spotifyUserToken } : {}),
      ...(preferredGenres !== undefined ? { preferredGenres } : {}),
    };
    emitState(room);
    return toAck({ state: publicRoom(room) });
  }));

  const requirePlayer = () => {
    const room = rooms.get(socket.data.code);
    if (!room) throw Error('방에 참가하지 않았습니다.');
    return room;
  };
  socket.on('game:start', guard(async () => {
    const room = rooms.get(socket.data.code);
    if (!room) throw Error('방에 참가하지 않았습니다.');
    if (room.hostId !== socket.data.playerId) throw Error('호스트만 시작할 수 있습니다.');
    if (room.phase !== 'lobby') throw Error('이미 진행 중입니다.');
    if (room.players.filter(p => p.connected).length < 1) throw Error('플레이어가 최소 1명 이상 필요합니다.');

    const source = room.settings.musicSource || 'kpop_hits';
    if (source === 'spotify_playlist') {
      if (room.settings.playlistUrl) {
        try {
          const freshTracks = await fetchSpotifyPlaylist(room.settings.playlistUrl, undefined, undefined, room.settings.spotifyUserToken);
          if (freshTracks && freshTracks.length > 0) {
            room.customTracks = freshTracks;
          }
        } catch (e) {
          if (!room.customTracks || room.customTracks.length === 0) {
            throw Error('Spotify 플레이리스트를 불러올 수 없습니다. 공개 플레이리스트 URL인지 확인해주세요.');
          }
        }
      } else {
        throw Error('Spotify 플레이리스트 URL을 입력하고 [적용] 버튼을 눌러주세요.');
      }
    }

    const provider = createTrackProvider(`http://127.0.0.1:${PORT}`, {
      musicSource: source,
      playlistUrl: room.settings.playlistUrl,
      customTracks: source === 'spotify_playlist' ? room.customTracks : null,
      userToken: room.settings.spotifyUserToken,
      preferredGenres: room.settings.preferredGenres,
    });
    const tracks = await provider.listTracks();
    for (const t of tracks) {
      if (t?.id) dynamicTracksMap.set(t.id, t);
    }
    const syncProvider = {
      name: provider.name,
      listTracks: () => [...tracks],
      getPreview: (t, s) => provider.getPreview(t, s),
    };

    const revealMs = process.env.REVEAL_MS
      ? Number(process.env.REVEAL_MS)
      : (room.settings.mode === 'speed' ? 60000 : 0);

    room.game = new Game({
      get players() { return room.players; },
      emit: (event, payload) => {
        if (event === 'game:over') { room.phase = 'finished'; io.to(room.code).emit(event, payload); emitState(room); return; }
        io.to(room.code).emit(event, payload);
      }
    }, { config: { ...room.settings }, revealMs, provider: syncProvider });
    room.phase = 'playing';
    room.game.start();
    emitState(room);
    return {};
  }));

  socket.on('game:answer', guard(data => {
    const room = requirePlayer();
    if (!room.game) throw Error('진행 중인 게임이 없습니다.');
    const result = room.game.answer(socket.data.playerId, data || {});
    if (!result.ok) return result;
    emitState(room);
    return toAck({});
  }));
  socket.on('game:insert', guard(data => {
    const room = requirePlayer();
    if (!room.game) throw Error('진행 중인 게임이 없습니다.');
    const result = room.game.insert(socket.data.playerId, data || {});
    if (!result.ok && !result.discarded) return result;
    emitState(room);
    return toAck(result);
  }));
  socket.on('game:next', guard((data) => {
    const room = requirePlayer();
    if (!room.game) throw Error('진행 중인 게임이 없습니다.');
    const isHost = room.hostId === socket.data.playerId;
    if (data?.force && !isHost) throw Error('호스트만 강제 넘기기를 사용할 수 있습니다.');
    const force = Boolean(data?.force && isHost);
    if (force) {
      const hostPlayer = room.players.find(p => p.id === socket.data.playerId);
      const hostName = hostPlayer?.name || '호스트';
      io.to(room.code).emit('round:force_skip', { hostId: socket.data.playerId, hostName });
    }
    const result = room.game.skip(socket.data.playerId, force);
    emitState(room);
    return toAck(result);
  }));
  socket.on('game:reset', guard(() => {
    const room = rooms.get(socket.data.code);
    if (!room) throw Error('방에 참가하지 않았습니다.');
    if (room.hostId !== socket.data.playerId) throw Error('호스트만 초기화할 수 있습니다.');
    if (room.phase !== 'finished') throw Error('게임이 아직 끝나지 않았습니다.');
    room.game?.stop();
    room.game = null; room.phase = 'lobby';
    emitState(room);
    return toAck({});
  }));

  socket.on('disconnect', () => {
    const room = rooms.get(socket.data.code);
    const player = room?.players.find(p => p.id === socket.data.playerId);
    if (!player || player.socketId !== socket.id) return;
    player.connected = false; player.disconnectedAt = Date.now();
    if (room.game) {
      room.game.handlePlayerDisconnect(player.id);
    }
    emitState(room);
  });
});

setInterval(() => {
  const now = Date.now();
  for (const room of [...rooms.values()]) {
    const before = room.players.length;
    room.players = room.players.filter(p => p.connected || now - p.disconnectedAt < GRACE_MS);
    if (!room.players.length) rooms.delete(room.code);
    else if (room.players.length !== before) {
      if (room.game) {
        room.game.checkSkipVotes();
      }
      if (!room.players.some(p => p.id === room.hostId)) {
        const connected = room.players.filter(p => p.connected);
        room.hostId = connected.length ? connected[0].id : room.players[0].id;
      }
      if (!room.players.some(p => p.id === room.creatorId)) {
        room.creatorId = room.hostId;
      }
      emitState(room);
    }
  }
}, Math.max(50, Math.min(GRACE_MS / 2, 500))).unref();

const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || '127.0.0.1';
http.listen(port, host, () => console.log(`BeatSync minimal running on http://${host}:${port}`));
