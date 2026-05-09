"use client";

import { useGameStore } from '@/lib/store';
import Lobby from '@/components/Lobby';
import RoomWaiting from '@/components/RoomWaiting';
import Game from '@/components/Game';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Home() {
  const { room, localPlayer } = useGameStore();

  return (
    <main className="min-h-screen bg-background text-foreground transition-colors">
      <div className="relative z-10 max-w-7xl mx-auto pt-4 pb-8 lg:pt-8 lg:pb-12">
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
