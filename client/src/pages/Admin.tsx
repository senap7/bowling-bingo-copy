import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { ArrowLeft, RefreshCw, Trash2, Trophy, Shield, Lock, Eye, Pencil, Save, X } from 'lucide-react';
import { Link } from 'wouter';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { getTeamColor } from '@shared/teamColors';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface BingoCell {
  id: string;
  score: string;
  marked: boolean;
}

/**
 * カードプレビューコンポーネント（5x5グリッド表示）
 */
function CardPreview({ gridData, onEditCell }: { gridData: string; onEditCell?: (row: number, col: number, currentValue: string) => void }) {
  let grid: BingoCell[][] = [];
  try {
    grid = JSON.parse(gridData);
  } catch {
    return <p className="text-neon-pink text-xs text-center">カードデータの解析に失敗しました</p>;
  }

  return (
    <div className="grid grid-cols-5 gap-1.5 p-3">
      {grid.map((row, rowIndex) =>
        row.map((cell, colIndex) => {
          const isCenter = rowIndex === 2 && colIndex === 2;
          const isInnerRing = !isCenter && rowIndex >= 1 && rowIndex <= 3 && colIndex >= 1 && colIndex <= 3;
          const isSpare = cell.score.includes('◢');

          return (
            <button
              key={cell.id}
              onClick={() => onEditCell?.(rowIndex, colIndex, cell.score)}
              disabled={isCenter || !onEditCell}
              className={`
                w-12 h-12 md:w-14 md:h-14
                rounded-md font-mono font-bold text-xs
                flex items-center justify-center
                border-2 transition-all duration-200
                ${onEditCell && !isCenter ? 'hover:scale-105 cursor-pointer' : 'cursor-default'}
              `}
              style={isCenter ? {
                backgroundColor: 'rgba(255, 190, 11, 0.3)',
                color: '#ffbe0b',
                borderColor: '#ffbe0b',
                boxShadow: '0 0 10px rgba(255, 190, 11, 0.5)',
              } : isInnerRing || isSpare ? {
                backgroundColor: 'rgba(255, 190, 11, 0.15)',
                color: '#ffbe0b',
                borderColor: 'rgba(255, 190, 11, 0.5)',
              } : {
                backgroundColor: 'rgba(0, 245, 255, 0.1)',
                color: '#00f5ff',
                borderColor: 'rgba(0, 245, 255, 0.3)',
              }}
              title={onEditCell && !isCenter ? 'クリックして編集' : undefined}
            >
              {cell.score}
            </button>
          );
        })
      )}
    </div>
  );
}

/**
 * 管理者画面（パスワード認証）
 */
