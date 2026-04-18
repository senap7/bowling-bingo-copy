/**
 * チーム1〜10のテーマカラー定義
 * - color: メインカラー（HEX）
 * - name: カラー名（日本語）
 * - glow: グロー効果用のrgba文字列
 * - marked: マス選択時の背景色
 */
export const TEAM_COLORS: Record<number, {
  color: string;
  name: string;
  glow: string;
  markedBg: string;
  markedText: string;
  borderColor: string;
}> = {
  1: {
    color: '#3b82f6',       // 青
    name: '青',
    glow: 'rgba(59, 130, 246, 0.7)',
    markedBg: '#3b82f6',
    markedText: '#ffffff',
    borderColor: '#3b82f6',
  },
  2: {
    color: '#ef4444',       // 赤
    name: '赤',
    glow: 'rgba(239, 68, 68, 0.7)',
    markedBg: '#ef4444',
    markedText: '#ffffff',
    borderColor: '#ef4444',
  },
  3: {
    color: '#22c55e',       // 緑
    name: '緑',
    glow: 'rgba(34, 197, 94, 0.7)',
    markedBg: '#22c55e',
    markedText: '#ffffff',
    borderColor: '#22c55e',
  },
  4: {
    color: '#f59e0b',       // オレンジ
    name: 'オレンジ',
    glow: 'rgba(245, 158, 11, 0.7)',
    markedBg: '#f59e0b',
    markedText: '#000000',
    borderColor: '#f59e0b',
  },
  5: {
    color: '#a855f7',       // 紫
    name: '紫',
    glow: 'rgba(168, 85, 247, 0.7)',
    markedBg: '#a855f7',
    markedText: '#ffffff',
    borderColor: '#a855f7',
  },
  6: {
    color: '#ec4899',       // ピンク
    name: 'ピンク',
    glow: 'rgba(236, 72, 153, 0.7)',
    markedBg: '#ec4899',
    markedText: '#ffffff',
    borderColor: '#ec4899',
  },
  7: {
    color: '#06b6d4',       // シアン
    name: 'シアン',
    glow: 'rgba(6, 182, 212, 0.7)',
    markedBg: '#06b6d4',
    markedText: '#000000',
    borderColor: '#06b6d4',
  },
  8: {
    color: '#84cc16',       // 黄緑
    name: '黄緑',
    glow: 'rgba(132, 204, 22, 0.7)',
    markedBg: '#84cc16',
    markedText: '#000000',
    borderColor: '#84cc16',
  },
  9: {
    color: '#f97316',       // 朱色
    name: '朱色',
    glow: 'rgba(249, 115, 22, 0.7)',
    markedBg: '#f97316',
    markedText: '#ffffff',
    borderColor: '#f97316',
  },
  10: {
    color: '#14b8a6',       // ティール
    name: 'ティール',
    glow: 'rgba(20, 184, 166, 0.7)',
    markedBg: '#14b8a6',
    markedText: '#ffffff',
    borderColor: '#14b8a6',
  },
};

export function getTeamColor(teamNumber: number) {
  return TEAM_COLORS[teamNumber] ?? TEAM_COLORS[1];
}
