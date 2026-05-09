import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useGameStore } from '@/lib/store';
import { generateSudoku } from '@/lib/sudoku';
import { Users, Play, Loader2, Crown, LogOut, Copy, Check } from 'lucide-react';

export default function RoomWaiting() {
  const { room, localPlayer, players, setPlayers, setRoom, reset } = useGameStore();
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'expert'>('easy');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!room) return;
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

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
      <div className="w-full max-w-xl p-8 rounded-2xl bg-background border-4 border-border shadow-none">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center pl-4 pr-2 py-2 rounded-xl bg-input border-2 border-border mb-4">
            <span className="text-muted-foreground text-sm font-bold mr-2">Room Code:</span>
            <span className="text-xl font-bold tracking-widest text-foreground mr-3">{room.code}</span>
            <button 
              onClick={handleCopy}
              className="p-1.5 rounded-lg hover:bg-background transition-colors active:scale-95 text-muted-foreground hover:text-foreground border border-transparent hover:border-border"
              title="Copy Room Code"
            >
              {copied ? <Check className="w-5 h-5 text-success" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Waiting for Players</h1>
          <p className="text-muted-foreground text-sm font-bold">Share the room code with your friends</p>
        </div>

        <div className="bg-background rounded-xl border-4 border-border p-4 mb-8">
          <div className="flex items-center text-foreground font-bold mb-4 px-2">
            <Users className="w-5 h-5 mr-2 text-accent" />
            <span>Players ({players.length}/6)</span>
          </div>
          
          <div className="space-y-3">
            {players.map((p) => (
              <div 
                key={p.id} 
                className={`flex items-center justify-between p-3 rounded-xl border-2 ${p.id === localPlayer.id ? 'bg-primary/10 border-primary' : 'bg-input border-border'} transition-colors`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 rounded-full border-2 border-border" style={{ backgroundColor: p.color }}></div>
                  <span className="font-bold text-foreground">{p.username}</span>
                  {p.id === localPlayer.id && (
                    <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-md ml-2 font-bold">You</span>
                  )}
                </div>
                {p.is_host && <Crown className="w-5 h-5 text-primary" />}
              </div>
            ))}
            
            {players.length < 6 && (
              <div className="flex items-center p-3 rounded-xl border-2 border-dashed border-border text-muted-foreground font-bold">
                <Loader2 className="w-5 h-5 mr-3 animate-spin text-accent" />
                <span className="text-sm">Waiting for others to join...</span>
              </div>
            )}
          </div>
        </div>

        {isHost ? (
          <div className="space-y-4 w-full">
            <div className="bg-input p-4 rounded-xl border-2 border-border">
              <label className="block text-sm font-bold text-foreground mb-2">Select Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full bg-background border-2 border-border text-foreground font-bold text-sm rounded-xl focus:ring-2 focus:ring-accent block p-3 outline-none"
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
              className="w-full group rounded-xl px-4 py-4 font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all border-4 border-primary disabled:opacity-50 flex items-center justify-center space-x-2 active:scale-95"
            >
              <Play className="w-6 h-6 fill-primary-foreground" />
              <span className="text-lg">Start Game</span>
            </button>
          </div>
        ) : (
          <div className="text-center p-4 rounded-xl bg-input border-2 border-border flex items-center justify-center text-foreground font-bold">
            <Loader2 className="w-5 h-5 mr-3 animate-spin text-accent" />
            Waiting for host to start...
          </div>
        )}

        <div className="mt-8 pt-6 border-t-2 border-border">
           <button
             onClick={handleLeave}
             className="w-full flex items-center justify-center p-3 rounded-xl font-bold transition-all text-destructive hover:bg-destructive/10 border-2 border-transparent hover:border-destructive active:scale-95"
           >
             <LogOut className="w-5 h-5 mr-2" />
             {isHost ? 'Cancel & Close Room' : 'Leave Room'}
           </button>
        </div>
      </div>
    </div>
  );
}