export default function Admin() {
  const utils = trpc.useUtils();
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  // カード編集ダイアログ
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editRow, setEditRow] = useState(0);
  const [editCol, setEditCol] = useState(0);
  const [editValue, setEditValue] = useState('');
  const [editOriginal, setEditOriginal] = useState('');

  const verifyMutation = trpc.admin.verifyPassword.useMutation({
    onSuccess: () => {
      setIsAuthenticated(true);
      setAuthError('');
    },
    onError: () => {
      setAuthError('パスワードが正しくありません');
    },
  });

  const { data: teamStates, isLoading } = trpc.admin.getAllTeamStates.useQuery(
    { password },
    {
      refetchInterval: 3000,
      enabled: isAuthenticated,
    }
  );

  // 共通カード配置を取得（プレビュー用）
  const { data: sharedLayout, refetch: refetchLayout } = trpc.admin.getSharedLayout.useQuery(
    { password },
    { enabled: isAuthenticated }
  );

  const resetAllMutation = trpc.admin.resetAllTeams.useMutation({
    onSuccess: () => {
      toast.success('全チームのデータをリセットしました（共通カードも含む）');
      utils.admin.getAllTeamStates.invalidate();
      utils.team.getRankings.invalidate();
      utils.team.getSharedLayout.invalidate();
      utils.admin.getSharedLayout.invalidate();
      setConfirmReset(false);
    },
    onError: (err) => {
      toast.error(`エラー: ${err.message}`);
    },
  });

  const resetTeamMutation = trpc.admin.resetTeam.useMutation({
    onSuccess: (_, variables) => {
      toast.success(`チーム${variables.teamNumber}をリセットしました`);
      utils.admin.getAllTeamStates.invalidate();
      utils.team.getRankings.invalidate();
    },
    onError: (err) => {
      toast.error(`エラー: ${err.message}`);
    },
  });

  const resetSharedLayoutMutation = trpc.admin.resetSharedLayout.useMutation({
    onSuccess: () => {
      toast.success('新しいカードを生成しました。');
      utils.team.getSharedLayout.invalidate();
      utils.admin.getSharedLayout.invalidate();
      // 即座にプレビューを更新
      refetchLayout();
    },
    onError: (err) => {
      toast.error(`エラー: ${err.message}`);
    },
  });

  const updateSharedLayoutMutation = trpc.admin.updateSharedLayout.useMutation({
    onSuccess: () => {
      toast.success('カードのマス内容を更新しました');
      utils.team.getSharedLayout.invalidate();
      utils.admin.getSharedLayout.invalidate();
      setEditDialogOpen(false);
    },
    onError: (err) => {
      toast.error(`エラー: ${err.message}`);
    },
  });

  // マス編集ダイアログを開く
  const handleEditCell = (row: number, col: number, currentValue: string) => {
    setEditRow(row);
    setEditCol(col);
    setEditValue(currentValue);
    setEditOriginal(currentValue);
    setEditDialogOpen(true);
  };

  // マス内容を保存
  const handleSaveCell = () => {
    if (!sharedLayout || !editValue.trim()) return;

    try {
      const grid: BingoCell[][] = JSON.parse(sharedLayout);
      grid[editRow][editCol].score = editValue.trim();
      const newGridData = JSON.stringify(grid);
      updateSharedLayoutMutation.mutate({ password, gridData: newGridData });
    } catch {
      toast.error('カードデータの更新に失敗しました');
    }
  };

  // パスワード認証画面
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="bg-card border-2 border-neon-cyan rounded-lg p-8 text-center max-w-sm w-full" style={{
          boxShadow: '0 0 30px rgba(0, 245, 255, 0.4)'
        }}>
          <Lock size={48} className="text-neon-cyan mx-auto mb-4" style={{
            filter: 'drop-shadow(0 0 10px rgba(0, 245, 255, 0.8))'
          }} />
          <h1 className="text-neon-cyan font-bold text-xl mb-1">管理者画面</h1>
          <p className="text-neon-cyan text-xs opacity-60 mb-6">BOWLING BINGO ADMIN</p>

          <div className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') verifyMutation.mutate({ password });
              }}
              placeholder="パスワードを入力"
              className="w-full bg-dark-card border-2 border-neon-cyan rounded-lg px-4 py-3 text-neon-cyan placeholder-neon-cyan placeholder-opacity-40 focus:outline-none focus:border-neon-yellow transition-colors text-center font-mono"
            />
            {authError && (
              <p className="text-neon-pink text-xs">{authError}</p>
            )}
            <Button
              onClick={() => verifyMutation.mutate({ password })}
              disabled={verifyMutation.isPending || !password}
              className="w-full text-background font-bold hover:opacity-90 transition-colors"
              style={{ backgroundColor: '#7680c6' }}
            >
              {verifyMutation.isPending ? '確認中...' : '入室する'}
            </Button>
            <Link href="/">
              <Button
                variant="outline"
                className="w-full border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-background"
              >
                <ArrowLeft size={16} className="mr-2" />
                ホームに戻る
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center p-4 relative overflow-hidden">
      {/* 背景装飾 */}
      <div className="fixed inset-0 pointer-events-none opacity-10">
        <div className="absolute top-10 right-10 w-32 h-32 bg-neon-pink rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-40 h-40 bg-neon-cyan rounded-full blur-3xl" />
      </div>

      {/* ヘッダー */}
      <div className="w-full max-w-lg mb-6 z-10 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/">
            <Button
              variant="outline"
              size="sm"
              className="border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-background"
            >
              <ArrowLeft size={16} />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-neon-yellow" style={{
              textShadow: '0 0 15px rgba(255, 190, 11, 0.8)'
            }}>
              管理者画面
            </h1>
            <p className="text-neon-cyan text-xs">BOWLING BINGO ADMIN</p>
          </div>
          <div className="ml-auto">
            <Shield size={20} className="text-neon-yellow" style={{
              filter: 'drop-shadow(0 0 6px rgba(255, 190, 11, 0.8))'
            }} />
          </div>
        </div>

        {/* 全チームリセットボタン */}
        <div className="bg-card border-2 border-neon-pink rounded-lg p-4 mb-4" style={{
          boxShadow: '0 0 15px rgba(255, 0, 110, 0.3)'
        }}>
          <h2 className="text-neon-pink font-bold text-sm mb-3 flex items-center gap-2">
            <Trash2 size={16} />
            全チームリセット（共通カード含む）
          </h2>
          {!confirmReset ? (
            <Button
              onClick={() => setConfirmReset(true)}
              className="w-full bg-neon-pink text-background border-2 border-neon-pink hover:bg-red-500 font-bold transition-all"
            >
              全チームのデータをリセット
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-neon-yellow text-xs text-center mb-2">本当にリセットしますか？この操作は取り消せません。</p>
              <div className="flex gap-2">
                <Button
                  onClick={() => resetAllMutation.mutate({ password })}
                  disabled={resetAllMutation.isPending}
                  className="flex-1 bg-neon-pink text-background font-bold hover:bg-red-500"
                >
                  {resetAllMutation.isPending ? '処理中...' : 'はい、リセット'}
                </Button>
                <Button
                  onClick={() => setConfirmReset(false)}
                  variant="outline"
                  className="flex-1 border-neon-cyan text-neon-cyan"
                >
                  キャンセル
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* 共通カード管理セクション */}
        <div className="bg-card border-2 border-neon-yellow rounded-lg p-4 mb-4" style={{
          boxShadow: '0 0 15px rgba(255, 190, 11, 0.3)'
        }}>
          <h2 className="text-neon-yellow font-bold text-sm mb-3 flex items-center gap-2">
            <RefreshCw size={16} />
            共通カード管理
          </h2>
          <p className="text-neon-cyan text-xs mb-3 opacity-70">
            全チームで共有するビンゴカードの配置を管理します。リセットすると新しいカードが生成されます。
          </p>
          <div className="flex gap-2 mb-4">
            <Button
              onClick={() => resetSharedLayoutMutation.mutate({ password })}
              disabled={resetSharedLayoutMutation.isPending}
              className="flex-1 bg-neon-yellow text-background border-2 border-neon-yellow hover:opacity-80 font-bold transition-all"
            >
              {resetSharedLayoutMutation.isPending ? '処理中...' : '新しいカードを生成'}
            </Button>
            <Button
              onClick={() => refetchLayout()}
              variant="outline"
              className="border-neon-yellow text-neon-yellow hover:bg-neon-yellow hover:text-background"
            >
              <RefreshCw size={14} />
            </Button>
          </div>

          {/* カードプレビュー */}
          {sharedLayout ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Eye size={14} className="text-neon-cyan" />
                <h3 className="text-neon-cyan font-bold text-xs">カードプレビュー</h3>
                <span className="text-neon-cyan text-xs opacity-50 ml-auto">
                  <Pencil size={10} className="inline mr-1" />
                  マスをタップして編集
                </span>
              </div>
              <div className="bg-dark-card rounded-lg border border-neon-cyan border-opacity-30 flex justify-center">
                <CardPreview gridData={sharedLayout} onEditCell={handleEditCell} />
              </div>
              <p className="text-neon-cyan text-xs opacity-40 mt-2 text-center">
                黄色 = スペアマス（内側2列目） / 水色 = 通常マス / 中央 = ストライク
              </p>
            </div>
          ) : (
            <div className="bg-dark-card rounded-lg border border-neon-cyan border-opacity-30 p-6 text-center">
              <p className="text-neon-cyan text-xs opacity-60">
                カードが未生成です。「新しいカードを生成」ボタンを押すか、ホーム画面でチームがアクセスすると自動生成されます。
              </p>
            </div>
          )}
        </div>

        {/* チーム別状態テーブル */}
        <div className="bg-card border-2 border-neon-cyan rounded-lg p-4" style={{
          boxShadow: '0 0 15px rgba(0, 245, 255, 0.3)'
        }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-neon-cyan font-bold text-sm flex items-center gap-2">
              <Trophy size={16} />
              チーム別状態
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => utils.admin.getAllTeamStates.invalidate()}
              className="border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-background h-7 w-7 p-0"
            >
              <RefreshCw size={12} />
            </Button>
          </div>

          {isLoading ? (
            <p className="text-neon-cyan text-xs text-center py-4">読み込み中...</p>
          ) : !teamStates || teamStates.length === 0 ? (
            <p className="text-neon-cyan text-xs text-center py-4">データなし（全チームリセット済み）</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-neon-cyan border-opacity-30">
                  <th className="text-neon-cyan text-left pb-2">チーム</th>
                  <th className="text-neon-cyan text-center pb-2">ビンゴ</th>
                  <th className="text-neon-cyan text-right pb-2">スコア</th>
                  <th className="text-neon-cyan text-right pb-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {teamStates.map((team) => {
                  const tc = getTeamColor(team.teamNumber);
                  return (
                    <tr key={team.teamNumber} className="border-b border-opacity-20" style={{ borderColor: tc.color }}>
                      <td className="py-2 font-mono font-bold" style={{
                        color: tc.color,
                        textShadow: `0 0 6px ${tc.glow}`,
                      }}>
                        <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: tc.color }} />
                        チーム {team.teamNumber}
                        <span className="ml-1 opacity-60 text-xs">（{tc.name}）</span>
                      </td>
                      <td className="py-2 text-center">
                        {team.completedLines > 0 ? (
                          <span className="font-bold" style={{
                            color: tc.color,
                            textShadow: `0 0 6px ${tc.glow}`,
                          }}>{team.completedLines}</span>
                        ) : (
                          <span className="text-neon-cyan opacity-40">-</span>
                        )}
                      </td>
                      <td className="py-2 text-right font-bold font-mono" style={{
                        color: tc.color,
                        textShadow: `0 0 6px ${tc.glow}`,
                      }}>
                        {team.totalScore}
                      </td>
                      <td className="py-2 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resetTeamMutation.mutate({ teamNumber: team.teamNumber, password })}
                          disabled={resetTeamMutation.isPending}
                          className="h-6 px-2 text-xs transition-all"
                          style={{
                            borderColor: tc.color,
                            color: tc.color,
                          }}
                        >
                          <Trash2 size={10} className="mr-1" />
                          リセット
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* マス内容編集ダイアログ */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-card border-2 border-neon-yellow max-w-xs mx-auto" style={{
          boxShadow: '0 0 40px rgba(255, 190, 11, 0.5)',
        }}>
          <DialogHeader>
            <DialogTitle className="text-neon-yellow text-center font-bold" style={{
              textShadow: '0 0 10px rgba(255, 190, 11, 0.6)',
            }}>
              <Pencil size={16} className="inline mr-2" />
              マス内容を編集
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-neon-cyan text-xs mb-2 text-center opacity-70">
              位置: {editRow + 1}行 {editCol + 1}列 （現在: {editOriginal}）
            </p>
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveCell()}
              className="w-full text-center text-3xl font-bold bg-transparent border-b-2 border-neon-yellow outline-none text-neon-yellow font-mono pb-2"
              style={{
                textShadow: '0 0 10px rgba(255, 190, 11, 0.6)',
              }}
              autoFocus
            />
            <p className="text-neon-cyan text-xs mt-3 opacity-50 text-center">
              例: 3|5（通常）、5◢（スペア）、▶︎◀︎（ストライク）
            </p>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              className="flex-1 border-neon-cyan text-neon-cyan"
            >
              <X size={14} className="mr-1" />
              キャンセル
            </Button>
            <Button
              onClick={handleSaveCell}
              disabled={updateSharedLayoutMutation.isPending || !editValue.trim()}
              className="flex-1 bg-neon-yellow text-background font-bold hover:opacity-80"
            >
              <Save size={14} className="mr-1" />
              {updateSharedLayoutMutation.isPending ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
