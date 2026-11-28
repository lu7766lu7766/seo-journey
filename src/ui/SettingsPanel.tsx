import { useSettings } from '@/store/settings'
import { useUI } from '@/store/ui'
import { Panel } from './Panel'
import { Switch } from './Switch'

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="mb-4 flex items-center justify-between gap-6 text-lg">
      <span>
        {label}
        {hint && <span className="ml-2 text-sm text-ink/60">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

export function SettingsPanel() {
  const s = useSettings()
  const back = () => useUI.getState().setOverlay(useUI.getState().screen === 'game' ? 'menu' : null)
  return (
    <Panel title="設定" onClose={back}>
      <Row label={`文字速度 ${s.textSpeed} 字/秒`}>
        <input type="range" min={10} max={120} value={s.textSpeed} onChange={(e) => s.set({ textSpeed: +e.target.value })} />
      </Row>
      <Row label={`自動播放間隔 ${(s.autoDelayMs / 1000).toFixed(1)} 秒`}>
        <input type="range" min={300} max={4000} step={100} value={s.autoDelayMs} onChange={(e) => s.set({ autoDelayMs: +e.target.value })} />
      </Row>
      <Row label="音樂">
        <Switch checked={s.musicOn} onChange={(musicOn) => s.set({ musicOn })} label="音樂" testId="setting-music" />
      </Row>
      <Row label="音效">
        <Switch checked={s.sfxOn} onChange={(sfxOn) => s.set({ sfxOn })} label="音效" testId="setting-sfx" />
      </Row>
      <Row label="語音" hint="角色台詞配音">
        <Switch checked={s.voiceOn} onChange={(voiceOn) => s.set({ voiceOn })} label="語音" testId="setting-voice" />
      </Row>
      <Row label="允許快轉未讀文字">
        <Switch checked={s.skipUnreadAllowed} onChange={(skipUnreadAllowed) => s.set({ skipUnreadAllowed })} label="允許快轉未讀文字" testId="setting-skip-unread" />
      </Row>
      <div className="flex justify-end gap-3">
        <button className="btn-pastel" onClick={s.reset}>恢復預設</button>
        <button className="btn-pastel" onClick={back}>返回</button>
      </div>
      <p className="mt-4 text-center text-xs text-ink/60" data-testid="settings-credits">
        背景音樂：ACE-Step 1.5 生成（MIT）<br />音效：Stable Audio Open 生成 — Powered by Stability AI
      </p>
    </Panel>
  )
}
