import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { ArrowLeft, RefreshCw, Trash2, Trophy, Shield, Lock } from 'lucide-react';
import { Link } from 'wouter';
import { toast } from 'sonner';
import { useState } from 'react';
import { getTeamColor } from '@shared/teamColors';

/**
 * 管理者画面（パスワード認証）
 * - パスワード: bowlinglover
 * - 全チームの状態確認
 * - 全チームリセット（共通カードも含む）
 * - 個別チームリセット
 * - 共通カード配置リセット
 */
export default function Admin() {
  const utils = trpc.useUtils();
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

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

  const resetAllMutation = trpc.admin.resetAllTeams.useMutation({
    onSuccess: () => {
      toast.success('全チームのデータをリセットしました（共通カードも含む）');
      utils.admin.getAllTeamStates.invalidate();
      utils.team.getRankings.invalidate();
      utils.team.getSharedLayout.invalidate();
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
      toast.success('共通カード配置をリセットしました。次回アクセス時に新しいカードが生成されます。');
      utils.team.getSharedLayout.invalidate();
    },
    onError: (err) => {
      toast.error(`エラー: ${err.message}`);
    },
  });

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

        {/* 共通カードのみリセット */}
        <div className="bg-card border-2 border-neon-yellow rounded-lg p-4 mb-4" style={{
          boxShadow: '0 0 15px rgba(255, 190, 11, 0.3)'
        }}>
          <h2 className="text-neon-yellow font-bold text-sm mb-3 flex items-center gap-2">
            <RefreshCw size={16} />
            共通カード配置のリセット
          </h2>
          <p className="text-neon-cyan text-xs mb-3 opacity-70">
            全チームで共有するビンゴカードの配置を新しくします。次回アクセス時に新しいカードが生成されます。
          </p>
          <Button
            onClick={() => resetSharedLayoutMutation.mutate({ password })}
            disabled={resetSharedLayoutMutation.isPending}
            className="w-full bg-neon-yellow text-background border-2 border-neon-yellow hover:opacity-80 font-bold transition-all"
          >
            {resetSharedLayoutMutation.isPending ? '処理中...' : '共通カードをリセット'}
          </Button>
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
    </div>
  );
}
