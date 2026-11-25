/**
 * Flavor text consumed by the systems (P2) and written by the script team (P3).
 * Shapes are fixed by the contract; P3 fills the content.
 */
import type { ActivityId } from './activityIds'
import type { Face, SpeakerId } from './characters'
import type { HeroineId } from '@/engine/types'

export interface FlavorLine {
  who: SpeakerId
  face?: Face
  text: string // ≤ 45 chars, {name} allowed
  /** optional small bond reward when this chatter fires */
  bond?: Partial<Record<HeroineId, number>>
}

/** Weekly report one-liners, picked by the heroine's current score tier: low <40, mid 40–64, high ≥65. */
export const WEEKLY_COMMENTS: Record<HeroineId, { low: FlavorLine[]; mid: FlavorLine[]; high: FlavorLine[] }> = {
  // 凜 (SEO): crawl / index / speed / rules
  rin: {
    low: [
      { who: 'rin', face: 'angry', text: '爬蟲連門都找不到。基礎，還沒打好。' },
      { who: 'rin', face: 'normal', text: '速度、結構、規則，三項皆未達標。重來。' },
      { who: 'rin', face: 'sad', text: '……不是在責備你。只是，我有點擔心。' },
    ],
    mid: [
      { who: 'rin', face: 'think', text: '收錄在增加。但還有幾頁，讀取得太慢。' },
      { who: 'rin', face: 'normal', text: '方向正確。細節的規則，請再核對一次。' },
      { who: 'rin', face: 'smile', text: '……進步了。別以為我沒看到，只是沒說。' },
    ],
    high: [
      { who: 'rin', face: 'smile', text: '索引乾淨、速度穩定。這份成績，我認可。' },
      { who: 'rin', face: 'blush', text: '規則被你用得很漂亮。……我不會再說第二次。' },
      { who: 'rin', face: 'happy', text: '好東西，被看見了。{name}，做得很好。' },
    ],
  },
  // 晴 (AEO): direct answers / one-line summary
  hare: {
    low: [
      { who: 'hare', face: 'sad', text: '結論……找不到。段落太長，我自己都迷路了。' },
      { who: 'hare', face: 'think', text: '問題有，答案沒有。先把答案放在最前面吧！' },
      { who: 'hare', face: 'surprised', text: '咦？這一段在講什麼？一句話，可以嗎？' },
    ],
    mid: [
      { who: 'hare', face: 'normal', text: '有幾個問題，已經能一句話答出來了！' },
      { who: 'hare', face: 'smile', text: '結論先說：還不錯！細節，再磨一磨。' },
      { who: 'hare', face: 'think', text: '標題要像問題，答案要像回應。快到了！' },
    ],
    high: [
      { who: 'hare', face: 'happy', text: '結論先說！太棒了！答案一眼就看得到！' },
      { who: 'hare', face: 'blush', text: '這網站，連我的廣播稿都想引用呢！' },
      { who: 'hare', face: 'happy', text: '一句話總結：{name}，最強！好，講完了！' },
    ],
  },
  // 未來 (GEO): originality / sources / entity / trust
  mirai: {
    low: [
      { who: 'mirai', face: 'normal', text: '已讀取。內容與他人重複率偏高。' },
      { who: 'mirai', face: 'think', text: '來源不明，作者不明。無法列為引用對象。' },
      { who: 'mirai', face: 'sad', text: '……還沒有，只屬於這裡的東西。' },
    ],
    mid: [
      { who: 'mirai', face: 'think', text: '根據我的資料，可信度正在上升。' },
      { who: 'mirai', face: 'normal', text: '作者資訊已確認。原創資料，還可以更多。' },
      { who: 'mirai', face: 'smile', text: '這一段，我沒有在別處讀過。……有意思。' },
    ],
    high: [
      { who: 'mirai', face: 'smile', text: '已讀取。具原創性、有來源、有署名。優良。' },
      { who: 'mirai', face: 'blush', text: '{name}的文章，我想放進我的參考清單。' },
      { who: 'mirai', face: 'happy', text: '被引用的理由，已經成立。……我也有點開心。' },
    ],
  },
}

