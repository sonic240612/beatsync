'use client';
import { create } from 'zustand';
export type Lobby = { code: string; phase: string; players: { id: string; name: string }[] };
export const useRoom = create<{ room: Lobby | null; error: string; setRoom: (room: Lobby | null) => void; setError: (error: string) => void }>(set => ({
  room: null, error: '', setRoom: room => set({ room }), setError: error => set({ error }),
}));
