import React from 'react';
import { supabase } from '@/lib/supabase';
import { useGameStore } from '@/lib/store';
import { Trophy, Clock, XCircle, LogOut } from 'lucide-react';

export default function Leaderboard() {
  const { players, localPlayer, room, reset } = useGameStore();

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isHost = localPlayer?.is_host;

  const handleLeave = async () => {
    const confirmMsg = isHost ? "Close the room and kick everyone out?" : "Are you sure you want to leave the game?";
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

  return (
    <div className="bg-background border-4 border-border rounded-2xl overflow-hidden shadow-none flex flex-col h-full">
      <div className="p-4 border-b-4 border-border bg-input">
         <h2 className="text-xl font-bold text-foreground flex items-center">
            <Trophy className="w-5 h-5 mr-2 text-primary" />
            Live Leaderboard
         </h2>
      </div>
      <div className="p-4 space-y-3 flex-1 overflow-y-auto">
         {players.map((p, index) => {
            const isMe = p.id === localPlayer?.id;
            return (
               <div key={p.id} className={`p-4 rounded-xl flex items-center justify-between border-2 ${isMe ? 'bg-primary/10 border-primary' : 'bg-background border-border'}`}>
                  <div className="flex items-center space-x-3 w-1/2">
                     <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border-2 border-border shadow-sm" style={{ backgroundColor: p.color, color: '#fff' }}>
                        {p.username.charAt(0).toUpperCase()}
                     </div>
                     <div className="flex flex-col overflow-hidden">
                        <span className="font-semibold text-foreground truncate">
                           {p.username}
                           {isMe && <span className="text-xs ml-2 text-accent font-bold border border-accent/30 px-1.5 py-0.5 rounded-md">You</span>}
                        </span>
                        
                        {p.finish_time ? (
                           <span className="text-success text-xs font-bold leading-none mt-1 animate-pulse">FINISHED!</span>
                        ) : (
                           <span className="text-muted-foreground text-xs font-bold leading-none mt-1">Playing...</span>
                        )}
                     </div>
                  </div>

                  <div className="flex items-center space-x-4 w-1/2 justify-end">
                     <div className="flex flex-col items-center">
                        <XCircle className="w-4 h-4 text-destructive mb-0.5" />
                        <span className="text-xs text-muted-foreground font-bold">{p.mistakes_count}</span>
                     </div>
                     
                     <div className="flex flex-col items-end w-16">
                        <Clock className="w-4 h-4 text-muted-foreground mb-0.5" />
                        <span className={`text-sm font-mono font-bold ${p.finish_time ? 'text-success' : 'text-foreground'}`}>
                           {p.time_taken ? formatTime(p.time_taken) : '--:--'}
                        </span>
                     </div>
                  </div>
               </div>
            )
         })}
      </div>
      <div className="p-4 border-t-4 border-border bg-input">
         <button
            onClick={handleLeave}
            className={`w-full flex items-center justify-center p-3 rounded-xl font-bold transition-all border-2 ${isHost ? 'bg-destructive/10 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground' : 'bg-background text-foreground border-border hover:bg-muted'}`}
         >
            <LogOut className="w-5 h-5 mr-2" />
            {isHost ? 'Close Room' : 'Leave Game'}
         </button>
      </div>
    </div>
  );
}
