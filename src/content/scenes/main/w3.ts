import { bg, bgm, card, choice, hide, minigame, opt, say, scene, show } from '@/engine'

export default scene('w3', [
  bgm('daily'),
  bg('clubroom', 'day'),
  say('narr', undefined, '第三週週一，未來悄悄走進社辦，盯著電腦螢幕。'),
  show('mirai', 'center', 'normal'),
  say('mirai', 'normal', '根據我的資料，貴社網站目前存在嚴重的語意混亂。'),
  say('me', undefined, '怎麼說？頁面上的文字應該寫得很清楚才對。'),
  say('mirai', 'think', '校名同時出現「青葉學園」「青葉高中」「Aoba HS」三種寫法。'),
  say('mirai', 'normal', '對機器而言，這可能被當成三個不同的實體。'),
  card('entity-consistency'),

  say('mirai', 'normal', '請使用 JSON-LD 結構化資料，用機器讀得懂的格式自我介紹。'),
  say('mirai', 'think', '但注意：標記內容必須和頁面上看得到的完全一致，而且不保證出現複合結果。'),
  minigame('w3-jsonld', { stats: { str: 4, tru: 2 }, bond: { mirai: 2 } }, { stats: { str: 1 } }),
  card('json-ld'),
  card('schema-visible-match'),

  show('mirai', 'center', 'think'),
  say('mirai', 'think', '疑問。現在靠 AI 一鍵就能產生一百頁文章，為什麼不用？'),
  choice([
    opt('因為我想寫只有我們寫得出來的東西', { bond: { mirai: 6 } }, [
      show('mirai', 'center', 'surprised'),
      say('mirai', 'surprised', '……資料庫中，沒有這個答案。'),
      show('mirai', 'center', 'blush'),
      say('mirai', 'blush', '原來如此……「溫度」是無法批量生成的。'),
    ]),
    opt('好主意！', { bond: { mirai: -3 } }, [
      show('mirai', 'center', 'sad'),
      say('mirai', 'sad', '已記錄。重複無意義的頁面，只會製造網路垃圾。'),
    ]),
    opt('不知道……還沒想那麼多', {}, [
      say('mirai', 'normal', '建議早點思考自己的價值所在。'),
    ]),
  ]),
  say('narr', undefined, '未來輕觸髮梢的星形髮夾，微微點頭後離開了社辦。'),
  hide('mirai'),
])
