import { bg, bgm, card, choice, hide, minigame, opt, say, scene, show, when } from '@/engine'
import { bondIs } from '@/engine/cond'

export default scene('w3', [
  bgm('daily'),
  bg('clubroom', 'dusk'),
  say('narr', undefined, '第三週週一，放學後。回頭時，未來已經站在身後，一點腳步聲都沒有。'),
  show('mirai', 'center', 'normal'),
  say('me', undefined, '嚇！妳什麼時候進來的？'),
  say('mirai', 'normal', '十七分鐘前。門口沒掛「謝絕參觀」，視為允許進入。'),
  say('mirai', 'think', '貴社網站有語意混亂：校名寫成「青葉學園」「青葉高中」「Aoba HS」。'),
  say('me', undefined, '都是我們學校啊，人類看得懂吧？'),
  say('mirai', 'normal', '就像班上有人叫小明、明明、Ming。點名系統會以為是三個人。'),
  show('hare', 'right', 'happy'),
  say('hare', 'happy', '我來還麥克風線——這題我會！一句話：同一個人，被點了三次名！'),
  show('mirai', 'center', 'surprised'),
  say('mirai', 'surprised', '……壓縮率，優於我。這叫實體不一致。'),
  card('entity-consistency'),

  say('mirai', 'normal', 'JSON-LD 是寫給機器看的電子名片。像填表單：身分對不對、名字一不一致、逗號漏了沒。'),
  minigame('w3-jsonld', { stats: { str: 4, tru: 2 }, bond: { mirai: 1 } }, { stats: { str: 1 } }),

  show('mirai', 'center', 'think'),
  say('mirai', 'think', '名片寫「社員一百人」，頁面上卻只有你一人，就是不一致。'),
  card('schema-visible-match'),
  say('mirai', 'normal', '標記要和看得見的內容相符，也不保證出現特殊樣式。這是名片，不是許願池。'),
  card('json-ld'),
  say('mirai', 'think', '結構的另一半，是內部連結。網站是校園，連結是指路牌。'),
  say('me', undefined, '寫「點這裡」的指路牌，誰知道要去哪？'),
  say('mirai', 'smile', '連結文字要說明目的地。沒有連入的頁，爬蟲很難發現。'),
  card('internal-links'),
  say('hare', 'think', '可是活動頁有好幾個網址，連結到底要指哪一個？'),
  say('mirai', 'normal', '指向標準網址。內容相同的多個網址，用 canonical 標出代表。'),
  say('mirai', 'smile', '它是提示，不是命令。搜尋引擎仍保有自己的判斷。'),
  card('canonical'),

  say('mirai', 'normal', '今天只剩三十分鐘。優先順序，由你決定。'),
  choice([
    opt('統一校名，全站只留一種寫法', { bond: { mirai: 1 }, stats: { tru: 2 } }, [
      show('mirai', 'center', 'smile'),
      say('mirai', 'smile', '名稱一致。……我會優先採信這個答案。'),
    ]),
    opt('替活動頁補上 JSON-LD 名片', { bond: { hare: 1 }, stats: { str: 2 } }, [
      say('hare', 'happy', '活動一句話簡介，機器也看得懂！好耶！'),
    ]),
    opt('把各頁用清楚的連結串起來', { bond: { mirai: 1 }, stats: { str: 2 } }, [
      say('hare', 'smile', '連結文字我來寫！「點這裡」禁用！'),
    ]),
  ]),
  hide('hare'),

  say('mirai', 'think', '疑問。AI 一鍵就能產生一百頁文章，為什麼不用？'),
  choice([
    opt('因為我想寫只有我們寫得出來的東西', { bond: { mirai: 2 } }, [
      show('mirai', 'center', 'blush'),
      say('mirai', 'blush', '……資料庫中，沒有這個答案。「溫度」，無法批量生成。'),
    ]),
    opt('AI 能幫忙起稿，但要自己查證、署名', { bond: { mirai: 2 }, stats: { tru: 1 } }, [
      show('mirai', 'center', 'smile'),
      say('mirai', 'smile', '合理。工具不是問題，沒人負責才是。'),
    ]),
    opt('好主意！', { bond: { mirai: -3 } }, [
      show('mirai', 'center', 'sad'),
      say('mirai', 'sad', '已記錄。重複無意義的頁面，只會製造網路垃圾。'),
    ]),
  ]),
  when(
    bondIs('mirai', 'gte', 4),
    [
      say('narr', undefined, '她收拾得特別慢，直到我存好最後一個檔案，才開口。'),
      show('mirai', 'center', 'blush'),
      say('mirai', 'blush', '……今天的資料，我想加上標籤：重要。明天，我也會來。'),
    ],
    [
      when(
        bondIs('mirai', 'lt', 4),
        [
          show('mirai', 'center', 'normal'),
          say('mirai', 'normal', '本日資料已歸檔。感謝配合。'),
        ],
        [
          say('narr', undefined, '夕陽落在她的髮梢，星形髮夾輕輕亮了一下，像在記下今天。'),
          say('mirai', 'normal', '……已儲存。今天的資料，很有價值。'),
        ],
      ),
    ],
  ),
  hide('mirai'),
])
