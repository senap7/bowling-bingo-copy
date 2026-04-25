import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { generateBingoGrid } from '@shared/bingoGrid';
import type { BingoCell, GridSize } from '@shared/bingoGrid';
export type { BingoCell };

export interface BingoState {
  grid: BingoCell[][];
  totalScore: number;
  completedLines: string[];
}

// 1列揃っているかチェック（縦・横・斜め）— 可変サイズ対応
const checkLines = (grid: BingoCell[][]): string[] => {
  const size = grid.length;
  if (size === 0) return [];
  const completedLines: string[] = [];
  // 行チェック
  for (let row = 0; row < size; row++) {
    if (grid[row].every(cell => cell.marked)) completedLines.push(`row-${row}`);
  }
  // 列チェック
  for (let col = 0; col < size; col++) {
    if (grid.every(row => row[col]?.marked)) completedLines.push(`col-${col}`);
  }
  // 左上→右下 斜めチェック
  if (grid.every((row, i) => row[i]?.marked)) completedLines.push('diag-lr');
  // 右上→左下 斜めチェック
  if (grid.every((row, i) => row[size - 1 - i]?.marked)) completedLines.push('diag-rl');
  return completedLines;
};

// スコア計算: 1マス=10点、ビンゴ1列=100点 — 可変サイズ対応
const calculateScore = (grid: BingoCell[][], completedLines: string[]): number => {
  const size = grid.length;
  let score = 0;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (grid[row]?.[col]?.marked) score += 10;
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

// JSON文字列をグリッドに変換（可変サイズ対応、不正データの場合はnullを返す）
const stringToGrid = (str: string): BingoCell[][] | null => {
  try {
    const scoreGrid = JSON.parse(str);
    if (!Array.isArray(scoreGrid) || (scoreGrid.length !== 4 && scoreGrid.length !== 5)) return null;
    const size = scoreGrid.length;
    for (const row of scoreGrid) {
      if (!Array.isArray(row) || row.length !== size) return null;
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

// マーク状態をJSON文字列に変換 — 可変サイズ対応
const markedCellsToString = (grid: BingoCell[][]): string => {
  const size = grid.length;
  const marked: Record<string, boolean> = {};
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      marked[`${row}-${col}`] = grid[row][col].marked;
    }
  }
  return JSON.stringify(marked);
};

// JSON文字列をマーク状態に変換してグリッドに適用 — 可変サイズ対応
const applyMarkedCells = (grid: BingoCell[][], markedStr: string): BingoCell[][] => {
  try {
    const marked: Record<string, boolean> = JSON.parse(markedStr);
    const size = grid.length;
    if (!Array.isArray(grid) || (size !== 4 && size !== 5)) return grid;
    const newGrid = grid.map(row => {
      if (!Array.isArray(row)) return row;
      return [...row];
    });
    for (let row = 0; row < size; row++) {
      if (!newGrid[row] || !Array.isArray(newGrid[row])) continue;
      for (let col = 0; col < size; col++) {
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

// markedCells文字列を比較して変化があるか確認 — 可変サイズ対応
const markedCellsEqual = (a: string, b: string): boolean => {
  try {
    const ma: Record<string, boolean> = JSON.parse(a);
    const mb: Record<string, boolean> = JSON.parse(b);
    // 全キーを収集して比較
    const allKeys = Array.from(new Set([...Object.keys(ma), ...Object.keys(mb)]));
    for (const key of allKeys) {
      if (!!ma[key] !== !!mb[key]) return false;
    }
    return true;
  } catch {
    return a === b;
  }
};

/**
 * チーム別ビンゴボウリングフック（可変グリッドサイズ対応）
 */
export const useTeamBingoBowling = (teamNumber: number, onRankingRefresh?: () => void) => {
  const utils = trpc.useUtils();
  const [grid, setGrid] = useState<BingoCell[][]>([]);
  const [completedLines, setCompletedLines] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const localMarkedCellsRef = useRef<string>('');
  const pendingMutationRef = useRef<boolean>(false);

  // 共通カード配置を取得（2秒ポーリング）
  const { data: sharedLayout, isLoading: isSharedLoading } = trpc.team.getSharedLayout.useQuery(undefined, {
    refetchInterval: 2000,
  });

  // チーム状態を取得（2秒ポーリング）
  const { data: teamState, isLoading: isTeamLoading } = trpc.team.getBingoState.useQuery(
    { teamNumber },
    { refetchInterval: 2000 }
  );

  // 共通カード配置を初期化（まだ存在しない場合のみ）
  const initSharedLayoutMutation = trpc.team.initSharedLayout.useMutation();

  // チーム状態を更新
  const updateMutation = trpc.team.updateBingoState.useMutation({
    onSuccess: () => {
      pendingMutationRef.current = false;
      onRankingRefresh?.();
    },
    onError: () => {
      pendingMutationRef.current = false;
    },
  });

  // 初期化ロジック
  useEffect(() => {
    if (isSharedLoading || isTeamLoading) return;
    if (isInitialized) return;

    try {
      let baseGrid: BingoCell[][] | null = null;

      if (sharedLayout) {
        baseGrid = stringToGrid(sharedLayout);
      }

      if (!baseGrid) {
        // デフォルトは5×5で生成
        baseGrid = generateBingoGrid(5);
        initSharedLayoutMutation.mutate({ gridData: gridToString(baseGrid) });
      }

      if (teamState) {
        const gridWithMarked = applyMarkedCells(baseGrid, teamState.markedCells);
        const savedLines = (() => {
          try { return JSON.parse(teamState.completedLines); } catch { return []; }
        })();
        setGrid(gridWithMarked);
        setCompletedLines(savedLines);
        localMarkedCellsRef.current = teamState.markedCells;
      } else {
        setGrid(baseGrid);
        setCompletedLines([]);
        localMarkedCellsRef.current = markedCellsToString(baseGrid);
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
      const newGrid = generateBingoGrid(5);
      setGrid(newGrid);
      setCompletedLines([]);
      setIsInitialized(true);
    }
  }, [sharedLayout, teamState, isSharedLoading, isTeamLoading, isInitialized, teamNumber]);

  // ポーリングで取得したmarkedCellsをローカルグリッドに反映（他端末の変更を同期）
  useEffect(() => {
    if (!isInitialized) return;
    if (!teamState) return;
    // 自分が送信中の場合はスキップ（楽観的更新との競合を防ぐ）
    if (pendingMutationRef.current) return;

    const serverMarkedCells = teamState.markedCells;

    // サーバーのmarkedCellsとローカルが異なる場合のみ更新
    if (markedCellsEqual(serverMarkedCells, localMarkedCellsRef.current)) return;

    // サーバーのmarkedCellsをローカルグリッドに反映
    setGrid(prevGrid => {
      const updated = applyMarkedCells(prevGrid, serverMarkedCells);
      return updated;
    });

    // completedLinesもサーバーから反映
    try {
      const serverLines = JSON.parse(teamState.completedLines);
      if (Array.isArray(serverLines)) {
        setCompletedLines(serverLines);
      }
    } catch {
      // ignore
    }

    localMarkedCellsRef.current = serverMarkedCells;
  }, [teamState, isInitialized]);

  // 共通カードが変更された場合（管理者がリセットした場合）にグリッドを再初期化
  useEffect(() => {
    if (!isInitialized) return;
    if (!sharedLayout) return;

    const newBaseGrid = stringToGrid(sharedLayout);
    if (!newBaseGrid) return;

    // 現在のグリッドサイズと共通カードのサイズが異なる場合は再初期化
    if (grid.length !== newBaseGrid.length) {
      setGrid(newBaseGrid);
      setCompletedLines([]);
      localMarkedCellsRef.current = markedCellsToString(newBaseGrid);
      updateMutation.mutate({
        teamNumber,
        gridData: gridToString(newBaseGrid),
        markedCells: markedCellsToString(newBaseGrid),
        completedLines: JSON.stringify([]),
        totalScore: 0,
      });
    }
  }, [sharedLayout, isInitialized]);

  const totalScore = useMemo(() => calculateScore(grid, completedLines), [grid, completedLines]);

  const toggleCell = useCallback((row: number, col: number) => {
    setGrid(prevGrid => {
      const newGrid = prevGrid.map(r => [...r]);
      newGrid[row][col] = { ...newGrid[row][col], marked: !newGrid[row][col].marked };

      const newCompletedLines = checkLines(newGrid);
      setCompletedLines(newCompletedLines);

      const newMarkedCells = markedCellsToString(newGrid);
      const newScore = calculateScore(newGrid, newCompletedLines);

      // ローカルの最新状態を記録（ポーリング上書きを防ぐ）
      localMarkedCellsRef.current = newMarkedCells;
      pendingMutationRef.current = true;

      updateMutation.mutate({
        teamNumber,
        gridData: gridToString(newGrid),
        markedCells: newMarkedCells,
        completedLines: JSON.stringify(newCompletedLines),
        totalScore: newScore,
      });

      return newGrid;
    });
  }, [teamNumber, updateMutation]);

  const resetGame = useCallback(() => {
    setIsInitialized(false);
    pendingMutationRef.current = false;
    localMarkedCellsRef.current = '';
    utils.team.getSharedLayout.invalidate();
    updateMutation.mutate({
      teamNumber,
      gridData: gridToString(grid),
      markedCells: markedCellsToString(grid.map(row => row.map(cell => ({ ...cell, marked: false })))),
      completedLines: JSON.stringify([]),
      totalScore: 0,
    });
  }, [teamNumber, grid, updateMutation, utils]);

  // 可変サイズ対応のisLineCompleted
  const isLineCompleted = useCallback((row: number, col: number): boolean => {
    const size = grid.length;
    if (completedLines.includes(`row-${row}`)) return true;
    if (completedLines.includes(`col-${col}`)) return true;
    if (row === col && completedLines.includes('diag-lr')) return true;
    if (row + col === size - 1 && completedLines.includes('diag-rl')) return true;
    return false;
  }, [completedLines, grid.length]);

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
