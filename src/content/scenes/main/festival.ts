import type { Cmd, HeroineId } from '@/engine'
import { bg, bgm, choice, hide, opt, say, scene, show, wait, when } from '@/engine'
import { scoreIs, seen } from '@/engine/cond'

/** three tiers (>= 65 / 40-64 / < 40): nested `when` so exactly one tier plays */
const tiers = (who: HeroineId, high: Cmd[], mid: Cmd[], low: Cmd[]): Cmd =>
  when(scoreIs(who, 'gte', 65), high, [when(scoreIs(who, 'gte', 40), mid, low)])

export default scene('festival', [
  bgm('festival'),
  bg('festival', 'day'),
  say('narr', undefined, '搜尋祭開幕。鼓聲咚咚震著地面，空氣裡有章魚燒和燈籠紙的味道。'),
  show('sensei', 'center', 'smile'),
  say('sensei', 'smile', '輪到我們了，{name}。我的咖啡緊張到沒喝完，這很稀有，請珍惜。'),
  hide('sensei'),

  show('rin', 'left', 'normal'),
  show('hare', 'center', 'normal'),
  show('mirai', 'right', 'normal'),
  say('narr', undefined, '我站上木質舞台，膝蓋比筆電的風扇還會抖。三位評審坐在台下正前方。'),
  say('hare', 'happy', '社長加油——！'),
  say('rin', 'angry', '夏川同學，評審席禁止應援。'),
  say('hare', 'surprised', '對不起！但是社長加油——！（小聲）'),
  say('me', undefined, '各位評審好，我們是「404 號社辦」。六週前，搜尋我們，結果是零筆。'),
  say('me', undefined, '今天，我想向三位，各報告一件事。'),

  // 凜 (SEO)：爬取、索引、速度、結構
  say('rin', 'normal', '先由我。你們的網站，搜尋引擎找得到、讀得快嗎？'),
  choice([
    opt('我們做了社團大調查，附上方法與樣本數', undefined, [
      say('rin', 'normal', '……資料很有價值。但，不是我問的。'),
    ]),
    opt('爬蟲進得來、頁面收得進，大圖壓縮也加快載入', { bond: { rin: 2 } }, [
      show('rin', 'left', 'smile'),
      say('rin', 'smile', '爬取、收錄與速度都顧到了，正確。……這份細心，我記下了。'),
    ]),
    opt('主圖先到位、配角圖延遲並預留寬高，LCP 不再拖慢首屏', { bond: { rin: 2 } }, [
      show('rin', 'left', 'blush'),
      say('rin', 'blush', '……貓咪部落格那套圖片最佳化與 LCP，用得真好。滿分。'),
    ], seen('sq-r3')),
    opt('我們每週都有進步，也很努力！', undefined, [
      say('rin', 'normal', '努力，我看見了。具體內容，下次請補上。'),
    ]),
  ]),
  tiers(
    'rin',
    [
      show('rin', 'left', 'smile'),
      say('rin', 'smile', 'SEO 評審白鷺凜講評：爬取順暢、速度優秀、結構嚴謹。'),
      show('rin', 'left', 'blush'),
      say('rin', 'blush', '……規則，確實讓好東西被看見了。我找不到能扣分的地方。'),
    ],
    [
      show('rin', 'left', 'think'),
      say('rin', 'think', 'SEO 評審白鷺凜講評：索引與標題規範皆已達標。'),
      say('rin', 'normal', '行動版的互動回應與內部連結，還有進步空間。繼續。'),
    ],
    [
      show('rin', 'left', 'angry'),
      say('rin', 'angry', 'SEO 評審白鷺凜講評：基礎技術與規則，尚未紮穩。'),
      show('rin', 'left', 'sad'),
      say('rin', 'sad', '……但我看見你每一步都在努力。請從第一步重來。'),
    ],
  ),

  // 晴 (AEO)：直接回答、標題、清楚
  say('hare', 'normal', '換我！結論先說——你們最想讓讀者帶走的答案是什麼？'),
  choice([
    opt('每頁先給結論再補細節，標題寫成讀者會問的話', { bond: { hare: 2 } }, [
      show('hare', 'center', 'happy'),
      say('hare', 'happy', '就是這個！先講答案再補細節，超帥的！'),
    ]),
    opt('用問句標題搭一兩句直答，做 FAQ 求結構清楚、不迷信特效', { bond: { hare: 2 } }, [
      show('hare', 'center', 'blush'),
      say('hare', 'blush', '廣播社的文字問答，連 FAQ 的真相都記住了！這句結論，超棒！'),
    ], seen('sq-h3')),
    opt('我們把原創資料與來源，整理成可被引用的樣子', undefined, [
      say('hare', 'smile', '好厲害！可是……答案在哪？下次請一句話講完！'),
    ]),
    opt('我們的內容，都是用心寫的！', undefined, [
      say('hare', 'smile', '好感動！可是……可以更短嗎？一句話！'),
    ]),
  ]),
  tiers(
    'hare',
    [
      show('hare', 'center', 'happy'),
      say('hare', 'happy', 'AEO 評審夏川晴講評：結論先說，超級清楚！'),
      say('hare', 'happy', '一眼就能直接唸出答案，我現在就想念給全校聽！'),
    ],
    [
      show('hare', 'center', 'smile'),
      say('hare', 'smile', 'AEO 評審夏川晴講評：不少段落都抓到重點了！'),
      say('hare', 'normal', '問題型標題再明確一點，就能一句話答完，加油！'),
    ],
    [
      show('hare', 'center', 'sad'),
      say('hare', 'sad', 'AEO 評審夏川晴講評：讀者要的結論，藏得有點深。'),
      show('hare', 'center', 'smile'),
      say('hare', 'smile', '不過沒關係，我們一起練！先從第一句開始！'),
    ],
  ),

  // 未來 (GEO)：原創資料、來源、實體一致、引用
  say('mirai', 'think', '最後。請提出一項，只有你們擁有的證據。'),
  choice([
    opt('網站在手機上變快了：大圖壓縮，版面不再亂跳', undefined, [
      say('mirai', 'normal', '已讀取。改善屬實，但這是多數網站都有的證據。'),
    ]),
    opt('我們寫的每一句，都是自己的話。', undefined, [
      say('mirai', 'normal', '主張已記錄。證據欄位，目前為空白。'),
    ]),
    opt('學生社團大調查：附上方法、樣本與原始數據', { bond: { mirai: 2 } }, [
      show('mirai', 'right', 'happy'),
      say('mirai', 'happy', '原創、可查證、有署名。……我會引用它。'),
    ]),
    opt('附實測紀錄與署名：讓讀者帶走別處沒有的資訊增益', { bond: { mirai: 2 } }, [
      show('mirai', 'right', 'blush'),
      say('mirai', 'blush', '原創性與資訊增益，不是複製的總和。……這份證據，我會引用。'),
    ], seen('sq-m3')),
  ]),
  tiers(
    'mirai',
    [
      show('mirai', 'right', 'happy'),
      say('mirai', 'happy', 'GEO 評審星野未來講評：原創資料、來源可信、實體明確。'),
      say('mirai', 'smile', '我無法保證任何引擎會引用。但這份內容，我會。'),
    ],
    [
      show('mirai', 'right', 'think'),
      say('mirai', 'think', 'GEO 評審星野未來講評：可信度合格。'),
      say('mirai', 'normal', '若多一點只有你們寫得出來的第一手觀察，會更亮眼。'),
    ],
    [
      show('mirai', 'right', 'sad'),
      say('mirai', 'sad', 'GEO 評審星野未來講評：作者與原創依據不足，尚難被引用。'),
      show('mirai', 'right', 'normal'),
      say('mirai', 'normal', '……但我預測，下一次的資料會不一樣。'),
    ],
  ),

  say('narr', undefined, '三位評審低頭寫下最終分數。鼓聲從慢到快，咚、咚、咚咚咚——'),
  wait(1200),
  say('narr', undefined, '全場屏息，燈光「唰」地聚向結果公布牌！'),
  hide('all'),
])
