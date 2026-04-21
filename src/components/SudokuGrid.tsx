import React, { useMemo } from 'react';
import { useGameStore, CellState } from '@/lib/store';

interface SudokuGridProps {
  selectedCell: { r: number, c: number } | null;
  onSelectCell: (r: number, c: number) => void;
}

export default function SudokuGrid({ selectedCell, onSelectCell }: SudokuGridProps) {
  const { grid, players, localPlayer } = useGameStore();

  const playerColorMap = useMemo(() => {
    const map = new Map<string, string>();
    players.forEach(p => map.set(p.id, p.color));
    return map;
  }, [players]);

  if (!grid) return null;

  const isSelected = (r: number, c: number) => selectedCell?.r === r && selectedCell?.c === c;
  
  const isHighlighted = (r: number, c: number, value: number) => {
    if (!selectedCell) return false;
    // same row/col/box
    const sameRow = r === selectedCell.r;
    const sameCol = c === selectedCell.c;
    const boxR = Math.floor(r / 3) === Math.floor(selectedCell.r / 3);
    const boxC = Math.floor(c / 3) === Math.floor(selectedCell.c / 3);
    const sameBox = boxR && boxC;
    // same value
    const selectedVal = grid[selectedCell.r][selectedCell.c].value;
    const sameValue = value !== 0 && selectedVal === value;

    return sameRow || sameCol || sameBox || sameValue;
  };

  return (
    <div className="w-full max-w-[450px] aspect-square bg-slate-700 border-4 border-slate-700 shadow-xl overflow-hidden rounded-md relative select-none">
      <div className="absolute inset-0 grid grid-cols-9 grid-rows-9">
        {grid.map((row, r) => 
          row.map((cell, c) => {
            const selected = isSelected(r, c);
            const highlighted = isHighlighted(r, c, cell.value);
            
            // Background color logic
            let bgClass = "bg-slate-900";
            if (selected) {
              bgClass = "bg-blue-600/60 transition-none";
            } else if (highlighted) {
               // lighter bg for highlighted areas
               bgClass = "bg-slate-800 transition-colors";
            }

            // Cell background color from other players
            let customBg = {};
            if (cell.playerId && cell.playerId !== localPlayer?.id && cell.value !== 0) {
               const pColor = playerColorMap.get(cell.playerId);
               if (pColor) {
                  // Add a very subtle tint to the cell
                  customBg = { backgroundColor: `${pColor}20`, boxShadow: `inset 0 0 10px ${pColor}40` };
               }
            }

            // Text color logic
            let textClass = "text-white";
            if (cell.isFixed) {
               textClass = "text-slate-300 font-medium";
            } else if (cell.isError) {
               textClass = "text-red-500 font-bold drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]";
            } else if (cell.playerId === localPlayer?.id) {
               textClass = "text-blue-300 font-bold drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]";
            }

            // Borders for 3x3 grids
            const borderR = c % 3 === 2 && c !== 8 ? 'border-r-2 border-r-slate-600 ' : 'border-r border-r-slate-800/50 ';
            const borderB = r % 3 === 2 && r !== 8 ? 'border-b-2 border-b-slate-600 ' : 'border-b border-b-slate-800/50 ';

            return (
              <div 
                key={`${r}-${c}`}
                onClick={() => onSelectCell(r, c)}
                style={customBg}
                className={`
                  flex items-center justify-center cursor-pointer relative
                  ${bgClass} ${borderR} ${borderB} 
                  hover:bg-slate-700/80 transition-colors duration-100 ease-in-out
                `}
              >
                {cell.value !== 0 ? (
                   <span className={`text-xl sm:text-2xl ${textClass}`}>{cell.value}</span>
                ) : (
                   cell.notes && cell.notes.length > 0 && (
                      <div className="grid grid-cols-3 grid-rows-3 w-full h-full p-0.5">
                         {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                            <div key={n} className="flex items-center justify-center text-[10px] sm:text-xs text-slate-400 font-medium leading-none">
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
