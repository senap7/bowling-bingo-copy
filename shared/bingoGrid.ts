/**
 * ビンゴグリッド生成ロジック（サーバー・クライアント共通）
 * 5×5 と 4×4 の両方に対応
 */

export type GridSize = 4 | 5;

export interface BingoCell {
  id: string;
  score: string;
  marked: boolean;
}

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

// スペア一覧（1◢〜9◢）
const SPARE_SCORES = ['1◢', '2◢', '3◢', '4◢', '5◢', '6◢', '7◢', '8◢', '9◢'];

// 通常スコア一覧（スペアを除く）
const NORMAL_SCORES = BOWLING_SCORES.filter(s => !s.includes('◢'));

// 重複チェック関数（可変サイズ対応）
const hasDuplicate = (grid: BingoCell[][], size: number): boolean => {
  const scores = new Set<string>();
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const score = grid[row][col].score;
      if (scores.has(score)) return true;
      scores.add(score);
    }
  }
  return false;
};

// ===== 5×5 グリッド生成 =====
// 内側2列目のセル座標（中央の▶︎◀︎を除く8マス）
const INNER_RING_CELLS_5x5: [number, number][] = [
  [1,1], [1,2], [1,3],
  [2,1],        [2,3],
  [3,1], [3,2], [3,3],
];

function generate5x5Grid(): BingoCell[][] {
  let grid: BingoCell[][] = [];
  let attempts = 0;
  const maxAttempts = 100;

  do {
    // 9種のスペアからランダムに8つ選んでシャッフル
    const shuffledSpares = [...SPARE_SCORES].sort(() => Math.random() - 0.5).slice(0, 8);
    // 通常スコアをシャッフル
    const shuffledNormal = [...NORMAL_SCORES].sort(() => Math.random() - 0.5);

    // 内側2列目セルのセット（高速判定用）
    const innerSet = new Set(INNER_RING_CELLS_5x5.map(([r, c]) => `${r}-${c}`));

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
  } while (hasDuplicate(grid, 5) && attempts < maxAttempts);

  return grid;
}

// ===== 4×4 グリッド生成 =====
// 4×4ではストライク（▶︎◀︎）を使わない
// 内側2列目のセル座標（4×4の場合: row 1,2 × col 1,2 の4マス）
const INNER_RING_CELLS_4x4: [number, number][] = [
  [1,1], [1,2],
  [2,1], [2,2],
];

function generate4x4Grid(): BingoCell[][] {
  let grid: BingoCell[][] = [];
  let attempts = 0;
  const maxAttempts = 100;

  do {
    // 9種のスペアからランダムに4つ選んでシャッフル（内側4マス分）
    const shuffledSpares = [...SPARE_SCORES].sort(() => Math.random() - 0.5).slice(0, 4);
    // 通常スコアをシャッフル（外側12マス分）
    const shuffledNormal = [...NORMAL_SCORES].sort(() => Math.random() - 0.5);

    // 内側セルのセット
    const innerSet = new Set(INNER_RING_CELLS_4x4.map(([r, c]) => `${r}-${c}`));

    grid = [];
    let spareIdx = 0;
    let normalIdx = 0;

    for (let row = 0; row < 4; row++) {
      grid[row] = [];
      for (let col = 0; col < 4; col++) {
        if (innerSet.has(`${row}-${col}`)) {
          // 内側：スペア固定
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
  } while (hasDuplicate(grid, 4) && attempts < maxAttempts);

  return grid;
}

/**
 * ビンゴグリッドを生成する
 * @param size グリッドサイズ（4 or 5、デフォルト5）
 */
export function generateBingoGrid(size: GridSize = 5): BingoCell[][] {
  if (size === 4) {
    return generate4x4Grid();
  }
  return generate5x5Grid();
}

/**
 * グリッドからサイズを判定する
 */
export function getGridSize(grid: BingoCell[][]): GridSize {
  return grid.length === 4 ? 4 : 5;
}
