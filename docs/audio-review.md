# 音訊資產與配樂系統嚴格審查報告

> **審查對象**：《直到你找到我 ～青葉學園網站研究社～》（`seo-journey`）全套音訊資產、配樂分配與產製管線  
> **審查日期**：2026-11-28  
> **審查範圍**：15 首背景音樂（BGM）、32 個音效（SFX）、全 39 個劇本場景、養成／小遊戲／標題／結局介面、以及 [`docs/audio-requests.md`](./audio-requests.md) 與 `scripts/colab/{bgm,sfx}/` 產製規格  
> **審查原則**：嚴格對標遊戲美術風格（`public/og-image.jpg` 與 `public/art/` 呈現之清新日系動漫校園賽璐璐戀愛視覺小說）與實際遊戲性需求；只修改本審查報告，不更動 `src/**`、`tests/**`、`public/**`。

---

## 1. 審查方法與資料來源標示

為避免「僅靠文字與數據猜聽感」，本報告嚴格區分每項結論的來源標籤：

| 標示 | 來源與驗證方式 | 涵蓋範圍 |
| --- | --- | --- |
| **【實聽】** | 直接以多模態音訊讀取並完整聆聽 MP3 音訊內容（含原檔各段落演進與尾段收束） | 全部 **15 首 BGM**（`title` / `daily` / `warm` / `tense` / `festival` 各 `c1`–`c3`）與全部 **32 個 SFX**（8 類 × `c1`–`c4`） |
| **【客觀分析】** | 本機 `ffmpeg` 解碼為 44.1 kHz 32-bit float PCM 並以 `numpy` 計算聲學指標，交叉比對 [`scripts/audio/bgm-candidates.json`](../scripts/audio/bgm-candidates.json)、[`scripts/audio/sfx-candidates.json`](../scripts/audio/sfx-candidates.json) 與 [`public/audio/manifest.json`](../public/audio/manifest.json) | 總長與 MP3 padding 誤差、5–95% 動態範圍、2 秒窗最大響度跳動、立體聲左右聲道相關度、5 頻帶能量占比（20–120 / 120–500 / 500–2500 / 2500–6000 / 6000–16000 Hz）、接縫跨界 ±500 ms 響度差與頻譜餘弦相似度 |
| **【視覺對照】** | 直接檢視遊戲封面、背景、立繪與 CG 圖檔 | `public/og-image.jpg`、`public/art/bg/{clubroom,rooftop,rain,festival}.webp`、`public/art/{rin,hare,mirai}/`、`public/art/kuro/smug.webp`、`public/art/cg/{end-bad,end-blackhat,date-rin-3,date-hare-3,date-mirai-3}.webp` |
| **【程式碼核查】** | 全盤掃描音訊引擎、狀態管理、介面與劇本指令 | `src/audio/{engine,webBackend,synth,manifest,index}.ts`、`src/store/{game,save,settings}.ts`、`src/ui/**`、`src/minigames/**`、`src/content/scenes/{main,side,dates,endings}/*.ts`（共 39 份劇本） |

> **方法學註記**：本機環境未預裝 `librosa`、`laion_clap`、`torch` 與 `essentia`（僅有 `ffmpeg` / `ffprobe` / `numpy`），但因審核過程中已能**直接實聽全部 47 個音檔**，主觀曲風、配器辨識、情緒判斷與突兀爆音檢出皆以**【實聽】**為核心依據，並以 `ffmpeg + numpy` 客觀指標交叉驗證動態與接縫一致性。

### 視覺與遊戲調性基準（【視覺對照】）

實看 `public/og-image.jpg` 與 `public/art/`：
- **畫風**：高明度、乾淨賽璐璐線條、柔暖光影的**現代日系動漫校園青春視覺小說**（櫻花校門、夕陽斜照的 404 社辦、藍天積雨雲天台、燈籠祭典廣場、星空天文館）。
- **角色氣質**：白鷺凜（嚴謹端莊帶反差萌貓奴學生會長）、夏川晴（陽光活潑、掛著耳機的廣播社社長）、星野未來（銀紫長髮與發光星形髮夾的冷靜知性少女）、黑川翔（外強中乾的高中生搞笑反派）。
- **配樂與音效應有聽感**：清澈、留白、具透明感的日系校園原聲器樂（鋼琴、室內樂弦樂、木吉他、鐘琴／木琴、輕爵士或輕快電鋼琴），搭配溫潤圓滑的木質／清亮鐘琴 UI 音效。任何**歐美體育館失真電吉他搖滾、西班牙佛朗明哥速彈、夜店 EDM 重拍、好萊塢預告片戰鼓與靜電毛刺喀聲**都會瞬間破壞沉浸感。

---

## 2. 總評與最嚴重前 5 大問題

### 整體分數概況

- **BGM 整體現況**：15 首 BGM **平均僅 1.67 / 5.0**；更致命的是 `public/audio/manifest.json` 目前採用的 5 首**預設曲（`default`）平均僅 1.60 / 5.0**（`title_c2`=2.0、`daily_c1`=1.0、`warm_c2`=1.0、`tense_c1`=2.0、`festival_c2`=2.0），全場僅 **`title_c3`（3.5 / 5）** 勉強接近正統日系校園 VN 語法，但目前並未設為預設。
- **SFX 整體現況**：32 個 SFX 呈強烈兩極化——獎勵／情感類（`card`、`grow`、`bond`、`win`）多達 **4.0–4.5 / 5**，表現不俗；但玩家每秒都會聽到的**極高頻基礎操作音（`click`、`blip` 預設）與系統回饋音（`choice`、`fail` 預設）僅 1.5–2.0 / 5**，而且全包品質最高的 **`win`（最高 4.5 / 5）在程式碼裡根本沒被接線使用**。

### 最嚴重的前 5 個問題

1. **預設日常曲與溫馨約會曲徹底曲風錯亂（最高優先災難，影響 ~80% 遊玩時間）**
   - `daily_c1`（預設，**1 / 5**）【實聽】根本不是日系校園鐘琴撥弦，而是**純西班牙佛朗明哥／吉普賽雙木吉他疾速掃弦炫技**，音符密度極高毫無留白，出現在青葉學園社辦與校園日常裡極度突兀。
   - `warm_c2`（預設，**1 / 5**）【實聽】前 22 秒像凱爾特民謠，**0:28 突然爆出 80–2000s 歐美體育館破音電吉他流行搖滾**（`warm_c1` 更在 0:28 爆成後搖滾重失真吉他音牆）。玩家在天台夕陽告白、海邊約會與雨夜談心時，會被破音電吉他和重鼓直接震醒。

2. **ACE-Step v1 3.5B 150 秒結構失控＋盲目純數據挑預設，產生反向淘汰**
   - 【實聽】確認 ACE-Step v1 3.5B 生成 150 秒長曲時存在極強的「商用流行歌主副歌先驗」：15 首中有 **13 首在 25–40 秒左右強行進重鼓、破音吉他、EDM 夜店舞曲或好萊塢戰鼓預告片高潮**，完全無法平穩墊在對白下。
   - 更糟的是 `scripts/colab/bgm/generate_and_process.py:683` 的 `compute_objective_score()` 只看 LUFS、50 ms 接縫跳動與粗略諧波比例，完全不辨曲風與中段爆音，結果把**破音搖滾 `warm_c2`（103.71 分）、史詩戰鼓 `title_c2`（101.14 分）、佛朗明哥 `daily_c1`（98.67 分）**自動捧成預設，反而把唯一接近正統日系 VN 的 `title_c3`（90.47 分）排在最後一名。

3. **養成系統、小遊戲、低落／搞笑／角色專屬場面全面缺曲與錯配**
   - 【程式碼核查】確認排程（`ScheduleScreen.tsx`）、公佈欄（`NoticeBoard.tsx`）、週末（`WeekendMenu.tsx`）、週報（`WeeklyReport.tsx`）四個養成畫面與全部 **17 關 SEO 小遊戲**（`MinigameHost`）完全沒有呼叫 `audio.bgm()`，直接沿用上一個場景的音樂。
   - 導致第 4 週結束在 `w4.ts:44` 的 `tense`（或打完 `sq-x1.ts`），整個第 4 週排程與公佈欄都在播動作大片緊張曲；第 6 週結束在 `w6.ts:75` 的 `warm`，整個第 6 週排程在播約會曲；約會完進入週報也在播約會曲。
   - 壞結局 `end-bad.ts:4` 用 `warm`、搞笑罰坐結局 `end-blackhat.ts:4` 用 `tense`、13 場約會／休息只混用 `daily`（3 場）與 `warm`（10 場），三位女主角毫無音樂辨識度。

4. **最高頻 UI 音效（`blip_c1`、`click_c1`）刺耳似雜訊，且 `choice`/`fail` 語意失效**
   - 【實聽】+【客觀分析】對白每 3 字觸發一次的 `blip_c1`（預設，**1.5 / 5**，質心 5662.1 Hz）與點擊推進的 `click_c1`（預設，**2.0 / 5**，質心 4358.2 Hz）都是尖細乾硬的高頻靜電喀聲，連播就像喇叭破音雜訊；反觀程式合成的 `blip_c4`（3.5 / 5，703.5 Hz）與 `click_c3`（3.5 / 5，671.9 Hz）圓潤溫和得多卻沒設為預設。
   - `choice_c1`（預設，**2.0 / 5**，6396.5 Hz）實聽為尖銳單音金屬服務鈴且缺第二音上行；`fail_c1`（預設，**2.0 / 5**）實聽只是一下 0.25 秒的乾木頭敲擊，毫無失誤／下行嘆氣感。

5. **音效系統接線遺漏與劇本觸發誤用**
   - 全 SFX 品質最高的 **`win`（最高 `win_c2` 4.5 / 5）在整個 `src/` 從未被任何程式碼呼叫**，三個小遊戲過關（`Spot.tsx:65`、`Serp.tsx:41`、`Quiz.tsx:54`）全部錯播知識卡解鎖音 `card`，失敗甚至播普通按鈕音 `click`！
   - `prologue.ts:8`（撞人閃白轉場）與 `festival.ts:17`（三位評審登場）誤用 `sfx('choice')`；`w6.ts:8`（演算法暴雨排名暴跌閃白）誤用喜劇感提示的 `sfx('fail')`；`WeeklyReport.tsx:32` 不分分數漲跌無條件播 `sfx('bond')`。

---

## 3. 背景音樂（15 首）逐一嚴格審查與評分

> **評分標準（1–5 分）**：  
> **5 分**＝完全符合日系動漫校園 VN 氣質、對白襯底極佳、循環無縫、可直接上線；  
> **4 分**＝風格對題且堪用，僅細節可微調；  
> **3 分**＝尚可過渡，但配器、動態或風格有明顯瑕疵；  
> **2 分**＝曲風明顯偏離或段落起伏干擾對白，應重做；  
> **1 分**＝徹底錯位、刺耳或嚴重破壞體驗，必須立即撤換。

### 3.1 BGM 總評分表

