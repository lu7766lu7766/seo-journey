import { bg, bgm, card, choice, hide, opt, say, scene, show } from '@/engine'

export default scene('w5', [
  bgm('warm'),
  bg('clubroom', 'day'),
  say('narr', undefined, '第五週週一，社團準備推出年度特輯「青葉學生社團大調查」。'),
  show('mirai', 'center', 'normal'),
  say('mirai', 'normal', '進入 GEO 課程。生成式搜尋會綜合多個來源並附上引用。'),
  say('mirai', 'think', '想提高被引用機會，需要原創資料、可查證的來源與清楚署名。'),
  say('mirai', 'normal', '而且網頁重點別全靠瀏覽器跑 JS 才出現，有些爬蟲會讀不到。'),
  say('me', undefined, '難怪！原來要先讓文字直接留在網頁裡，機器才抓得到。'),
  say('me', undefined, '對了，聽說放個叫 llms.txt 的檔案就能讓 AI 推薦，是真的嗎？'),
  show('mirai', 'center', 'smile'),
  say('mirai', 'smile', '那是社群提案，主要搜尋引擎還沒採用。別被神秘檔案騙了，呵呵。'),
  say('mirai', 'normal', '記住，沒有任何方法能保證一定被引用。'),
  card('geo-citations'),
  card('ai-crawlers'),
  card('llms-txt-truth'),

  say('mirai', 'think', '那麼，這份調查問卷的結果，你打算怎麼發表？'),
  choice([
    opt('附上完整調查方法、樣本數與原始數據', { bond: { mirai: 6 }, stats: { tru: 4 } }, [
      show('mirai', 'center', 'happy'),
      say('mirai', 'happy', '正確。第一手原創資料，正是他人無法取代的資訊增益。'),
    ]),
    opt('只放一張漂亮的結論圖表', {}, [
      say('mirai', 'normal', '圖表很美，但爬蟲看不到文字細節與查證依據。'),
    ]),
    opt('把樣本數稍微灌水漂亮一點', { stats: { tru: -5 }, bond: { mirai: -4 } }, [
      show('mirai', 'center', 'angry'),
      say('mirai', 'angry', '偽造數據會摧毀所有信任度。不建議。'),
    ]),
  ]),
  card('original-data'),
  hide('mirai'),

  bg('rooftop', 'dusk', 'fade'),
  say('narr', undefined, '傍晚在天台吹風時，我看見未來獨自望著遠方發亮的晚霞。'),
  show('mirai', 'center', 'sad'),
  say('mirai', 'sad', '{name}……我所有知識都來自網路上別人寫的東西。'),
  say('mirai', 'sad', '有時候我會想，我是不是也只是一個「複製品」呢？'),
  say('me', undefined, '未來是用自己的眼睛思考、提出問題的人，絕不是複製品。'),
  show('mirai', 'center', 'blush'),
  say('mirai', 'blush', '……這句話，我會好好存進重要記憶裡。'),
  hide('mirai'),
])
