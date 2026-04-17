import { useTeamBingoBowling } from '@/hooks/useTeamBingoBowling';
import { Button } from '@/components/ui/button';
import { RotateCcw, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * ボウリングビンゴ - メインゲームページ
 * ネオンレトロスタイル: 深い紺色背景、ネオンピンク/シアン/イエローのアクセント
 * スマホ最適化: タップしやすい大きなマス、レスポンシブレイアウト
 * チーム機能: 複数チーム対応、リアルタイム同期
 */
export default function Home() {
  const { user, loading, error, isAuthenticated, logout } = useAuth();
  const [selectedTeam, setSelectedTeam] = useState<number>(1);
  const [animatingCells, setAnimatingCells] = useState<Set<string>>(new Set());
  const [showBingoEffect, setShowBingoEffect] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: string; x: number; y: number }>>([]);

  const { grid, totalScore, completedLines, toggleCell, resetGame, isLineCompleted, isLoading } = useTeamBingoBowling(selectedTeam);

  // ビンゴ達成時のエフェクト
  useEffect(() => {
    if (completedLines.length > 0) {
      setShowBingoEffect(true);
      
      // パーティクル生成
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
    // アニメーション効果
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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* ビンゴエフェクト背景 */}
      {showBingoEffect && (
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-neon-pink via-neon-cyan to-neon-yellow opacity-30" />
          {/* パーティクルエフェクト */}
          {particles.map(particle => (
            <div
              key={particle.id}
              className="absolute w-2 h-2 rounded-full animate-ping"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                backgroundColor: ['#ff006e', '#00f5ff', '#ffbe0b'][Math.floor(Math.random() * 3)],
                animation: `ping 1s cubic-bezier(0, 0, 0.2, 1) 0s infinite`,
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
        <div className="flex items-center gap-3 bg-card border-2 border-neon-cyan rounded-lg p-3 md:p-4 backdrop-blur-sm" style={{
          boxShadow: '0 0 15px rgba(0, 245, 255, 0.3)'
        }}>
          <label className="text-neon-cyan text-sm md:text-base font-bold">チーム:</label>
          <Select value={selectedTeam.toString()} onValueChange={(value) => setSelectedTeam(parseInt(value))}>
            <SelectTrigger className="w-20 md:w-24 bg-dark-card border-neon-cyan text-neon-cyan">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-dark-card border-neon-cyan">
              {Array.from({ length: 10 }, (_, i) => i + 1).map(team => (
                <SelectItem key={team} value={team.toString()} className="text-neon-cyan hover:bg-neon-pink hover:text-background">
                  {team}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* スコア表示 */}
      <div className="mb-6 z-10">
        <div className="bg-card border-2 border-neon-cyan rounded-lg p-4 md:p-6 text-center backdrop-blur-sm" style={{
          boxShadow: '0 0 20px rgba(0, 245, 255, 0.5), inset 0 0 20px rgba(0, 245, 255, 0.1)'
        }}>
          <p className="text-neon-cyan text-sm mb-2">SCORE</p>
          <p className="text-4xl md:text-5xl font-bold text-neon-yellow transition-all duration-300" style={{
            textShadow: '0 0 20px rgba(255, 190, 11, 0.8)',
            transform: showBingoEffect ? 'scale(1.1)' : 'scale(1)',
          }}>
            {totalScore}
          </p>
          {completedLines.length > 0 && (
            <p className="text-neon-pink text-sm mt-2 flex items-center justify-center gap-1" style={{
              textShadow: '0 0 10px rgba(255, 0, 110, 0.6)'
            }}>
              <Zap size={16} />
              ビンゴ: {completedLines.length}
            </p>
          )}
        </div>
      </div>

      {/* ビンゴグリッド */}
      {isLoading ? (
        <div className="mb-8 z-10 text-neon-cyan text-center">
          <p>読み込み中...</p>
        </div>
      ) : (
        <div className="mb-8 z-10">
          <div className="grid grid-cols-5 gap-2 md:gap-3 p-4 md:p-6 bg-card border-2 border-neon-pink rounded-lg backdrop-blur-sm" style={{
            boxShadow: '0 0 30px rgba(255, 0, 110, 0.4), inset 0 0 30px rgba(255, 0, 110, 0.05)'
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
                      ${cell.marked
                        ? 'bg-neon-pink text-background border-neon-pink'
                        : 'bg-dark-card text-neon-cyan border-neon-cyan hover:border-neon-yellow'
                      }
                      ${isCompleted && cell.marked ? 'ring-2 ring-neon-yellow animate-neon-pulse' : ''}
                      ${isAnimating ? 'scale-110' : 'scale-100'}
                    `}
                    style={{
                      boxShadow: cell.marked
                        ? `0 0 15px rgba(255, 0, 110, 0.8), inset 0 0 10px rgba(255, 0, 110, 0.3)`
                        : `0 0 10px rgba(0, 245, 255, 0.3)`,
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
      <div className="z-10">
        <Button
          onClick={resetGame}
          className="bg-neon-purple hover:bg-neon-pink text-background font-bold py-2 px-6 rounded-lg border-2 border-neon-cyan transition-all duration-300 flex items-center gap-2"
          style={{
            boxShadow: '0 0 20px rgba(181, 55, 242, 0.6)'
          }}
        >
          <RotateCcw size={20} />
          NEW GAME
        </Button>
      </div>

      {/* 背景装飾 */}
      <div className="fixed inset-0 pointer-events-none opacity-10">
        <div className="absolute top-10 right-10 w-32 h-32 bg-neon-pink rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-40 h-40 bg-neon-cyan rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-neon-yellow rounded-full blur-3xl" />
      </div>
    </div>
  );
}