| 曲目 / 版本 | 預設 | 評分 | 【實聽】實際曲風與配器 | 【實聽】情緒與日系 VN 契合度 | 對白襯底與循環表現（含無人聲／失真確認） | 【客觀分析】關鍵指標 | 建議處置 |
| --- | :---: | :---: | :--- | :--- | :--- | :--- | :--- |
| **`title_c1`** | | **2.5** | 鋼琴起手後在 0:28 轉為**西式勵志流行搖滾**（厚重爵士鼓＋電貝斯＋大片流行弦樂） | 前段帶思念感；進鼓組後偏美劇／電影宣傳片勵志感，略顯老派 | **過於搶戲**：LRA 12.94 dB、max2sΔ 5.9 dB；接縫尚順；無人聲、無削波 | BPM 86.1；20–120 Hz 佔 80%；接縫 500ms Δ −0.3 dB / cos 0.89 | 淘汰重做 |
| **`title_c2`** | ✓ | **2.0** | 0:20 柔鋼琴後突轉**史詩奇幻管弦＋定音鼓＋銅管齊奏**（JRPG 決戰感） | 太宏大悲壯，與櫻花校園戀愛社團完全不符 | 雖較均勻但音場厚重；**接縫略跳脫**（尾段大管弦回前段輕鋼琴）；無人聲 | BPM 84.7；LRA 6.44 dB；20–120 Hz 62%；500ms Δ −2.1 dB / cos 0.57 | **撤除預設**並重做 |
| **`title_c3`** | | **3.5** | **獨奏鋼琴＋室內樂小提琴與大提琴**，全程無鼓無搖滾 | **唯一真正接近正統日系校園 VN 的作品**，帶溫柔懷舊思念，略偏歐陸室內樂 | 適合襯底，但強弱起伏大（LRA 13.35 dB、max2sΔ 8.7 dB），部分小提琴長音有輕微 AI 音色漂移；接縫平順；無人聲 | BPM 92.3（目標 75–85 偏快）；20–120 Hz 68%；500ms Δ +0.3 dB / cos 0.83 | **可暫升為過渡預設**；中長期重製精修版 |
| **`daily_c1`** | ✓ | **1.0** | **純西班牙佛朗明哥／吉普賽雙木吉他疾速掃弦炫技** | **徹底離題**：像拉丁餐廳或鬥牛場，毫無日系校園與鐘琴氣息 | 16 分音符掃弦極密且毫無留白，嚴重壓迫對白閱讀；無鼓、無人聲 | BPM 110.0；120–500 Hz 佔 75%；LRA 3.02 dB；500ms Δ −0.1 dB / cos 0.69 | **立刻撤換**並重做 |
| **`daily_c2`** | | **1.0** | 憂鬱慢板美式民謠吉他 → 0:45 爆出**歐美軟搖滾電吉他 solo＋鼓組貝斯** | 憂鬱又變成人搖滾樂團，完全不是輕快校園社辦 | **動態突爆＋接縫斷裂**：0:45 音量瞬間驟增（max2sΔ 10.8 dB），回接處突兀斷層；無人聲 | BPM 79.5（QA 警告）；5–95% 11.7 dB；500ms Δ **+4.8 dB** / cos 0.45 | 淘汰重做 |
| **`daily_c3`** | | **1.5** | **拉丁／熱帶海島馬林巴＋康加與邦哥手鼓** | 像企業簡報罐頭音樂或熱帶渡假村廣告，與台灣／日本校園脫節 | 動態平穩但節奏單調；**接縫音色徹底斷裂**（cos 0.13 全場最低）；無人聲 | BPM 90.7；質心 1834 Hz；500ms Δ −0.3 dB / cos **0.13** | 淘汰重做 |
| **`warm_c1`** | | **1.0** | 前 22 秒鋼琴後，0:28 爆出**失真電吉他後搖滾／前衛搖滾音牆＋重踩大鼓鈸**（1:25 再爆） | 破壞夕陽告白氣氛，像災難片或搖滾演唱會安可曲 | 電吉他高頻嘶鳴與大鼓鈸完全蓋掉對白；接縫尚可；無人聲 | BPM 84.7；LRA 9.77 dB；max2sΔ 4.7 dB；500ms Δ +0.3 dB / cos 0.86 | 淘汰重做 |
| **`warm_c2`** | ✓ | **1.0** | 前 22 秒凱爾特風木吉他直笛 → 0:28 突爆**80–2000s 歐美體育館流行搖滾**（破音強力五和弦） | **嚴重災難**：約會與雨夜談心放體育館破音搖滾，徹底毀掉遊戲情感核心 | 0:28 突襲驚嚇玩家，能量牆過滿無法襯底；無人聲 | BPM 74.9；20–120 Hz 72%；客觀分竟拿 103.71；500ms Δ −0.8 dB / cos 0.76 | **立刻撤換**並重做 |
| **`warm_c3`** | | **2.0** | 憂傷鋼琴＋**哀愁薩克斯風主奏＋90 年代抒情鼓組＋1:25 煽情電吉他獨奏** | 像 90 年代華語 KTV 苦情歌伴唱帶或深夜 Smooth Jazz-Rock，偏老氣哀怨而非青春悸動 | 薩克斯風與電吉他主奏過強，持續搶走對白焦點；接縫偏斷裂；無人聲 | BPM 65.4（偏慢）；5–95% 9.0 dB；500ms Δ −0.8 dB / cos 0.50 | 淘汰重做 |
| **`tense_c1`** | ✓ | **2.0** | 極簡鋼琴 → **漢斯·季默式好萊塢動作大片預告配樂**（電影戰鼓、厚重合成低音、1:25 大型 riser+drop） | 過度動作大片化；本作只是高中網站排名下滑與搞笑反派登場，不需要拆除核彈級配樂 | 1:25 前後的 riser 與轟擊 drop 極具驚嚇感，打斷對話節奏；無人聲 | BPM 95.7；20–120 Hz 62%；500ms Δ +0.6 dB / cos 0.79 | 撤除並重做（改輕度懸疑） |
| **`tense_c2`** | | **1.5** | 前 20 秒俐落撥弦（方向極好！）→ 0:25 炸成 **EDM 電音小提琴夜店舞曲**（4/4 大鼓＋側鏈抽吸＋rave drop） | 前 20 秒很棒，但 0:25 直接變成夜店電音秀，徹底出戲 | drop 與大鼓抽吸無法墊對白；**接縫嚴重錯位**；無人聲 | BPM 87.6；質心 3377.8 Hz；500ms Δ −0.2 dB / cos **0.34** | 淘汰重做 |
| **`tense_c3`** | | **1.0** | **硬核工業電子／賽博龐克機甲最終 Boss 戰**（失真電子鼓＋刺耳尖銳合成主音＋重銅管轟擊） | 壓迫與暴力感極強，與高中校園故事格格不入 | **極度刺耳搶戲**：質心全場最高（4051 Hz），高頻尖嘯令人無法閱讀文字；無人聲 | BPM 99.4；質心 **4051.1 Hz**；500ms Δ +1.8 dB / cos 0.71 | 淘汰重做 |
| **`festival_c1`** | | **1.5** | 抒情鋼琴 → **悲壯英雄動漫大戰管弦電音搖滾**（毫無祭典銅管、拍手與太鼓喜氣） | 情緒徹底跑偏成「悲壯最終決戰」，沒有學園祭逛攤位／頒獎的快樂感 | 動態過寬（LRA 11.49 dB），戰鬥感過重不適合作為對話背景；無人聲 | BPM **152.0**（過快）；20–120 Hz 74%；500ms Δ +0.4 dB / cos 0.70 | 淘汰重做 |
| **`festival_c2`** | ✓ | **2.0** | **緊迫激昂軍樂戰鼓／JRPG 攻城戰交響曲** | 緊張戰鬥行軍味重於陽光歡慶，放在真結局與祭典顯得像在攻城略地 | 超低頻轟鳴佔 **84%**（20–120 Hz），久聽易悶累；速度偏急促；無人聲 | BPM 143.6；20–120 Hz **84%**；500ms Δ −1.2 dB / cos 0.81 | 撤除並重做 |
| **`festival_c3`** | | **1.5** | **漫威預告片／電競世界賽開場史詩大管弦電音** | 商業預告片罐頭味濃，欠缺日系校園祭的輕快陽光與人情味 | 音牆過滿（質心 3623 Hz、max2sΔ 8.8 dB），在對話場景壓過台詞；接縫尚可；無人聲 | BPM **152.0**；max2sΔ **8.8 dB**；500ms Δ −0.1 dB / cos 0.63 | 淘汰重做 |

> **補充核查（Whisper / 實聽人聲與接縫驗證）**：15 首 BGM 經【實聽】確認**全數皆為純器樂，無明顯人聲或唱詞殘留**（僅 `festival_c3` 有偏合唱Pad 質感的合成弦樂厚度，非真正人聲）。這說明問題核心不是人聲漏出，而是**曲風／編曲／動態曲線完全失控**。另外在 `public/audio/manifest.json` 核對到所有 15 檔 `dur` 與 `loopEnd` 差值在 ±1 ms 內（padding 已被妥善計入或裁切），接縫問題出現在**音樂本身的編曲段落不連續**（如 `daily_c2`、`daily_c3`、`tense_c2`）。

### 3.2 為何幾乎全軍覆沒？根因總結（【實聽】＋【程式碼核查】）

1. **生成長度 150 秒逼出模型的「流行歌爆發本能」**：ACE-Step v1 3.5B 在 `audio_duration=150.0` 下（`scripts/colab/bgm/tracks.json:10`），預設會把前 15–25 秒當作靜態 Intro，接著在 **0:25–0:40** 強行切換進主歌／副歌（加入重鼓、破音電吉他、史詩銅管或 EDM drop）。由於選循環點時偏好 `loopEnd ≥ 100s`、長度 60–120 秒，玩家進場景只要待超過 25 秒就會被「結構性變奏炸出來」。
2. **提示詞用了錯誤的觸發詞且沒有 Negative Prompt**：提示詞出現 `soundtrack`、`epic/triumphant/fanfare`、`groove`、`dark synth pulse`、`acoustic guitar`（缺少 `fingerstyle japan anime` 限制而跑出佛朗明哥或美式民謠）。ACE-Step v1 管線又把 `use_erg_tag=true` 與極高的 `guidance_scale=15.0` 配在一起，卻沒支援負向排除詞，反而放大了歐美流行搖滾／電影預告片的標籤偏誤。
3. **客觀挑選公式的盲點**：`compute_objective_score` 對 `title`/`warm` 單純加分 `harmonic_ratio`、對 `daily` 只加 `harmonic_ratio * 4`，完全沒有懲罰中段突發鼓組、電吉他失真度、高頻刺耳或過多超低頻轟鳴（20–120 Hz）。

---

## 4. 音效（32 個）逐一嚴格審查與評分 ＋ 接線缺陷

### 4.1 SFX 總評分表（8 類 × 4 候選）

