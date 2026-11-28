import { useSettings } from '@/store/settings'
import { useUI } from '@/store/ui'
import { Panel } from './Panel'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-4 flex items-center justify-between gap-6 text-lg">
      <span>{label}</span>
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
      <Row label={`BGM 音量 ${Math.round(s.bgmVolume * 100)}`}>
        <input type="range" min={0} max={1} step={0.05} value={s.bgmVolume} onChange={(e) => s.set({ bgmVolume: +e.target.value })} />
      </Row>
      <Row label={`音效音量 ${Math.round(s.sfxVolume * 100)}`}>
        <input type="range" min={0} max={1} step={0.05} value={s.sfxVolume} onChange={(e) => s.set({ sfxVolume: +e.target.value })} />
      </Row>
      <Row label="允許快轉未讀文字">
        <input type="checkbox" checked={s.skipUnreadAllowed} onChange={(e) => s.set({ skipUnreadAllowed: e.target.checked })} />
      </Row>
      <div className="flex justify-end gap-3">
        <button className="btn-pastel" onClick={s.reset}>恢復預設</button>
        <button className="btn-pastel" onClick={back}>返回</button>
      </div>
      <p className="mt-4 text-center text-xs text-ink/60" data-testid="settings-credits">
        背景音樂：ACE-Step 生成（Apache 2.0）<br />音效：Stable Audio Open 生成 — Powered by Stability AI
      </p>
    </Panel>
  )
}
