import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useGameStore, GameGrid } from '@/lib/store';
import { Loader2, Pencil, Eraser, Undo, Gauge, Clock } from 'lucide-react';
import SudokuGrid from './SudokuGrid';
import Leaderboard from './Leaderboard';
import { ThemeToggle } from './ThemeToggle';

function getConflictingCells(grid: GameGrid, r: number, c: number, n: number): {r: number, c: number}[] {
   const conflicts = new Map<string, {r: number, c: number}>();
   const addConflict = (cr: number, cc: number) => conflicts.set(`${cr}-${cc}`, {r: cr, c: cc});

   for (let i = 0; i < 9; i++) {
      if (grid[r][i].value === n && !grid[r][i].isError) addConflict(r, i);
      if (grid[i][c].value === n && !grid[i][c].isError) addConflict(i, c);
   }
   const startR = Math.floor(r / 3) * 3;
   const startC = Math.floor(c / 3) * 3;
   for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
         const br = startR + i;
         const bc = startC + j;
         if (grid[br][bc].value === n && !grid[br][bc].isError) addConflict(br, bc);
      }
   }
   return Array.from(conflicts.values());
}

export default function Game() {
  const { room, localPlayer, initGame, updateCell, setPlayers, grid, solution, inputMode, setInputMode, toggleNote, clearNotes, setNotes, pushHistory, popHistory } = useGameStore();
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState<{ r: number, c: number } | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [conflictCells, setConflictCells] = useState<{r: number, c: number}[]>([]);

  useEffect(() => {
    if (!room?.start_time || localPlayer?.finish_time) return;
    const st = new Date(room.start_time).getTime();
    const update = () => {
       setElapsedSeconds(Math.floor((Date.now() - st) / 1000));
    };
    update();
    const int = setInterval(update, 1000);
    return () => clearInterval(int);
  }, [room?.start_time, localPlayer?.finish_time]);

  let fixedCount = 0;
  if (grid) {
     grid.forEach(row => row.forEach(cell => { if (cell.isFixed) fixedCount++; }));
  }
  let difficulty = 'Unknown';
  if (fixedCount > 0) {
     if (fixedCount >= 38) difficulty = 'Easy';
     else if (fixedCount >= 30) difficulty = 'Medium';
     else if (fixedCount >= 24) difficulty = 'Hard';
     else difficulty = 'Expert';
  }

  const finalSeconds = localPlayer?.finish_time && room?.start_time
     ? Math.floor((new Date(localPlayer.finish_time).getTime() - new Date(room.start_time).getTime()) / 1000)
     : elapsedSeconds;

  const formatTime = (sec: number) => {
     const m = Math.floor(sec / 60).toString().padStart(2, '0');
     const s = (sec % 60).toString().padStart(2, '0');
     return `${m}:${s}`;
  };

  useEffect(() => {
    if (!room || !localPlayer) return;

    let isMounted = true;

    const loadGame = async () => {
      try {
        // 1. Load initial game grids (with retry for eventual consistency)
        let gameData = null;
        for (let i = 0; i < 5; i++) {
          const { data, error } = await supabase
            .from('games')
            .select('*')
            .eq('room_id', room.id)
            .maybeSingle();

          if (data) {
            gameData = data;
            break;
          }
          if (error) {
             console.error(`Attempt ${i+1} failed carefully:`, error);
          }
          await new Promise(res => setTimeout(res, 800)); // wait 800ms
        }

        if (!gameData) {
           console.error("Game data could not be found.");
           if (isMounted) setLoading(false);
           return;
        }

        // Initialize state
        initGame(gameData.initial_grid, gameData.solution_grid);

        // 2. Load existing moves (ONLY for the local player)
        const { data: movesData } = await supabase
          .from('grid_state')
          .select('*')
          .eq('room_id', room.id)
          .eq('player_id', localPlayer.id);

        if (movesData && isMounted) {
          movesData.forEach((move: any) => {
            const isError = gameData.solution_grid[move.row_idx][move.col_idx] !== move.value;
            updateCell(move.row_idx, move.col_idx, move.value, move.player_id, isError);
          });
        }
        
        if (isMounted) setLoading(false);
      } catch (error) {
        console.error('Error loading game:', error);
        if (isMounted) setLoading(false);
      }
    };

    loadGame();

    // 3. Subscribe to Realtime Updates
    const channel = supabase
      .channel(`game:${room.id}`)
      .on(
         'postgres_changes',
         { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${room.id}` },
         async () => {
            const { data } = await supabase.from('players').select('*').eq('room_id', room.id).order('finish_time', { ascending: true });
            if (data && isMounted) setPlayers(data as any);
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
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [room, localPlayer?.id, initGame, updateCell, setPlayers]);

  const handleCellSelect = useCallback((r: number, c: number) => {
    setSelectedCell({ r, c });
  }, []);

  const checkWinCondition = async (lastR: number, lastC: number, lastVal: number) => {
      if (!grid || !solution || !room || !localPlayer) return;
      let isFull = true;
      for (let r=0; r<9; r++) {
         for(let c=0; c<9; c++) {
            const cellVal = (r === lastR && c === lastC) ? lastVal : grid[r][c].value;
            if (cellVal === 0 || cellVal !== solution[r][c]) {
               isFull = false; break;
            }
         }
         if (!isFull) break;
      }
      if (isFull && !localPlayer.finish_time) {
         const finTime = new Date();
         const stTime = room.start_time ? new Date(room.start_time).getTime() : finTime.getTime();
         const timeTakenMs = finTime.getTime() - stTime;
         await supabase.from('players').update({ finish_time: finTime.toISOString(), time_taken: timeTakenMs }).eq('id', localPlayer.id);
      }
  };

  const syncValueToDB = async (r: number, c: number, value: number, isError: boolean) => {
    updateCell(r, c, value, localPlayer?.id, isError);
    if (!room || !localPlayer) return;
    try {
      const { data: existing } = await supabase.from('grid_state').select('id').eq('room_id', room.id).eq('row_idx', r).eq('col_idx', c).maybeSingle();
      if (value === 0) {
         if (existing) await supabase.from('grid_state').delete().eq('id', existing.id);
      } else {
         if (existing) await supabase.from('grid_state').update({ value, player_id: localPlayer.id, updated_at: new Date().toISOString() }).eq('id', existing.id);
         else await supabase.from('grid_state').insert([{ room_id: room.id, row_idx: r, col_idx: c, value, player_id: localPlayer.id }]);
      }
      if (isError) await supabase.rpc('increment_mistakes', { p_id: localPlayer.id });
      else checkWinCondition(r, c, value);
    } catch (e) {
      console.error(e);
    }
  };

  const handleInput = async (value: number) => {
    if (!selectedCell || !grid || !solution || !room || !localPlayer || localPlayer.finish_time) return;
    const { r, c } = selectedCell;
    if (grid[r][c].isFixed) return;
    const prevCell = grid[r][c];

    if (inputMode === 'notes') {
      if (value !== 0) {
        const isAdding = !prevCell.notes.includes(value);
        if (isAdding) {
           const conflicts = getConflictingCells(grid, r, c, value);
           if (conflicts.length > 0) {
              setConflictCells([...conflicts, {r, c}]);
              setTimeout(() => setConflictCells([]), 600);
              return;
           }
        }
        pushHistory({ type: 'note', r, c, prevNotes: [...prevCell.notes] });
        toggleNote(r, c, value);
      } else {
        pushHistory({ type: 'note', r, c, prevNotes: [...prevCell.notes] });
        clearNotes(r, c);
      }
      return;
    }

    pushHistory({ type: 'value', r, c, prevValue: prevCell.value });
    const isError = value !== 0 && solution[r][c] !== value;
    syncValueToDB(r, c, value, isError);
  };

  const handleUndo = () => {
     if (localPlayer?.finish_time || !solution) return;
     const action = popHistory();
     if (!action) return;

     if (action.type === 'note') {
        setNotes(action.r, action.c, action.prevNotes);
     } else {
        const isError = action.prevValue !== 0 && solution[action.r][action.c] !== action.prevValue;
        syncValueToDB(action.r, action.c, action.prevValue, isError);
     }
  };

  useEffect(() => {
     const onKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
           e.preventDefault();
           handleUndo();
           return;
        }

        if (!selectedCell) return;
        const key = e.key;
        if (key >= '1' && key <= '9') {
           const num = parseInt(key, 10);
           handleInput(num);
        } else if (key === 'Backspace' || key === 'Delete') {
           handleInput(0);
        } else if (key === 'ArrowUp') {
           e.preventDefault();
           setSelectedCell(prev => prev && prev.r > 0 ? { r: prev.r - 1, c: prev.c } : prev);
        } else if (key === 'ArrowDown') {
           e.preventDefault();
           setSelectedCell(prev => prev && prev.r < 8 ? { r: prev.r + 1, c: prev.c } : prev);
        } else if (key === 'ArrowLeft') {
           e.preventDefault();
           setSelectedCell(prev => prev && prev.c > 0 ? { r: prev.r, c: prev.c - 1 } : prev);
        } else if (key === 'ArrowRight') {
           e.preventDefault();
           setSelectedCell(prev => prev && prev.c < 8 ? { r: prev.r, c: prev.c + 1 } : prev);
        } else if (key === 'n' || key === 'N') {
           setInputMode(inputMode === 'normal' ? 'notes' : 'normal');
        }
     };

     document.addEventListener('keydown', onKeyDown);
     return () => document.removeEventListener('keydown', onKeyDown);
  }, [selectedCell, handleInput, inputMode, setInputMode, handleUndo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-4 max-w-6xl mx-auto pt-4 lg:pt-8">
      <div className="lg:col-span-2">
         <div className="bg-background border-4 border-border rounded-2xl p-6 flex flex-col items-center">
            {localPlayer?.finish_time && (
               <div className="w-full bg-success/20 border-2 border-success/50 text-success p-4 rounded-xl mb-6 text-center font-bold text-lg">
                  🎉 Puzzle Completed!
               </div>
            )}

            <SudokuGrid selectedCell={selectedCell} onSelectCell={handleCellSelect} conflictCells={conflictCells} />
            <NumberPad onInput={handleInput} onUndo={handleUndo} selectedCell={selectedCell} />
         </div>
      </div>
      <div className="lg:col-span-1 flex flex-col gap-8">
         <div className="w-full flex items-center justify-between bg-background border-4 border-border p-4 rounded-2xl font-bold text-foreground">
            <div className="flex items-center">
               <Gauge className="w-6 h-6 mr-3 text-primary" />
               <span className="text-lg">{difficulty}</span>
            </div>
            <ThemeToggle />
            <div className="flex items-center">
               <Clock className="w-6 h-6 mr-3 text-accent" />
               <span className="tabular-nums tracking-widest text-lg">{formatTime(finalSeconds)}</span>
            </div>
         </div>
         <Leaderboard />
      </div>
    </div>
  );
}

function NumberPad({ onInput, onUndo, selectedCell }: { onInput: (value: number) => void, onUndo: () => void, selectedCell: { r: number, c: number } | null }) {
   const { inputMode, setInputMode, grid } = useGameStore();
   const nums = [1,2,3,4,5,6,7,8,9];

   // Tally valid placements out of 9
   const counts = new Array(10).fill(0);
   if (grid) {
      for(let r=0; r<9; r++) {
         for(let c=0; c<9; c++) {
            const cell = grid[r][c];
            if (cell.value !== 0 && !cell.isError) {
               counts[cell.value]++;
            }
         }
      }
   }

   return (
      <div className="mt-8 flex flex-col items-center max-w-[300px] w-full gap-4">
         <div className="flex bg-input border-2 border-border rounded-xl p-1 w-full gap-2">
            <button
               onClick={() => setInputMode('normal')}
               className={`flex-1 flex items-center justify-center py-2 rounded-lg transition-colors text-sm font-bold ${inputMode === 'normal' ? 'bg-accent text-accent-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
               Normal
            </button>
            <button
               onClick={() => setInputMode('notes')}
               className={`flex-1 flex items-center justify-center py-2 rounded-lg transition-colors text-sm font-bold ${inputMode === 'notes' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
               <Pencil className="w-4 h-4 mr-2" />
               Notes
            </button>
         </div>
         <div className="grid grid-cols-6 gap-2 w-full">
            {nums.map(n => {
               const isCompleted = counts[n] >= 9;
               return (
                  <button
                     key={n}
                     onClick={() => onInput(n)}
                     className={`col-span-2 h-12 rounded-xl font-bold transition-all active:scale-95 border-2 ${isCompleted ? 'opacity-20 pointer-events-none' : ''} ${inputMode === 'notes' ? 'bg-primary/10 hover:bg-primary/20 text-primary border-primary/30' : 'bg-background hover:bg-muted text-foreground border-border'}`}
                  >
                     {n}
                  </button>
               );
            })}
            <button
               onClick={() => onInput(0)}
               className="col-span-3 h-12 bg-background hover:bg-destructive hover:text-destructive-foreground hover:border-destructive text-foreground rounded-xl font-bold transition-colors active:scale-95 border-2 border-border flex items-center justify-center"
            >
               <Eraser className="w-5 h-5" />
            </button>
            <button
               onClick={onUndo}
               className="col-span-3 h-12 bg-background hover:bg-muted text-foreground rounded-xl font-bold transition-colors active:scale-95 border-2 border-border flex items-center justify-center"
            >
               <Undo className="w-5 h-5" />
            </button>
         </div>
      </div>
   );
}
