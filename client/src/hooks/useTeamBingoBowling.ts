import { useState, useCallback, useMemo, useEffect } from 'react';
import { trpc } from '@/lib/trpc';

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
// 1つ目の数字が0のものは除外、重複なし、合計が10になるものはスペア表記に統一
const BOWLING_SCORES = [
  // 合計が10未満の通常フレーム（1投目 + 2投目が10未満）
  '1|1', '1|2', '1|3', '1|4', '1|5', '1|6', '1|7', '1|8',
  '2|1', '2|2', '2|3', '2|4', '2|5', '2|6', '2|7',
  '3|1', '3|2', '3|3', '3|4', '3|5', '3|6',
  '4|1', '4|2', '4|3', '4|4', '4|5',
  '5|1', '5|2', '5|3', '5|4',
  '6|1', '6|2', '6|3',
  '7|1', '7|2',
  '8|1',
  // スペア表記（1投目 + 2投目で合計が10）
  '1◢', '2◢', '3◢', '4◢', '5◢', '6◢', '7◢', '8◢', '9◢',
];

// 重複チェック関数
const hasDuplicate = (grid: BingoCell[][]): boolean => {
  const scores = new Set<string>();
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const score = grid[row][col].score;
      if (scores.has(score)) return true;
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

  do {
    const shuffled = [...BOWLING_SCORES].sort(() => Math.random() - 0.5);
    grid = [];

    for (let row = 0; row < 5; row++) {
      grid[row] = [];
      for (let col = 0; col < 5; col++) {
        if (row === 2 && col === 2) {
          grid[row][col] = { id: `${row}-${col}`, score: '▶︎◀︎', marked: false };
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

  for (let row = 0; row < 5; row++) {
    if (grid[row].every(cell => cell.marked)) completedLines.push(`row-${row}`);
  }
  for (let col = 0; col < 5; col++) {
    if (grid.every(row => row[col].marked)) completedLines.push(`col-${col}`);
  }
  if (grid.every((row, i) => row[i].marked)) completedLines.push('diag-lr');
  if (grid.every((row, i) => row[4 - i].marked)) completedLines.push('diag-rl');

  return completedLines;
};

// スコア計算: 1マス=10点、ビンゴ1列=100点
const calculateScore = (grid: BingoCell[][], completedLines: string[]): number => {
  let score = 0;
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      if (grid[row][col].marked) score += 10;
    }
  }
  score += completedLines.length * 100;
  return score;
};

// グリッドをJSON文字列に変換（スコア情報のみ）
const gridToString = (grid: BingoCell[][]): string => {
  const scoreGrid = grid.map(row => row.map(cell => ({ id: cell.id, score: cell.score })));
  return JSON.stringify(scoreGrid);
};

// JSON文字列をグリッドに変換（不正データの場合はnullを返す）
const stringToGrid = (str: string): BingoCell[][] | null => {
  try {
    const scoreGrid = JSON.parse(str);
    if (!Array.isArray(scoreGrid) || scoreGrid.length !== 5) return null;
    for (const row of scoreGrid) {
      if (!Array.isArray(row) || row.length !== 5) return null;
      for (const cell of row) {
        if (!cell || typeof cell.id !== 'string' || typeof cell.score !== 'string') return null;
      }
    }
    return scoreGrid.map((row: any[]) => row.map((cell: any) => ({
      id: cell.id,
      score: cell.score,
      marked: false,
    })));
  } catch {
    return null;
  }
};

// マーク状態をJSON文字列に変換
const markedCellsToString = (grid: BingoCell[][]): string => {
  const marked: Record<string, boolean> = {};
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      marked[`${row}-${col}`] = grid[row][col].marked;
    }
  }
  return JSON.stringify(marked);
};

// JSON文字列をマーク状態に変換してグリッドに適用
const applyMarkedCells = (grid: BingoCell[][], markedStr: string): BingoCell[][] => {
  try {
    const marked: Record<string, boolean> = JSON.parse(markedStr);
    if (!Array.isArray(grid) || grid.length !== 5) return grid;
    const newGrid = grid.map(row => {
      if (!Array.isArray(row)) return row;
      return [...row];
    });
    for (let row = 0; row < 5; row++) {
      if (!newGrid[row] || !Array.isArray(newGrid[row])) continue;
      for (let col = 0; col < 5; col++) {
        if (!newGrid[row][col]) continue;
        newGrid[row][col] = { ...newGrid[row][col], marked: marked[`${row}-${col}`] || false };
      }
    }
    return newGrid;
  } catch (e) {
    console.error('Error parsing markedCells:', e);
    return grid;
  }
};