| ID / 候選 | 來源 | 預設 | 評分 | 關鍵數據（`sfx-candidates.json`） | 【實聽】聽感、質感與日系 VN 契合度 | 扣分原因與建議處置 |
| --- | :---: | :---: | :---: | :--- | :--- | :--- |
| **`click_c1`** | AI | ✓ | **2.0** | 58.9 ms｜質心 **4358 Hz**｜−25.1 LUFS | 尖細、乾硬帶輕微高頻靜電毛刺的「喀」聲，缺少溫潤木頭厚實感 | 高頻過刺、每句對白都要按極易疲勞；**撤除預設**、重做 |
| **`click_c2`** | AI | | **2.5** | 71.9 ms｜質心 3663 Hz｜−25.0 LUFS | 極微弱、像硬塑膠或指甲輕彈桌面，偏單薄乾澀 | 質感略廉價單薄；淘汰重做 |
| **`click_c3`** | 合成 | | **3.5** | 54.9 ms｜質心 **672 Hz**｜−25.3 LUFS | **溫潤柔和的木質「篤」聲**（490 Hz+920 Hz），厚實不刺耳，耐聽 | 略帶數學合成味、精緻度稍輸真人採樣，但**現階段最好聽，應立即升為預設** |
| **`click_c4`** | 合成 | | **3.5** | 50.9 ms｜質心 **531 Hz**｜−24.8 LUFS | 更低沉消光的圓潤短「叩」聲，柔和不擾人 | 存在感偏悶弱；可保留為備選（C 改 C3 後可留下或升級物理建模版） |
| **`blip_c1`** | AI | ✓ | **1.5** | 46.4 ms｜質心 **5662 Hz**｜−26.6 LUFS | **極尖細刺耳的高頻毛刺喀聲**，無明顯音高，像壞掉的膠帶或靜電爆音 | 對白每 3 字播一次會像背景爆音雜訊，**極嚴重扣分，立刻撤除** |
| **`blip_c2`** | AI | | **1.0** | 36.9 ms｜質心 **6239 Hz**｜−26.6 LUFS | 更尖銳的針刺瞬態靜電聲，幾近數位噪音 | 完全不可作為文字打字音；淘汰 |
| **`blip_c3`** | AI | | **1.5** | 56.0 ms｜質心 **5388 Hz**｜−26.5 LUFS | 高頻乾澀細響，完全沒有提示詞要的木琴音高感 | 6 kHz 附近刺耳無質感，Stable Audio Open 不擅長 ≤60ms 微瞬態；淘汰 |
| **`blip_c4`** | 合成 | | **3.5** | 53.9 ms｜質心 **704 Hz**｜−26.5 LUFS | 圓潤溫和、帶 640 Hz 清晰柔和音高的可愛短「嘀」聲，不刮耳 | 現有 4 版中**唯一合格**；但單一音高連發略顯單調，**應立刻升為預設**，後續可微調音包 |
| **`choice_c1`** | AI | ✓ | **2.0** | 350 ms｜質心 **6397 Hz**｜preFade −32 dB | **單音尖銳高頻金屬櫃檯服務鈴**，聽感偏向旅館櫃檯按鈴而非「兩音上行確認」 | 缺少雙音上行感、高頻偏尖且 350 ms 硬截斷尾韻；**撤除預設**、重做 |
| **`choice_c2`** | AI | | **2.5** | 350 ms｜質心 5043 Hz｜preFade −22 dB | 清亮單音鐘聲，沒有明顯第二個上行音，略冷硬 | 單音偏單調，尾段 −22 dB 被硬切感明顯；重做 |
| **`choice_c3`** | AI | | **3.0** | 350 ms｜質心 5086 Hz｜preFade −19.4 dB | **唯一真正有可愛上行八音盒雙音感**，旋律方向正確 | 高頻仍偏尖（5 kHz），且因上限卡死 350 ms 導致第二音尾巴被硬砍；**暫作過渡預設**，中長期重做 |
| **`choice_c4`** | AI | | **2.5** | 350 ms｜質心 5178 Hz｜preFade −18.4 dB | 微小風鈴／金屬雙擊聲，偏單薄尖銳且尾巴直接被截斷 | 殘餘電平 −18.4 dB 遭硬切感重；淘汰重做 |
| **`card_c1`** | AI | ✓ | **4.0** | 769 ms｜質心 3419 Hz｜preFade −44.0 dB | **溫潤乾淨的魔法鐘琴上升琶音**，音色圓潤具發現喜悅感，收尾極乾淨 | 整體優秀、非常貼合知識卡解鎖；**保留為預設** |
| **`card_c2`** | AI | | **4.0** | 841 ms｜質心 4845 Hz｜preFade −43.1 dB | 更清亮閃爍的上升鐘琴＋精靈鈴聲，華麗可愛 | 略比 c1 亮一些，是很稱職的替代版本；**保留** |
| **`card_c3`** | AI | | **3.5** | 1000 ms｜質心 4077 Hz｜preFade −40.5 dB | 晶亮快速鐘琴滑音，像日系手遊抽卡／領獎提示音 | 略偏亮且較偏向抽卡風格；**可保留或擇優替換** |
| **`card_c4`** | AI | | **2.0** | 1000 ms｜質心 **7819 Hz**｜preFade −39.3 dB | 極高頻、刺耳如細碎玻璃與金屬風鈴碰撞聲 | 質心高達 7.8 kHz，極度刺耳廉價；**淘汰重做／替換** |
| **`grow_c1`** | AI | ✓ | **4.0** | 700 ms｜質心 3860 Hz｜preFade −37.8 dB | 陽光明亮的三音上升木琴＋鐘琴，正向升級感清晰 | 非常適合排程能力提升；建議**保留**（若四格連播可與 c2 比較，c2 更耐聽） |
| **`grow_c2`** | AI | | **4.0** | 700 ms｜質心 **2130 Hz**｜preFade −39.5 dB | **溫潤木質馬林巴／木琴溫暖和弦向上「叮咚」**，圓潤不刺耳 | 在排程連續播放 4 個時段時最不累耳，**與 c1 同列優秀（建議評估升 c2 為預設）** |
| **`grow_c3`** | AI | | **2.0** | 700 ms｜質心 **6487 Hz**｜preFade −30.0 dB | 尖銳高頻金屬小鈴「叮」兩聲，缺少木琴溫暖質感 | 高頻過尖且過冷；**淘汰** |
| **`grow_c4`** | AI | | **2.5** | 700 ms｜質心 3186 Hz｜preFade −25.7 dB | 低沉雙音鐘聲，節奏偏慢、有點像門鈴，結尾 −25.7 dB 被裁切 | 升級爽快感不足、收尾偏突兀；**淘汰** |
| **`bond_c1`** | AI | ✓ | **4.0** | 1000 ms｜質心 3145 Hz｜preFade −32.7 dB | **溫柔甜美豎琴琶音加輕柔鐘琴尾音**，日系戀愛心動感準確 | 非常合適，僅 1.0 秒尾部略收稍快；**保留為預設** |
| **`bond_c2`** | AI | | **3.5** | 1000 ms｜質心 4818 Hz｜preFade −31.6 dB | 輕快閃亮小豎琴加清脆鐘琴，偏童話夢幻感 | 高頻稍微多了一點，略偏向「道具魔法」而非心動；**可保留** |
| **`bond_c3`** | AI | | **2.0** | 1000 ms｜質心 **6878 Hz**｜preFade −35.6 dB | 過於尖銳冷冽的高頻細金屬琴弦＋風鈴聲，缺乏「溫暖」感 | 6.8 kHz 太刺耳且氣氛太冷；**淘汰** |
| **`bond_c4`** | AI | | **4.0** | 1000 ms｜質心 **1490 Hz**｜preFade −29.7 dB | **溫厚真實的音樂會豎琴大滑音**，暖度與戀愛氛圍極佳 | 因上限卡 1.0 秒（preFade −29.7 dB）尾韻被略切，否則可拿 4.5 分；**建議保留（放寬 1.2s 後重裁更佳）** |
| **`fail_c1`** | AI | ✓ | **2.0** | 400 ms｜act 284 ms｜cent 1729 Hz | **單下一聲乾硬的木頭敲擊「叩」**，既不可愛也沒有失誤下行音階感 | 聽起來像「按鈕失敗或門鎖住」，與「輕喜感噗咚失誤」完全不符；**撤除預設**、重做 |
| **`fail_c2`** | AI | | **2.0** | 569 ms｜質心 3325 Hz｜preFade −40.4 dB | 滑稽橡膠／彈簧滑音哨「啾～」一聲 | 卡通橡膠感太過頭，顯得廉價搞笑，放在校園社團失誤甚至暴雨危機很出戲；淘汰 |
| **`fail_c3`** | AI | | **1.5** | 400 ms｜**act 165 ms**｜cent 1503 Hz | 只有極短促一聲悶木鼓敲擊，剩下兩百多毫秒全是靜音 | 完全聽不出失敗／失誤情緒，像錯誤裁切的碎片；淘汰 |
| **`fail_c4`** | AI | | **3.0** | 706 ms｜質心 1565 Hz｜preFade −41.5 dB | **唯一確實有「兩音下行可愛噗咚感」的候選**，音色圓潤不刺耳 | 略帶一點老式卡通圓鈍感、精緻度普通，但現況遠勝 c1；**暫升為過渡預設**，中長期重做 |
| **`win_c1`** | AI | ✓ | **4.0** | 1542 ms｜質心 2784 Hz｜preFade −43.4 dB | 歡快明亮的鐘琴＋木琴過關小樂句，節奏明快乾淨 | 品質很好，僅末段音色稍微普通；**保留** |
| **`win_c2`** | AI | | **4.5** | 1307 ms｜質心 **1690 Hz**｜preFade −44.3 dB | **全 SFX 最佳！溫潤鋼琴＋鐘琴完美交織出日系校園 VN 過關小樂句**，毫不刺耳且收尾優雅 | 完美契合本作畫風；**強烈建議將 `win` 預設從 c1 改為 `win_c2`** |
| **`win_c3`** | AI | | **4.0** | 1786 ms｜質心 3375 Hz｜preFade −44.6 dB | 完整閃亮的 1.8 秒鐘琴豎琴慶祝樂句，氣氛飽滿喜悅 | 品質佳，長度適合當高分 3 星獎勵或大關勝利；**保留** |
| **`win_c4`** | AI | | **3.5** | 1794 ms｜質心 3498 Hz｜preFade −44.3 dB | 夢幻童話豎琴與叮咚鐘聲過關短句 | 稍微偏奇幻 RPG 風格，但仍乾淨好聽；**保留** |

### 4.2 程式碼端 SFX 接線遺漏與劇本誤用（【程式碼核查】）

即使有了好音效，目前的程式接線也存在 4 個明顯缺陷：

1. **`win` 音效完全是死資產（從未被播放）**：
   - `scripts/audio/sfx-candidates.json:1278` 寫著「保留給新版音效系統接線」，結果三個小遊戲過關時全都還沒改過來：
     - `src/minigames/Spot.tsx:65`：`audio.sfx(passed ? 'card' : 'click')`
     - `src/minigames/Serp.tsx:41`：`audio.sfx(passed ? 'card' : 'click')`
     - `src/minigames/Quiz.tsx:54`：`audio.sfx(passed ? 'card' : 'click')`
   - 導致玩家小遊戲過關會和 `unlockCard()` 同時連撞兩次 `card`（見 `src/store/game.ts:177` 獲卡時已會自播 `card`），且失敗時只播無感的 `click`。**應改為過關播 `win`、失敗播 `fail`（或輕微提示音）**。
2. **轉場／登場事件濫用選項音 `choice`**：
   - `src/content/scenes/main/prologue.ts:8`：晴高速衝撞主角並配合 `bg('gate', 'day', 'flash')` 閃白，竟放 `sfx('choice')`（八音盒確認鈴），毫無碰撞衝擊或驚訝喜劇感。
   - `src/content/scenes/main/festival.ts:17`：搜尋祭三位評審登場前放 `sfx('choice')`，同樣語意不符。
