import type { Cmd, HeroineId } from '@/engine'
import { bg, bgm, hide, say, scene, sfx, show, wait, when } from '@/engine'
import { scoreIs } from '@/engine/cond'

/** three tiers (>= 65 / 40-64 / < 40): nested `when` so exactly one tier plays */
const tiers = (who: HeroineId, high: Cmd[], mid: Cmd[], low: Cmd[]): Cmd =>
  when(scoreIs(who, 'gte', 65), high, [when(scoreIs(who, 'gte', 40), mid, low)])

export default scene('festival', [
  bgm('festival'),
  bg('festival', 'day'),
  say('narr', undefined, '搜尋祭開幕。太鼓咚咚震著地面，空氣裡有章魚燒和燈籠紙的味道。'),
  say('narr', undefined, '社團攤位排成長龍，每個攤位的海報上，都印著大大的網址。'),
  show('sensei', 'center', 'smile'),
  say('sensei', 'smile', '輪到我們了，{name}。照你準備的去講就好。'),
  say('sensei', 'normal', '我的咖啡緊張到沒喝完。這很稀有，請珍惜。'),
  hide('sensei'),

  sfx('choice'),
  show('rin', 'left', 'normal'),
  show('hare', 'center', 'normal'),
  show('mirai', 'right', 'normal'),
  say('narr', undefined, '我站上木質舞台，膝蓋比筆電的風扇還會抖。三位評審坐在台下正前方。'),
  say('me', undefined, '（稿子上的字突然全模糊了。……那就，用說的。）'),
  say('hare', 'happy', '社長加油——！'),
  say('rin', 'angry', '夏川同學，評審席禁止應援。'),
  say('hare', 'surprised', '對不起！但是社長加油——！（小聲）'),
  say('me', undefined, '各位評審好，我們是網站研究社，「404 號社辦」。'),
  say('me', undefined, '六週前，搜尋我們，結果是零筆。'),
  say('me', undefined, '我們先讓網站被找得到，再讓它答得出來，最後讓它值得被引用。'),
  say('me', undefined, '沒有魔法，只有一個個修好的標題，和一份份寫清楚來源的資料。'),
  say('narr', undefined, '台下靜了一瞬，接著響起掌聲。晴舉雙手比了大大的圈，凜的筆尖停了半拍，未來的髮夾亮了一下。'),

  // 凜 (SEO)
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

  // 晴 (AEO)
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

  // 未來 (GEO)
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

  say('narr', undefined, '三位評審低頭寫下最終分數。太鼓從慢到快，咚、咚、咚咚咚——'),
  wait(1200),
  say('narr', undefined, '全場屏息，燈光「唰」地聚向結果公布牌！'),
  hide('all'),
])
