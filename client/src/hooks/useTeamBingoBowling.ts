import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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

// スペア一覧（1◢〜9◢）
const SPARE_SCORES = ['1◢', '2◢', '3◢', '4◢', '5◢', '6◢', '7◢', '8◢', '9◢'];

// 通常スコア一覧（スペアを除く）
const NORMAL_SCORES = BOWLING_SCORES.filter(s => !s.includes('◢'));

// 内側2列目のセル座標（中央の▶︎◀︎を除く8マス）
// 5x5グリッドで内側2列目 = row 1,2,3 × col 1,2,3 のうち中央(2,2)を除いた8マス
const INNER_RING_CELLS: [number, number][] = [
  [1,1], [1,2], [1,3],
  [2,1],        [2,3],
  [3,1], [3,2], [3,3],
];

// ボウリングスコアをシャッフルして5x5グリッドを生成
// 中央はストライク固定、内側2列目の8マスは異なるスペアに固定、外側は通常スコア
const generateBingoGrid = (): BingoCell[][] => {
  let grid: BingoCell[][] = [];
  let attempts = 0;
  const maxAttempts = 100;

  do {
    // 9種のスペアからランダムに8つ選んでシャッフル
    const shuffledSpares = [...SPARE_SCORES].sort(() => Math.random() - 0.5).slice(0, 8);
    // 通常スコアをシャッフル
    const shuffledNormal = [...NORMAL_SCORES].sort(() => Math.random() - 0.5);

    // 内側2列目セルのセット（高速判定用）
    const innerSet = new Set(INNER_RING_CELLS.map(([r, c]) => `${r}-${c}`));

    grid = [];
    let spareIdx = 0;
    let normalIdx = 0;

    for (let row = 0; row < 5; row++) {
      grid[row] = [];
      for (let col = 0; col < 5; col++) {
        if (row === 2 && col === 2) {
          // 中央：ストライク固定
          grid[row][col] = { id: `${row}-${col}`, score: '▶︎◀︎', marked: false };
        } else if (innerSet.has(`${row}-${col}`)) {
          // 内側2列目：スペア固定
          grid[row][col] = {
            id: `${row}-${col}`,
            score: shuffledSpares[spareIdx++],
            marked: false,
          };
        } else {
          // 外側：通常スコア
          grid[row][col] = {
            id: `${row}-${col}`,
            score: shuffledNormal[normalIdx++ % shuffledNormal.length],
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

// markedCells文字列を比較して変化があるか確認
const markedCellsEqual = (a: string, b: string): boolean => {
  try {
    const ma: Record<string, boolean> = JSON.parse(a);
    const mb: Record<string, boolean> = JSON.parse(b);
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const key = `${row}-${col}`;
        if (!!ma[key] !== !!mb[key]) return false;
      }
    }
    return true;
  } catch {
    return a === b;
  }
};

export const useTeamBingoBowling = (teamNumber: number, onRankingRefresh?: () => void) => {
  const [grid, setGrid] = useState<BingoCell[][]>(() => generateBingoGrid());
  const [completedLines, setCompletedLines] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const utils = trpc.useUtils();

  // 自分が最後に送信したmarkedCells（サーバーからの応答で上書きしないための比較用）
  const pendingMutationRef = useRef(false);
  // 現在のmarkedCells文字列（サーバーと比較するため）
  const localMarkedCellsRef = useRef<string>('');

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

  // サーバーからチーム状態を取得（markedCells・totalScore）- 2秒ごとポーリング
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
      // ミューテーション完了
      pendingMutationRef.current = false;
    },
    onError: () => {
      pendingMutationRef.current = false;
    },
  });

  // チーム番号が変更されたときはリセット
  useEffect(() => {
    setIsInitialized(false);
    pendingMutationRef.current = false;
    localMarkedCellsRef.current = '';
  }, [teamNumber]);

  // 共通カード配置とチーム状態が揃ったら初期化（初回のみ）
  useEffect(() => {
    if (isInitialized) return;
    if (isSharedLoading || isTeamLoading) return;

    try {
      let baseGrid: BingoCell[][];

      if (sharedLayout) {
        const parsed = stringToGrid(sharedLayout);
        baseGrid = parsed ?? generateBingoGrid();

        if (!parsed) {
          initSharedLayoutMutation.mutate({ gridData: gridToString(baseGrid) });
        }
      } else {
        baseGrid = generateBingoGrid();
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
      const newGrid = generateBingoGrid();
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
