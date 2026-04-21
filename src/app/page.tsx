"use client";

import { useGameStore } from '@/lib/store';
import Lobby from '@/components/Lobby';
import RoomWaiting from '@/components/RoomWaiting';
import Game from '@/components/Game';

export default function Home() {
  const { room, localPlayer } = useGameStore();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 selection:bg-blue-500/30">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20 pointer-events-none"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto py-8 lg:py-12">
        {!localPlayer || !room ? (
          <Lobby />
        ) : room.status === 'waiting' ? (
          <RoomWaiting />
        ) : (
          <Game />
        )}
      </div>
    </main>
  );
}
