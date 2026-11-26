# 搜尋戀曲：美術製作單（art-requests）

> 給「用 AI 影像工具出圖」的人使用。照這份文件出圖、跑一次指令，新圖就會自動被遊戲採用，**不需要改任何程式碼**。
> 所有路徑、尺寸、指令都已對照程式碼與現有檔案驗證（`scripts/process-art.mjs`、`src/art/**`、`public/art/manifest.json`）。

## 0. 總覽

| 類別 | 已有 | 要新增 | 說明 |
|---|---|---|---|
| 角色表情立繪 | 5（各角色 `normal`） | **27** | 凜／晴／未來各 7 張（smile、happy、blush、surprised、angry、sad、think）＝21；索老師 3 張（smile、think、sad）；黑川 3 張（smug、shock、sad） |
| 背景 | 9 | **6** | street、planetarium、beach、festival、rain、infirmary（目前以程式繪製的 SVG 頂替） |
| 事件 CG | 0 | **10** | 7 個結局＋3 個第 3 次約會，目前以「背景＋立繪合成」頂替 |
| **合計** | 14 | **43** | 檢查表在第 6 章；`npm run art:check` 會自動列出完成／未完成 |

**建議出圖順序**（依劇本中出現次數，投資報酬率由高到低）

1. 凜：think、smile、blush、angry；晴：happy、think、blush、smile、surprised、sad；未來：think、smile、blush、sad、happy；索老師：smile；黑川：smug、shock。
2. 背景：street（週末選單每週都看得到）、festival、planetarium、beach、rain、infirmary。
3. 其餘表情（angry/surprised 等次要的）與 10 張 CG。

### 遊戲如何使用這些圖（務必先讀）

- **立繪**：`CharacterSprite` 以 `<角色>/<表情>` 查 manifest。**有該表情的圖＝直接顯示（完全比對，不再疊 emoji 小符號）**；沒有就退回 `normal` 並疊上 emoji 風格小符號（愛心、汗滴等）。索老師與黑川另有退回對照：索老師 happy／blush→smile、surprised→normal、angry→think、smug→smile、shock→normal；黑川 smile／happy→smug、blush／angry／think→normal、surprised→shock。所以索老師只需補 3 張、黑川只需補 3 張。
- 遊戲對部分表情會再套**輕微 CSS 濾鏡**（smile／happy／blush 略亮、angry 提高對比、sad 略暗且降飽和、shock 提高對比）。**請不要在圖上再加整體調色**，以免重複。
- **舞台**是 1280×720。立繪顯示框為 384×640（高 640、寬 = 高×0.6），左／中／右三個站位的中心 x = 250／640／1030，框頂 y = 150、底部超出舞台 70px。對話框寬 1120、高約 164，貼底 20px，所以**畫面最下方約 200px（y > 515）會被對話框遮住**。
- **背景**會被遊戲套用時段濾鏡：`dusk` ＝ 褐黃（sepia 0.22）＋飽和 1.25＋亮度 0.92，再疊橘紅漸層；`night` ＝ 亮度 0.58＋飽和 0.88＋色相 +8°，再疊深藍漸層，戶外背景（gate／rooftop／street／beach／festival）還會疊星點。因此原圖請畫成「白天、亮度中等」。`gate` 另外有櫻花瓣粒子。
- **CG** 以 z-index 蓋在整個舞台（含立繪）之上，外圍有 10px 半透明白框，**右上角（約 x 900～1250、y 20～65）有標題膠囊**；結局畫面還會在下方蓋一個 960px 寬的面板與漸層；約會 CG 播放時下方會有對話框。→ 請把主體與臉放在 **y ≈ 60～470**，右上角與下 1/3 保持簡單。回憶相簿縮圖只有 288×162，主體要夠大。

## 1. 風格聖經（Style Bible）

以現有 5 張立繪與 9 張背景為準，再對照 plan §1（角色表）與 §4（美術規格）。**新圖必須長得像現有圖**。

### 1.1 整體畫風

- **日系校園青春動畫 × 韓系條漫（webtoon）**：臉小、眼睛大且有清楚的高光、鼻口簡單，髮絲有光澤感，身形修長、比例偏寫實。
- **線條**：細而乾淨的**深色線（用深藍／深棕，不是純黑）**，輪廓外圍有一圈極淡的亮邊（現有立繪去背後可見），不要粗描邊、不要漫畫網點。
- **上色**：柔和賽璐璐——底色＋一層陰影＋一層高光（plan §4）；頭髮有一條明顯的光澤帶；皮膚是淺暖米色，腮紅是淡粉。不要寫實光影、不要 3D 渲染感、不要厚塗。
- **背景**：精緻數位繪景，電影感暖色逆光、窗邊光束、微微的光暈（bloom）、冷暖對比的陰影；乾淨但有手繪質感；窗外永遠有綠樹與藍天（白天）。（對照 `bg/classroom`、`bg/library`、`bg/rooftop`）
- **調色**：UI 主題粉彩（櫻花粉 `#f7b8c8`、天空藍 `#9fd3f0`、薄荷 `#b5ead7`、奶油白 `#fffaf0`、墨色 `#3b3550`）；背景整體偏暖黃木色＋天藍；人物飽和度高於背景，讓人物從背景跳出來。
- **學園制服（青葉學園）**：深藍西裝外套、白襯衫、深色百褶／格紋裙，**每個角色領口配件顏色不同**（凜＝紅緞帶、晴＝黃領結、未來＝青緞帶）。校舍＝米色牆＋紅磚（`bg/gate`）。
- **不要**：中文／英文文字（背景招牌除外，且不要求可讀）、浮水印、簽名、Q 版、寫實照片感、過度模糊。

### 1.2 角色色彩與「必須保留」特徵

主色／輔色取自 `src/content/characters.ts`。表情圖與 CG 一律不得更動下列特徵。

| 角色 | 身分 | 主色／輔色 | 必須保留（Must keep） | 表情調性 |
|---|---|---|---|---|
| `rin` 白鷺 凜 | SEO・學生會長 | `#1f3a6e` ／ `#d6334a` | 黑長直藍黑髮（帶藍色高光）、紅色髮帶、銳利藍眼、領口紅色緞帶、左臂（畫面右側）紅色學生會臂章、深藍西裝外套 | 外冷內熱：表情幅度克制，生氣是「冷冽的不悅」而不是大吼；害羞時會別開視線（傲嬌）。 |
| `hare` 夏川 晴 | AEO・廣播問答社社長 | `#f28c28` ／ `#ffd24a` | 橘色鮑伯頭＋右側（畫面右）黃色髮圈小馬尾、琥珀橘大眼、脖子上白橘耳機、歪歪的黃色領結 | 元氣外放：表情幅度最大，笑容大、嘴巴常張開；生氣是鼓臉賭氣的可愛款。 |
| `mirai` 星野 未來 | GEO・資訊科學會特邀評審 | `#9a8cd0` ／ `#3fd0d4` | 銀白漸層淡紫長髮、畫面右側青色星形髮夾、藍紫眼、領口青色緞帶、過大的淡紫開襟外套 | 神秘安靜：表情變化細微（像在「運算」），笑容淺、眼神是主要情緒來源；生氣只是微微嘟嘴。 |
| `sensei` 索 千尋 老師 | 網站研究社顧問 | `#a9826a` ／ `#f1dcc4` | 棕色低馬尾（垂在畫面左側肩上）、黑色細框長方形眼鏡、白襯衫＋棕黃開襟毛衣、手拿陶製馬克杯 | 慵懶溫柔的成年女性：不要畫成少女，眼神帶著包容。 |
| `kuro` 黑川 翔 | 黑帽 SEO 反派（流量學院） | `#2d2d38` ／ `#8a8a9a` | 黑色棒球帽（金色閃電標誌）、深灰藍凌亂髮、灰色眼睛、炭黑連帽外套＋白 T | 輕浮的推銷員：smug 要有「很欠揍但有魅力」的味道；shock 與 sad 要讓人看到他其實有點可愛、可救贖。 |

剪影必須一眼可分辨（plan §4 品質關卡）：凜＝又長又直的深色髮、晴＝短橘髮＋側馬尾、未來＝銀白長髮＋過大外套、索老師＝成年體型＋眼鏡、黑川＝棒球帽。

### 1.3 現有立繪的技術規格（已驗證）

- 檔案：`public/art/<id>/normal.webp`，**600×1000 px、WebP、含透明通道（RGBA）**。
- 構圖：頭頂到大腿／腰部，**底邊貼齊畫布底部（y = 1000）**；凜的不透明區域外框為 (71,50)–(529,1000)，即頭頂距畫布上緣 50px、高 950px；索老師、黑川、未來則寬度到 560px（x = 20～580）為止。人物水平置中。
- 這個規格不是手動切出來的，而是 `scripts/process-art.mjs` 自動裁切／縮放的結果（見 §6.2）：**每張圖都依自己的不透明外框重新裁切並縮放到「寬 ≤ 560、高 ≤ 950」、置中、貼底**。這代表：**同一角色的各表情，姿勢／輪廓必須與 `normal` 完全一致**，否則自動裁切後臉會「跳動」或大小不同。

## 2. 一致性工作流程（最重要）

### 2.1 做法：以 `normal` 立繪當參考圖，用「圖生圖／編輯」只改臉

1. **做綠幕參考圖**：把現有 `public/art/<id>/normal.webp` 墊上純綠 `#00FF00` 背景並存成 PNG，當作每次的參考圖（ImageMagick 範例，Windows 用 `magick`、macOS／Linux 用 `convert`）：

   ```bash
   magick public/art/rin/normal.webp -background "#00FF00" -alpha remove -alpha off rin-normal-green.png
   ```

   （也可用任何圖片編輯軟體：貼到綠色圖層上再匯出 PNG。）
2. 在你的影像工具使用**圖片編輯／Image-to-Image／Inpainting／參考圖**功能（例如各家的 "edit image"、"variations"、ControlNet＋reference、對話式圖片編輯工具），**附上該參考圖**，貼上 §3 的提示詞。**只准改臉：眼睛、眉毛、嘴巴、腮紅**。
3. 若工具支援**遮罩**，只塗臉部（髮瀏海以內的臉部區域），其餘鎖定；若不支援，請在提示詞中重申「same pose, same framing, same canvas」，並降低「變化強度／denoise／image strength」到約 0.3～0.5。
4. 每張出 4 張候選，**挑與 `normal` 疊起來時頭髮、肩膀、手完全重合**的那一張。可以把候選圖與參考圖疊成 50% 透明來比對。
5. 出圖尺寸請與參考圖**同一比例（2:3 直式）**，建議 **1024×1536**（至少高 ≥ 1200px，因為會縮到高 950）。背景必須是**單一純綠 #00FF00，無漸層、無陰影、無地面**。
6. 若換了臉但髮型、衣服、配件被改動，不要修修補補，直接**重新用參考圖再出**。必要時先固定一組種子（seed）。

### 2.2 綠幕去背的注意事項（對應 `process-art.mjs` 演算法）