3. **第 6 週嚴肅危機使用喜劇失敗音 `fail`**：
   - `src/content/scenes/main/w6.ts:8`：窗外大雨傾盆、螢幕排名曲線暴跌並伴隨閃白，卻呼叫 `sfx('fail')`。依 `sfx-candidates.json` 設計，`fail` 是「輕鬆可愛的卡通噗咚」，用在暴雨危機極易出戲；應新增嚴肅警告／衝擊音效（如 `shock` 或 `alert`）。
4. **週報介面無條件播好感上升音 `bond`**：
   - `src/ui/sim/WeeklyReport.tsx:32`：`useEffect(() => { audio.sfx('bond') }, [])` 只要進週報就固定播一次心動豎琴 `bond`，即便該週因黑帽／失誤導致好感與網站分數雙雙倒退也是播 `bond`。建議改依分數淨變化決定播 `bond`（進步）或 `click`／不播（持平或退步）。

---

## 5. 配樂分配現況核查（驗證並補充總監初步發現）

透過 grep 與逐檔讀完 39 個劇本與全部 UI 元件後，核查結果如下（含數項重要勘誤與補充）：

| 總監初步發現 | 實查驗證結果 | 具體檔案證據與補充細節 |
| --- | --- | --- |
| 1. 全劇本僅用 5 首 BGM | **證實（且過度集中於 `daily` / `warm`）** | 39 份劇本共 41 次 `bgm()` 呼叫：`daily` 14 次、`warm` 22 次、`tense` 3 次、`festival` 2 次，加上 `TitleScreen.tsx:28` 的 `title` 1 次，共 5 首。 |
| 2. 養成畫面無獨立 BGM（提及 W6 緊張後排程播緊張、約會後週報播戀愛） | **大方向證實，並補充精確勘誤** | 四個養成畫面（`ScheduleScreen.tsx`、`NoticeBoard.tsx`、`WeekendMenu.tsx`、`WeeklyReport.tsx`）皆**零 `bgm()` 呼叫**。<br>**【重要勘誤】**：第 6 週主線 `w6.ts` 雖於 L5 開頭播 `tense`，但在 **L75 雨夜選對象前切為 `warm`**，因此 W6 排程／公佈欄／週末實際上是沿用**雨夜約會曲 `warm`**；真正把**整個養成階段綁架播放 `tense`（動作大片曲）**的是 **第 4 週主線 `w4.ts:44`（黑川傍晚登場結束）** 與 **黑川支線 `sq-x1.ts:4`（打完黑川回公佈欄）**！而約會結束進 `WeeklyReport.tsx` 則確實沿用 `warm`（或 `rin-1/2`、`hare-1` 的 `daily`）。 |
| 3. 小遊戲無自己的音樂 | **證實** | `src/minigames/index.tsx`（`MinigameHost`）與 `Quiz.tsx` / `Spot.tsx` / `Serp.tsx` 皆未切換 BGM，全 17 關（`demo-quiz`、`w1`–`w6` 6 關、10 個支線）全部沿用對話曲。特別是 `w6-update` 是在好萊塢戰鼓 `tense_c1` 下作答，`sq-m3` 與 `sq-h3` 則是在破音搖滾 `warm_c2` 下作答。 |
| 4. 壞結局用 `warm`、黑帽結局用 `tense` | **證實，並補充主線／支線情感錯位** | • `end-bad.ts:4` 全程用 `warm`，開頭社辦熄燈廢社＋夜裡歸還鑰匙完全沒有失落感，最後新學期重聚也沒切回希望曲。<br>• `end-blackhat.ts:4` 黑川喊「別拔掉我備用網域！」、凜說「你們兩個都不准偷吃我的布丁」、被罰坐抄寫政策，本質是**喜劇吐槽懲罰結局**，配動作大片 `tense` 嚴重錯位。<br>• **【補充新發現】**：`w5.ts:5` 圖書館日常研討一開始就錯用告白曲 `warm`，且後半 L46–L75 未來在夕陽天台脆弱自白「我是不是只是一個複製品？」沒有低落曲鋪墊；`sq-m3.ts:4` 天文館自我懷疑、與 `sq-h3.ts:4` 晴自卑「小時候常被說安靜一點」同樣一進場就放 `warm`（現行還爆破音搖滾）。 |
| 5. 三位女主角約會全用同一首 `warm`，無角色個性 | **補充細節（3 場用 `daily`、10 場用 `warm`）** | 實查 `src/content/scenes/dates/`：`date-rin-1.ts:4`、`date-rin-2.ts:4`、`date-hare-1.ts:4` 用 `daily`（目前為佛朗明哥吉他）；其餘 9 場女主角約會＋`weekend-rest.ts:4`（主角在家睡覺喝熱可可）全用 `warm`。不但三人全無個性，連「在家睡懶覺」都在放告白曲。 |
| 6. **【額外發現】** `EndingScreen.tsx` 與存檔恢復 `resumeBgm()` | **確認設計缺口** | 劇本結束進入 `EndingScreen.tsx` 成果報告畫面時不切曲，若達成黑帽結局，玩家會在 `tense` 緊張鼓聲中看學習成果與截圖清單；`src/store/save.ts:79-84` 的 `resumeBgm()` 讀檔備援未區分養成 phase（`schedule`/`board`/`weekend`/`report`）。 |

---

## 6. 新版配樂表（Cue Sheet）提案

### 6.1 曲目總規劃（共 12 首；Phase 1 可先落實 9 首）

總曲數控制在 **12 首**（落在建議的 8–12 首區間內），分兩階段落實，並需同步更新 `src/audio/synth.ts`（`BgmId` 型別與合成備援）及 `src/ui/MusicGallery.tsx`（曲目清單）：

| 階段 | BGM ID | 建議中文曲名 | 角色／情境定位 | 核心聽感定位 |
| :---: | --- | --- | --- | --- |
| **P1** | `title` | 直到你找到我 | 標題畫面、真結局收尾、壞結局重生段 | 抒情清澈鋼琴＋柔和室內樂弦樂（日系 VN 招牌開幕） |
| **P1** | `daily` | 404 號社辦的日常 | 平日主線社辦／教室課程、日常支線、普通結局 | 明亮輕快校園日常：木吉他分解＋鐘琴＋撥弦＋輕打擊 |
| **P1** | `sim` | 本週企劃中！ | **養成專用曲**：排程、公佈欄、週末自由行動、週報、在家休息 | 輕爵士／電鋼琴＋尼龍吉他＋輕刷鈸（節奏穩定、清爽不膩） |
| **P1** | `minigame` | 實戰演練！ | **小遊戲專用曲**：Quiz / Spot / Serp 全部 17 關 | 專注思考又不壓迫：馬林巴＋撥弦＋電鋼琴＋輕快電子脈衝 |
| **P1** | `warm` | 放學後的晚霞 | 共用心動、雨夜告白時刻、第 3 階約會 CG、個人結局告白 | 溫暖心跳留白：Felt 鋼琴＋大提琴／柔弦樂，極低密度旋律 |
| **P1** | `melancholy` | 404 的雨夜 | **低落／脆弱專用曲**：壞結局前半、未來「複製品」自白、大雨夜獨行 | 孤獨微光：緩慢稀疏獨奏鋼琴＋極輕雨夜墊音＋大提琴長音 |
| **P1** | `tense` | 演算法的大雨 | **輕度懸疑危機**：W4 黑川初次威脅、W6 演算法更新風暴／人工處罰 | 校園科技懸疑（非動作片）：斷奏撥弦＋低音貝斯＋冷靜合成脈衝 |
| **P1** | `comedy` | 黑帽推銷中！ | **輕鬆搞笑吐槽**：黑川擺攤 `sq-x1` 前半、黑帽罰坐結局 `end-blackhat` | 俏皮滑稽校園喜劇：跳音低音管／單簧管＋撥弦＋木魚輕打擊 |
| **P1** | `festival` | 青葉搜尋祭 | 第 7 週學園祭評審、真結局成果揭曉瞬間 | 陽光學園祭歡騰：輕快銅管＋手拍＋鐘琴＋明亮節慶打擊 |
| **P2** | `theme_rin` | 規則與貓咪 | **白鷺凜專用主題**：凜約會（1–3 階與偶遇）、`sq-r3` 貓咪部落格 | 端莊知性帶柔情：清亮鋼琴＋弦樂四重奏（小提琴／大提琴對話） |
| **P2** | `theme_hare` | 結論先說！ | **夏川晴專用主題**：晴約會（1–3 階與偶遇）、`sq-h3` 播報成功 | 陽光元氣廣播社：清新木吉他／烏克麗麗＋輕快長笛或口風琴 |
| **P2** | `theme_mirai` | 星光資料庫 | **星野未來專用主題**：未來約會（1–3 階與偶遇）、`w5`/`sq-m3` 轉折 | 空靈澄澈星空感：晶透鋼琴＋鋼片琴＋柔和閃亮合成 Pad |

> **若預算需先壓縮為 9 首（Phase 1 先行版）**：先產出上表 P1 的 9 首；在 P2 的 3 首角色主題未到位前，表 6.3 標註 `theme_*` 之處先回退對應的 `daily`（前期約會）或 `warm`（後期約會／支線第 3 話）。

### 6.2 非劇本介面、小遊戲與系統狀態對應表

| 系統位置 | 現行行為 | 新版 BGM 規則 | 理由與實作注意 |
| --- | --- | --- | --- |
| `src/ui/TitleScreen.tsx:28` | `audio.bgm('title')` | `title`（不變） | 開場建立全作抒情印象；需換為重製後正統鋼琴弦樂版 `title` |
| `src/ui/sim/ScheduleScreen.tsx` | 沿用上一幕（W4 播 `tense`、W6 播 `warm`） | 掛載時呼叫 `audio.bgm('sim')` | 把玩家從前段劇情拉回「規劃社團行程」的經營節奏 |
| `src/ui/sim/NoticeBoard.tsx` | 沿用（打完 `sq-x1` 回來播 `tense`） | 掛載時呼叫 `audio.bgm('sim')` | 打完任何支線回到公佈欄時，統一恢復輕快養成氛圍 |
| `src/ui/sim/WeekendMenu.tsx` | 沿用 | 掛載時呼叫 `audio.bgm('sim')` | 週末行程選擇頁面保持輕鬆日常規劃感 |
| `src/ui/sim/WeeklyReport.tsx` | 沿用約會結束的 `warm` | 掛載時呼叫 `audio.bgm('sim')` | 週日看網站數據報告應為理性整理心情，不宜持續放戀愛告白曲 |
| `src/minigames/index.tsx` (`MinigameHost`) | 沿用劇本當下 BGM | 開啟時 `audio.bgm('minigame')`；結束／卸載時恢復 `useGame.getState().stage.bgm ?? 'daily'` | 讓全部 17 關 SEO 實戰題有統一的專注思考感；不改寫 `stage.bgm`，卸載即 1 秒交叉淡回原劇情曲 |
| `src/ui/sim/EndingScreen.tsx` | 沿用結局場景最後一曲 | 延續對應結局收尾曲（真結局 `title`／壞結局 `title` 或 `daily`／黑帽 `comedy` 或 `daily`／個人結局 `warm` 或 `theme_*`） | 玩家常在此停留看學習報告、截圖與複製檢查清單，應播愉悅／撫慰的餘韻曲 |
| `src/store/save.ts:79` (`resumeBgm`) | 只分 `ending` / `week>=7` / `daily` | 補入若 `!d.stage.bgm` 且 `phase` 為 `schedule`/`board`/`weekend`/`report` 時回傳 `'sim'` | 讓舊存檔或跨階段讀檔不會錯播劇本曲 |

