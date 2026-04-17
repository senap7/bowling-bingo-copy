import { useState, useCallback, useMemo } from 'react';

export interface BingoCell {
  id: string;
  score: string;
  marked: boolean;
}

export interface BingoState {
  grid: BingoCell[][];
  totalScore: number;
  completedLines: string[];
}

// ボウリングスコアのパターン（正式な表記法）
// 1つ目の数字が0のものは除外、重複なし
const BOWLING_SCORES = [
  '1|1', '1|2', '1|3', '1|4', '1|5', '1|6', '1|7', '1|8', '1|9',
  '2|1', '2|2', '2|3', '2|4', '2|5', '2|6', '2|7', '2|8',
  '3|1', '3|2', '3|3', '3|4', '3|5', '3|6', '3|7',
  '4|1', '4|2', '4|3', '4|4', '4|5', '4|6',
  '5|1', '5|2', '5|3', '5|4', '5|5',
  '6|1', '6|2', '6|3', '6|4',
  '7|1', '7|2', '7|3',
  '8|1', '8|2',
  '9|1',
  '1◢', '2◢', '3◢', '4◢', '5◢', '6◢', '7◢', '8◢', '9◢', // スペア表記（◢で2つ目を表記）
];

// 重複チェック関数
const hasDuplicate = (grid: BingoCell[][]): boolean => {
  const scores = new Set<string>();
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const score = grid[row][col].score;
      if (scores.has(score)) {
        return true;
      }
      scores.add(score);
    }
  }
  return false;
};

// ボウリングスコアをシャッフルして5x5グリッドを生成（真ん中はストライク固定、重複なし）
const generateBingoGrid = (): BingoCell[][] => {
  let grid: BingoCell[][] = [];
  let attempts = 0;
  const maxAttempts = 100;
  
  // 重複がないグリッドが生成されるまでリトライ
  do {
    const shuffled = [...BOWLING_SCORES].sort(() => Math.random() - 0.5);
    grid = [];
    
    for (let row = 0; row < 5; row++) {
      grid[row] = [];
      for (let col = 0; col < 5; col++) {
        // 真ん中のマス（3行目3列目）はストライク固定
        if (row === 2 && col === 2) {
          grid[row][col] = {
            id: `${row}-${col}`,
            score: '▶︎◀︎',
            marked: false,
          };
        } else {
          const index = row * 5 + col;
          grid[row][col] = {
            id: `${row}-${col}`,
            score: shuffled[index % shuffled.length],
            marked: false,
          };
        }
      }
    }
    
    attempts++;
  } while (hasDuplicate(grid) && attempts < maxAttempts);
  
  return grid;
};

// 1列揃っているかチェック（縦・横・斜め）
const checkLines = (grid: BingoCell[][]): string[] => {
  const completedLines: string[] = [];
  
  // 横チェック
  for (let row = 0; row < 5; row++) {
    if (grid[row].every(cell => cell.marked)) {
      completedLines.push(`row-${row}`);
    }
  }
  
  // 縦チェック
  for (let col = 0; col < 5; col++) {
    if (grid.every(row => row[col].marked)) {
      completedLines.push(`col-${col}`);
    }
  }
  
  // 斜め（左上から右下）
  if (grid.every((row, i) => row[i].marked)) {
    completedLines.push('diag-lr');
  }
  
  // 斜め（右上から左下）
  if (grid.every((row, i) => row[4 - i].marked)) {
    completedLines.push('diag-rl');
  }
  
  return completedLines;
};

// スコア計算
const calculateScore = (grid: BingoCell[][], completedLines: string[]): number => {
  let score = 0;
  
  // マークされたマスの数
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      if (grid[row][col].marked) {
        score += 1;
      }
    }
  }
  
  // 1列揃うごとに+5点
  score += completedLines.length * 5;
  
  return score;
};

export const useBingoBowling = () => {
  const [grid, setGrid] = useState<BingoCell[][]>(generateBingoGrid());
  const [completedLines, setCompletedLines] = useState<string[]>([]);
  
  const totalScore = useMemo(() => {
    return calculateScore(grid, completedLines);
  }, [grid, completedLines]);
  
  const toggleCell = useCallback((row: number, col: number) => {
    setGrid(prevGrid => {
      const newGrid = prevGrid.map(r => [...r]);
      newGrid[row][col].marked = !newGrid[row][col].marked;
      
      // 新しい完成ラインをチェック
      const newCompletedLines = checkLines(newGrid);
      setCompletedLines(newCompletedLines);
      
      return newGrid;
    });
  }, []);
  
  const resetGame = useCallback(() => {
    setGrid(generateBingoGrid());
    setCompletedLines([]);
  }, []);
  
  const isLineCompleted = useCallback((row: number, col: number): boolean => {
    // 横
    if (completedLines.includes(`row-${row}`)) return true;
    // 縦
    if (completedLines.includes(`col-${col}`)) return true;
    // 斜め（左上から右下）
    if (row === col && completedLines.includes('diag-lr')) return true;
    // 斜め（右上から左下）
    if (row + col === 4 && completedLines.includes('diag-rl')) return true;
    
    return false;
  }, [completedLines]);
  
  return {
    grid,
    totalScore,
    completedLines,
    toggleCell,
    resetGame,
    isLineCompleted,
  };
};
