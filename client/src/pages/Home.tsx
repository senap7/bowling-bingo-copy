import { useTeamBingoBowling } from '@/hooks/useTeamBingoBowling';
import { Button } from '@/components/ui/button';
import { RotateCcw, Zap, Trophy, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { Link } from 'wouter';
import { getTeamColor, TEAM_COLORS } from '@shared/teamColors';

/**
 * ランキングテーブルコンポーネント（チームカラー対応・2種類スコア表示）
 */
function RankingTable() {
  const { data: rankings, isLoading } = trpc.team.getRankings.useQuery(undefined, {
    refetchInterval: 3000,
  });

  if (isLoading) {
    return (
      <div className="z-10 w-full max-w-sm mb-6">
        <div className="bg-card border-2 border-neon-yellow rounded-lg p-4 text-center text-neon-cyan text-sm">
          ランキング読み込み中...
        </div>
      </div>
    );
  }

  if (!rankings || rankings.length === 0) {
    return (
      <div className="z-10 w-full max-w-sm mb-6">
        <div className="bg-card border-2 border-neon-yellow rounded-lg p-4" style={{
          boxShadow: '0 0 15px rgba(255, 190, 11, 0.3)'
        }}>
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={18} className="text-neon-yellow" />
            <h2 className="text-neon-yellow font-bold text-sm" style={{
              textShadow: '0 0 10px rgba(255, 190, 11, 0.6)'
            }}>RANKING</h2>
          </div>
          <p className="text-neon-cyan text-xs text-center">まだデータがありません</p>
        </div>
      </div>
    );
  }

  // 合計スコア降順でソート
  const sorted = [...rankings].sort((a, b) => b.totalCombinedScore - a.totalCombinedScore);

  return (
    <div className="z-10 w-full max-w-sm mb-6">
      <div className="bg-card border-2 border-neon-yellow rounded-lg p-4" style={{
        boxShadow: '0 0 15px rgba(255, 190, 11, 0.3)'
      }}>
        <div className="flex items-center gap-2 mb-3">
          <Trophy size={18} className="text-neon-yellow" />
          <h2 className="text-neon-yellow font-bold text-sm" style={{
            textShadow: '0 0 10px rgba(255, 190, 11, 0.6)'
          }}>RANKING</h2>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-neon-cyan border-opacity-30">
              <th className="text-neon-cyan text-left pb-2 w-6">#</th>
              <th className="text-neon-cyan text-left pb-2">チーム</th>
              <th className="text-neon-cyan text-center pb-2 text-nowrap">ビンゴ</th>
              <th className="text-neon-cyan text-center pb-2 text-nowrap">ボウリング</th>
              <th className="text-neon-cyan text-right pb-2 text-nowrap">合計</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((team, index) => {
              const tc = getTeamColor(team.teamNumber);
              return (
                <tr key={team.teamNumber} className="border-b border-neon-cyan border-opacity-10">
                  <td className="py-2 text-left">
                    <span className={`font-bold ${
                      index === 0 ? 'text-neon-yellow' :
                      index === 1 ? 'text-gray-300' :
                      index === 2 ? 'text-amber-600' :
                      'text-neon-cyan opacity-60'
                    }`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="py-2 font-mono font-bold" style={{
                    color: tc.color,
                    textShadow: `0 0 8px ${tc.glow}`,
                  }}>
                    <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: tc.color }} />
                    チーム{team.teamNumber}
                  </td>
                  <td className="py-2 text-center font-mono" style={{ color: tc.color }}>
                    {team.bingoScore}
                  </td>
                  <td className="py-2 text-center font-mono" style={{ color: tc.color }}>
                    {team.bowlingScore > 0 ? team.bowlingScore : <span className="opacity-40">-</span>}
                  </td>
                  <td className="py-2 text-right">
                    <span className="font-bold font-mono" style={{
                      color: index === 0 ? '#ffbe0b' : tc.color,
                      textShadow: index === 0
                        ? '0 0 10px rgba(255, 190, 11, 0.8)'
                        : `0 0 8px ${tc.glow}`,
                    }}>
                      {team.totalCombinedScore}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * ボウリングビンゴ - メインゲームページ
 */
export default function Home() {
  const [selectedTeam, setSelectedTeam] = useState<number>(1);
  const [animatingCells, setAnimatingCells] = useState<Set<string>>(new Set());
  const [showBingoEffect, setShowBingoEffect] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: string; x: number; y: number }>>([]);
  const [bowlingScoreInput, setBowlingScoreInput] = useState<string>('');
  const utils = trpc.useUtils();

  const { grid, totalScore, completedLines, toggleCell, resetGame, isLineCompleted, isLoading } = useTeamBingoBowling(selectedTeam);

  // 現在のチームカラー
  const teamColor = getTeamColor(selectedTeam);

  // チームのビンゴ状態を取得（bowlingScoreを読み込む）
  const { data: teamState } = trpc.team.getBingoState.useQuery(
    { teamNumber: selectedTeam },
    { refetchInterval: 3000 }
  );

  // bowlingScoreをサーバーから読み込む
  useEffect(() => {
    if (teamState && teamState.bowlingScore !== undefined) {
      setBowlingScoreInput(teamState.bowlingScore > 0 ? teamState.bowlingScore.toString() : '');
    }
  }, [teamState?.bowlingScore, selectedTeam]);

  // ボウリング実スコア更新ミューテーション
  const [bowlingScoreError, setBowlingScoreError] = useState<string | null>(null);
  const updateBowlingScoreMutation = trpc.team.updateBowlingScore.useMutation({
    onSuccess: () => {
      utils.team.getRankings.invalidate();
      utils.team.getBingoState.invalidate();
      setBowlingScoreError(null);
    },
    onError: (err) => {
      if (err.data?.code === 'NOT_FOUND') {
        setBowlingScoreError('先にビンゴマスをタップしてチームを初期化してください');
      } else {
        setBowlingScoreError('保存に失敗しました。再度お試しください');
      }
    }
  });

  // チーム変更時にキャッシュを無効化
  const handleTeamChange = (value: string) => {
    utils.team.getBingoState.invalidate();
    setSelectedTeam(parseInt(value));
    setBowlingScoreInput('');
    setBowlingScoreError(null);
  };

  // ボウリングスコア確定（Enterキーまたはフォーカスアウト）
  const handleBowlingScoreCommit = () => {
    const score = parseInt(bowlingScoreInput) || 0;
    if (score >= 0) {
      updateBowlingScoreMutation.mutate({
        teamNumber: selectedTeam,
        bowlingScore: score,
      });
    }
  };

  // ビンゴ達成時のエフェクト
  useEffect(() => {
    if (completedLines.length > 0) {
      setShowBingoEffect(true);

      const newParticles = Array.from({ length: 20 }).map((_, i) => ({
        id: `particle-${i}`,
        x: Math.random() * 100,
        y: Math.random() * 100,
      }));
      setParticles(newParticles);

      const timer = setTimeout(() => {
        setShowBingoEffect(false);
        setParticles([]);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [completedLines]);

  const handleCellClick = (row: number, col: number) => {
    const cellId = `${row}-${col}`;
    setAnimatingCells(prev => new Set(prev).add(cellId));
    setTimeout(() => {
      setAnimatingCells(prev => {
        const next = new Set(prev);
        next.delete(cellId);
        return next;
      });
    }, 300);
    toggleCell(row, col);
  };

  // 合計スコア（ビンゴ + ボウリング）
  const bowlingScore = parseInt(bowlingScoreInput) || (teamState?.bowlingScore ?? 0);
  const combinedScore = totalScore + bowlingScore;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* ビンゴエフェクト背景 */}
      {showBingoEffect && (
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 animate-pulse opacity-30" style={{
            background: `linear-gradient(to right, ${teamColor.color}, #00f5ff, #ffbe0b)`
          }} />
          {particles.map(particle => (
            <div
              key={particle.id}
              className="absolute w-2 h-2 rounded-full animate-ping"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                backgroundColor: teamColor.color,
              }}
            />
          ))}
        </div>
      )}

      {/* ヘッダー */}
      <div className="text-center mb-6 z-10">
        <h1 className="text-4xl md:text-5xl font-bold mb-2 text-neon-pink drop-shadow-lg" style={{
          textShadow: '0 0 20px rgba(255, 0, 110, 0.8), 0 0 40px rgba(0, 245, 255, 0.4)'
        }}>
          BOWLING BINGO
        </h1>
        <p className="text-neon-cyan text-sm md:text-base drop-shadow-lg" style={{
          textShadow: '0 0 10px rgba(0, 245, 255, 0.6)'
        }}>
          ボウリングスコアでビンゴを完成させよう！
        </p>
      </div>

      {/* チーム選択 */}
      <div className="mb-6 z-10">
        <div className="flex items-center gap-3 bg-card border-2 rounded-lg p-3 md:p-4 backdrop-blur-sm transition-all duration-500" style={{
          borderColor: teamColor.color,
          boxShadow: `0 0 15px ${teamColor.glow}`,
        }}>
          <label className="text-sm md:text-base font-bold transition-colors duration-500" style={{ color: teamColor.color }}>
            チーム:
          </label>
          <Select value={selectedTeam.toString()} onValueChange={handleTeamChange}>
            <SelectTrigger className="w-32 bg-dark-card font-bold" style={{
              borderColor: teamColor.color,
              color: teamColor.color,
            }}>
              <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: teamColor.color }} />
              チーム {selectedTeam}
            </SelectTrigger>
            <SelectContent className="bg-dark-card border-neon-cyan">
              {Array.from({ length: 10 }, (_, i) => i + 1).map(team => {
                const tc = TEAM_COLORS[team];
                return (
                  <SelectItem
                    key={team}
                    value={team.toString()}
                    className="font-bold"
                    style={{ color: tc?.color }}
                  >
                    <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: tc?.color }} />
                    チーム {team}（{tc?.name}）
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* スコア表示（2種類） */}
      <div className="mb-6 z-10 w-full max-w-sm">
        <div className="bg-card border-2 rounded-lg p-4 md:p-5 backdrop-blur-sm transition-all duration-500" style={{
          borderColor: teamColor.color,
          boxShadow: `0 0 20px ${teamColor.glow}, inset 0 0 20px ${teamColor.glow.replace('0.7', '0.1')}`,
        }}>
          {/* 2カラムレイアウト：ビンゴスコア ＋ 合計スコア */}
          <div className="flex gap-4 items-stretch">
            {/* ビンゴスコア */}
            <div className="flex-1 text-center border-r border-opacity-30" style={{ borderColor: teamColor.color }}>
              <p className="text-xs mb-1 font-bold opacity-70" style={{ color: teamColor.color }}>ビンゴ</p>
              <p className="text-3xl md:text-4xl font-bold text-neon-cyan transition-all duration-300" style={{
                textShadow: '0 0 15px rgba(0, 245, 255, 0.8)',
                transform: showBingoEffect ? 'scale(1.1)' : 'scale(1)',
              }}>
                {totalScore}
              </p>
              {completedLines.length > 0 && (
                <p className="text-xs mt-1 flex items-center justify-center gap-1 font-bold" style={{
                  color: teamColor.color,
                }}>
                  <Zap size={12} />
                  {completedLines.length}列
                </p>
              )}
            </div>

            {/* ボウリング実スコア入力 */}
            <div className="flex-1 text-center border-r border-opacity-30" style={{ borderColor: teamColor.color }}>
              <p className="text-xs mb-1 font-bold opacity-70" style={{ color: teamColor.color }}>ボウリング</p>
              <input
                type="number"
                min="0"
                value={bowlingScoreInput}
                onChange={(e) => setBowlingScoreInput(e.target.value)}
                onBlur={handleBowlingScoreCommit}
                onKeyDown={(e) => e.key === 'Enter' && handleBowlingScoreCommit()}
                placeholder="0"
                className="w-full text-center text-3xl md:text-4xl font-bold bg-transparent border-b-2 outline-none transition-colors duration-300 font-mono"
                style={{
                  color: teamColor.color,
                  borderColor: teamColor.color,
                  textShadow: `0 0 10px ${teamColor.glow}`,
                }}
              />
              {bowlingScoreError ? (
                <p className="text-xs mt-1 text-red-400 leading-tight">{bowlingScoreError}</p>
              ) : (
                <p className="text-xs mt-1 opacity-50" style={{ color: teamColor.color }}>タップして入力</p>
              )}
            </div>

            {/* 合計スコア */}
            <div className="flex-1 text-center">
              <p className="text-xs mb-1 font-bold opacity-70" style={{ color: teamColor.color }}>合計</p>
              <p className="text-3xl md:text-4xl font-bold text-neon-yellow transition-all duration-300" style={{
                textShadow: '0 0 20px rgba(255, 190, 11, 0.8)',
              }}>
                {combinedScore}
              </p>
              <p className="text-xs mt-1 opacity-50 text-neon-yellow">TOTAL</p>
            </div>
          </div>
        </div>
      </div>

      {/* ビンゴグリッド */}
      {isLoading ? (
        <div className="mb-8 z-10 text-neon-cyan text-center">
          <p>読み込み中...</p>
        </div>
      ) : (
        <div className="mb-8 z-10">
          <div className="grid grid-cols-5 gap-2 md:gap-3 p-4 md:p-6 bg-card border-2 rounded-lg backdrop-blur-sm transition-all duration-500" style={{
            borderColor: teamColor.color,
            boxShadow: `0 0 30px ${teamColor.glow}, inset 0 0 30px ${teamColor.glow.replace('0.7', '0.05')}`,
          }}>
            {grid.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                const isCompleted = isLineCompleted(rowIndex, colIndex);
                const isAnimating = animatingCells.has(cell.id);

                return (
                  <button
                    key={cell.id}
                    onClick={() => handleCellClick(rowIndex, colIndex)}
                    className={`
                      w-14 h-14 md:w-16 md:h-16 lg:w-20 lg:h-20
                      rounded-lg font-mono font-bold text-xs md:text-sm
                      transition-all duration-300
                      flex items-center justify-center
                      border-2
                      ${isAnimating ? 'scale-110' : 'scale-100'}
                    `}
                    style={cell.marked ? {
                      backgroundColor: teamColor.markedBg,
                      color: teamColor.markedText,
                      borderColor: teamColor.color,
                      boxShadow: `0 0 15px ${teamColor.glow}, inset 0 0 10px ${teamColor.glow.replace('0.7', '0.3')}`,
                      outline: isCompleted ? `2px solid #ffbe0b` : undefined,
                    } : {
                      backgroundColor: 'var(--dark-card, #0d1b2a)',
                      color: teamColor.color,
                      borderColor: teamColor.color,
                      boxShadow: `0 0 8px ${teamColor.glow.replace('0.7', '0.3')}`,
                    }}
                  >
                    <span>{cell.score}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* リセットボタン */}
      <div className="z-10 mb-8">
        <Button
          onClick={resetGame}
          className="font-bold py-2 px-6 rounded-lg border-2 transition-all duration-300 flex items-center gap-2"
          style={{
            backgroundColor: teamColor.markedBg,
            color: teamColor.markedText,
            borderColor: teamColor.color,
            boxShadow: `0 0 20px ${teamColor.glow}`,
          }}
        >
          <RotateCcw size={20} />
          NEW GAME
        </Button>
      </div>

      {/* ランキング表示 */}
      <RankingTable />

      {/* 管理者リンク */}
      <div className="z-10 mt-2 mb-8">
        <Link href="/admin">
          <Button
            variant="outline"
            className="border-neon-yellow text-neon-yellow hover:bg-neon-yellow hover:text-background font-bold py-2 px-6 rounded-lg transition-all duration-300 flex items-center gap-2"
            style={{ boxShadow: '0 0 10px rgba(255, 190, 11, 0.4)' }}
          >
            <Shield size={16} />
            管理者画面
          </Button>
        </Link>
      </div>

      {/* 背景装飾 */}
      <div className="fixed inset-0 pointer-events-none opacity-10">
        <div className="absolute top-10 right-10 w-32 h-32 rounded-full blur-3xl transition-all duration-500" style={{ backgroundColor: teamColor.color }} />
        <div className="absolute bottom-20 left-10 w-40 h-40 bg-neon-cyan rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/4 w-32 h-32 rounded-full blur-3xl transition-all duration-500" style={{ backgroundColor: teamColor.color }} />
      </div>
    </div>
  );
}
