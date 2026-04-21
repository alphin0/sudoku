import { create } from 'zustand';
import { Grid } from './sudoku';

export type Player = {
  id: string;
  room_id?: string;
  username: string;
  color: string;
  is_host: boolean;
  joined_at?: string;
  finish_time?: string | null;
  time_taken?: number | null;
  mistakes_count: number;
};

export type Room = {
  id: string;
  code: string;
  status: 'waiting' | 'playing' | 'finished';
  start_time: string | null;
};

export type HistoryAction = 
  | { type: 'value'; r: number; c: number; prevValue: number; }
  | { type: 'note'; r: number; c: number; prevNotes: number[]; };

export type CellState = {
  value: number;
  playerId?: string | null;
  isFixed: boolean;
  isError: boolean;
  notes: number[];
};

export type GameGrid = CellState[][];

type GameState = {
  localPlayer: Player | null;
  room: Room | null;
  players: Player[];
  grid: GameGrid | null;
  solution: Grid | null;
  inputMode: 'normal' | 'notes';
  history: HistoryAction[];
  
  setLocalPlayer: (player: Player) => void;
  setRoom: (room: Room) => void;
  setPlayers: (players: Player[]) => void;
  setInputMode: (mode: 'normal' | 'notes') => void;
  initGame: (initial: Grid, solution: Grid) => void;
  updateCell: (row: number, col: number, value: number, playerId?: string | null, isError?: boolean) => void;
  toggleNote: (row: number, col: number, value: number) => void;
  clearNotes: (row: number, col: number) => void;
  setNotes: (row: number, col: number, notes: number[]) => void;
  pushHistory: (action: HistoryAction) => void;
  popHistory: () => HistoryAction | undefined;
  reset: () => void;
};

export const useGameStore = create<GameState>((set) => ({
  localPlayer: null,
  room: null,
  players: [],
  grid: null,
  solution: null,
  inputMode: 'normal',
  history: [],

  setLocalPlayer: (player) => set({ localPlayer: player }),
  setRoom: (room) => set({ room }),
  setPlayers: (players) => set({ players }),
  setInputMode: (mode) => set({ inputMode: mode }),
  
  initGame: (initial, solution) => set(() => {
    const newGrid: GameGrid = Array.from({ length: 9 }, (_, r) =>
      Array.from({ length: 9 }, (_, c) => ({
        value: initial[r][c],
        isFixed: initial[r][c] !== 0,
        isError: false,
        notes: [],
      }))
    );
    return { grid: newGrid, solution };
  }),

  updateCell: (row, col, value, playerId, isError = false) => set((state) => {
    if (!state.grid) return state;
    const newGrid = state.grid.map(r => r.map(c => ({...c, notes: [...c.notes]})));
    newGrid[row][col].value = value;
    newGrid[row][col].playerId = playerId || null;
    newGrid[row][col].isError = isError;
    
    // Clear notes when a value is successfully set
    if (value !== 0) {
      newGrid[row][col].notes = [];
    }
    
    return { grid: newGrid };
  }),

  toggleNote: (row, col, value) => set((state) => {
    if (!state.grid || value === 0) return state;
    const newGrid = state.grid.map(r => r.map(c => ({...c, notes: [...c.notes]})));
    const cell = newGrid[row][col];
    
    if (cell.value !== 0) return state; // Don't add notes to filled cells
    
    if (cell.notes.includes(value)) {
       cell.notes = cell.notes.filter(n => n !== value);
    } else {
       cell.notes.push(value);
       cell.notes.sort();
    }
    
    return { grid: newGrid };
  }),

  clearNotes: (row, col) => set((state) => {
    if (!state.grid) return state;
    const newGrid = state.grid.map(r => r.map(c => ({...c, notes: [...c.notes]})));
    newGrid[row][col].notes = [];
    return { grid: newGrid };
  }),

  setNotes: (row, col, notes) => set((state) => {
    if (!state.grid) return state;
    const newGrid = state.grid.map(r => r.map(c => ({...c, notes: [...c.notes]})));
    newGrid[row][col].notes = [...notes];
    return { grid: newGrid };
  }),

  pushHistory: (action) => set((state) => ({ history: [...state.history, action] })),
  
  popHistory: () => {
    let action: HistoryAction | undefined;
    set((state) => {
      if (state.history.length === 0) return state;
      const newHistory = [...state.history];
      action = newHistory.pop();
      return { history: newHistory };
    });
    return action;
  },

  reset: () => set({ room: null, players: [], grid: null, solution: null, inputMode: 'normal', history: [] }),
}));