/** 15% random interlude after a schedule slot of this activity (plan §2.4). */
export const ACTIVITY_CHATTER: Record<ActivityId, FlavorLine[]> = {
  write: [
    { who: 'hare', face: 'happy', text: '路過！結論先說：這篇標題超吸睛！', bond: { hare: 1 } },
    { who: 'mirai', face: 'think', text: '偵測到原創文字。……我，偷看了一行。', bond: { mirai: 1 } },
    { who: 'rin', face: 'normal', text: '錯字，第三行。……其他地方，尚可。', bond: { rin: 1 } },
  ],
  research: [
    { who: 'rin', face: 'think', text: '搜尋的人，真正想知道什麼？先問這個。', bond: { rin: 1 } },
    { who: 'hare', face: 'surprised', text: '哇，這個關鍵字好多人搜！是問題耶！', bond: { hare: 1 } },
    { who: 'mirai', face: 'normal', text: '同一個詞，意圖可能不同。已讀取。', bond: { mirai: 1 } },
  ],
  techcheck: [
    { who: 'rin', face: 'smile', text: '連結全數可用。……不錯的檢查習慣。', bond: { rin: 1 } },
    { who: 'hare', face: 'surprised', text: '網頁開太慢，我都能先講完一段廣播了！', bond: { hare: 1 } },
    { who: 'mirai', face: 'think', text: '建議：先壓縮圖片。這是根據我的資料。', bond: { mirai: 1 } },
  ],
  schema: [
    { who: 'mirai', face: 'smile', text: '標記整齊。機器讀起來，也會覺得舒服。', bond: { mirai: 1 } },
    { who: 'rin', face: 'normal', text: '標記與內文必須一致。這是規則。', bond: { rin: 1 } },
    { who: 'hare', face: 'think', text: '大括號好多……這是新的暗號嗎？', bond: { hare: 1 } },
  ],
  qa: [
    { who: 'hare', face: 'happy', text: '這段我來念！……嗯，一句話就懂了！', bond: { hare: 1 } },
    { who: 'rin', face: 'think', text: '先給答案，再給理由。有條理，很好。', bond: { rin: 1 } },
    { who: 'mirai', face: 'normal', text: '段落長度適中。方便擷取。已讀取。', bond: { mirai: 1 } },
  ],
  authors: [
    { who: 'mirai', face: 'blush', text: '署名……這是第一次，有人願意為內容負責。', bond: { mirai: 1 } },
    { who: 'rin', face: 'smile', text: '來源註明清楚。信任，從這裡開始累積。', bond: { rin: 1 } },
    { who: 'hare', face: 'happy', text: '作者頁有大頭貼耶！笑一個！', bond: { hare: 1 } },
  ],
  social: [
    { who: 'hare', face: 'happy', text: '我幫你在廣播裡提了社團！大家都有聽到！', bond: { hare: 1 } },
    { who: 'mirai', face: 'think', text: '外部提及增加。……你，人緣意外地好。', bond: { mirai: 1 } },
    { who: 'rin', face: 'normal', text: '合作，要守約。……你做得到，我相信。', bond: { rin: 1 } },
  ],
  rest: [
    { who: 'hare', face: 'happy', text: '午睡中的你，睫毛好長！……啊，被發現了。', bond: { hare: 1 } },
    { who: 'rin', face: 'blush', text: '這條毯子……只是剛好多帶一條。別誤會。', bond: { rin: 1 } },
    { who: 'mirai', face: 'smile', text: '睡眠中的心跳，規律。……我，陪你五分鐘。', bond: { mirai: 1 } },
  ],
}

/** Result caption shown for a successful slot, per activity (narr/me voice). */
export const ACTIVITY_RESULT: Record<ActivityId, string[]> = {
  write: [
    '鍵盤敲得喀噠響，一篇只屬於這個社團的文章誕生了。',
    '寫著寫著，連自己都想按讚。',
    '原創的字句，一行一行堆起了網站的底氣。',
  ],
  research: [
    '搜尋框的背後，是一個個真正想知道答案的人。',
    '筆記本上畫滿了圈圈，意圖漸漸清楚了。',
    '關鍵字不是目的，讀的人才是。你記住了。',
  ],
  techcheck: [
    '一條一條檢查連結，壞掉的網址全都被抓出來了。',
    '載入速度變快了，網站像換上新鞋。',
    '手機版的畫面也乖乖排好了。',
  ],
  schema: [
    '大括號與引號各就各位，機器終於讀懂了。',
    '標記寫完了，並且跟頁面上的內容一模一樣。',
    '結構化資料像一張清楚的名片，遞給了搜尋引擎。',
  ],
  qa: [
    '把答案挪到最前面，整段讀起來清爽多了。',
    '一個段落只講一件事，條理分明。',
    '標題變成了問題，答案緊跟在後面。',
  ],
  authors: [
    '作者介紹寫好了，署名的感覺有點害羞。',
    '每個數字後面，都補上了出處。',
    '讓人知道是誰寫的、憑什麼寫，信任感就多了一點。',
  ],
  social: [
    '和其他社團交換了連結，社辦熱鬧了起來。',
    '聊著聊著，網站的名字被更多人記住了。',
    '外面的世界，原來有這麼多願意提到我們的人。',
  ],
  rest: [
    '天台的風很舒服，整個人都放鬆下來。',
    '福利社的紅豆麵包，今天特別好吃。',
    '睡了一個短短的午覺，腦袋清爽多了。',
  ],
}