- 角色身上、頭髮、配件、反光**不可以有綠色**（腳本以「綠色成分明顯高於紅藍」判定背景，並對邊緣做去綠溢色）。未來的青色星形髮夾（`#3fd0d4` 一帶）、索老師的馬克杯等偏青／偏棕不受影響，但請避免偏綠的青色。
- 參考圖的四個角落必須是背景色；邊緣不要有渲染出來的地面陰影。
- 也可以直接給**已去背的透明 PNG**（四周 alpha = 0）：腳本會保留 alpha，只做裁切與縮放。
- 表情用的符號（汗滴、怒筋）請**畫在原本輪廓範圍內**（例如額頭、太陽穴），不要飄到頭外，否則外框變大、整張被縮小。也不要抬手（托下巴思考等）。

### 2.3 母版提示詞（Master prompt template，可重複使用）

把 `{ID}`、`{IDENTITY}`、`{EXPRESSION}` 換成 §3 的內容；§3 已為每個表情填好完整可貼的版本。

```text
[Attach reference: {ID}-normal-green.png]
Image edit. Keep the character IDENTICAL to the reference image: same pose, same camera and framing, same body, uniform, hair silhouette,
accessories, line art, colors and lighting, on a flat pure chroma-green (#00FF00) background with no shadow or gradient.
Change ONLY the facial expression (eyes, eyebrows, mouth, blush): {EXPRESSION}
Do not move, resize or retilt the head or body. Do not add props, hands or effects that extend outside the original silhouette.
Character: {IDENTITY}.
Style: Japanese high-school anime x Korean webtoon (manhwa) character illustration, clean thin dark-colored (not pure black) line art, soft cel shading with one shadow layer and one highlight layer, large glossy eyes with crisp highlights, saturated but gentle colors, smooth glossy hair highlights, high detail, 2:3 portrait, same framing as the reference.
```

**負面提示詞（Negative prompt，各表情共用；工具沒有負面欄位就整段貼在提示詞最後，前面加 "Avoid: "）**

```text
green clothing, green hair, green rim light, green reflections or green glow on the character, text, watermark, signature, extra fingers, deformed hands, cropped head, different hairstyle, different outfit, different accessories, changed pose, 3D render, photorealistic, heavy blur, cast shadow, floor, ground, background scenery, props, multiple characters, chibi, low quality
```

### 2.4 背景／CG 的一致性

- 背景：沿用 §1.1 的背景畫風；**每張先附上一張現有背景當風格參考**（例如 `bg/classroom.webp`、`bg/rooftop.webp`），提示詞中加上「in the same style as the reference」。
- CG：附上相關角色的 `normal` 立繪與（若已完成）對應表情立繪當角色參考，提示詞中保留角色設計描述（§5 已寫好）。CG 以 16:9 直接生成，不需綠幕。

## 3. 表情立繪需求（27 張）

**檔案規格（已對照 `process-art.mjs` 驗證）**

- 你交給工具的**來源圖**：PNG 或 JPG（建議 1024×1536、2:3 直式、綠幕或透明背景）。來源檔名不限，但要寫進「來源對照檔」（§6.1）。
- 腳本產出：`public/art/<id>/<face>.webp`（**600×1000、WebP 品質 0.88、RGBA**），並在 `public/art/manifest.json` 寫入 `"<id>/<face>": "/art/<id>/<face>.webp"`。
- 下表「Key」就是來源對照檔裡的 key，也是 manifest 的 key；「出圖檔名建議」是你自己存來源圖用的名字。

每個角色的 5 條共通規則：①同姿勢同裁切 ②只改眼／眉／嘴／腮紅 ③綠幕單色 ④不要綠色 ⑤符號只能在原輪廓內。

### 3.1 白鷺 凜（`rin`）：7 張