### 6.3 全 39 個劇本檔案 `bgm(...)` 逐點更換明細表

#### 主線劇本（`src/content/scenes/main/`，9 檔）

| 檔案 | 現行 `bgm(...)` | 建議配樂（含中段切曲行號） | 是否更換 | 理由（對照劇本內容與美術） |
| --- | --- | --- | :---: | --- |
| [`demo.ts`](../src/content/scenes/main/demo.ts#L5) | L5 `daily` | 維持 `daily`（小遊戲自動切 `minigame`） | 否（重製曲） | 示範開頭櫻花校門＋社辦對話，重製後純淨校園日常曲正合適 |
| [`prologue.ts`](../src/content/scenes/main/prologue.ts#L4) | L4 `daily` | 維持 `daily`（可選：L58 黃昏遇未來暫切 `theme_mirai`，L66 回社辦切回 `daily`） | 可選微調 | 晴衝撞搞笑＋凜整併宣言＋索老師介紹 SEO，維持輕快校園節奏 |
| [`w1.ts`](../src/content/scenes/main/w1.ts#L5) | L5 `daily` | 維持 `daily` | 否（重製曲） | 週一社辦查收錄＋炸雞排 301/302 插曲 |
| [`w2.ts`](../src/content/scenes/main/w2.ts#L5) | L5 `daily` | L5 `daily`；**可選**：L41 夕陽晴低頭問「我是不是總是很吵」切 `warm`（P1 維持或切 `warm`） | 建議微切 | 後半進入廣播室夕陽交心，切柔鋼琴 `warm` 更有戀愛推進感 |
| [`w3.ts`](../src/content/scenes/main/w3.ts#L5) | L5 `daily` | L5 `daily`；**可選**：L57 未來談「溫度無法批量生成」切 `theme_mirai`（P1 用 `warm`） | 建議微切 | 前段搞笑「十七分鐘前我就進來了」，後段轉入感性討論 AI 與溫度 |
| [`w4.ts`](../src/content/scenes/main/w4.ts#L4) | L4 `daily`、L44 `tense` | 維持 L4 `daily`、L44 `tense` | 否（重製曲） | L44 黑川傍晚於校門攔人販售黑帽流量包，重製為輕度懸疑 `tense` 合理（且進排程會改切 `sim` 不再外溢） |
| [`w5.ts`](../src/content/scenes/main/w5.ts#L5) | L5 `warm` | **L5 改 `daily`（或 `theme_mirai`）→ L46 天台「複製品」自白切 `melancholy` → L53「未來是未來，不是誰的副本」後切 `theme_mirai`（P1 用 `warm`）** | **是（必換）** | L6–L44 是圖書館 GEO 上課與小遊戲，不該一開始就播告白曲；L46 未來說「我是不是複製品」必須切 `melancholy` 才感人，安慰後再轉亮 |
| [`w6.ts`](../src/content/scenes/main/w6.ts#L5) | L5 `tense`、L75 `warm` | L5 維持 `tense` → **L51 雨中校門見落魄黑川改切 `melancholy`** → L75 夜雨選對象延續 **`melancholy`** → **選完進室內（L80 學生會室／L106 廣播室／L128 天台）切 `warm`（P2 可切 `theme_rin/hare/mirai`）** | **是（細化）** | 核心更新危機維持輕懸疑 `tense`；黑川落寞退場與雨夜撐傘獨行改 `melancholy` 才能把情緒拉低，進室內拿到毛巾／熱可可／傘下告白再升溫成 `warm` |
| [`festival.ts`](../src/content/scenes/main/festival.ts#L10) | L10 `festival` | 維持 `festival` | 否（重製曲） | 搜尋祭木質舞台＋章魚燒＋太鼓簡報，重製為陽光學園祭版 |

#### 支線委託劇本（`src/content/scenes/side/`，10 檔）

| 檔案 | 現行 `bgm(...)` | 建議配樂（含中段切曲行號） | 是否更換 | 理由 |
| --- | --- | --- | :---: | --- |
| [`sq-r1.ts`](../src/content/scenes/side/sq-r1.ts#L4) | L4 `daily` | 維持 `daily` | 否（重製曲） | 學生會室查 301/404/410，「申請表沒被吃掉」帶輕鬆互動 |
| [`sq-r2.ts`](../src/content/scenes/side/sq-r2.ts#L4) | L4 `daily` | 維持 `daily`（可選：L6 凜帶鹽驅鬼前 15 行可點綴 `comedy`，L18 看網址切 `daily`） | 否 / 可選 | 日光燈閃爍＋帶一包鹽抓重複內容「幽靈」，日常幽默 |
| [`sq-r3.ts`](../src/content/scenes/side/sq-r3.ts#L4) | L4 `warm` | **更換為 `theme_rin`**（P1：L4 `daily`，L69 貓照測速通過抱貓臉紅後切 `warm`） | **是** | 凜的秘密《街角貓咪觀察日記》部落格，前段講 LCP/CLS、後段溫馨告白秘密基地 |
| [`sq-h1.ts`](../src/content/scenes/side/sq-h1.ts#L4) | L4 `daily` | 維持 `daily` | 否（重製曲） | 家政教室烤奶油餅乾＋alt/Recipe 教學，明快輕鬆 |
| [`sq-h2.ts`](../src/content/scenes/side/sq-h2.ts#L4) | L4 `daily` | 維持 `daily` | 否（重製曲） | 體育館走廊「三個字籃球社隊長＋晴四十字翻譯」，熱鬧日常 |
| [`sq-h3.ts`](../src/content/scenes/side/sq-h3.ts#L4) | L4 `warm` | **L4 改 `melancholy`**（晴吐露小時候常被嫌吵而自卑）→ **L59 完成 11 秒播報後切 `theme_hare`**（P1 用 `warm`） | **是（必換）** | L4–L29 晴抱著 8000 字逐字稿自我否定，不適合直接播溫馨約會曲；成功唸完 11 秒再轉晴亮主題 |
| [`sq-m1.ts`](../src/content/scenes/side/sq-m1.ts#L4) | L4 `daily` | 維持 `daily` | 否（重製曲） | 圖書館查 1982 創校年錯字＋老館員溫馨互動，日常偏柔即可 |
| [`sq-m2.ts`](../src/content/scenes/side/sq-m2.ts#L4) | L4 `daily` | 維持 `daily` | 否（重製曲） | 天文社「連月亮也 Disallow」搞笑日常＋AI 爬蟲教學 |
| [`sq-m3.ts`](../src/content/scenes/side/sq-m3.ts#L4) | L4 `warm` | **L4 改 `melancholy`**（天文館未來懷疑自己只是「除七後的複製品」）→ **L68/L85 寫下「今晚的星空，比資料裡溫暖」切 `theme_mirai`**（P1 用 `warm`） | **是（必換）** | 全作未來線最重要內心戲之一，必須先用 `melancholy` 承托孤寂感，再靠手寫第一行開出星光 |
| [`sq-x1.ts`](../src/content/scenes/side/sq-x1.ts#L4) | L4 `tense` | **L4 改 `comedy`**（商店街黑川吆喝賣黑帽套餐、「首頁？我家的」）→ **L63 `show('kuro','center','sad')` 吐露學長被處罰與作文不及格切 `melancholy`** → L87 收攤嘴硬切回 **`comedy`** | **是（必換）** | 原本黑川擺攤嘴砲用好萊塢動作片 `tense` 極為尷尬；改成 `comedy` 配悲傷轉折才符合人物弧線 |

#### 約會與週末劇本（`src/content/scenes/dates/`，13 檔）

| 檔案 | 現行 `bgm(...)` | 建議配樂（含中段切曲行號） | 是否更換 | 理由 |
| --- | --- | --- | :---: | --- |
| [`date-rin-1.ts`](../src/content/scenes/dates/date-rin-1.ts#L4) | L4 `daily` | **`theme_rin`**（P1 暫用 `daily`） | **是** | 書店偷買《寫作風格指南》遇見，需凜的知性反差感 |
| [`date-rin-2.ts`](../src/content/scenes/dates/date-rin-2.ts#L4) | L4 `daily` | **`theme_rin`**（P1：L4 `daily`，L16 泡熱茶切 `warm`） | **是** | 學生會室加班逞強發抖到放下筆，需凜專用曲與柔暖弦樂 |
| [`date-rin-3.ts`](../src/content/scenes/dates/date-rin-3.ts#L4) | L4 `warm` | **L4 `theme_rin` → L23 `cg('date-rin-3')` 煙火告白切 `warm`** | **是（細化）** | 前段逛夜市聊制服嚴謹感，煙火綻放瞬間切 `warm` 推高心動 |
| [`date-rin-casual.ts`](../src/content/scenes/dates/date-rin-casual.ts#L4) | L4 `warm` | **`theme_rin`**（P1：`daily` 或 `warm`） | **是** | 買貓咪便利貼／菠蘿麵包的輕鬆偶遇 |
| [`date-hare-1.ts`](../src/content/scenes/dates/date-hare-1.ts#L4) | L4 `daily` | **`theme_hare`**（P1 暫用 `daily`） | **是** | 商店街可樂餅燙舌頭，活潑元氣 |
| [`date-hare-2.ts`](../src/content/scenes/dates/date-hare-2.ts#L4) | L4 `warm` | **L4 `theme_hare` → L24 關閉吵雜、輕聲說「今晚只播給你聽」切 `warm`** | **是（細化）** | 先用晴主題表現錄音練習，再進深層告白 |
| [`date-hare-3.ts`](../src/content/scenes/dates/date-hare-3.ts#L4) | L4 `warm` | **L4 `theme_hare` → L22 `cg('date-hare-3')` 海邊夕陽戴耳機切 `warm`** | **是（細化）** | 前段赤腳踩浪花開朗，戴上耳機聽心跳切入柔暖 `warm` |
| [`date-hare-casual.ts`](../src/content/scenes/dates/date-hare-casual.ts#L4) | L4 `warm` | **`theme_hare`**（P1：`daily`） | **是** | 公園長椅分耳機／商店街請吃冰棒 |
| [`date-mirai-1.ts`](../src/content/scenes/dates/date-mirai-1.ts#L4) | L4 `warm` | **`theme_mirai`**（P1：`warm`） | **是** | 天文館黑暗中發光的星形髮夾與知識圖譜星空，極適合未來空靈曲 |
| [`date-mirai-2.ts`](../src/content/scenes/dates/date-mirai-2.ts#L4) | L4 `warm` | **`theme_mirai`**（P1：`warm`） | **是** | 圖書館觸摸紙本書頁與作者溫度，靜謐澄澈 |
| [`date-mirai-3.ts`](../src/content/scenes/dates/date-mirai-3.ts#L4) | L4 `warm` | **L4 `theme_mirai` → L22 `cg('date-mirai-3')` 星空下勾袖口切 `warm`** | **是（細化）** | 先以未來空靈曲開夜風獨白，CG 勾袖口切 `warm`（或延續 `theme_mirai`） |
| [`date-mirai-casual.ts`](../src/content/scenes/dates/date-mirai-casual.ts#L4) | L4 `warm` | **`theme_mirai`**（P1：`daily` 或 `warm`） | **是** | 圖書館抱著三本貓咪書／手繪星圖 |
| [`weekend-rest.ts`](../src/content/scenes/dates/weekend-rest.ts#L4) | L4 `warm` | **`sim`** | **是** | 週末早晨在家睡到自然醒喝熱可可、看手機訊息，用清爽 `sim` 遠比戀愛曲合理 |

#### 結局劇本（`src/content/scenes/endings/`，7 檔）

| 檔案 | 現行 `bgm(...)` | 建議配樂（含中段切曲行號） | 是否更換 | 理由 |
| --- | --- | --- | :---: | --- |
| [`end-bad.ts`](../src/content/scenes/endings/end-bad.ts#L4) | L4 `warm` | **L4 改 `melancholy` → L41 `bg('clubroom', 'day', 'fade')` 新學期三人拿申請書登場切 `title`（或 `daily`）** | **是（必換）** | L5–L40 經歷廢社、繳回鑰匙、關機備份隨身碟，必須用 `melancholy` 才能共情；L41 轉入白天三人現身再切 `title`，完成「失落但帶希望」的情緒轉折 |
| [`end-blackhat.ts`](../src/content/scenes/endings/end-blackhat.ts#L4) | L4 `tense` | **L4 改 `comedy`**（可選：L34 索老師嚴肅講解重新審查切 `daily`，L39 社辦罰抄「算不算原創」再回 `comedy`） | **是（必換）** | 「不准偷吃我的布丁」「抄一百遍算原創嗎？」是全作最歡樂的警世喜劇收尾，用 `comedy` 才對味 |
| [`end-normal.ts`](../src/content/scenes/endings/end-normal.ts#L5) | L5 `daily` | 維持 `daily`（可選：L42 獨坐電腦前打字 `cg('end-normal')` 切柔版 `title` 或延續 `daily`） | 否（重製曲） | 驚險及格保住社辦＋下學期繼續更新的溫馨日常 |
| [`end-rin.ts`](../src/content/scenes/endings/end-rin.ts#L5) | L5 `warm` | **L5 `theme_rin` → L29 `cg('end-rin')` 夕陽告白切 `warm` → L56 隔天資料夾彩蛋切 `theme_rin`** | **是（細化）** | 把凜的傲嬌轉折與最後「謝絕參觀」貓咪資料夾彩蛋做出層次 |
| [`end-hare.ts`](../src/content/scenes/endings/end-hare.ts#L5) | L5 `warm` | **L5 `theme_hare` → L25 關掉 ON AIR 燈＋L30 `cg('end-hare')` 切 `warm` → L51 隔天全校廣播彩蛋切 `theme_hare`** | **是（細化）** | 鎖門→熄燈告白→隔天廣播撒糖，結構極清楚 |
| [`end-mirai.ts`](../src/content/scenes/endings/end-mirai.ts#L5) | L5 `warm` | **L5 `theme_mirai` → L39 `cg('end-mirai')` 告白切 `warm` → L48 隔天署名文章切 `theme_mirai`** | **是（細化）** | 天文館預演 47 次的星空告白＋署上「星野未來」的清晨 |
| [`end-true.ts`](../src/content/scenes/endings/end-true.ts#L5) | L5 `festival` | **L5 維持 `festival`（分數揭曉歡呼）→ L18 `bg('festival', 'dusk', 'fade')` 燈籠合照 `cg('end-true')` 與 L36 隔天夕陽迎新切 `title`** | **是（強烈建議）** | **首尾呼應神來之筆**：`title` 曲名就是「《直到你找到我》」，而 `end-true.ts:38` 門牌字條正寫著「我在這裡。謝謝你，終於找到我了。」在黃昏合照轉入 `title` 收尾能把玩家感動推到最高點 |

> **後續工程串接備忘（本審查不改程式，供後續排程實作）**：落地新配樂表需於後續 PR 更新 `src/audio/synth.ts`（補齊 `sim`、`minigame`、`melancholy`、`comedy`、`theme_rin`、`theme_hare`、`theme_mirai` 之合成備援）、`src/store/save.ts`（`resumeBgm`）、`src/ui/MusicGallery.tsx`、`src/ui/sim/*.tsx`、`src/minigames/index.tsx` 與上述劇本檔。

---

## 7. 模型評估、開源商用相容方案與重產規格

### 7.1 ACE-Step v1 3.5B 是否足以做到日系 VN 風格？

**評估結論：僅靠現行 `ACE-Step v1 3.5B` ＋ 150 秒盲產流程，不足以穩定產出合格的日系 VN BGM。**

理由有三：
1. **流行歌／管弦大製作結構偏誤極強**：實測 15 首僅 `title_c3` 1 首（6.7%）沒有在 25–40 秒爆出流行搖滾鼓組、EDM 或預告片戰鼓；即使寫了 `calm sparse melody for dialogue`、`not horror` 仍全面失守。
2. **欠缺原生 Negative Prompt 與調性／拍號鎖定**：v1 無法直接在管線傳入負向排除詞（`no drums, no electric guitar, no rock`），且 `tracks.json` 中 `bpm` 只是寫進文字提示詞，實測出現 65–152 BPM 大幅漂移。
3. **高 CFG + ERG 放大刻板印象**：`guidance_scale=15.0`、`use_erg_tag=true` 把 `soundtrack`、`anime` 過度導向熱血動漫 OP/ED 搖滾與西方電影預告片。

### 7.2 開源可商用／與現行授權相容的方案比較

本專案現行授權規範為 **BGM：Apache-2.0**、**SFX：Stability AI Community License**（≤100 萬美元年營收免費商用，且 UI 已於標題／設定／音樂鑑賞標示 `Powered by Stability AI`）。以下只納入**明確允許商用**的方案，**嚴格排除任何僅限非商用模型**（例如 Meta MusicGen 權重 `CC-BY-NC 4.0`、YuE / YuE2 權重 `CC-BY-NC 4.0`、HeartMuLa 非商用權重、TangoFlux / AudioX 研究或 CC-BY-NC 權重）：

| 方案 | 授權與商用相容性 | 對日系校園 VN 的能力評估 | 建議角色定位 |
| --- | --- | --- | --- |
| **ACE-Step 1.5** (`ACE-Step/Ace-Step1.5`) | **MIT License**（完全允許商用，與 Apache-2.0 相容） | 採用 LM Planner + DiT 架構，新增原生結構化 `bpm`、`keyscale`、`time_signature`、`duration`（10s–600s）與 `[Instrumental]` 控制，VRAM 需求低且支援 LoRA 鎖定風格。將 `duration` 縮為 **75–95s** 並降 CFG 後，表現遠勝 v1。 | **首選主力 BGM 模型**（特別適合 `title`、`warm`、`melancholy`、`tense`、`festival`） |
| **Stable Audio Open 1.0** (`stabilityai/stable-audio-open-1.0`) | **Stability AI Community License**（年營收 ≤100 萬美元免費商用，**本專案已採用並已標示 `Powered by Stability AI`**） | 原生支援 **Negative Prompt** 與高品質立體聲 44.1 kHz 音色，但上限 47 秒；正因為只有 ≤47 秒，**反而不會在 30 秒強行進副歌爆炸**，非常適合生成 35–45 秒純淨穩定循環襯底！ | **BGM 互補方案**（特別適合 `sim`、`minigame`、`theme_mirai`、`melancholy` 等穩定 loop）＋ **中長音效主力**（`card`/`grow`/`bond`/`win`） |
| **符號 MIDI 編曲 ＋ 可商用開源 SoundFont**（FluidSynth + Salamander Grand Piano / MuseScore General / GeneralUser GS 等） | 程式庫 Apache/LGPL；SoundFont 依個別授權（CC0 / MIT / CC-BY 4.0，皆可商用只需署名） | **零跑風風險、100% 精準小節循環、鋼琴與撥弦零 AI 偽影**；只要搭配基本混響／母帶，即可產出最道地的日系校園 VN 音色（如 Key / Clannad / 校園戀愛遊戲風格）。 | **極高把握備選／混合方案**：適合結構最容易被 AI 搞砸的 `daily`、`comedy`、`theme_rin`、`theme_hare` 與精細鋼琴主題 |
| **DiffRhythm 2 / InspireMusic** (`ASLP-lab/DiffRhythm2`, FunAudioLLM) | **Apache-2.0**（註：DiffRhythm 類部分 VAE 相依 Stable Audio Open 需留意條款） | 可純 Apache-2.0 商用，支援 Instrumental 模式；但偏向完整人聲歌曲編曲結構，在「低密度、不進鼓組的對話襯底」上反而不如 ACE-Step 1.5 或 Stable Audio Open 短循環可控。 | **次要純 Apache-2.0 備選**（作為抽卡多樣性比對） |
| **程式物理建模合成 / CC0 Foley ＋ MOSS-SoundEffect v2.0** | Python DSP 無授權限制；`OpenMOSS-Team/MOSS-SoundEffect-v2.0` 為 **Apache-2.0** | 擴散模型對 ≤100 ms 的 `click`/`blip` 幾乎必帶高頻毛刺；用阻尼共振＋低通包絡或 CC0 Foley 做 `click`/`blip`/`choice`/`fail` 效果遠勝擴散模型。MOSS-SoundEffect v2.0（48 kHz DiT）可作為純 Apache-2.0 長度較長音效的商用備援。 | **短 UI 音效主力（`click`/`blip`/`choice`/`fail`）** |

---

### 7.3 全部 12 首 BGM 具體重產規格

> **通用參數建議（ACE-Step 1.5 / 若暫沿用 v1 也需套用長度與 tag 調整）**：
> - `duration` / `audio_duration`：**75–95 秒**（**嚴禁設 150 秒**，截斷 AI 進副歌爆發的動機；搭配 45–75 秒無縫循環區）
> - `lyrics`：`"[Instrumental]"`（ACE-Step 1.5 可搭 `[Intro]` / `[Verse]` / `[Verse - Gentle]` 避免 `[Chorus]`）
> - `guidance_scale`：**7.5–9.0**（從 15.0 降下，減少高 CFG 過度硬塞流行搖滾套路）
> - `use_erg_tag`：**`false`**（停用 tag 隨機擴張）；若使用支援負向詞的模型（如 Stable Audio Open 1.0），務必填入完整負向表。
> - **絕對禁用觸發地雷詞**：`soundtrack`、`epic`、`triumphant`、`groove`、`rock`、`metal`、`cinematic`、`trailer`、`fanfare`（除非極度節制）、`dark synth`。

1. **`title`（直到你找到我 — 標題與大團圓收尾）**
   - **引擎與參數**：ACE-Step 1.5｜`duration: 90s`｜`bpm: 78`｜`keyscale: "D Major"`｜`time_signature: "4/4"`
   - **風格 Tags / Prompt**：`japanese visual novel piano and chamber strings, delicate lyrical upright piano arpeggio, warm legato violin and cello ensemble, gentle celesta sparkle, nostalgic spring morning, clear uncluttered mix, soft dynamics, acoustic chamber music, instrumental only`
   - **配器 / BPM / 情緒**：鋼琴（主導）＋ 弦樂四重奏（小／中／大提琴）＋ 極少量鋼片琴｜76–82 BPM｜思念、青澀、帶著期待的早晨微光
   - **避免元素**：`drums, percussion, drum kit, timpani, electric guitar, distortion, rock, epic trailer brass, choir, vocals, sudden crescendo`

2. **`daily`（404 號社辦的日常 — 社辦／教室／普通日常）**
   - **引擎與參數**：ACE-Step 1.5（或 MIDI+SoundFont 保底）｜`duration: 85s`｜`bpm: 112`｜`keyscale: "C Major"`｜`time_signature: "4/4"`
   - **風格 Tags / Prompt**：`japanese slice of life anime BGM, light playful acoustic chamber ensemble, gentle fingerstyle steel-string acoustic guitar, cute glockenspiel and marimba melody, soft pizzicato strings, delicate brushed snare and light shaker, sunny school clubroom afternoon, sparse airy dialogue-friendly arrangement, instrumental`
   - **配器 / BPM / 情緒**：清脆民謠木吉他分解（非掃弦）＋ 鐘琴／木琴 ＋ 撥弦 ＋ 輕刷小鼓／沙鈴｜108–116 BPM｜輕鬆明快、有空氣感、不搶對白
   - **避免元素**：`flamenco, spanish guitar, strumming solo, latin percussion, conga, heavy drums, electric guitar, overdrive, rock band, vocals`

3. **`sim`（本週企劃中！— 排程／公佈欄／週末／週報／在家休息）**
   - **引擎與參數**：Stable Audio Open 1.0（42–46 秒純淨短循環）或 ACE-Step 1.5（`duration: 80s`）｜`bpm: 100`｜`keyscale: "F Major"`｜`time_signature: "4/4"`
   - **風格 Tags / Prompt**：`cozy lo-fi rhodes electric piano and nylon acoustic guitar, soft upright bass walking gently, subtle brushed jazz drums, light marimba accents, relaxed productive afternoon planning mood, japanese life sim menu BGM, steady mellow loop, clean studio mix, instrumental`
   - **配器 / BPM / 情緒**：Rhodes 電鋼琴 ＋ 尼龍弦吉他 ＋ 原聲貝斯撥奏 ＋ 極輕刷鈸｜96–104 BPM｜專注規劃、自在從容、久聽五分鐘以上不疲勞
   - **避免元素**：`vinyl crackle noise, distorted guitar, heavy kick drum, sidechain EDM, dramatic climax, choir, vocals`

4. **`minigame`（實戰演練！— Quiz / Spot / Serp 全部 17 關）**
   - **引擎與參數**：Stable Audio Open 1.0（44s 循環）或 ACE-Step 1.5（`duration: 80s`）｜`bpm: 118`｜`keyscale: "G Major"`｜`time_signature: "4/4"`
   - **風格 Tags / Prompt**：`bright playful japanese puzzle game thinking BGM, marimba and pizzicato strings ostinato, crisp electric piano chords, subtle chiptune-lite bell arpeggio, light snappy rimshot beat, curious focused upbeat study mood, steady non-intrusive loop, instrumental`
   - **配器 / BPM / 情緒**：馬林巴 ＋ 弦樂撥奏 ＋ 電鋼琴 ＋ 輕巧高音鐘琴 ＋ 輕微電子／木塊節拍｜114–122 BPM｜動腦專注、帶一點小緊張與好玩感，絕不催促焦慮
   - **避免元素**：`countdown alarm, ticking bomb, dubstep, heavy bass drop, aggressive synth lead, rock guitar, vocals`

5. **`warm`（放學後的晚霞 — 心動時刻與 CG 告白）**
   - **引擎與參數**：ACE-Step 1.5｜`duration: 85s`｜`bpm: 72`｜`keyscale: "A Major"`｜`time_signature: "4/4"`
   - **風格 Tags / Prompt**：`intimate felt piano and warm soft cello, gentle sustained chamber strings pad, subtle acoustic harp harmonics, golden hour sunset romance visual novel BGM, tender peaceful emotional space, sparse slow melody with breathing room for dialogue, no percussion, instrumental`
   - **配器 / BPM / 情緒**：Felt 柔音鋼琴 ＋ 大提琴獨奏線條 ＋ 柔弦樂墊底 ＋ 少量豎琴泛音｜68–76 BPM｜溫柔、心跳、真摯不煽情
   - **避免元素**：`drums, percussion, rock, distorted electric guitar, saxophone, smooth jazz, power ballad, sudden buildup, vocals`

6. **`melancholy`（404 的雨夜 — 壞結局前半／複製品自白／雨夜）**
   - **引擎與參數**：ACE-Step 1.5 或 Stable Audio Open 1.0（45s 循環）｜`duration: 85s`｜`bpm: 64`｜`keyscale: "E Minor"`｜`time_signature: "4/4"`
   - **風格 Tags / Prompt**：`melancholic solo felt piano in minor key, sparse delicate notes with long silence decay, soft distant solo cello sigh, quiet rainy night school room atmosphere, bittersweet gentle sadness with a faint spark of hope, minimal acoustic ambient visual novel BGM, no drums, instrumental`
   - **配器 / BPM / 情緒**：稀疏微弱延音 Felt 鋼琴 ＋ 極低聲量孤獨大提琴（嚴禁加鼓，可帶極細不可搶戲之室內暖色 Reverb）｜60–68 BPM｜失落、孤寂、但保有希望微光而非恐怖絕望
   - **避免元素**：`horror, dissonant drone, jumpscare, heavy sub-bass, drums, electric guitar, gothic organ, vocals`

7. **`tense`（演算法的大雨 — 黑川登場／排名暴跌危機）**
   - **引擎與參數**：ACE-Step 1.5｜`duration: 80s`｜`bpm: 100`｜`keyscale: "D Minor"`｜`time_signature: "4/4"`
   - **風格 Tags / Prompt**：`light anime school mystery suspense BGM, crisp staccato pizzicato violin and cello, subtle muted analog synth pluck pulse, soft tense piano ostinato, light woodblock and rimshot tick, focused cyber-investigation intrigue without horror or action trailer drops, dialogue-friendly, instrumental`
   - **配器 / BPM / 情緒**：緊湊弦樂撥奏（像 `tense_c2` 前 20 秒的成功部分！）＋ 低音鋼琴八分音符反覆動機 ＋ 柔和類比合成器脈衝 ＋ 輕木塊｜96–104 BPM｜警戒、事件發生、需要冷靜排查
   - **避免元素**：`EDM kick, rave drop, sidechain, dubstep, trailer braaam, taiko war drums, industrial metal, distortion, screeching synth, horror`

8. **`comedy`（黑帽推銷中！— 黑川擺攤 `sq-x1`／罰坐結局）**
   - **引擎與參數**：ACE-Step 1.5（或 MIDI+SoundFont 保底）｜`duration: 75s`｜`bpm: 116`｜`keyscale: "F Major"`｜`time_signature: "4/4"`
   - **風格 Tags / Prompt**：`playful comedic japanese slice of life anime BGM, bouncy bassoon and clarinet staccato duet, mischievous pizzicato strings, lighthearted xylophone and jaunty piano chords, cute clumsy mischievous mood, cheerful cartoon-lite school comedy, steady light rhythm, instrumental`
   - **配器 / BPM / 情緒**：低音管／單簧管跳音對話 ＋ 撥弦 ＋ 輕巧木琴與鋼琴切分音 ＋ 輕微三角鐵／沙鈴｜112–122 BPM｜滑稽、自鳴得意被戳破、吐槽歡樂而不喧鬧
   - **避免元素**：`sad music, dark suspense, brass fanfare, heavy drums, trombone slide cliché overuse, distortion, vocals`

9. **`festival`（青葉搜尋祭 — 第 7 週學園祭典與揭曉瞬間）**
   - **引擎與參數**：ACE-Step 1.5｜`duration: 85s`｜`bpm: 128`｜`keyscale: "Bb Major"`｜`time_signature: "4/4"`
   - **風格 Tags / Prompt**：`cheerful sunny japanese high school cultural festival BGM, bright upbeat acoustic brass and flute melody, joyful glockenspiel, energetic handclaps and light festive percussion, bouncy pop piano and bass, celebratory warm daytime crowd joy without battle tension, instrumental`
   - **配器 / BPM / 情緒**：明亮吹奏樂（小號點綴＋長笛）＋ 活潑鋼琴和弦 ＋ 鐘琴 ＋ 清脆拍手與輕巧祭典節奏｜124–132 BPM｜陽光、章魚燒攤位熱鬧、青春歡慶（不是打仗！）
   - **避免元素**：`war drums, dark minor key, cinematic battle orchestra, heavy distortion guitar, intense combat, choir, vocals`

10. **`theme_rin`（規則與貓咪 — 白鷺凜專用主題）**
    - **引擎與參數**：ACE-Step 1.5（或 MIDI+SoundFont）｜`duration: 85s`｜`bpm: 94`｜`keyscale: "G Major"`｜`time_signature: "3/4"` 或 `"4/4"`
    - **風格 Tags / Prompt**：`elegant neat classical-pop anime heroine theme, crisp classical piano melody with refined string quartet accompaniment, gentle pizzicato accents, dignified yet secretly sweet and shy mood, warm afternoon student council room, clean transparent chamber sound, no drums, instrumental`
    - **配器 / BPM / 情緒**：清澈古典鋼琴 ＋ 弦樂四重奏（中後半可帶一點柔情連弓）｜90–98 BPM｜條理分明、端莊克制卻藏著可愛溫柔
    - **避免元素**：`drums, heavy bass, rock, jazz sax, electronic synth lead, gloomy minor sadness, vocals`

11. **`theme_hare`（結論先說！— 夏川晴專用主題）**
    - **引擎與參數**：ACE-Step 1.5（或 MIDI+SoundFont）｜`duration: 80s`｜`bpm: 120`｜`keyscale: "C Major"`｜`time_signature: "4/4"`
    - **風格 Tags / Prompt**：`sunny energetic anime girl theme, cheerful bright ukulele and strummed acoustic guitar, playful whistling-like flute or melodica melody, bouncy upright bass, crisp handclaps and light shaker tambourine, radiant after-school radio club vibe, positive uncluttered background music, instrumental`
    - **配器 / BPM / 情緒**：烏克麗麗＋明亮木吉他 ＋ 長笛／口風琴可愛主旋律 ＋ 拍手鈴鼓｜116–124 BPM｜開朗率真、元氣滿滿、像放學後陽光灑進廣播室
    - **避免元素**：`flamenco, distorted guitar, heavy rock kit, EDM, slow melancholy, vocals`

12. **`theme_mirai`（星光資料庫 — 星野未來專用主題）**
    - **引擎與參數**：Stable Audio Open 1.0（44s 循環）或 ACE-Step 1.5（`duration: 85s`）｜`duration: 85s`｜`bpm: 84`｜`keyscale: "Db Major"` 或 `"F# Major"`｜`time_signature: "4/4"`
    - **風格 Tags / Prompt**：`ethereal crystal clear anime girl theme, delicate glass piano and sparkling celesta arpeggios, soft glowing ambient synth pad like distant stars, gentle plucked harp notes, calm curious serene planetarium night atmosphere, minimalist electronic-acoustic blend, no heavy drums, instrumental`
    - **配器 / BPM / 情緒**：清透高音域鋼琴 ＋ 鋼片琴 ＋ 輕柔閃亮合成 Pad ＋ 豎琴撥弦｜80–88 BPM｜澄澈、科技感與少女感並存、夜空星光下的溫柔心跳
    - **避免元素**：`cyberpunk industrial, glitch noise, heavy sub-bass, harsh lead synth, rock drums, vocals`

---

### 7.4 BGM 後處理與 QA 閘門升級規格（修正 `scripts/colab/bgm/generate_and_process.py`）

1. **導入「分段動態穩定度」門檻（抓出前平後爆）**：
   - 對話襯底曲（`daily` / `sim` / `warm` / `melancholy` / `tense` / `comedy` / `theme_*`）：強制 **LRA ≤ 6.0 dB**，相鄰 2 秒窗最大跳動 **≤ 3.5 dB**（原本僅做軟扣分，讓 `daily_c2` 10.8 dB 與 `title_c3` 8.7 dB 通通放行）。
   - 標題／祭典曲（`title` / `festival`）：**LRA ≤ 8.5 dB**，單 2 秒最大跳動 **≤ 4.5 dB**。
2. **新增頻帶比例與低頻轟鳴守門**：
   - 超低頻（20–120 Hz）能量占比 **≤ 45%**（排除 `festival_c2` 84% 這類戰鼓低頻轟鳴）。
   - 對話襯底曲平均頻譜質心限制在 **900–2400 Hz**，中低／中高比例平順，避免 `tense_c3` 4051 Hz 這類尖銳電子音。
3. **修補接縫檢核漏洞（不只看 50 ms）**：
   - 在現有 ±50 ms 跳動外，新增**跨界 ±500 ms 響度差 ≤ 1.5 dB** 與 **±500 ms 頻譜／色度餘弦相似度 ≥ 0.78**（直接擋掉 `daily_c2` +4.8 dB、`daily_c3` cos 0.13、`tense_c2` cos 0.34），並優先讓 `loopStart` 與 `loopEnd` 落在相同編曲段落內。
4. **整合目標響度微調**：
   - 對話襯底曲調為 **−19.0 LUFS**（或保留 −18 LUFS 搭配 `gainDb` 補償），標題／祭典維持 **−17.5 LUFS**，讓切換介面時不會突然太大聲。
5. **增加 CLAP 零樣本風格過濾 ＋ 取消自動選定 `default`**：
   - 生成完立即以 `laion/clap-htsat-unfused` 比對正向文字（如 `gentle japanese anime visual novel piano chamber background music`）與負向地雷（`heavy metal rock electric guitar distortion`、`flamenco spanish guitar`、`EDM nightclub rave`、`epic hollywood trailer war drums`），負向相似度高者直接淘汰重抽。
   - 移除自動寫死 `recommended_id` 當上線預設的邏輯，強制產出試聽頁經**人耳聽審確認**後才寫入 `public/audio/manifest.json` 的 `default`。

---

### 7.5 SFX 重產／調整規格與 `postprocess.py` 修正清單

#### 需保留／僅微調清單（無需重生成）
- **`win`**：全部 4 候選皆佳，將 `default` 從 `c1` 改為 **`win_c2`**（4.5 / 5，最溫潤自然），並立即接入 3 個小遊戲過關觸發。
- **`card`**：保留 `c1`（預設）、`c2`、`c3`；僅將刺耳的 `c4`（7819 Hz）汰除或移至候選末位。
- **`grow`**：保留 `c1`、`c2`（可評估將 `c2` 設為預設，四連播更不吵耳）；汰換 `c3`、`c4`。
- **`bond`**：保留 `c1`（預設）、`c2`、`c4`；若重跑 `postprocess.py`，把 `bond` 長度上限從 1000 ms 放寬至 **1200 ms**（含 70 ms 淡出），即可讓極佳的 `bond_c4` 自然收尾不急收；汰換 `c3`。

#### 需重製／新增清單

| SFX ID | 產製策略與模型選擇 | 具體規格 / 提示詞 / 避免元素 | 後處理參數要求 |
| --- | --- | --- | --- |
| **`click`** | **放棄擴散模型**，改用 **Python 物理建模合成**（雙極點阻尼木魚/機械鍵帽共振）或 **CC0 Foley 真實木質短敲取樣** 製作 4 版差異化候選 | 雙模態帶通木質敲擊（主頻 450–750 Hz + 泛音 1.1–1.4 kHz），帶極短 2 ms 柔膚起音，聽感類似日系 VN 溫潤紙頁／木質按鈕輕「篤」；質心控制在 **600–1300 Hz** | 44.1 kHz 單聲道、總長 55–85 ms、**4 kHz 柔和低通濾波**去除靜電毛刺、目標 −25 LKFS、峰值 −9.5 dBFS |
| **`blip`** | **一律改用精緻程式合成**（嚴禁再使用 Stable Audio Open 生成 ≤60 ms 短音） | 以柔和阻尼木琴／Marimba 波型為基底（基頻 620–820 Hz，微量 2/3 次諧波衰減快，**可設計 2–3 個微小音高輪替**避免機械重複）；質心 **650–1100 Hz** | 總長 42–55 ms、3 ms 升餘弦淡入＋22 ms 淡出、3.5 kHz 低通確保 65 ms 連播如雨滴不刮耳、目標 −26.5 LKFS |
| **`choice`** | 可優先採 **MIDI 鋼片琴／鋼琴＋馬林巴採樣合成**（精準確保「純四度或大三度雙音上行」），或以 **Stable Audio Open 1.0** 搭配更長目標區間抽卡 | Prompt（若用 AI）：`Two distinct ascending notes played cleanly on warm celesta and soft marimba, C5 to G5 pleasant interval, Japanese visual novel menu confirm ding, warm studio tone, no harsh high metallic chime`；避免：`single note, hotel desk bell, harsh piercing high pitch, cymbal, reverb` | **【關鍵】將 `target_duration_ms` 上限由 350 ms 放寬至 `420–550 ms`**（淡出 70 ms），禁止在 −19 dB 時硬切第二音尾韻；質心目標 1800–3200 Hz |
| **`fail`** | **Stable Audio Open 1.0**（重設提示詞避開單下木塊與彈簧哨）＋ 符號 MIDI/採樣雙軌備選 | Prompt：`Warm gentle descending two-note muted marimba and soft plucked double bass interval (E4 down to C4), polite cute Japanese school anime puzzle mistake thud, rounded warm low-mids, clean decay`；避免：`single knock, spring boing, rubber toy, slide whistle, buzzer, harsh horn` | 總長 **500–750 ms**（必須聽得出兩音下行）、目標質心 **800–1800 Hz**、−18.5 LKFS |
| **`shock`（新增）** | **Stable Audio Open 1.0** 或 **MOSS-SoundEffect v2.0**（Apache-2.0） | 用於 `w6.ts:8` 演算法暴雨危機與閃白轉場（替代誤用的喜劇 `fail`）：`Short dramatic low pizzicato bass impact with soft crisp digital notification glitch accent, mild anime mystery surprise sting, not horror scream, clean 0.6s tail` | 總長 **500–800 ms**、帶低頻頓挫但不破音（true peak ≤ −1.5 dBTP）、−17 LKFS |

#### `scripts/colab/sfx/postprocess.py` 與 `select_candidates.py` 必須修正項目
1. 放寬長度上限：`choice` 上限由 350 ms 改為 **550 ms**；`bond` 上限由 1000 ms 改為 **1200 ms**，杜絕 `pre_fade_level_db` 偏高（−18 至 −29 dB）的硬截斷尾音。
2. 增設高頻質心罰分門檻：`click`、`blip` 質心若超過 **2200 Hz** 直接重扣／淘汰；`choice`、`card`、`grow`、`bond` 若超過 **5500 Hz** 扣分（防止再次挑出 `blip_c1` 5662 Hz、`choice_c1` 6396 Hz、`card_c4` 7819 Hz）。
3. 針對 `fail` 與 `choice` 改以**音高包絡（F0/Chroma 軌跡）**檢查是否真的包含「兩音上行／下行」變化，避免再選出單音敲擊的 `fail_c1`。

---

## 8. 重產清單、優先順序與預估工作量

### 階段 0：零生成成本止血（立即可做，預估 **0.5–1 小時** / **0 CU**）
利用現有檔案立即調換錯誤預設並修補死資產／誤觸發：
1. 在 `scripts/audio/{bgm,sfx}-candidates.json` 與 `public/audio/manifest.json` 將明顯較佳的既有候選暫升為預設：
   - `bgm/title`：`c2` → **`c3`**（2.0 → 3.5 分）
   - `sfx/click`：`c1` → **`c3`**（2.0 → 3.5 分）
   - `sfx/blip`：`c1` → **`c4`**（1.5 → 3.5 分）
   - `sfx/choice`：`c1` → **`c3`**（2.0 → 3.0 分）
   - `sfx/fail`：`c1` → **`c4`**（2.0 → 3.0 分）
   - `sfx/win`：`c1` → **`c2`**（4.0 → 4.5 分）
2. 程式接線止血（後續實作任務）：小遊戲過關改播 `win`（失敗播 `fail`）、移除 `prologue.ts:8` / `festival.ts:17` 的 `choice`、移除 `w6.ts:8` 誤播 `fail`、修正 `WeeklyReport.tsx:32` 無條件播 `bond`。

### 階段 1：核心曲庫重建 ＋ 缺口補齊 ＋ 短音效重做（高優先，預估 **1–2 個工作天** / Colab L4 **約 2.5–4.5 CU**）
- **BGM 重製／新增（9 首 × 3 候選 = 27 首）**：
  - 徹底替換 **4 首重災曲**：`daily`、`warm`、`tense`、`festival`
  - 升級精修 **1 首**：`title`（在 `title_c3` 方向上產出更穩動態版）
  - 新增 **4 首流程缺口曲**：`sim`（養成專用）、`minigame`（小遊戲專用）、`melancholy`（低落／雨夜／壞結局）、`comedy`（黑川與搞笑結局）
  - 推薦採 **ACE-Step 1.5（MIT）＋ Stable Audio Open 1.0 短循環（45s）＋ 關鍵難控曲（如 `daily`/`comedy`）輔以 MIDI+SoundFont**，於 L4 上線 75–95s 生成＋CLAP 預篩＋本機人耳聽審（單首每 3 候選連重抽約 0.3–0.5 CU，9 首合計約 **2.5–4.5 CU**）。
- **SFX 重製／新增（4 種重製 ＋ 1 種新音）**：
  - 本機重寫物理建模合成：`click`、`blip`（**0 CU**，約 2 小時）
  - 重跑 Stable Audio Open / 符號取樣＋新版 `postprocess.py`：`choice`、`fail`、新增 `shock`（若需重開 Colab 約 **0.3–0.5 CU**，或直接與 BGM 同機執行）
- **引擎與劇本同步**：擴充 `synth.ts`、將養成 4 畫面切 `sim`、將 `MinigameHost` 切 `minigame`、依表 6.3 更新 `w5`/`w6`/`sq-h3`/`sq-m3`/`sq-x1`/`weekend-rest`/`end-bad`/`end-blackhat`/`end-true` 切曲。

### 階段 2：三位女主角專屬主題升級（中優先體驗打磨，預估 **0.5–1 個工作天** / Colab L4 **約 1.0–2.0 CU**）
- **新增 3 首角色曲（3 首 × 3 候選 = 9 首）**：`theme_rin`（白鷺凜）、`theme_hare`（夏川晴）、`theme_mirai`（星野未來）。
- 套用至全部 12 場女主角約會、`sq-r3`/`sq-h3`/`sq-m3` 後半與 `end-rin`/`end-hare`/`end-mirai` 結局，並同步加進「音樂鑑賞」清單。