/** Stress ≥ 80 failure quips (who: 'me'). */
export const FAIL_LINES: FlavorLine[] = [
  { who: 'me', face: 'sad', text: '盯著螢幕十分鐘，只打出了一個「的」。' },
  { who: 'me', face: 'surprised', text: '咦？我剛才存檔了嗎？……沒有。' },
  { who: 'me', face: 'think', text: '腦袋像被爬蟲爬過，什麼都沒剩下。' },
  { who: 'me', face: 'sad', text: '標題打成了「404」。這不是梗，是真的。' },
  { who: 'me', face: 'surprised', text: '把 robots.txt 當成機器人的日記在讀……' },
  { who: 'me', face: 'sad', text: '壓力大到，連瀏覽器分頁都在對我嘆氣。' },
]

/** Stamina 0 → infirmary mini scene lines (bg 'infirmary'). */
export const INFIRMARY_LINES: FlavorLine[] = [
  { who: 'sensei', face: 'normal', text: '醒啦？你在社辦倒下的時候，咖啡都灑了。' },
  { who: 'sensei', face: 'smile', text: '睡一覺，通常比再改十篇文章有用。' },
  { who: 'rin', face: 'angry', text: '自我管理，也是規則的一部分！給我好好休息！' },
  { who: 'hare', face: 'sad', text: '結論先說：我嚇死了！下次累了要說啊！' },
  { who: 'mirai', face: 'sad', text: '已讀取。你的體力值，剛剛是零。……不要再這樣。' },
  { who: 'sensei', face: 'think', text: '網站要長期經營。人倒了，就沒有人更新了。' },
  { who: 'rin', face: 'blush', text: '……醒了就好。我……沒有守在這裡。只是路過。' },
]

/** Notice-board blurbs for each side quest (shown on the 委託公佈欄). */
export const QUEST_BLURBS: Record<string, { title: string; client: string; blurb: string }> = {
  'sq-r1': {
    title: '舊公告頁搬家',
    client: '凜（學生會）',
    blurb: '舊公告網址全壞了。請確認轉址方式，不得出錯。',
  },
  'sq-r2': {
    title: '重複內容的幽靈',
    client: '凜（學生會）',
    blurb: '同一頁出現了好幾個網址。請找出原因，整理乾淨。',
  },
  'sq-r3': {
    title: '凜的秘密部落格',
    client: '凜（私人委託）',
    blurb: '……圖片載入太慢。不准告訴別人，這是我的私事。',
  },
  'sq-h1': {
    title: '料理社的食譜頁',
    client: '料理社（晴牽線）',
    blurb: '食譜照片超美，但搜尋找不到！請幫幫我們！',
  },
  'sq-h2': {
    title: '籃球社的比賽頁',
    client: '籃球社',
    blurb: '比賽快到了，搜尋結果卻顯示舊資訊，快來救援！',
  },
  'sq-h3': {
    title: '廣播社的語音問答',
    client: '晴（私人委託）',
    blurb: '結論先說：我想把廣播內容做成文字問答，教我嘛！',
  },
  'sq-m1': {
    title: '圖書館消失的校史',
    client: '圖書館員',
    blurb: '網路上的校史，創校年份竟然寫得不一樣。',
  },
  'sq-m2': {
    title: 'AI 爬蟲來敲門',
    client: '天文社',
    blurb: '社網站日誌裡有陌生的機器人。該放行還是擋掉？',
  },
  'sq-m3': {
    title: '未來的真面目',
    client: '未來（私人委託）',
    blurb: '已讀取。請求：陪我弄清楚，什麼才算「原創」。',
  },
  'sq-x1': {
    title: '流量學院的挑戰',
    client: '黑川翔',
    blurb: '嘿，敢比比看嗎？看你能不能認出我的招數。',
  },
}
