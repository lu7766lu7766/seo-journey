import { bg, bgm, card, choice, hide, minigame, opt, say, scene, show } from '@/engine'

export default scene('w3', [
  bgm('daily'),
  bg('clubroom', 'dusk'),
  say('narr', undefined, '第三週週一，放學後。社辦只剩螢幕的藍光，和我敲鍵盤的聲音。'),
  say('narr', undefined, '回頭時，未來已經站在我身後，一點腳步聲都沒有。'),
  show('mirai', 'center', 'normal'),
  say('me', undefined, '嚇！妳什麼時候進來的？'),
  say('mirai', 'normal', '十七分鐘前。門口沒掛「謝絕參觀」，視為允許進入。'),
  say('mirai', 'smile', '根據我的資料，你沒發現我，是因為專注。……這是讚美。'),
  say('mirai', 'think', '貴社網站有語意混亂：校名寫成「青葉學園」「青葉高中」「Aoba HS」。'),
  say('me', undefined, '都是我們學校啊，人類看得懂吧？'),
  say('mirai', 'normal', '就像班上有人叫小明、明明、Ming。點名系統會以為是三個人。'),
  say('me', undefined, '那一個人就會被點成三次名……缺席三次。'),
  show('mirai', 'center', 'smile'),
  say('mirai', 'smile', '比喻成立。這叫實體不一致。'),
  card('entity-consistency'),

  say('mirai', 'normal', '接著製作 JSON-LD。它是寫給機器看的電子名片。'),
  say('me', undefined, '一堆大括號和英文，我光看就想睡……'),
  show('sensei', 'left', 'smile'),
  say('sensei', 'smile', '當成填表單就好：身分選對沒、名字一不一致、每行逗號有沒有漏。'),
  hide('sensei'),
  minigame('w3-jsonld', { stats: { str: 4, tru: 2 }, bond: { mirai: 1 } }, { stats: { str: 1 } }),

  say('me', undefined, '大括號不可怕，可怕的是漏掉的那顆逗號。'),
  show('mirai', 'center', 'think'),
  say('mirai', 'think', '補充規範：名片寫「社員一百人」，網頁上卻只有你一人，就是不一致。'),
  say('mirai', 'normal', '標記必須和頁面看得見的內容相符。'),
  card('schema-visible-match'),
  say('mirai', 'normal', '符合規範也不保證出現特殊樣式。這是電子名片，不是許願池。'),
  card('json-ld'),

  say('mirai', 'think', '疑問。AI 一鍵就能產生一百頁文章，為什麼不用？'),
  choice([
    opt('因為我想寫只有我們寫得出來的東西', { bond: { mirai: 4 } }, [
      show('mirai', 'center', 'surprised'),
      say('mirai', 'surprised', '……資料庫中，沒有這個答案。'),
      show('mirai', 'center', 'blush'),
      say('mirai', 'blush', '原來如此。「溫度」，是無法批量生成的。'),
    ]),
    opt('好主意！', { bond: { mirai: -3 } }, [
      show('mirai', 'center', 'sad'),
      say('mirai', 'sad', '已記錄。重複無意義的頁面，只會製造網路垃圾。'),
    ]),
    opt('不知道……還沒想那麼多', {}, [
      say('mirai', 'normal', '建議早點思考自己的價值所在。'),
    ]),
  ]),
  say('narr', undefined, '夕陽落在她的髮梢，星形髮夾輕輕亮了一下，像在記下今天。'),
  say('mirai', 'normal', '……已儲存。今天的資料，很有價值。'),
  hide('mirai'),
])
