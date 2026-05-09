import React, { useMemo } from 'react';
import { useGameStore, CellState } from '@/lib/store';

interface SudokuGridProps {
  selectedCell: { r: number, c: number } | null;
  onSelectCell: (r: number, c: number) => void;
  conflictCells?: { r: number, c: number }[];
}

export default function SudokuGrid({ selectedCell, onSelectCell, conflictCells = [] }: SudokuGridProps) {
  const { grid, players, localPlayer } = useGameStore();

  const playerColorMap = useMemo(() => {
    const map = new Map<string, string>();
    players.forEach(p => map.set(p.id, p.color));
    return map;
  }, [players]);

  if (!grid) return null;

  const isSelected = (r: number, c: number) => selectedCell?.r === r && selectedCell?.c === c;
  
  return (
    <div className="w-full max-w-[450px] aspect-square bg-border border-4 border-border overflow-hidden rounded-xl relative select-none">
      <div className="absolute inset-0 grid grid-cols-9 grid-rows-9">
        {grid.map((row, r) => 
          row.map((cell, c) => {
            const selected = isSelected(r, c);
            
            let isSameValue = false;
            let isRelated = false;
            if (selectedCell) {
               const sameRow = r === selectedCell.r;
               const sameCol = c === selectedCell.c;
               const sameBox = Math.floor(r / 3) === Math.floor(selectedCell.r / 3) && Math.floor(c / 3) === Math.floor(selectedCell.c / 3);
               isRelated = sameRow || sameCol || sameBox;

               const selectedVal = grid[selectedCell.r][selectedCell.c].value;
               isSameValue = cell.value !== 0 && selectedVal === cell.value;
            }
            
            const conflict = conflictCells.some(cc => cc.r === r && cc.c === c);
            
            // Background color logic
            let bgClass = "bg-background";
            if (conflict) {
              bgClass = "bg-destructive/40 transition-colors animate-pulse";
            } else if (selected) {
              bgClass = "bg-primary/40 transition-none";
            } else if (isSameValue) {
               bgClass = "bg-primary/20 transition-colors";
            } else if (isRelated) {
               bgClass = "bg-muted transition-colors";
            }

            // Cell background color from other players
            let customBg = {};
            if (cell.playerId && cell.playerId !== localPlayer?.id && cell.value !== 0) {
               const pColor = playerColorMap.get(cell.playerId);
               if (pColor) {
                  customBg = { backgroundColor: `${pColor}20` }; // subtle flat tint
               }
            }

            // Text color logic
            let textClass = "text-foreground font-bold";
            if (cell.isFixed) {
               textClass = "text-foreground font-medium";
            } else if (cell.isError) {
               textClass = "text-destructive font-bold";
            } else if (cell.playerId === localPlayer?.id) {
               textClass = "text-accent font-bold";
            } else {
               textClass = "text-foreground font-bold";
               // If it's another player's cell, maybe use their color? Let's leave it foreground but bg has tint.
            }

            // Borders for 3x3 grids
            const borderR = c % 3 === 2 && c !== 8 ? 'border-r-2 border-r-border ' : 'border-r border-r-border/50 ';
            const borderB = r % 3 === 2 && r !== 8 ? 'border-b-2 border-border ' : 'border-b border-b-border/50 ';

            return (
              <div 
                key={`${r}-${c}`}
                onClick={() => onSelectCell(r, c)}
                style={customBg}
                className={`
                  flex items-center justify-center cursor-pointer relative
                  ${bgClass} ${borderR} ${borderB} 
                  hover:bg-muted/80 transition-colors duration-100 ease-in-out
                `}
              >
                {cell.value !== 0 ? (
                   <span className={`text-2xl sm:text-3xl ${textClass}`}>{cell.value}</span>
                ) : (
                   cell.notes && cell.notes.length > 0 && (
                      <div className="grid grid-cols-3 grid-rows-3 w-full h-full p-0.5">
                         {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                            <div key={n} className="flex items-center justify-center text-[10px] sm:text-xs text-muted-foreground font-bold leading-none">
                               {cell.notes.includes(n) ? n : ''}
                            </div>
                         ))}
                      </div>
                   )
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
