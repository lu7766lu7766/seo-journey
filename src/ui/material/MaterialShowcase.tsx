import {
  Corkboard,
  FourPointStar,
  Paper,
  Pin,
  RoomBadge,
  SakuraPetal,
  SearchRule,
  Stamp,
  StickyNote,
  Tape,
  WoodPlaque,
} from './index'

const SWATCHES = [
  { name: '紙張（米白）', token: '--color-paper', hex: '#fbf6eb', darkText: true },
  { name: '紙張（微黃）', token: '--color-paper-warm', hex: '#f5ebd4', darkText: true },
  { name: '牛皮紙色', token: '--color-paper-kraft', hex: '#e9d9bc', darkText: true },
  { name: '軟木底色', token: '--color-cork', hex: '#c79563', darkText: true },
  { name: '木框深棕', token: '--color-wood', hex: '#7a4f2d', darkText: false },
  { name: '朱紅印泥', token: '--color-stamp', hex: '#c6382b', darkText: false },
  { name: '便利貼黃', token: '--color-note-yellow', hex: '#fff1a8', darkText: true },
  { name: '櫻花膠帶', token: '--color-tape-sakura', hex: '#f5a8be', darkText: true },
]

/** Dev-only 材質系統與字級規範展示頁（/?dev=materials）。 */
export function MaterialShowcase() {
  return (
    <div
      data-testid="material-showcase"
      className="grid h-full w-full grid-cols-[372px_1fr] gap-5 overflow-hidden bg-[#1b1512] p-5 text-[#f7efe2]"
    >
      {/* 左欄：色票、字級、母題與按鈕 */}
      <div className="flex min-h-0 flex-col justify-between gap-3">
        <div className="rounded-lg border border-[#5a422c] bg-[#261d17] p-4">
          <div className="flex items-center justify-between">
            <h1 className="font-title text-[22px] font-bold text-[#fbf6eb]">社辦文具材質系統</h1>
            <RoomBadge label="404" />
          </div>
          <p className="mt-1 text-[13px] text-[#d5c3aa]">1280×720 基準展示（僅 dev 模式載入）</p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {SWATCHES.map((s) => (
              <div key={s.token} className="flex items-center gap-2 rounded bg-black/25 p-1.5">
                <span
                  className="h-6 w-6 shrink-0 rounded border border-white/20"
                  style={{ backgroundColor: s.hex }}
                />
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-bold text-[#f7efe2]">{s.name}</div>
                  <div className="truncate text-[13px] text-[#bda88e]">{s.hex}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-[#5a422c] bg-[#261d17] p-4">
          <h2 className="font-title text-[18px] font-bold text-[#f5ebd4]">字級規範（無 &lt; 13px 文字）</h2>
          <div className="mt-2 space-y-1.5 text-[#f7efe2]">
            <p className="font-title text-[24px] font-bold leading-tight">標題 24px · 霞鶩文楷 TC</p>
            <p className="font-title text-[16px] leading-snug">內文 16px · 手寫感委託與評語文字</p>
            <p className="text-[15px]">數據 15px · Noto Sans TC 清晰最小內文</p>
            <p className="text-[13px] text-[#d5c3aa]">次要資訊 13px · 週次、標籤與註記底線</p>
          </div>
        </div>

        <div className="rounded-lg border border-[#5a422c] bg-[#261d17] p-4">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-bold text-[#f5ebd4]">品牌母題與實體按鈕</span>
            <div className="flex items-center gap-2">
              <FourPointStar size={16} color="#9fd3f0" />
              <SakuraPetal size={18} rotate={14} />
            </div>
          </div>
          <SearchRule tone="gold" className="my-2.5" />
          <div className="flex items-center justify-between gap-3">
            <WoodPlaque className="px-4 py-1.5">
              <span className="font-title text-[15px] font-bold">木牌標題樣式</span>
            </WoodPlaque>
            <button type="button" className="mat-pass-btn px-4 py-2 font-title text-[16px] font-bold">
              <span>前往週末 →</span>
            </button>
          </div>
        </div>
      </div>

      {/* 右欄：軟木公佈欄上的實體紙張、圖釘、膠帶、印章與便利貼 */}
      <Corkboard
        className="h-full w-full"
        innerClassName="px-6 py-4"
        header={
          <div className="flex items-center justify-between">
            <WoodPlaque>
              <span className="font-title text-[22px] font-bold">實體元件展示板</span>
            </WoodPlaque>
            <div className="flex items-center gap-3 rounded bg-[#3b210e]/70 px-3 py-1.5">
              <Pin color="red" size={22} />
              <Pin color="blue" size={22} />
              <Pin color="yellow" size={22} />
              <Pin color="mint" size={22} />
              <Pin color="sakura" size={22} />
              <Pin color="brass" size={22} />
            </div>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-5 py-2">
          <Paper tone="cream" rule="lined" rotate={-1.2} interactive className="p-4 pt-6">
            <Pin color="red" size={24} className="absolute -top-3 left-1/2 -translate-x-1/2" />
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[13px] font-bold text-ink-muted">Paper · cream + lined</p>
                <h3 className="font-title text-[19px] font-bold text-ink-body">橫線筆記委託單</h3>
              </div>
              <Stamp label="本週截止" color="vermilion" shape="rect" rotate={-8} size="sm" />
            </div>
            <p className="mt-2 font-title text-[15px] leading-relaxed text-ink-body">
              微傾角度、底部翹角陰影，滑鼠移入或鍵盤聚焦會輕輕抬起。
            </p>
          </Paper>

          <Paper tone="warm" rule="grid" rotate={1.1} dogEar className="p-4 pt-6">
            <Tape color="sky" pattern="stripe" rotate={-4} className="absolute -top-2.5 left-1/2 -translate-x-1/2" />
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[13px] font-bold text-ink-muted">Paper · warm + grid + dogEar</p>
                <h3 className="font-title text-[19px] font-bold text-ink-body">方格手帳與摺角</h3>
              </div>
              <Stamp label="已確認" color="navy" shape="circle" rotate={7} size="sm" />
            </div>
            <p className="mt-2 font-title text-[15px] leading-relaxed text-ink-body">
              適合排程表與成績報表，搭配手撕邊半透明和紙膠帶。
            </p>
          </Paper>

          <Paper tone="kraft" rule="memo" rotate={0.8} className="p-4 pt-6">
            <Tape color="sakura" pattern="dots" rotate={5} className="absolute -top-2.5 left-6" />
            <Tape color="mint" pattern="solid" rotate={-8} className="absolute -top-2.5 right-6" />
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[13px] font-bold text-ink-muted">Paper · kraft + memo</p>
                <h3 className="font-title text-[19px] font-bold text-ink-body">牛皮便箋紙</h3>
              </div>
              <Stamp label="已完成" color="forest" shape="oval" rotate={-6} size="sm" />
            </div>
            <p className="mt-2 font-title text-[15px] leading-relaxed text-ink-body">
              頂端紅線與橫紋便箋，可作特殊挑戰書或週報說明卡。
            </p>
          </Paper>

          <div className="grid grid-cols-2 gap-3.5 pt-2">
            <StickyNote color="yellow" rotate={-2} attach="pin" pinColor="blue" className="p-3.5 pt-5">
              <p className="text-[13px] font-sans font-bold text-ink-muted">StickyNote · yellow</p>
              <p className="mt-1 text-[16px] font-bold">額度剩 2/2 件</p>
            </StickyNote>
            <StickyNote color="pink" rotate={2.2} attach="tape" tapeColor="cream" className="p-3.5 pt-5">
              <p className="text-[13px] font-sans font-bold text-ink-muted">StickyNote · pink</p>
              <p className="mt-1 text-[16px] font-bold">記得備份網站！</p>
            </StickyNote>
            <StickyNote color="mint" rotate={1.4} className="p-3.5">
              <p className="text-[13px] font-sans font-bold text-ink-muted">StickyNote · mint</p>
              <p className="mt-1 text-[15px] font-bold">結構化資料檢查</p>
            </StickyNote>
            <StickyNote color="sky" rotate={-1.6} className="p-3.5">
              <p className="text-[13px] font-sans font-bold text-ink-muted">StickyNote · sky</p>
              <p className="mt-1 text-[15px] font-bold">LCP &lt; 2.5s</p>
            </StickyNote>
          </div>
        </div>
      </Corkboard>
    </div>
  )
}

export default MaterialShowcase