export const useTeamBingoBowling = (teamNumber: number, onRankingRefresh?: () => void) => {
  const [grid, setGrid] = useState<BingoCell[][]>(() => generateBingoGrid());
  const [completedLines, setCompletedLines] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const utils = trpc.useUtils();

  // 全チーム共通のカード配置を取得
  const { data: sharedLayout, isLoading: isSharedLoading } = trpc.team.getSharedLayout.useQuery(
    undefined,
    { refetchInterval: false } // 共通カードは初回のみ取得
  );

  // 共通カード配置を初期化するミューテーション
  const initSharedLayoutMutation = trpc.team.initSharedLayout.useMutation({
    onSuccess: () => {
      utils.team.getSharedLayout.invalidate();
    },
  });

  // サーバーからチーム状態を取得（markedCells・totalScore）
  const { data: teamState, isLoading: isTeamLoading } = trpc.team.getBingoState.useQuery(
    { teamNumber },
    { enabled: true, refetchInterval: 2000 }
  );

  // サーバーへの更新ミューテーション
  const updateMutation = trpc.team.updateBingoState.useMutation({
    onSuccess: () => {
      // ビンゴマス変更成功時にランキングを即座に再取得
      utils.team.getRankings.invalidate();
      onRankingRefresh?.();
    },
  });

  // チーム番号が変更されたときはリセット
  useEffect(() => {
    setIsInitialized(false);
  }, [teamNumber]);

  // 共通カード配置とチーム状態が揃ったら初期化
  useEffect(() => {
    if (isInitialized) return;
    if (isSharedLoading || isTeamLoading) return;

    try {
      let baseGrid: BingoCell[][];

      if (sharedLayout) {
        // 既存の共通カード配置を使用
        const parsed = stringToGrid(sharedLayout);
        baseGrid = parsed ?? generateBingoGrid();

        if (!parsed) {
          // 不正な共通カードなら新しいものを生成してサーバーに保存
          initSharedLayoutMutation.mutate({ gridData: gridToString(baseGrid) });
        }
      } else {
        // 共通カードがまだない → 新しいグリッドを生成してサーバーに保存
        baseGrid = generateBingoGrid();
        initSharedLayoutMutation.mutate({ gridData: gridToString(baseGrid) });
      }

      if (teamState) {
        // チームのmarkedCells状態を共通グリッドに適用
        const gridWithMarked = applyMarkedCells(baseGrid, teamState.markedCells);
        const savedLines = (() => {
          try { return JSON.parse(teamState.completedLines); } catch { return []; }
        })();
        setGrid(gridWithMarked);
        setCompletedLines(savedLines);
      } else {
        // 新しいチーム：共通グリッドをそのまま使用、markedCellsは空
        setGrid(baseGrid);
        setCompletedLines([]);
        // サーバーに初期状態を保存
        updateMutation.mutate({
          teamNumber,
          gridData: gridToString(baseGrid),
          markedCells: markedCellsToString(baseGrid),
          completedLines: JSON.stringify([]),
          totalScore: 0,
        });
      }

      setIsInitialized(true);
    } catch (e) {
      console.error('Error initializing team state:', e);
      const newGrid = generateBingoGrid();
      setGrid(newGrid);
      setCompletedLines([]);
      setIsInitialized(true);
    }
  }, [sharedLayout, teamState, isSharedLoading, isTeamLoading, isInitialized, teamNumber]);

  const totalScore = useMemo(() => calculateScore(grid, completedLines), [grid, completedLines]);

  const toggleCell = useCallback((row: number, col: number) => {
    setGrid(prevGrid => {
      const newGrid = prevGrid.map(r => [...r]);
      newGrid[row][col] = { ...newGrid[row][col], marked: !newGrid[row][col].marked };

      const newCompletedLines = checkLines(newGrid);
      setCompletedLines(newCompletedLines);

      const newScore = calculateScore(newGrid, newCompletedLines);
      updateMutation.mutate({
        teamNumber,
        gridData: gridToString(newGrid),
        markedCells: markedCellsToString(newGrid),
        completedLines: JSON.stringify(newCompletedLines),
        totalScore: newScore,
      });

      return newGrid;
    });
  }, [teamNumber, updateMutation]);

  const resetGame = useCallback(() => {
    // チームのmarkedCellsのみリセット（共通カード配置は維持）
    setIsInitialized(false);
    // 共通グリッドを再取得して適用
    utils.team.getSharedLayout.invalidate();
    updateMutation.mutate({
      teamNumber,
      gridData: gridToString(grid),
      markedCells: markedCellsToString(grid.map(row => row.map(cell => ({ ...cell, marked: false })))),
      completedLines: JSON.stringify([]),
      totalScore: 0,
    });
  }, [teamNumber, grid, updateMutation, utils]);

  const isLineCompleted = useCallback((row: number, col: number): boolean => {
    if (completedLines.includes(`row-${row}`)) return true;
    if (completedLines.includes(`col-${col}`)) return true;
    if (row === col && completedLines.includes('diag-lr')) return true;
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
    isLoading: !isInitialized,
  };
};