- 參考圖：`public/art/rin/normal.webp` → 先做成 `rin-normal-green.png`。
- 角色描述（已放進下方每條提示詞）：Shirasagi Rin, tall elegant third-year student council president: very long straight glossy dark navy-blue hair with lighter blue highlights and straight blunt bangs, a red hairband, sharp blue eyes, navy school blazer, white shirt, red ribbon bow at the collar, red student-council armband on her left arm (viewer's right), pleated dark skirt.
- 表情調性：外冷內熱：表情幅度克制，生氣是「冷冽的不悅」而不是大吼；害羞時會別開視線（傲嬌）。

| Key（manifest） | 輸出檔 | 來源圖建議檔名 | 尺寸 | 劇本 say/show 次數 |
|---|---|---|---|---|
| `rin/smile` 微笑 | `public/art/rin/smile.webp` | `rin-smile.png` | 600×1000 RGBA（來源 2:3，建議 1024×1536） | 37 |
| `rin/happy` 開心 | `public/art/rin/happy.webp` | `rin-happy.png` | 600×1000 RGBA（來源 2:3，建議 1024×1536） | 5 |
| `rin/blush` 害羞 | `public/art/rin/blush.webp` | `rin-blush.png` | 600×1000 RGBA（來源 2:3，建議 1024×1536） | 28 |
| `rin/surprised` 驚訝 | `public/art/rin/surprised.webp` | `rin-surprised.png` | 600×1000 RGBA（來源 2:3，建議 1024×1536） | 6 |
| `rin/angry` 生氣 | `public/art/rin/angry.webp` | `rin-angry.png` | 600×1000 RGBA（來源 2:3，建議 1024×1536） | 19 |
| `rin/sad` 難過 | `public/art/rin/sad.webp` | `rin-sad.png` | 600×1000 RGBA（來源 2:3，建議 1024×1536） | 6 |
| `rin/think` 思考 | `public/art/rin/think.webp` | `rin-think.png` | 600×1000 RGBA（來源 2:3，建議 1024×1536） | 36 |

**`rin/smile`（微笑）提示詞**

```text
[Attach reference: rin-normal-green.png]
Image edit. Keep the character IDENTICAL to the reference image: same pose, same camera and framing, same body, uniform, hair silhouette, accessories, line art, colors and lighting, on a flat pure chroma-green (#00FF00) background with no shadow or gradient. Change ONLY the facial expression (eyes, eyebrows, mouth, blush): a small, composed, gentle closed-mouth smile; eyes softened with a slight upward curve; brows relaxed. A rare warm smile from a cool-headed girl. Do not move, resize or retilt the head or body. Do not add props, hands or effects that extend outside the original silhouette. Character: Shirasagi Rin, tall elegant third-year student council president: very long straight glossy dark navy-blue hair with lighter blue highlights and straight blunt bangs, a red hairband, sharp blue eyes, navy school blazer, white shirt, red ribbon bow at the collar, red student-council armband on her left arm (viewer's right), pleated dark skirt.
```

**`rin/happy`（開心）提示詞**

```text
[Attach reference: rin-normal-green.png]
Image edit. Keep the character IDENTICAL to the reference image: same pose, same camera and framing, same body, uniform, hair silhouette, accessories, line art, colors and lighting, on a flat pure chroma-green (#00FF00) background with no shadow or gradient. Change ONLY the facial expression (eyes, eyebrows, mouth, blush): a genuine bright smile with lips slightly parted, eyes curved up with sparkling highlights; joyful but still restrained, not a big grin. Do not move, resize or retilt the head or body. Do not add props, hands or effects that extend outside the original silhouette. Character: Shirasagi Rin, tall elegant third-year student council president: very long straight glossy dark navy-blue hair with lighter blue highlights and straight blunt bangs, a red hairband, sharp blue eyes, navy school blazer, white shirt, red ribbon bow at the collar, red student-council armband on her left arm (viewer's right), pleated dark skirt.
```

**`rin/blush`（害羞）提示詞**

```text
[Attach reference: rin-normal-green.png]
Image edit. Keep the character IDENTICAL to the reference image: same pose, same camera and framing, same body, uniform, hair silhouette, accessories, line art, colors and lighting, on a flat pure chroma-green (#00FF00) background with no shadow or gradient. Change ONLY the facial expression (eyes, eyebrows, mouth, blush): flustered and embarrassed: cheeks and nose bridge flushed pink, eyes glancing sideways away from the viewer, lips pressed into a small wobbly line, brows slightly knit (tsundere fluster). Do not move, resize or retilt the head or body. Do not add props, hands or effects that extend outside the original silhouette. Character: Shirasagi Rin, tall elegant third-year student council president: very long straight glossy dark navy-blue hair with lighter blue highlights and straight blunt bangs, a red hairband, sharp blue eyes, navy school blazer, white shirt, red ribbon bow at the collar, red student-council armband on her left arm (viewer's right), pleated dark skirt.
```

**`rin/surprised`（驚訝）提示詞**

```text
[Attach reference: rin-normal-green.png]
Image edit. Keep the character IDENTICAL to the reference image: same pose, same camera and framing, same body, uniform, hair silhouette, accessories, line art, colors and lighting, on a flat pure chroma-green (#00FF00) background with no shadow or gradient. Change ONLY the facial expression (eyes, eyebrows, mouth, blush): eyes wide open with small pupils, eyebrows raised high, lips parted in a small 'o'; caught off guard. Do not move, resize or retilt the head or body. Do not add props, hands or effects that extend outside the original silhouette. Character: Shirasagi Rin, tall elegant third-year student council president: very long straight glossy dark navy-blue hair with lighter blue highlights and straight blunt bangs, a red hairband, sharp blue eyes, navy school blazer, white shirt, red ribbon bow at the collar, red student-council armband on her left arm (viewer's right), pleated dark skirt.
```

**`rin/angry`（生氣）提示詞**

```text
[Attach reference: rin-normal-green.png]
Image edit. Keep the character IDENTICAL to the reference image: same pose, same camera and framing, same body, uniform, hair silhouette, accessories, line art, colors and lighting, on a flat pure chroma-green (#00FF00) background with no shadow or gradient. Change ONLY the facial expression (eyes, eyebrows, mouth, blush): stern cold disapproval: brows pulled down sharply toward the center, narrowed piercing eyes, mouth in a firm straight or slightly downturned line. Elegant cold anger, not screaming. A tiny anger-vein mark on the temple is optional (inside the silhouette only). Do not move, resize or retilt the head or body. Do not add props, hands or effects that extend outside the original silhouette. Character: Shirasagi Rin, tall elegant third-year student council president: very long straight glossy dark navy-blue hair with lighter blue highlights and straight blunt bangs, a red hairband, sharp blue eyes, navy school blazer, white shirt, red ribbon bow at the collar, red student-council armband on her left arm (viewer's right), pleated dark skirt.
```

**`rin/sad`（難過）提示詞**

```text
[Attach reference: rin-normal-green.png]
Image edit. Keep the character IDENTICAL to the reference image: same pose, same camera and framing, same body, uniform, hair silhouette, accessories, line art, colors and lighting, on a flat pure chroma-green (#00FF00) background with no shadow or gradient. Change ONLY the facial expression (eyes, eyebrows, mouth, blush): inner ends of the brows raised, eyes glossy and lowered, mouth small and slightly downturned; restrained sadness with a faint shine of tears. Do not move, resize or retilt the head or body. Do not add props, hands or effects that extend outside the original silhouette. Character: Shirasagi Rin, tall elegant third-year student council president: very long straight glossy dark navy-blue hair with lighter blue highlights and straight blunt bangs, a red hairband, sharp blue eyes, navy school blazer, white shirt, red ribbon bow at the collar, red student-council armband on her left arm (viewer's right), pleated dark skirt.
```

**`rin/think`（思考）提示詞**

```text
[Attach reference: rin-normal-green.png]
Image edit. Keep the character IDENTICAL to the reference image: same pose, same camera and framing, same body, uniform, hair silhouette, accessories, line art, colors and lighting, on a flat pure chroma-green (#00FF00) background with no shadow or gradient. Change ONLY the facial expression (eyes, eyebrows, mouth, blush): eyes looking up and slightly to the side, one eyebrow slightly raised, lips lightly pursed; contemplative. No hand gestures. Do not move, resize or retilt the head or body. Do not add props, hands or effects that extend outside the original silhouette. Character: Shirasagi Rin, tall elegant third-year student council president: very long straight glossy dark navy-blue hair with lighter blue highlights and straight blunt bangs, a red hairband, sharp blue eyes, navy school blazer, white shirt, red ribbon bow at the collar, red student-council armband on her left arm (viewer's right), pleated dark skirt.
```

### 3.2 夏川 晴（`hare`）：7 張

- 參考圖：`public/art/hare/normal.webp` → 先做成 `hare-normal-green.png`。
- 角色描述（已放進下方每條提示詞）：Natsukawa Hare, energetic second-year girl: short orange bob with a small side ponytail on the viewer's right tied with a yellow scrunchie, big amber-orange eyes, white-and-orange headphones hanging around her neck, slightly crooked yellow bow tie, navy school blazer, white shirt, pleated dark skirt.
- 表情調性：元氣外放：表情幅度最大，笑容大、嘴巴常張開；生氣是鼓臉賭氣的可愛款。

| Key（manifest） | 輸出檔 | 來源圖建議檔名 | 尺寸 | 劇本 say/show 次數 |
|---|---|---|---|---|
| `hare/smile` 微笑 | `public/art/hare/smile.webp` | `hare-smile.png` | 600×1000 RGBA（來源 2:3，建議 1024×1536） | 17 |
| `hare/happy` 開心 | `public/art/hare/happy.webp` | `hare-happy.png` | 600×1000 RGBA（來源 2:3，建議 1024×1536） | 43 |
| `hare/blush` 害羞 | `public/art/hare/blush.webp` | `hare-blush.png` | 600×1000 RGBA（來源 2:3，建議 1024×1536） | 20 |
| `hare/surprised` 驚訝 | `public/art/hare/surprised.webp` | `hare-surprised.png` | 600×1000 RGBA（來源 2:3，建議 1024×1536） | 15 |
| `hare/angry` 生氣 | `public/art/hare/angry.webp` | `hare-angry.png` | 600×1000 RGBA（來源 2:3，建議 1024×1536） | 2 |
| `hare/sad` 難過 | `public/art/hare/sad.webp` | `hare-sad.png` | 600×1000 RGBA（來源 2:3，建議 1024×1536） | 14 |
| `hare/think` 思考 | `public/art/hare/think.webp` | `hare-think.png` | 600×1000 RGBA（來源 2:3，建議 1024×1536） | 27 |

**`hare/smile`（微笑）提示詞**

```text
[Attach reference: hare-normal-green.png]
Image edit. Keep the character IDENTICAL to the reference image: same pose, same camera and framing, same body, uniform, hair silhouette, accessories, line art, colors and lighting, on a flat pure chroma-green (#00FF00) background with no shadow or gradient. Change ONLY the facial expression (eyes, eyebrows, mouth, blush): a warm friendly smile with closed mouth and softly upturned corners, bright amber eyes, relaxed brows. Do not move, resize or retilt the head or body. Do not add props, hands or effects that extend outside the original silhouette. Character: Natsukawa Hare, energetic second-year girl: short orange bob with a small side ponytail on the viewer's right tied with a yellow scrunchie, big amber-orange eyes, white-and-orange headphones hanging around her neck, slightly crooked yellow bow tie, navy school blazer, white shirt, pleated dark skirt.
```

**`hare/happy`（開心）提示詞**

```text
[Attach reference: hare-normal-green.png]
Image edit. Keep the character IDENTICAL to the reference image: same pose, same camera and framing, same body, uniform, hair silhouette, accessories, line art, colors and lighting, on a flat pure chroma-green (#00FF00) background with no shadow or gradient. Change ONLY the facial expression (eyes, eyebrows, mouth, blush): a huge cheerful grin with the mouth open showing teeth, eyes curved into happy arches (or wide and sparkling), cheeks lifted; pure energy. Do not move, resize or retilt the head or body. Do not add props, hands or effects that extend outside the original silhouette. Character: Natsukawa Hare, energetic second-year girl: short orange bob with a small side ponytail on the viewer's right tied with a yellow scrunchie, big amber-orange eyes, white-and-orange headphones hanging around her neck, slightly crooked yellow bow tie, navy school blazer, white shirt, pleated dark skirt.
```

**`hare/blush`（害羞）提示詞**

```text
[Attach reference: hare-normal-green.png]
Image edit. Keep the character IDENTICAL to the reference image: same pose, same camera and framing, same body, uniform, hair silhouette, accessories, line art, colors and lighting, on a flat pure chroma-green (#00FF00) background with no shadow or gradient. Change ONLY the facial expression (eyes, eyebrows, mouth, blush): cheeks bright pink, eyes shyly glancing aside, a flustered wobbly smile; embarrassed but happy. Do not move, resize or retilt the head or body. Do not add props, hands or effects that extend outside the original silhouette. Character: Natsukawa Hare, energetic second-year girl: short orange bob with a small side ponytail on the viewer's right tied with a yellow scrunchie, big amber-orange eyes, white-and-orange headphones hanging around her neck, slightly crooked yellow bow tie, navy school blazer, white shirt, pleated dark skirt.
```

**`hare/surprised`（驚訝）提示詞**

```text
[Attach reference: hare-normal-green.png]
Image edit. Keep the character IDENTICAL to the reference image: same pose, same camera and framing, same body, uniform, hair silhouette, accessories, line art, colors and lighting, on a flat pure chroma-green (#00FF00) background with no shadow or gradient. Change ONLY the facial expression (eyes, eyebrows, mouth, blush): eyes very wide with small pupils, eyebrows high, mouth open in a big 'oh!'. Do not move, resize or retilt the head or body. Do not add props, hands or effects that extend outside the original silhouette. Character: Natsukawa Hare, energetic second-year girl: short orange bob with a small side ponytail on the viewer's right tied with a yellow scrunchie, big amber-orange eyes, white-and-orange headphones hanging around her neck, slightly crooked yellow bow tie, navy school blazer, white shirt, pleated dark skirt.
```

**`hare/angry`（生氣）提示詞**

```text
[Attach reference: hare-normal-green.png]
Image edit. Keep the character IDENTICAL to the reference image: same pose, same camera and framing, same body, uniform, hair silhouette, accessories, line art, colors and lighting, on a flat pure chroma-green (#00FF00) background with no shadow or gradient. Change ONLY the facial expression (eyes, eyebrows, mouth, blush): cute pouty anger: brows angled down toward the center, narrowed eyes, cheeks slightly puffed, mouth in a frown; not menacing. A small anger-vein mark on the temple is optional (inside the silhouette only). Do not move, resize or retilt the head or body. Do not add props, hands or effects that extend outside the original silhouette. Character: Natsukawa Hare, energetic second-year girl: short orange bob with a small side ponytail on the viewer's right tied with a yellow scrunchie, big amber-orange eyes, white-and-orange headphones hanging around her neck, slightly crooked yellow bow tie, navy school blazer, white shirt, pleated dark skirt.
```

**`hare/sad`（難過）提示詞**

```text
[Attach reference: hare-normal-green.png]
Image edit. Keep the character IDENTICAL to the reference image: same pose, same camera and framing, same body, uniform, hair silhouette, accessories, line art, colors and lighting, on a flat pure chroma-green (#00FF00) background with no shadow or gradient. Change ONLY the facial expression (eyes, eyebrows, mouth, blush): droopy eyebrows, teary shimmering eyes looking down, mouth downturned with a small wobble; deflated energy. Do not move, resize or retilt the head or body. Do not add props, hands or effects that extend outside the original silhouette. Character: Natsukawa Hare, energetic second-year girl: short orange bob with a small side ponytail on the viewer's right tied with a yellow scrunchie, big amber-orange eyes, white-and-orange headphones hanging around her neck, slightly crooked yellow bow tie, navy school blazer, white shirt, pleated dark skirt.
```

**`hare/think`（思考）提示詞**

```text
[Attach reference: hare-normal-green.png]
Image edit. Keep the character IDENTICAL to the reference image: same pose, same camera and framing, same body, uniform, hair silhouette, accessories, line art, colors and lighting, on a flat pure chroma-green (#00FF00) background with no shadow or gradient. Change ONLY the facial expression (eyes, eyebrows, mouth, blush): eyes rolled up and to the side, mouth pursed slightly to one side, one eyebrow raised; a 'hmm...' look. No hand gestures. Do not move, resize or retilt the head or body. Do not add props, hands or effects that extend outside the original silhouette. Character: Natsukawa Hare, energetic second-year girl: short orange bob with a small side ponytail on the viewer's right tied with a yellow scrunchie, big amber-orange eyes, white-and-orange headphones hanging around her neck, slightly crooked yellow bow tie, navy school blazer, white shirt, pleated dark skirt.
```

### 3.3 星野 未來（`mirai`）：7 張

- 參考圖：`public/art/mirai/normal.webp` → 先做成 `mirai-normal-green.png`。
- 角色描述（已放進下方每條提示詞）：Hoshino Mirai, mysterious first-year girl: very long silver-white hair fading into pale lilac at the tips, a cyan star-shaped hairclip on the viewer's right side of her bangs, blue-violet eyes, cyan ribbon at the collar, oversized pale-lilac cardigan over a white shirt, dark navy skirt.
- 表情調性：神秘安靜：表情變化細微（像在「運算」），笑容淺、眼神是主要情緒來源；生氣只是微微嘟嘴。

| Key（manifest） | 輸出檔 | 來源圖建議檔名 | 尺寸 | 劇本 say/show 次數 |
|---|---|---|---|---|
| `mirai/smile` 微笑 | `public/art/mirai/smile.webp` | `mirai-smile.png` | 600×1000 RGBA（來源 2:3，建議 1024×1536） | 29 |
| `mirai/happy` 開心 | `public/art/mirai/happy.webp` | `mirai-happy.png` | 600×1000 RGBA（來源 2:3，建議 1024×1536） | 13 |
| `mirai/blush` 害羞 | `public/art/mirai/blush.webp` | `mirai-blush.png` | 600×1000 RGBA（來源 2:3，建議 1024×1536） | 22 |
| `mirai/surprised` 驚訝 | `public/art/mirai/surprised.webp` | `mirai-surprised.png` | 600×1000 RGBA（來源 2:3，建議 1024×1536） | 9 |
| `mirai/angry` 生氣 | `public/art/mirai/angry.webp` | `mirai-angry.png` | 600×1000 RGBA（來源 2:3，建議 1024×1536） | 2 |
| `mirai/sad` 難過 | `public/art/mirai/sad.webp` | `mirai-sad.png` | 600×1000 RGBA（來源 2:3，建議 1024×1536） | 14 |
| `mirai/think` 思考 | `public/art/mirai/think.webp` | `mirai-think.png` | 600×1000 RGBA（來源 2:3，建議 1024×1536） | 36 |

**`mirai/smile`（微笑）提示詞**

```text
[Attach reference: mirai-normal-green.png]
Image edit. Keep the character IDENTICAL to the reference image: same pose, same camera and framing, same body, uniform, hair silhouette, accessories, line art, colors and lighting, on a flat pure chroma-green (#00FF00) background with no shadow or gradient. Change ONLY the facial expression (eyes, eyebrows, mouth, blush): a faint gentle smile with serene half-lidded eyes; the change from neutral is subtle and quiet. Do not move, resize or retilt the head or body. Do not add props, hands or effects that extend outside the original silhouette. Character: Hoshino Mirai, mysterious first-year girl: very long silver-white hair fading into pale lilac at the tips, a cyan star-shaped hairclip on the viewer's right side of her bangs, blue-violet eyes, cyan ribbon at the collar, oversized pale-lilac cardigan over a white shirt, dark navy skirt.
```

**`mirai/happy`（開心）提示詞**

```text
[Attach reference: mirai-normal-green.png]
Image edit. Keep the character IDENTICAL to the reference image: same pose, same camera and framing, same body, uniform, hair silhouette, accessories, line art, colors and lighting, on a flat pure chroma-green (#00FF00) background with no shadow or gradient. Change ONLY the facial expression (eyes, eyebrows, mouth, blush): a soft but genuine bright smile, eyes wide with star-like highlights, lips slightly parted; rare and precious. Do not move, resize or retilt the head or body. Do not add props, hands or effects that extend outside the original silhouette. Character: Hoshino Mirai, mysterious first-year girl: very long silver-white hair fading into pale lilac at the tips, a cyan star-shaped hairclip on the viewer's right side of her bangs, blue-violet eyes, cyan ribbon at the collar, oversized pale-lilac cardigan over a white shirt, dark navy skirt.
```

**`mirai/blush`（害羞）提示詞**

```text
[Attach reference: mirai-normal-green.png]
Image edit. Keep the character IDENTICAL to the reference image: same pose, same camera and framing, same body, uniform, hair silhouette, accessories, line art, colors and lighting, on a flat pure chroma-green (#00FF00) background with no shadow or gradient. Change ONLY the facial expression (eyes, eyebrows, mouth, blush): light pink blush across the cheeks, eyes looking slightly down and aside, lips pressed in a small shy line. Do not move, resize or retilt the head or body. Do not add props, hands or effects that extend outside the original silhouette. Character: Hoshino Mirai, mysterious first-year girl: very long silver-white hair fading into pale lilac at the tips, a cyan star-shaped hairclip on the viewer's right side of her bangs, blue-violet eyes, cyan ribbon at the collar, oversized pale-lilac cardigan over a white shirt, dark navy skirt.
```

**`mirai/surprised`（驚訝）提示詞**

```text
[Attach reference: mirai-normal-green.png]
Image edit. Keep the character IDENTICAL to the reference image: same pose, same camera and framing, same body, uniform, hair silhouette, accessories, line art, colors and lighting, on a flat pure chroma-green (#00FF00) background with no shadow or gradient. Change ONLY the facial expression (eyes, eyebrows, mouth, blush): eyes widened with tiny pupils, eyebrows lifted slightly, lips parted; a deadpan kind of surprise. Do not move, resize or retilt the head or body. Do not add props, hands or effects that extend outside the original silhouette. Character: Hoshino Mirai, mysterious first-year girl: very long silver-white hair fading into pale lilac at the tips, a cyan star-shaped hairclip on the viewer's right side of her bangs, blue-violet eyes, cyan ribbon at the collar, oversized pale-lilac cardigan over a white shirt, dark navy skirt.
```

**`mirai/angry`（生氣）提示詞**

```text
[Attach reference: mirai-normal-green.png]
Image edit. Keep the character IDENTICAL to the reference image: same pose, same camera and framing, same body, uniform, hair silhouette, accessories, line art, colors and lighting, on a flat pure chroma-green (#00FF00) background with no shadow or gradient. Change ONLY the facial expression (eyes, eyebrows, mouth, blush): pouty displeasure rather than rage: brows slightly lowered, eyes narrowed, lips pressed together, cheeks barely puffed. Do not move, resize or retilt the head or body. Do not add props, hands or effects that extend outside the original silhouette. Character: Hoshino Mirai, mysterious first-year girl: very long silver-white hair fading into pale lilac at the tips, a cyan star-shaped hairclip on the viewer's right side of her bangs, blue-violet eyes, cyan ribbon at the collar, oversized pale-lilac cardigan over a white shirt, dark navy skirt.
```

**`mirai/sad`（難過）提示詞**

```text
[Attach reference: mirai-normal-green.png]
Image edit. Keep the character IDENTICAL to the reference image: same pose, same camera and framing, same body, uniform, hair silhouette, accessories, line art, colors and lighting, on a flat pure chroma-green (#00FF00) background with no shadow or gradient. Change ONLY the facial expression (eyes, eyebrows, mouth, blush): inner brows tilted up, large glossy eyes looking down, lips slightly trembling; fragile loneliness (she fears being 'a copy'). Do not move, resize or retilt the head or body. Do not add props, hands or effects that extend outside the original silhouette. Character: Hoshino Mirai, mysterious first-year girl: very long silver-white hair fading into pale lilac at the tips, a cyan star-shaped hairclip on the viewer's right side of her bangs, blue-violet eyes, cyan ribbon at the collar, oversized pale-lilac cardigan over a white shirt, dark navy skirt.
```

**`mirai/think`（思考）提示詞**

```text
[Attach reference: mirai-normal-green.png]
Image edit. Keep the character IDENTICAL to the reference image: same pose, same camera and framing, same body, uniform, hair silhouette, accessories, line art, colors and lighting, on a flat pure chroma-green (#00FF00) background with no shadow or gradient. Change ONLY the facial expression (eyes, eyebrows, mouth, blush): eyes looking up or away as if computing, one eyebrow lifted slightly, lips neutral to slightly pursed. No hand gestures. Do not move, resize or retilt the head or body. Do not add props, hands or effects that extend outside the original silhouette. Character: Hoshino Mirai, mysterious first-year girl: very long silver-white hair fading into pale lilac at the tips, a cyan star-shaped hairclip on the viewer's right side of her bangs, blue-violet eyes, cyan ribbon at the collar, oversized pale-lilac cardigan over a white shirt, dark navy skirt.
```

### 3.4 索 千尋 老師（`sensei`）：3 張

- 參考圖：`public/art/sensei/normal.webp` → 先做成 `sensei-normal-green.png`。
- 角色描述（已放進下方每條提示詞）：Sou Chihiro, relaxed adult female teacher: brown hair in a low side ponytail over her left shoulder (viewer's left), thin black rectangular glasses, warm brown eyes, white collared shirt, mustard-brown open knit cardigan, holding a tan ceramic coffee mug in her hand.
- 表情調性：慵懶溫柔的成年女性：不要畫成少女，眼神帶著包容。
- 只需這 3 張；其餘表情由程式退回（happy／blush→smile、surprised→normal、angry→think）。

| Key（manifest） | 輸出檔 | 來源圖建議檔名 | 尺寸 | 劇本 say/show 次數 |
|---|---|---|---|---|
| `sensei/smile` 微笑 | `public/art/sensei/smile.webp` | `sensei-smile.png` | 600×1000 RGBA（來源 2:3，建議 1024×1536） | 17 |
| `sensei/think` 思考 | `public/art/sensei/think.webp` | `sensei-think.png` | 600×1000 RGBA（來源 2:3，建議 1024×1536） | 2 |
| `sensei/sad` 難過 | `public/art/sensei/sad.webp` | `sensei-sad.png` | 600×1000 RGBA（來源 2:3，建議 1024×1536） | 3 |

**`sensei/smile`（微笑）提示詞**

```text
[Attach reference: sensei-normal-green.png]
Image edit. Keep the character IDENTICAL to the reference image: same pose, same camera and framing, same body, uniform, hair silhouette, accessories, line art, colors and lighting, on a flat pure chroma-green (#00FF00) background with no shadow or gradient. Change ONLY the facial expression (eyes, eyebrows, mouth, blush): a relaxed, warm, slightly lazy smile with softly lowered eyelids behind the glasses; still holding the mug. Do not move, resize or retilt the head or body. Do not add props, hands or effects that extend outside the original silhouette. Character: Sou Chihiro, relaxed adult female teacher: brown hair in a low side ponytail over her left shoulder (viewer's left), thin black rectangular glasses, warm brown eyes, white collared shirt, mustard-brown open knit cardigan, holding a tan ceramic coffee mug in her hand.
```

**`sensei/think`（思考）提示詞**

```text
[Attach reference: sensei-normal-green.png]
Image edit. Keep the character IDENTICAL to the reference image: same pose, same camera and framing, same body, uniform, hair silhouette, accessories, line art, colors and lighting, on a flat pure chroma-green (#00FF00) background with no shadow or gradient. Change ONLY the facial expression (eyes, eyebrows, mouth, blush): eyes glancing up and aside behind the glasses, one brow raised, lips pursed; curious and thinking. Do not move, resize or retilt the head or body. Do not add props, hands or effects that extend outside the original silhouette. Character: Sou Chihiro, relaxed adult female teacher: brown hair in a low side ponytail over her left shoulder (viewer's left), thin black rectangular glasses, warm brown eyes, white collared shirt, mustard-brown open knit cardigan, holding a tan ceramic coffee mug in her hand.
```

**`sensei/sad`（難過）提示詞**

```text
[Attach reference: sensei-normal-green.png]
Image edit. Keep the character IDENTICAL to the reference image: same pose, same camera and framing, same body, uniform, hair silhouette, accessories, line art, colors and lighting, on a flat pure chroma-green (#00FF00) background with no shadow or gradient. Change ONLY the facial expression (eyes, eyebrows, mouth, blush): a gentle apologetic expression: brows tilted, eyes lowered behind the glasses, a faint sorry smile fading; mild disappointment but still kind. Do not move, resize or retilt the head or body. Do not add props, hands or effects that extend outside the original silhouette. Character: Sou Chihiro, relaxed adult female teacher: brown hair in a low side ponytail over her left shoulder (viewer's left), thin black rectangular glasses, warm brown eyes, white collared shirt, mustard-brown open knit cardigan, holding a tan ceramic coffee mug in her hand.
```

### 3.5 黑川 翔（`kuro`）：3 張

- 參考圖：`public/art/kuro/normal.webp` → 先做成 `kuro-normal-green.png`。
- 角色描述（已放進下方每條提示詞）：Kurokawa Sho, glib rival-school boy: black baseball cap with a small gold lightning-bolt emblem, messy dark gray-blue hair under the cap, gray eyes, charcoal-black zip hoodie over a white T-shirt.
- 表情調性：輕浮的推銷員：smug 要有「很欠揍但有魅力」的味道；shock 與 sad 要讓人看到他其實有點可愛、可救贖。
- 只需這 3 張；其餘由程式退回（smile／happy→smug、blush／angry／think→normal、surprised→shock）。

| Key（manifest） | 輸出檔 | 來源圖建議檔名 | 尺寸 | 劇本 say/show 次數 |
|---|---|---|---|---|
| `kuro/smug` 得意 | `public/art/kuro/smug.webp` | `kuro-smug.png` | 600×1000 RGBA（來源 2:3，建議 1024×1536） | 15 |
| `kuro/shock` 震驚 | `public/art/kuro/shock.webp` | `kuro-shock.png` | 600×1000 RGBA（來源 2:3，建議 1024×1536） | 11 |
| `kuro/sad` 難過 | `public/art/kuro/sad.webp` | `kuro-sad.png` | 600×1000 RGBA（來源 2:3，建議 1024×1536） | 6 |

**`kuro/smug`（得意）提示詞**

```text
[Attach reference: kuro-normal-green.png]
Image edit. Keep the character IDENTICAL to the reference image: same pose, same camera and framing, same body, uniform, hair silhouette, accessories, line art, colors and lighting, on a flat pure chroma-green (#00FF00) background with no shadow or gradient. Change ONLY the facial expression (eyes, eyebrows, mouth, blush): a cocky smirk with one corner of the mouth raised high, half-lidded eyes looking down at the viewer, one eyebrow raised; a slick salesman grin. Do not move, resize or retilt the head or body. Do not add props, hands or effects that extend outside the original silhouette. Character: Kurokawa Sho, glib rival-school boy: black baseball cap with a small gold lightning-bolt emblem, messy dark gray-blue hair under the cap, gray eyes, charcoal-black zip hoodie over a white T-shirt.
```

**`kuro/shock`（震驚）提示詞**

```text
[Attach reference: kuro-normal-green.png]
Image edit. Keep the character IDENTICAL to the reference image: same pose, same camera and framing, same body, uniform, hair silhouette, accessories, line art, colors and lighting, on a flat pure chroma-green (#00FF00) background with no shadow or gradient. Change ONLY the facial expression (eyes, eyebrows, mouth, blush): eyes wide with tiny pupils, mouth hanging open, a sweat drop at the temple (inside the silhouette only), brows raised high; cap brim unchanged. Do not move, resize or retilt the head or body. Do not add props, hands or effects that extend outside the original silhouette. Character: Kurokawa Sho, glib rival-school boy: black baseball cap with a small gold lightning-bolt emblem, messy dark gray-blue hair under the cap, gray eyes, charcoal-black zip hoodie over a white T-shirt.
```

**`kuro/sad`（難過）提示詞**

```text
[Attach reference: kuro-normal-green.png]
Image edit. Keep the character IDENTICAL to the reference image: same pose, same camera and framing, same body, uniform, hair silhouette, accessories, line art, colors and lighting, on a flat pure chroma-green (#00FF00) background with no shadow or gradient. Change ONLY the facial expression (eyes, eyebrows, mouth, blush): dejected and remorseful: eyes cast downward, brows drooping, mouth in a small frown; keep exactly the same pose (no slumping or leaning). Do not move, resize or retilt the head or body. Do not add props, hands or effects that extend outside the original silhouette. Character: Kurokawa Sho, glib rival-school boy: black baseball cap with a small gold lightning-bolt emblem, messy dark gray-blue hair under the cap, gray eyes, charcoal-black zip hoodie over a white T-shirt.
```

## 4. 背景需求（6 張）

**共通規格（已驗證）**：現有 9 張背景皆為 **1280×720、WebP（RGB，不透明）**。腳本會把來源圖以 **cover** 方式縮放並**置中裁切**成 1280×720（品質 0.86），所以來源請用 **16:9**（建議 **1920×1080**，或 2560×1440），重要內容放在中央 90% 以內。輸出：`public/art/bg/<id>.webp`，manifest key：`bg/<id>`。

**共通構圖規則**：①不要有人物（角色立繪會疊上去）②**下 1/3（y > 480）保持平靜、低對比**（對話框會蓋住 y > 515）③中央（x 約 380～900）與三個站位（x≈250／640／1030、y > 150）不要放高對比小物④以「白天、亮度中等」為準，遊戲自己加黃昏／夜晚濾鏡（見第 0 章）⑤避免需要特地閱讀的文字。

**背景共通風格段落**（附在每條提示詞後面）：

```text
Japanese anime background art, polished digital painting, cinematic warm natural lighting with soft light shafts and subtle bloom, clean line work with painterly texture, rich but harmonious colors, high detail, no characters, no people, wide 16:9 composition, 1920x1080, in the same style as the attached reference background
```

**背景負面提示詞**：

```text
people, characters, text artifacts, garbled signs, watermark, signature, logo, photorealistic, 3D render, heavy blur, fisheye distortion, low quality, over-dark, noise
```

| Key | 輸出檔 | 來源建議檔名 | 尺寸 |
|---|---|---|---|
| `bg/street` 商店街 | `public/art/bg/street.webp` | `bg-street.png` | 1280×720（來源 16:9，建議 1920×1080） |
| `bg/planetarium` 天文館 | `public/art/bg/planetarium.webp` | `bg-planetarium.png` | 1280×720（來源 16:9，建議 1920×1080） |
| `bg/beach` 海邊 | `public/art/bg/beach.webp` | `bg-beach.png` | 1280×720（來源 16:9，建議 1920×1080） |
| `bg/festival` 搜尋祭會場（舞台） | `public/art/bg/festival.webp` | `bg-festival.png` | 1280×720（來源 16:9，建議 1920×1080） |
| `bg/rain` 雨天（屋簷下） | `public/art/bg/rain.webp` | `bg-rain.png` | 1280×720（來源 16:9，建議 1920×1080） |
| `bg/infirmary` 保健室 | `public/art/bg/infirmary.webp` | `bg-infirmary.png` | 1280×720（來源 16:9，建議 1920×1080） |

### 4.1 `street` 商店街

- **遊戲中的使用處**：週末外出選單（WeekendMenu，白天，上方再蓋 45% 暗色與模糊）；date-rin-1（書店）、date-hare-1（試吃）、date-hare-casual（白天）；sq-x1、date-rin-casual（黃昏）
- **時段／亮度**：白天為主，也會被當成黃昏用（遊戲會自動加黃昏濾鏡）→ 請畫「午後偏暖、亮度中等」的版本
- **構圖**：一點透視、消失點偏右；中央與左右兩側的人物站位區（x 約 250／640／1030，y 150 以下）保持空曠不放高對比小物；畫面下 1/3 是路面，保持平靜。兩側店面要看得出「書店」與「小吃攤」（凜約會去書店、晴去試吃）。招牌文字不要求可讀，可用模糊的繁體中文招牌。夜間遊戲會在天空疊星點，所以天空區不要有複雜雲層細節。

```text
a lively Taiwanese-Japanese covered shopping street (shotengai) in the late afternoon, one-point perspective looking down the street with the vanishing point slightly right of center, a small bookstore and a food-sample stall with an awning on the sides, hanging paper lanterns and banners with blurry Chinese signage, warm sunlight, wet-clean pavement, a few potted plants and bicycles parked, the center and lower third of the street left open and calm, Japanese anime background art, polished digital painting, cinematic warm natural lighting with soft light shafts and subtle bloom, clean line work with painterly texture, rich but harmonious colors, high detail, no characters, no people, wide 16:9 composition, 1920x1080, in the same style as the attached reference background
```

### 4.2 `planetarium` 天文館

- **遊戲中的使用處**：date-mirai-1（夜晚）、sq-m3（夜晚）、end-mirai 結局 CG 底圖
- **時段／亮度**：只用在「night」。遊戲對 night 會把亮度降到約 58% 並疊深藍色 → 請畫成「亮度中等偏亮」的天文館，不要畫成全黑
- **構圖**：圓頂內部，中央偏下是投影機（啞鈴形星象儀），同心圓排列的躺椅；穹頂投影出銀河與連線的星座（呼應「星座就像知識圖譜」）。畫面中央與上方留出大片星空，不放人物站位用的細節；下方 1/3 是座椅與地板，保持暗而平靜。

```text
the interior of a school planetarium dome, a dumbbell-shaped star projector at the center bottom, rings of reclining seats, the dome ceiling glowing with a projected Milky Way and constellation lines connected like a knowledge graph, cool cyan and violet palette with soft glowing highlights, moderately bright (not pitch black), dreamy and quiet atmosphere, the middle and upper area clean and open, Japanese anime background art, polished digital painting, cinematic warm natural lighting with soft light shafts and subtle bloom, clean line work with painterly texture, rich but harmonious colors, high detail, no characters, no people, wide 16:9 composition, 1920x1080, in the same style as the attached reference background
```

### 4.3 `beach` 海邊

- **遊戲中的使用處**：date-hare-3（黃昏）、date-hare-3 CG 底圖
- **時段／亮度**：只用在「dusk」。遊戲會再加褐黃濾鏡與橘紅色疊層 → 請畫「午後金色時刻、亮度偏亮、橘色不要太濃」的版本
- **構圖**：地平線約在畫面高度 40%（y≈290）；太陽低垂在右三分之一處，海面有金色反光；中央到左側的沙灘平整空曠，供角色站立；下方 1/3 是濕沙與淺浪，保持平靜。遠方可有小小的防波堤或燈塔。沒有人。

```text
a quiet sunset beach, golden hour, low sun over the sea on the right third of the frame with a glittering reflection, gentle waves rolling onto wet sand, a few soft clouds, a small distant pier and lighthouse on the left horizon, warm gold and pale pink sky, the horizon at about 40 percent from the top, the foreground sand open and calm, Japanese anime background art, polished digital painting, cinematic warm natural lighting with soft light shafts and subtle bloom, clean line work with painterly texture, rich but harmonious colors, high detail, no characters, no people, wide 16:9 composition, 1920x1080, in the same style as the attached reference background
```

### 4.4 `festival` 搜尋祭會場（舞台）

- **遊戲中的使用處**：main/festival（白天）、end-true（白天）、date-rin-3 夏日祭（夜晚，用同一張）、date-rin-3 與 end-true 的 CG 底圖
- **時段／亮度**：白天與夜晚都會用 → 請畫「白天、亮度中等」；夜晚遊戲會自動變暗並加星點。紙燈籠請畫成「暖色、看起來亮著也不突兀」
- **構圖**：操場上的校慶舞台放在畫面中後方（偏左或居中、不要太大），舞台上方掛一條大布條，寫著繁體中文「搜尋祭」；兩側有攤位、彩旗、拉過頭頂的紙燈籠串；遠處是青葉學園校舍（紅磚＋米色牆，與 bg/gate 同一棟）。前景（下 1/3）是空曠的操場地面。

```text
a high-school culture festival ground in daylight, an outdoor stage in the middle distance with a large banner reading "搜尋祭" (Traditional Chinese, bold white characters on a deep blue banner), colorful bunting flags, strings of warm paper lanterns across the sky, festival stalls on both sides, the beige-and-red-brick school building of Aoba Academy in the background, a cheerful atmosphere, the foreground schoolyard open and calm, Japanese anime background art, polished digital painting, cinematic warm natural lighting with soft light shafts and subtle bloom, clean line work with painterly texture, rich but harmonious colors, high detail, no characters, no people, wide 16:9 composition, 1920x1080, in the same style as the attached reference background
```

### 4.5 `rain` 雨天（屋簷下）

- **遊戲中的使用處**：main/w6：bg('rain','dusk','rain')，搭配遊戲內建的雨絲 CSS 疊層（.rain-layer）
- **時段／亮度**：遊戲會套「dusk」濾鏡（褐黃＋橘紅疊層）再疊雨絲動畫 → 請畫「冷灰藍、略低飽和、陰天」的版本，疊暖色後才不會變濁；圖上不要畫明顯的雨線，只要地面積水與水花
- **構圖**：站在校舍走廊屋簷下往外看：前景有屋簷與柱子（左右各一，邊緣），中央是被雨打濕的操場，遠處是模糊的校舍與樹；地面積水反射天光；傘架上有幾把傘。中央與下 1/3 保持空曠。

```text
a rainy afternoon seen from under the eaves of a school building, covered walkway pillars at the left and right edges, a rain-soaked schoolyard in the center with puddles reflecting the overcast sky, blurred school buildings and trees in the distance, an umbrella stand with a few umbrellas, cool gray-blue palette, soft melancholic mood, no visible rain streaks (only ripples in puddles), the center and lower third open and calm, Japanese anime background art, polished digital painting, cinematic warm natural lighting with soft light shafts and subtle bloom, clean line work with painterly texture, rich but harmonious colors, high detail, no characters, no people, wide 16:9 composition, 1920x1080, in the same style as the attached reference background
```

### 4.6 `infirmary` 保健室

- **遊戲中的使用處**：目前沒有任何劇本呼叫 bg('infirmary')（只有 flavor.ts 註解提到體力歸零的保健室小劇場），圖先備好，之後劇本／排程失敗畫面可直接使用
- **時段／亮度**：白天、柔和的午後陽光；亮度中等
- **構圖**：兩張白色床鋪與隔簾在左側，右側是藥櫃與保健老師的書桌（桌上有體重計、體溫計、急救箱），窗戶在中後方，白色窗簾被風輕輕吹動。中央留空。

```text
a calm school infirmary in soft afternoon light, two beds with white sheets and half-drawn curtains on the left, a medicine cabinet and the nurse's desk with a first-aid box and a scale on the right, a large window with white curtains moving gently in the center-back, a small green cross poster on the wall, clean and quiet, pale mint and cream palette, the center open and calm, Japanese anime background art, polished digital painting, cinematic warm natural lighting with soft light shafts and subtle bloom, clean line work with painterly texture, rich but harmonious colors, high detail, no characters, no people, wide 16:9 composition, 1920x1080, in the same style as the attached reference background
```

> 「搜尋祭」布條：多數 AI 工具畫不好中文字。建議先讓它畫**空白布條**，再用圖片編輯軟體貼上粗體白字「搜尋祭」；或請工具改用簡單的橫幅造型再手動補字。

## 5. 事件 CG 需求（10 張）

**規格（已驗證）**：目前沒有任何 CG 圖檔。`CgArt`（`src/art/cg/index.tsx`）已會讀 manifest 的 `cg/<id>`，有圖就以 `object-cover` 填滿 1280×720 並疊上標題膠囊與白框，沒有就用背景＋立繪合成。腳本對 `cg/` 開頭的 key 與背景相同處理：來源 **16:9（建議 1920×1080）**，輸出 **`public/art/cg/<id>.webp`（1280×720，品質 0.86）**，manifest key：`cg/<id>`。

**CG 的使用位置**：①劇情中 `cg(id)` 指令（z-index 蓋住舞台與立繪）②回憶相簿（解鎖後顯示縮圖與大圖）③結局畫面 `EndingScreen` 以該結局的 CG 當全螢幕背景（面板蓋住下方）。CG 一旦被劇本呼叫就會解鎖。

**共通構圖規則**：主體與臉放在 y ≈ 60～470；右上角（約 380×70）不放重要細節（標題膠囊）；下 1/3 保持簡單、偏暗（面板／對話框會蓋住）；10px 外框會吃掉邊緣，重要內容離邊 ≥ 40px；縮圖 288×162 也要看得出主體，所以**人物臉部要大、輪廓清楚**。玩家（`{name}`）沒有立繪：一律用**第一人稱視角**，玩家不入鏡或只露出一點手／袖口。

**CG 共通風格段落**（附在每條提示詞後面）：

```text
Japanese visual novel event CG illustration in the same anime x manhwa style as the reference sprites, cinematic lighting, soft bloom, clean thin colored line art, soft cel shading, large glossy eyes, high detail, 16:9 landscape 1920x1080, keep each character's design identical to the attached reference sprites
```

| Key | 輸出檔 | 來源建議檔名 | 角色 | 目前的頂替畫面 |
|---|---|---|---|---|
| `cg/date-rin-3` 夏夜煙火下的微笑 | `public/art/cg/date-rin-3.webp` | `cg-date-rin-3.png` | 凜（blush） | festival／night |
| `cg/date-hare-3` 海風與一句話的告白 | `public/art/cg/date-hare-3.webp` | `cg-date-hare-3.png` | 晴（blush） | beach／dusk |
| `cg/date-mirai-3` 星光與被引用的來源 | `public/art/cg/date-mirai-3.webp` | `cg-date-mirai-3.png` | 未來（happy） | rooftop／night |
| `cg/end-true` 搜尋祭的三重奏 | `public/art/cg/end-true.webp` | `cg-end-true.png` | 凜＋晴＋未來（皆 happy） | festival／day |
| `cg/end-rin` 索引之外的心意 | `public/art/cg/end-rin.webp` | `cg-end-rin.png` | 凜（blush） | gate／dusk |
| `cg/end-hare` 一句話的告白 | `public/art/cg/end-hare.webp` | `cg-end-hare.png` | 晴（happy） | broadcast／dusk |
| `cg/end-mirai` 被你引用的我 | `public/art/cg/end-mirai.webp` | `cg-end-mirai.png` | 未來（blush） | planetarium／night |
| `cg/end-normal` 404 社辦的明天 | `public/art/cg/end-normal.webp` | `cg-end-normal.png` | 索老師（smile）＋凜（smile） | clubroom／dusk |
| `cg/end-bad` 404 Not Found | `public/art/cg/end-bad.webp` | `cg-end-bad.png` | 索老師（sad） | clubroom／night |
| `cg/end-blackhat` 人工處罰的代價 | `public/art/cg/end-blackhat.webp` | `cg-end-blackhat.png` | 黑川（shock）＋凜（smile／生氣皆可，現行 CG 設定為 smile） | council／dusk |

### 5.1 `date-rin-3`《夏夜煙火下的微笑》

- **觸發場景**：週末約會：凜第 3 場（需凜好感 ≥ 55，否則播「普通相處」不會觸發）。scenes/dates/date-rin-3.ts 在選項後呼叫 cg('date-rin-3')，台詞「被看見……原來是這種感覺。」，同時解鎖回憶相簿。
- **角色／表情**：凜（blush）
- **場景描述**：夏日祭夜晚的神社階梯旁。凜穿著藍色浴衣、紅色髮帶仍在（劇本：紅色髮帶配上藍色浴衣），仰望夜空，煙火在她的眼睛裡映出光點，臉頰泛紅。她垂在身側的手背輕輕碰到畫面外玩家的手。
- **構圖／光影**：中景到近景、凜略偏右，臉部在畫面上 1/2 內；左側夜空有大朵煙火（粉、金、青），遠處一排紙燈籠；暖橘燈籠光＋冷藍夜色對比。第一人稱視角，玩家不入鏡（只有畫面左下角可露出一點點手）。

```text
Japanese visual novel event CG. Shirasagi Rin (very long straight glossy dark navy-blue hair with a red hairband, sharp blue eyes) in a blue yukata, standing on shrine steps at a summer festival at night, looking up at huge fireworks (pink, gold, cyan) that reflect in her eyes, cheeks flushed pink, a soft embarrassed smile, strings of warm paper lanterns behind her, warm lantern glow versus cool deep-blue night sky, her hand hanging at her side near the viewer, romantic and emotional atmosphere, medium close-up, her face in the upper half, the bottom third calm and darker, Japanese visual novel event CG illustration in the same anime x manhwa style as the reference sprites, cinematic lighting, soft bloom, clean thin colored line art, soft cel shading, large glossy eyes, high detail, 16:9 landscape 1920x1080, keep each character's design identical to the attached reference sprites
```

### 5.2 `date-hare-3`《海風與一句話的告白》

- **觸發場景**：週末約會：晴第 3 場（需晴好感 ≥ 55）。scenes/dates/date-hare-3.ts 呼叫 cg('date-hare-3')，台詞「結論先說。我喜歡你，{name}。」，同時解鎖。
- **角色／表情**：晴（blush）
- **場景描述**：黃昏的海邊，晴赤腳站在金色的浪花裡，把自己的耳機輕輕戴到畫面外玩家（第一人稱）的耳朵上，臉紅、直視鏡頭、笑得有點不好意思；風吹起她的裙襬與側馬尾。
- **構圖／光影**：近景，晴在畫面中央偏右，雙手舉到畫面邊緣（正在幫玩家戴耳機）；背景是低垂的夕陽與金色海面，浪花在腳邊；逆光的輪廓光。下 1/3 是浪與沙，保持平靜。

```text
Japanese visual novel event CG. Natsukawa Hare (short orange bob with a small side ponytail and yellow scrunchie, amber eyes, navy school uniform, slightly crooked yellow bow tie) barefoot in golden shallow waves on a sunset beach, gently placing her white-and-orange headphones on the viewer's ears (first-person view, her hands reaching toward the camera at the edge of the frame), blushing, looking straight at the viewer with a shy but happy smile, wind lifting her skirt and ponytail, strong golden backlight with rim light, low sun over the sea, medium close-up, bottom third calm, Japanese visual novel event CG illustration in the same anime x manhwa style as the reference sprites, cinematic lighting, soft bloom, clean thin colored line art, soft cel shading, large glossy eyes, high detail, 16:9 landscape 1920x1080, keep each character's design identical to the attached reference sprites
```

### 5.3 `date-mirai-3`《星光與被引用的來源》

- **觸發場景**：週末約會：未來第 3 場（需未來好感 ≥ 55）。scenes/dates/date-mirai-3.ts 呼叫 cg('date-mirai-3')，台詞「我想成為被引用的來源，而不是被複製的內容。」，同時解鎖。
- **角色／表情**：未來（happy）
- **場景描述**：夜晚的校舍天台，滿天星空。未來轉過身看向鏡頭，星形髮夾像一顆小星星發出青色微光，過大的外套袖口被風吹動，她的手指輕輕勾住畫面外玩家的袖口，露出難得的真心笑容。
- **構圖／光影**：中近景，未來居中偏左、回眸；背景是天台欄杆與遠方城市燈火，銀河斜貫畫面右上；髮夾的青色光是畫面焦點。下 1/3 是天台地面，保持暗而平靜。

```text
Japanese visual novel event CG. Hoshino Mirai (very long silver-white hair fading to pale lilac, a glowing cyan star-shaped hairclip, blue-violet eyes, oversized pale-lilac cardigan with sleeves past her hands) on a school rooftop at night under a brilliant Milky Way, turning back to look at the viewer, a rare genuine smile, her fingers hooking the viewer's sleeve at the edge of the frame, the star hairclip glowing cyan like a tiny star, wind in her hair, city lights far below, cool blue-violet night palette with cyan accent light, medium close-up, bottom third calm and dark, Japanese visual novel event CG illustration in the same anime x manhwa style as the reference sprites, cinematic lighting, soft bloom, clean thin colored line art, soft cel shading, large glossy eyes, high detail, 16:9 landscape 1920x1080, keep each character's design identical to the attached reference sprites
```

### 5.4 `end-true`《搜尋祭的三重奏》

- **觸發場景**：結局判定為「真結局」：黑帽旗標 = 0 且凜、晴、未來好感皆 ≥ 65。scenes/endings/end-true.ts 開頭呼叫 cg('end-true')；EndingScreen 也以此圖當背景，同時解鎖。
- **角色／表情**：凜＋晴＋未來（皆 happy）
- **場景描述**：搜尋祭會場，評分牌亮起全場最高分，煙火在白天的青葉學園上空綻放（劇本：「評分牌亮起全場最高分，煙火在青葉學園的天空綻放！」）。三位女主角並肩站在舞台前，開心大笑、比出勝利手勢或互相搭肩，彩帶紙屑飄落。
- **構圖／光影**：三人構圖：凜在左、晴在中（最前、最大）、未來在右，剪影一眼可分辨（黑長髮／橘馬尾／銀紫長髮）；背景是舞台與「搜尋祭」布條、煙火；三人臉部都在畫面 y≈60～420。畫面下方會被結局面板蓋住（見下方注意），不要把重點放在下 1/3。

```text
Japanese visual novel event CG, a triumphant group shot. Three heroines side by side in front of a school-festival stage with a banner reading "搜尋祭": on the left Shirasagi Rin (very long straight dark navy-blue hair, red hairband, red ribbon, red armband), in the center Natsukawa Hare (orange bob with a side ponytail and yellow scrunchie, headphones around her neck, yellow bow tie), on the right Hoshino Mirai (long silver-white to lilac hair, cyan star hairclip, oversized lilac cardigan). All three are laughing happily, arms around each other's shoulders, confetti falling, fireworks bursting in the daytime sky, a glowing score board behind, bright warm daylight, dynamic cheerful composition, faces in the upper two thirds, Japanese visual novel event CG illustration in the same anime x manhwa style as the reference sprites, cinematic lighting, soft bloom, clean thin colored line art, soft cel shading, large glossy eyes, high detail, 16:9 landscape 1920x1080, keep each character's design identical to the attached reference sprites
```

### 5.5 `end-rin`《索引之外的心意》

- **觸發場景**：結局判定為「凜 END」：凜好感為三人最高且 ≥ 60（未達真結局）。scenes/endings/end-rin.ts 開頭呼叫 cg('end-rin')，同時解鎖。
- **角色／表情**：凜（blush）
- **場景描述**：搜尋祭落幕的黃昏，櫻花校門前只剩凜一人，晚風吹動她的紅色髮帶與長髮，她手裡拿著社辦的鑰匙，帶著害羞而溫柔的笑容看向鏡頭。
- **構圖／光影**：半身特寫，凜居中，校門紅磚柱與櫻花在兩側虛化；櫻花瓣飄過畫面；夕陽從右後方打光，髮絲透光。下 1/3（會被面板遮住）只放衣服與花瓣。

```text
Japanese visual novel event CG. Shirasagi Rin (very long straight glossy dark navy-blue hair with a red hairband, blue eyes, navy blazer, red ribbon and red armband) standing alone in front of a cherry-blossom school gate at sunset, holding a small key, wind blowing her hair and hairband, cherry petals drifting, a soft shy tender smile and a slight blush looking at the viewer, warm orange sunset backlight through her hair, blurred red brick gate pillars and pink blossoms, bust-up close shot, bittersweet romantic mood, Japanese visual novel event CG illustration in the same anime x manhwa style as the reference sprites, cinematic lighting, soft bloom, clean thin colored line art, soft cel shading, large glossy eyes, high detail, 16:9 landscape 1920x1080, keep each character's design identical to the attached reference sprites
```

### 5.6 `end-hare`《一句話的告白》

- **觸發場景**：結局判定為「晴 END」：晴好感為三人最高且 ≥ 60。scenes/endings/end-hare.ts 開頭呼叫 cg('end-hare')，同時解鎖。
- **角色／表情**：晴（happy）
- **場景描述**：搜尋祭結束後的黃昏，廣播社錄音室。晴對著鏡頭比出「結論先說」的手勢，用直球告白，笑容燦爛、臉頰泛紅；ON AIR 紅燈沒亮（劇本：「錄音室紅燈雖然沒亮」）。
- **構圖／光影**：中景，晴居中偏左，麥克風與混音台在前景邊緣；窗外夕陽把錄音室染成暖橘；ON AIR 燈牌在她後方上方，保持熄滅（深紅灰色）。下 1/3 放混音台，保持較暗平靜。

```text
Japanese visual novel event CG. Natsukawa Hare (short orange bob with a side ponytail and yellow scrunchie, amber eyes, headphones around her neck, navy school uniform) in a school radio broadcast studio at sunset, pointing a finger at the viewer in a 'conclusion first!' gesture, a radiant open smile with pink cheeks, a microphone on a boom arm and a mixing console in the foreground, the 'ON AIR' sign behind her switched OFF, warm orange sunset light through the studio window, wood-panel walls and acoustic foam, medium shot, joyful confession mood, Japanese visual novel event CG illustration in the same anime x manhwa style as the reference sprites, cinematic lighting, soft bloom, clean thin colored line art, soft cel shading, large glossy eyes, high detail, 16:9 landscape 1920x1080, keep each character's design identical to the attached reference sprites
```

### 5.7 `end-mirai`《被你引用的我》

- **觸發場景**：結局判定為「未來 END」：未來好感為三人最高且 ≥ 60。scenes/endings/end-mirai.ts 開頭呼叫 cg('end-mirai')，同時解鎖。
- **角色／表情**：未來（blush）
- **場景描述**：搜尋祭後，天文館圓頂之下。投影機把星座連線投在她身上，未來側著臉、臉頰泛紅，髮夾在星光下閃爍，溫柔而堅定地看著鏡頭（劇本：「照亮了她溫柔而堅定的側臉」）。
- **構圖／光影**：半身側臉／四分之三側面，未來在畫面右三分之一；左側與上方是投影出的銀河與星座連線；青色髮夾是亮點。下 1/3 是座椅剪影，保持暗。

```text
Japanese visual novel event CG. Hoshino Mirai (very long silver-white hair fading to pale lilac, glowing cyan star hairclip, blue-violet eyes, oversized pale-lilac cardigan) inside a planetarium dome, three-quarter side view, softly blushing with a gentle resolute smile, constellation lines and a projected Milky Way glowing across the dome and across her hair and cheek, the star hairclip sparkling, rows of reclining seats in silhouette, cool cyan and violet light, bust-up shot, tender and quiet mood, Japanese visual novel event CG illustration in the same anime x manhwa style as the reference sprites, cinematic lighting, soft bloom, clean thin colored line art, soft cel shading, large glossy eyes, high detail, 16:9 landscape 1920x1080, keep each character's design identical to the attached reference sprites
```

### 5.8 `end-normal`《404 社辦的明天》

- **觸發場景**：結局判定為「普通 END」：三人平均好感 ≥ 35 但未達個人／真結局。scenes/endings/end-normal.ts 開頭呼叫 cg('end-normal')，同時解鎖。
- **角色／表情**：索老師（smile）＋凜（smile）
- **場景描述**：黃昏的 404 號社辦。索老師舉起馬克杯笑著「敬保住的社辦」，凜站在一旁露出難得的淺笑；桌上的老電腦螢幕亮著、白板上寫著 SEO／AEO／GEO。
- **構圖／光影**：中景，索老師在左（舉杯，略前）、凜在右；夕陽從窗戶打進來；電腦螢幕與白板是背景焦點。下 1/3 放桌面，保持簡潔。

```text
Japanese visual novel event CG. Inside a cozy cluttered school club room at sunset: on the left Sou Chihiro, an adult woman teacher with a brown low side ponytail, thin black glasses, white shirt and mustard-brown cardigan, raising a tan coffee mug in a toast with a warm lazy smile; on the right Shirasagi Rin (very long straight dark navy-blue hair, red hairband, navy blazer, red armband) with a rare gentle smile, an old computer monitor glowing on the desk, a whiteboard with 'SEO AEO GEO' behind them, warm orange sunlight streaming through the window, relieved and heartwarming mood, medium shot, Japanese visual novel event CG illustration in the same anime x manhwa style as the reference sprites, cinematic lighting, soft bloom, clean thin colored line art, soft cel shading, large glossy eyes, high detail, 16:9 landscape 1920x1080, keep each character's design identical to the attached reference sprites
```

### 5.9 `end-bad`《404 Not Found》

- **觸發場景**：結局判定為「壞 END」：三人平均好感 < 35 且未走黑帽。scenes/endings/end-bad.ts 開頭呼叫 cg('end-bad')，同時解鎖。
- **角色／表情**：索老師（sad）
- **場景描述**：夜晚的 404 社辦，只剩索老師一人坐在桌前，手邊放著要歸還的鑰匙；電腦螢幕顯示「404 Not Found」，她帶著抱歉又溫柔的淡笑，把隨身碟遞向鏡頭（劇本：「把學過的網站草稿備份進隨身碟」），帶一點希望的悲傷。
- **構圖／光影**：中景，索老師居中偏左，臉在畫面上 1/2；右側桌上的螢幕是冷藍光源，窗外是夜色與一點點月光；整體低彩度偏藍，但螢幕與月光保留一點暖色希望。下 1/3 放桌面。

```text
Japanese visual novel event CG. Sou Chihiro, an adult woman teacher (brown low side ponytail, thin black rectangular glasses, white shirt, mustard-brown cardigan) sitting alone at a desk in a dim school club room at night, a faint sorry smile, holding out a small USB flash drive toward the viewer, a room key on the desk, an old computer monitor glowing cold blue and showing "404 Not Found", moonlight through the window, muted blue palette with a small warm light of hope, quiet bittersweet mood, medium shot, Japanese visual novel event CG illustration in the same anime x manhwa style as the reference sprites, cinematic lighting, soft bloom, clean thin colored line art, soft cel shading, large glossy eyes, high detail, 16:9 landscape 1920x1080, keep each character's design identical to the attached reference sprites
```

### 5.10 `end-blackhat`《人工處罰的代價》

- **觸發場景**：結局判定為「黑帽 END」：累計接受黑川提議 ≥ 2 次（優先級最高）。scenes/endings/end-blackhat.ts 開頭呼叫 cg('end-blackhat')，同時解鎖。
- **角色／表情**：黑川（shock）＋凜（smile／生氣皆可，現行 CG 設定為 smile）
- **場景描述**：學生會室。凜雙手抱胸站在畫面右側、板著臉訓話（劇本中她是 angry），黑川灰頭土臉地站在左側、帽子歪掉、冒冷汗、嘴巴張開；背景螢幕顯示搜尋引擎的「人工處罰」通知。喜劇＋教育氣氛。
- **構圖／光影**：雙人中景，黑川在左（前景略小）、凜在右（氣勢較強）；學生會長桌與螢幕在背景；夕陽偏紅，加一點紅色警示光。下 1/3 放桌面。

```text
Japanese visual novel comedy event CG. In a school student-council room at sunset: on the left Kurokawa Sho (young man, black baseball cap with a gold lightning-bolt emblem knocked crooked, messy dark gray-blue hair, charcoal hoodie) looking shocked with wide eyes, open mouth and a sweat drop, on the right Shirasagi Rin (very long straight dark navy-blue hair, red hairband, navy blazer, red armband) standing with her arms crossed and a stern cold glare, a monitor on the desk behind them showing a red search-engine 'Manual action' penalty notice, red-orange dusk light with a hint of red warning glow, humorous but lesson-teaching mood, medium shot, Japanese visual novel event CG illustration in the same anime x manhwa style as the reference sprites, cinematic lighting, soft bloom, clean thin colored line art, soft cel shading, large glossy eyes, high detail, 16:9 landscape 1920x1080, keep each character's design identical to the attached reference sprites
```

## 6. 整合步驟

### 6.1 放檔案與來源對照檔

1. 把來源圖放在**專案外**（例如 `D:/seo-art-src/`），不要放進 `public/`（`public/` 內的檔案會被打包進網站）。
2. 在專案根目錄建立 `scripts/art-sources.json`（預設讀取位置；也可用任何路徑，執行時當第一個參數傳入）。格式：`{ "<key>": "<來源圖路徑>" }`。**路徑請用 `/` 或 `\\`**。範例（只列這次要處理的）：

   ```json
   {
     "rin/blush": "D:/seo-art-src/rin-blush.png",
     "rin/think": "D:/seo-art-src/rin-think.png",
     "bg/street": "D:/seo-art-src/bg-street.png",
     "cg/end-rin": "D:/seo-art-src/cg-end-rin.png"
   }
   ```

   key 規則：角色表情 `<id>/<face>`（id ∈ rin、hare、mirai、sensei、kuro；face ∈ normal、smile、happy、blush、surprised、angry、sad、think、smug、shock）；背景 `bg/<bgId>`；CG `cg/<cgId>`。**以 `bg/`、`cg/` 開頭的走「16:9 cover 1280×720」流程，其他一律當成立繪（去綠幕＋裁切成 600×1000）。**

### 6.2 執行處理腳本

在**專案根目錄**執行（腳本以目前工作目錄為根，需要先 `npm install`）：

```bash
npm run art                                   # 讀取 scripts/art-sources.json
npm run art -- D:/seo-art-src/sources.json    # 或指定其他來源對照檔
# 等同：node scripts/process-art.mjs [來源對照檔]
```

- 腳本用 Playwright 的 Chromium 在無頭瀏覽器裡用 canvas 處理圖片。找瀏覽器順序：環境變數 `CHROME_PATH` → Playwright 預設 Chromium → `PLAYWRIGHT_BROWSERS_PATH`、`/opt/pw-browsers`、`~/.cache/ms-playwright` 內已安裝的 chromium → 系統 Chrome／Edge（Windows、macOS、Linux 常見路徑）。找不到時請設定：`CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"`。
- **立繪處理**：以四個角落估計背景色，從畫面邊緣做洪水填充去除綠色背景，再補去封閉的純綠孔洞，邊緣 2px 去綠溢色與羽化；取不透明外框（alpha > 20）→ 縮放到「寬 ≤ 560、高 ≤ 950」→ 水平置中、貼底 → 輸出 600×1000 WebP（0.88）。
- **背景／CG 處理**：cover 縮放、置中裁切 → 1280×720 WebP（0.86）。
- **增量合併**：腳本會先讀既有的 `public/art/manifest.json`，**只更新來源對照檔裡有列的 key**，其他既有 key 原樣保留；來源檔不存在的 key 會警告並略過（不會動到舊資料）；最後把 manifest 以 2 空白縮排寫回，每個 key 的值為 `"/art/<key>.webp"`。所以可以**分批做**：做好幾張就跑一次。重跑同一個 key 會覆蓋舊圖。
- 注意：輸出的是 `.webp`（不是 `.png`）。`CONTRIBUTING.md` 中「`true` ＋ `.png`」的舊寫法仍相容（manifest 值為 `true` 時遊戲會找 `/art/<key>.png`），但建議一律走腳本。

### 6.3 驗證

1. **檢查清單與尺寸**：`npm run art:check`。它會列出 57 個預期資產（5 角色表情、15 背景、10 CG）各自是 DONE／TODO／BROKEN，檢查 WebP 尺寸是否為 600×1000／1280×720，並提醒「某表情的外框與 `normal` 差超過 12px」（代表遊戲內臉會跳動，請重出或重裁）。
2. **接觸表（供總監審查）**：`npm run art:check -- --sheet ./art-review` 會輸出每個角色所有表情並排圖（`sprites-<id>.png`）、`backgrounds.png`、`cgs.png`（plan §4 品質關卡：每角色表情並排審查）。
3. **在遊戲中看**：`npm run dev`（或 `npm run build && npm run preview`），按 Ctrl+Shift+R 強制重新整理後遊玩。
   - 表情：進劇情，換到該表情時應顯示新圖、**沒有** emoji 小符號（有 emoji 代表 manifest 沒有該 key，正在使用 `normal` 頂替）。
   - 背景：`street` 立刻會出現在週末選單；其餘在對應劇情（見第 4 章「使用處」）。
   - CG：解鎖全部 CG 後到「圖鑑・相簿 → 回憶相簿」檢查縮圖與大圖。在瀏覽器開發者工具 Console 貼上後重新整理：

     ```js
     localStorage.setItem('seo-journey:global', JSON.stringify({ cards: [], endings: [], cgs: ['end-true','end-rin','end-hare','end-mirai','end-normal','end-bad','end-blackhat','date-rin-3','date-hare-3','date-mirai-3'], readLines: [] }))
     ```

     （會覆蓋本機的圖鑑進度，只建議在開發用瀏覽器設定檔使用。）
4. **自動化**：`npm run typecheck && npm test && npm run build`，再跑 `npm run e2e`（建置→預覽→Playwright 全程通關，檢查 0 個 console／HTTP 錯誤；任何 404 的圖檔路徑都會讓它失敗）。
5. 圖檔很大時留意體積：單張立繪約 50～100KB、背景約 100～200KB 是現有水準。

### 6.4 手動方式（進階，不建議）

若你已經有「去背完成、600×1000」的立繪或「1280×720」的背景，可直接放到 `public/art/<id>/<face>.png`（背景 `public/art/bg/<id>.png`、CG `public/art/cg/<id>.png`），並在 `public/art/manifest.json` 寫入 `"<key>": true`。這種方式**不會**經過去綠幕與自動裁切。

### 6.5 檢查表（43 項）

已完成的 14 項（5 張角色 `normal`、9 張背景）不在表內。完成後把 ☐ 改成 ✅；`npm run art:check` 為準。

| # | Key | 輸出檔 | 完成？ |
|---|---|---|---|
| 1 | `rin/smile` | `public/art/rin/smile.webp` | ✅ |
| 2 | `rin/happy` | `public/art/rin/happy.webp` | ☐ |
| 3 | `rin/blush` | `public/art/rin/blush.webp` | ✅ |
| 4 | `rin/surprised` | `public/art/rin/surprised.webp` | ✅ |
| 5 | `rin/angry` | `public/art/rin/angry.webp` | ✅ |
| 6 | `rin/sad` | `public/art/rin/sad.webp` | ☐ |
| 7 | `rin/think` | `public/art/rin/think.webp` | ✅ |
| 8 | `hare/smile` | `public/art/hare/smile.webp` | ✅ |
| 9 | `hare/happy` | `public/art/hare/happy.webp` | ✅ |
| 10 | `hare/blush` | `public/art/hare/blush.webp` | ✅ |
| 11 | `hare/surprised` | `public/art/hare/surprised.webp` | ✅ |
| 12 | `hare/angry` | `public/art/hare/angry.webp` | ☐ |
| 13 | `hare/sad` | `public/art/hare/sad.webp` | ✅ |
| 14 | `hare/think` | `public/art/hare/think.webp` | ✅ |
| 15 | `mirai/smile` | `public/art/mirai/smile.webp` | ✅ |
| 16 | `mirai/happy` | `public/art/mirai/happy.webp` | ☐ |
| 17 | `mirai/blush` | `public/art/mirai/blush.webp` | ✅ |
| 18 | `mirai/surprised` | `public/art/mirai/surprised.webp` | ☐ |
| 19 | `mirai/angry` | `public/art/mirai/angry.webp` | ☐ |
| 20 | `mirai/sad` | `public/art/mirai/sad.webp` | ✅ |
| 21 | `mirai/think` | `public/art/mirai/think.webp` | ✅ |
| 22 | `sensei/smile` | `public/art/sensei/smile.webp` | ✅ |
| 23 | `sensei/think` | `public/art/sensei/think.webp` | ☐ |
| 24 | `sensei/sad` | `public/art/sensei/sad.webp` | ☐ |
| 25 | `kuro/smug` | `public/art/kuro/smug.webp` | ✅ |
| 26 | `kuro/shock` | `public/art/kuro/shock.webp` | ✅ |
| 27 | `kuro/sad` | `public/art/kuro/sad.webp` | ☐ |
| 28 | `bg/street` | `public/art/bg/street.webp` | ✅ |
| 29 | `bg/planetarium` | `public/art/bg/planetarium.webp` | ✅ |
| 30 | `bg/beach` | `public/art/bg/beach.webp` | ✅ |
| 31 | `bg/festival` | `public/art/bg/festival.webp` | ✅ |
| 32 | `bg/rain` | `public/art/bg/rain.webp` | ✅ |
| 33 | `bg/infirmary` | `public/art/bg/infirmary.webp` | ✅ |
| 34 | `cg/date-rin-3` | `public/art/cg/date-rin-3.webp` | ✅ |
| 35 | `cg/date-hare-3` | `public/art/cg/date-hare-3.webp` | ✅ |
| 36 | `cg/date-mirai-3` | `public/art/cg/date-mirai-3.webp` | ✅ |
| 37 | `cg/end-true` | `public/art/cg/end-true.webp` | ✅ |
| 38 | `cg/end-rin` | `public/art/cg/end-rin.webp` | ✅ |
| 39 | `cg/end-hare` | `public/art/cg/end-hare.webp` | ✅ |
| 40 | `cg/end-mirai` | `public/art/cg/end-mirai.webp` | ✅ |
| 41 | `cg/end-normal` | `public/art/cg/end-normal.webp` | ✅ |
| 42 | `cg/end-bad` | `public/art/cg/end-bad.webp` | ✅ |
| 43 | `cg/end-blackhat` | `public/art/cg/end-blackhat.webp` | ✅ |

