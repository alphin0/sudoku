import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useGameStore } from '@/lib/store';
import { generateSudoku } from '@/lib/sudoku';
import { Users, Play, Loader2, Crown, LogOut } from 'lucide-react';

export default function RoomWaiting() {
  const { room, localPlayer, players, setPlayers, setRoom, reset } = useGameStore();
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'expert'>('easy');

  const isHost = localPlayer?.is_host;

  // Realtime subscription for players joining
  useEffect(() => {
    if (!room) return;

    const channel = supabase
      .channel(`room:${room.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${room.id}` },
        async () => {
          // Fetch all players again
          const { data } = await supabase
            .from('players')
            .select('*')
            .eq('room_id', room.id)
            .order('joined_at', { ascending: true });
          
          if (data) {
            setPlayers(data as any);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` },
        (payload) => {
          setRoom(payload.new as any);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` },
        () => {
          alert('The host has closed the room.');
          useGameStore.getState().reset();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room, setPlayers, setRoom]);

  const handleStartGame = async () => {
    if (!room || !isHost) return;

    try {
      // 1. Generate puzzle
      const { initialGrid, solutionGrid } = generateSudoku(difficulty);

      // 2. Save game to DB
      const { error: gameError } = await supabase
        .from('games')
        .insert([{
          room_id: room.id,
          initial_grid: initialGrid,
          solution_grid: solutionGrid
        }]);

      if (gameError) throw gameError;

      // 3. Update room status and start_time
      const startTime = new Date().toISOString();
      const { error: roomError } = await supabase
        .from('rooms')
        .update({ status: 'playing', start_time: startTime })
        .eq('id', room.id);

      if (roomError) throw roomError;
      
    } catch (error) {
      console.error('Failed to start game:', error);
      alert('Failed to start the game. Please try again.');
    }
  };

  const handleLeave = async () => {
    const confirmMsg = isHost ? "Close the room and kick everyone out?" : "Are you sure you want to leave the waiting room?";
    if (!window.confirm(confirmMsg)) return;

    try {
       if (isHost && room) {
          await supabase.from('rooms').delete().eq('id', room.id);
       } else if (localPlayer) {
          await supabase.from('players').delete().eq('id', localPlayer.id);
       }
    } catch(e) { console.error(e); }
    
    reset();
  };

  if (!room || !localPlayer) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-xl p-8 rounded-2xl bg-slate-800/50 backdrop-blur-xl border border-slate-700 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-slate-900 border border-slate-600 mb-4">
            <span className="text-slate-400 text-sm mr-2">Room Code:</span>
            <span className="text-xl font-bold tracking-widest text-white">{room.code}</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Waiting for Players</h1>
          <p className="text-slate-400 text-sm">Share the room code with your friends</p>
        </div>

        <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 p-4 mb-8">
          <div className="flex items-center text-slate-300 font-semibold mb-4 px-2">
            <Users className="w-5 h-5 mr-2 text-blue-400" />
            <span>Players ({players.length}/6)</span>
          </div>
          
          <div className="space-y-2">
            {players.map((p) => (
              <div 
                key={p.id} 
                className={`flex items-center justify-between p-3 rounded-lg border ${p.id === localPlayer.id ? 'bg-slate-800 border-slate-600' : 'bg-slate-800/50 border-transparent'} transition-colors`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }}></div>
                  <span className="font-medium text-slate-200">{p.username}</span>
                  {p.id === localPlayer.id && (
                    <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full ml-2">You</span>
                  )}
                </div>
                {p.is_host && <Crown className="w-5 h-5 text-yellow-500" />}
              </div>
            ))}
            
            {players.length < 6 && (
              <div className="flex items-center p-3 rounded-lg border border-dashed border-slate-700 text-slate-500">
                <Loader2 className="w-4 h-4 mr-3 animate-spin" />
                <span className="text-sm">Waiting for others to join...</span>
              </div>
            )}
          </div>
        </div>

        {isHost ? (
          <div className="space-y-4 w-full">
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
              <label className="block text-sm font-medium text-slate-300 mb-2">Select Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full bg-slate-800 border-none text-white text-sm rounded-lg focus:ring-blue-500 block p-2.5 outline-none"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="expert">Expert</option>
              </select>
            </div>
            <button
              onClick={handleStartGame}
              disabled={players.length < 1} // Can play solo or multiplayer
              className="w-full group rounded-xl px-4 py-4 font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <Play className="w-5 h-5" />
              <span>Start Game</span>
            </button>
          </div>
        ) : (
          <div className="text-center p-4 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-300">
            <Loader2 className="w-5 h-5 mr-3 animate-spin text-blue-400" />
            Waiting for host to start...
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-700/50">
           <button
             onClick={handleLeave}
             className="w-full flex items-center justify-center p-3 rounded-lg font-bold transition-all text-slate-400 hover:text-red-400 hover:bg-slate-900 border border-transparent hover:border-red-500/30"
           >
             <LogOut className="w-5 h-5 mr-2" />
             {isHost ? 'Cancel & Close Room' : 'Leave Room'}
           </button>
        </div>
      </div>
    </div>
  );
}
