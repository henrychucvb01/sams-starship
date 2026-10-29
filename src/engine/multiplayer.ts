import type { EquipmentCommand, GameState } from './types';

/** Wire contract. No seeds, authority state or credentials appear in RoomView. */
export type PlayerCount = 2 | 3 | 4 | 5;
export type GameCommand =
  | { type: 'startingInformation'; circuitId: string }
  | { type: 'connect'; ownId: string; targetId: string; number: number }
  | { type: 'solo'; number: number }
  | { type: 'safeRed'; circuitId: string }
  | { type: 'power'; ownId: string; firstId: string; secondId: string; number: number; token: string }
  | { type: 'equipment'; equipmentId: string; command: EquipmentCommand }
  | { type: 'share'; circuitId: string }
  | { type: 'pass' };
export type RoomCommand = GameCommand | { type: 'ready'; ready: boolean } | { type: 'start' } | { type: 'restart' } | { type: 'leave' };
export interface RoomView {
  code: string;
  revision: number;
  playerId: string;
  hostId: string;
  playerCount: PlayerCount;
  status: 'lobby' | 'playing' | 'finished';
  players: { id: string; name: string; character?: string; ready: boolean; connected: boolean; left: boolean }[];
  game: GameState | null;
  expiresAt: number;
}
export interface RoomCredentials { code: string; playerId: string; token: string }
export interface RoomAdmission { credentials: RoomCredentials; room: RoomView }
export interface CommandRequest { revision: number; requestId: string; command: RoomCommand }
