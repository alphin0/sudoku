import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useGameStore, Player, Room } from '@/lib/store';
import { Loader2, Plus, LogIn } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

export default function Lobby() {
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { setLocalPlayer, setRoom, setPlayers } = useGameStore();

  const handleCreateRoom = async () => {
    if (!username.trim() || username.length > 15) {
      setError('Please enter a valid username (1-15 characters).');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      // 1. Create a Room
      const code = Math.random().toString(36).substring(2, 6).toUpperCase();
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .insert([{ code, status: 'waiting' }])
        .select()
        .single();

      if (roomError) throw roomError;

      // 2. Create Host Player
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .insert([{ 
          room_id: roomData.id, 
          username: username.trim(), 
          color, 
          is_host: true 
        }])
        .select()
        .single();

      if (playerError) throw playerError;

      // 3. Update Store
      setRoom(roomData as Room);
      setLocalPlayer(playerData as Player);
      setPlayers([playerData as Player]);
    } catch (err: any) {
      console.error(err);
      setError('Failed to create room. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || username.length > 15) {
      setError('Please enter a valid username (1-15 characters).');
      return;
    }
    if (!roomCode.trim() || roomCode.length !== 4) {
      setError('Please enter a valid 4-character room code.');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      // 1. Find Room
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', roomCode.toUpperCase())
        .single();

      if (roomError || !roomData) throw new Error('Room not found');
      if (roomData.status !== 'waiting') throw new Error('Game already started or finished');

      // Check current players
      const { data: existingPlayers } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', roomData.id);

      if (existingPlayers && existingPlayers.length >= 6) {
         throw new Error('Room is full (max 6 players)');
      }
      
      if (existingPlayers && existingPlayers.find(p => p.username === username.trim())) {
         throw new Error('Username already taken in this room');
      }

      // 2. Create Player
      // Find an unused color
      const usedColors = existingPlayers?.map(p => p.color) || [];
      const availableColors = COLORS.filter(c => !usedColors.includes(c));
      const color = availableColors.length > 0 ? availableColors[0] : COLORS[Math.floor(Math.random() * COLORS.length)];

      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .insert([{ 
          room_id: roomData.id, 
          username: username.trim(), 
          color, 
          is_host: false 
        }])
        .select()
        .single();

      if (playerError) throw playerError;

      // 3. Update Store
      setRoom(roomData as Room);
      setLocalPlayer(playerData as Player);
      if (existingPlayers) {
        setPlayers([...existingPlayers, playerData as Player]);
      } else {
        setPlayers([playerData as Player]);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to join room.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-md p-8 rounded-2xl bg-slate-800/50 backdrop-blur-xl border border-slate-700 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 mb-2">
            Multiplayer Sudoku
          </h1>
          <p className="text-slate-400 text-sm">Real-time synchronized puzzles</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm text-center font-medium">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-slate-300 text-sm font-semibold mb-2">Username</label>
            <input
              type="text"
              placeholder="e.g. SudokuMaster"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
              disabled={isLoading}
            />
          </div>

          <div className="pt-2">
            <button
              onClick={handleCreateRoom}
              disabled={isLoading}
              className="w-full relative group overflow-hidden rounded-xl px-4 py-4 font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <div className="absolute inset-0 w-full h-full bg-white/10 group-hover:bg-transparent transition-colors pointer-events-none" />
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              <span>Create New Room</span>
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-slate-800 text-slate-400">or join existing</span>
            </div>
          </div>

          <form onSubmit={handleJoinRoom} className="space-y-4">
            <div className="flex space-x-3">
              <input
                type="text"
                placeholder="Room Code"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={4}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold tracking-widest uppercase text-center"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !roomCode}
                className="px-6 rounded-xl font-semibold text-white bg-slate-700 hover:bg-slate-600 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
