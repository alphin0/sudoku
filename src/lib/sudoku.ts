import { getSudoku } from 'sudoku-gen';

export type Grid = number[][];

export function generateSudoku(difficulty: 'easy' | 'medium' | 'hard' | 'expert' = 'easy'): { initialGrid: Grid; solutionGrid: Grid } {
  const sudoku = getSudoku(difficulty);
  const puzzle = sudoku.puzzle;
  const solution = sudoku.solution;

  const initialGrid: Grid = Array.from({ length: 9 }, () => Array(9).fill(0));
  const solutionGrid: Grid = Array.from({ length: 9 }, () => Array(9).fill(0));

  for (let i = 0; i < 81; i++) {
    const row = Math.floor(i / 9);
    const col = i % 9;
    initialGrid[row][col] = puzzle[i] === '-' ? 0 : parseInt(puzzle[i], 10);
    solutionGrid[row][col] = parseInt(solution[i], 10);
  }

  return { initialGrid, solutionGrid };
}
