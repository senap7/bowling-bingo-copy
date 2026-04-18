import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { ArrowLeft, RefreshCw, Trash2, Trophy, Shield } from 'lucide-react';
import { Link } from 'wouter';
import { toast } from 'sonner';
import { useState } from 'react';

/**
 * 管理者画面
 * - 全チームの状態確認
 * - 全チームリセット
 * - 個別チームリセット
 */
export default function Admin() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [confirmReset, setConfirmReset] = useState(false);

  const { data: teamStates, isLoading } = trpc.admin.getAllTeamStates.useQuery(undefined, {
    refetchInterval: 3000,
    enabled: isAuthenticated && user?.role === 'admin',
  });

  const resetAllMutation = trpc.admin.resetAllTeams.useMutation({
    onSuccess: () => {
      toast.success('全チームのデータをリセットしました');
      utils.admin.getAllTeamStates.invalidate();
      utils.team.getRankings.invalidate();
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

  // 未認証または管理者でない場合
  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="bg-card border-2 border-neon-pink rounded-lg p-8 text-center max-w-sm" style={{
          boxShadow: '0 0 30px rgba(255, 0, 110, 0.4)'
        }}>
          <Shield size={48} className="text-neon-pink mx-auto mb-4" />
          <h1 className="text-neon-pink font-bold text-xl mb-2">アクセス拒否</h1>
          <p className="text-neon-cyan text-sm mb-6">管理者権限が必要です</p>
          <Link href="/">
            <Button className="bg-neon-cyan text-background font-bold">
              ホームに戻る
            </Button>
          </Link>
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
        </div>

        {/* 全チームリセットボタン */}
        <div className="bg-card border-2 border-neon-pink rounded-lg p-4 mb-4" style={{
          boxShadow: '0 0 15px rgba(255, 0, 110, 0.3)'
        }}>
          <h2 className="text-neon-pink font-bold text-sm mb-3 flex items-center gap-2">
            <Trash2 size={16} />
            全チームリセット
          </h2>
          {!confirmReset ? (
            <Button
              onClick={() => setConfirmReset(true)}
              className="w-full bg-transparent border-2 border-neon-pink text-neon-pink hover:bg-neon-pink hover:text-background font-bold transition-all"
            >
              全チームのデータをリセット
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-neon-yellow text-xs text-center mb-2">本当にリセットしますか？この操作は取り消せません。</p>
              <div className="flex gap-2">
                <Button
                  onClick={() => resetAllMutation.mutate()}
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

        {/* チーム別状態テーブル */}
        <div className="bg-card border-2 border-neon-yellow rounded-lg p-4" style={{
          boxShadow: '0 0 15px rgba(255, 190, 11, 0.3)'
        }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-neon-yellow font-bold text-sm flex items-center gap-2">
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
                {teamStates.map((team) => (
                  <tr key={team.teamNumber} className="border-b border-neon-cyan border-opacity-10">
                    <td className="py-2 text-neon-cyan font-mono font-bold">
                      チーム {team.teamNumber}
                    </td>
                    <td className="py-2 text-center">
                      {team.completedLines > 0 ? (
                        <span className="text-neon-pink font-bold">{team.completedLines}</span>
                      ) : (
                        <span className="text-neon-cyan opacity-40">-</span>
                      )}
                    </td>
                    <td className="py-2 text-right text-neon-yellow font-bold font-mono">
                      {team.totalScore}
                    </td>
                    <td className="py-2 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => resetTeamMutation.mutate({ teamNumber: team.teamNumber })}
                        disabled={resetTeamMutation.isPending}
                        className="border-neon-pink text-neon-pink hover:bg-neon-pink hover:text-background h-6 px-2 text-xs"
                      >
                        <Trash2 size={10} className="mr-1" />
                        リセット
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
