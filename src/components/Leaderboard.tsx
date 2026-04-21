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

  const isHost = React.useMemo(() => room?.host_id === localPlayer?.id, [room, localPlayer]);

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
    <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
      <div className="p-4 border-b border-slate-700/50 bg-slate-800/80">
         <h2 className="text-xl font-bold text-white flex items-center">
            <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
            Live Leaderboard
         </h2>
      </div>
      <div className="p-2 space-y-2 max-h-[500px] overflow-y-auto">
         {players.map((p, index) => {
            const isMe = p.id === localPlayer?.id;
            return (
               <div key={p.id} className={`p-4 rounded-xl flex items-center justify-between border ${isMe ? 'bg-slate-700/50 border-blue-500/50' : 'bg-slate-900/50 border-slate-700/50'}`}>
                  <div className="flex items-center space-x-3 w-1/2">
                     <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border-2 border-slate-800 shadow-sm" style={{ backgroundColor: p.color, color: '#fff' }}>
                        {p.username.charAt(0).toUpperCase()}
                     </div>
                     <div className="flex flex-col overflow-hidden">
                        <span className="font-semibold text-slate-100 truncate">
                           {p.username}
                           {isMe && <span className="text-xs ml-2 text-blue-400 font-normal border border-blue-400/30 px-1 rounded">You</span>}
                        </span>
                        
                        {p.finish_time ? (
                           <span className="text-emerald-400 text-xs font-bold leading-none mt-1 animate-pulse">FINISHED!</span>
                        ) : (
                           <span className="text-slate-500 text-xs font-medium leading-none mt-1">Playing...</span>
                        )}
                     </div>
                  </div>

                  <div className="flex items-center space-x-4 w-1/2 justify-end">
                     <div className="flex flex-col items-center">
                        <XCircle className="w-4 h-4 text-red-400 mb-0.5" />
                        <span className="text-xs text-slate-400 font-medium">{p.mistakes_count}</span>
                     </div>
                     
                     <div className="flex flex-col items-end w-16">
                        <Clock className="w-4 h-4 text-slate-400 mb-0.5" />
                        <span className={`text-sm font-mono ${p.finish_time ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
                           {p.time_taken ? formatTime(p.time_taken) : '--:--'}
                        </span>
                     </div>
                  </div>
               </div>
            )
         })}
      </div>
      <div className="p-4 border-t border-slate-700/50 bg-slate-800/80">
         <button
            onClick={handleLeave}
            className={`w-full flex items-center justify-center p-3 rounded-lg font-bold transition-all ${isHost ? 'bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/30' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
         >
            <LogOut className="w-5 h-5 mr-2" />
            {isHost ? 'Close Room' : 'Leave Game'}
         </button>
      </div>
    </div>
  );
}
