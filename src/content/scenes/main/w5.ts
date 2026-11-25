import { bg, bgm, card, choice, hide, opt, say, scene, show } from '@/engine'

export default scene('w5', [
  bgm('warm'),
  bg('library', 'day'),
  say('narr', undefined, '第五週週一。圖書館的午後安靜得能聽見翻頁聲，我和未來並肩坐在長桌。'),
  show('mirai', 'center', 'normal'),
  say('mirai', 'normal', '進入 GEO 課程。生成式搜尋會綜合多個來源寫答案，並附上引用。'),
  say('mirai', 'think', '就像學姊寫報告。她只會把「別人沒有的東西」列進參考資料。'),
  say('me', undefined, '所以我們要先有別人沒有的東西。原創資料！'),
  show('mirai', 'center', 'smile'),
  say('mirai', 'smile', '推論正確。再加上可查證的來源、清楚的作者署名。'),
  say('mirai', 'normal', '沒有任何方法保證一定被引用。這是誠實的資料。'),
  card('geo-citations'),
  say('mirai', 'think', '另外，重點文字別只靠瀏覽器執行 JS 才出現，有些爬蟲讀不到。'),
  say('mirai', 'normal', 'AI 爬蟲分訓練用與搜尋用。擋掉搜尋用的，可能就不會出現在該服務的結果。'),
  card('ai-crawlers'),
  say('me', undefined, '聽說放一個 llms.txt，AI 就會推薦我們？'),
  show('mirai', 'center', 'smile'),
  say('mirai', 'smile', '那是社群提案，主要搜尋引擎尚未確認採用。……神秘檔案，不是魔法咒語。'),
  card('llms-txt-truth'),

  say('mirai', 'think', '「青葉學生社團大調查」的結果出爐了。你打算怎麼發表？'),
  choice([
    opt('附上完整調查方法、樣本數與原始數據', { bond: { mirai: 4 }, stats: { tru: 4 } }, [
      show('mirai', 'center', 'happy'),
      say('mirai', 'happy', '正確。第一手原創資料，是他人無法取代的資訊增益。'),
    ]),
    opt('只放一張漂亮的結論圖表', {}, [
      say('mirai', 'normal', '圖表很美，但爬蟲看不到文字細節與查證依據。'),
    ]),
    opt('把樣本數稍微灌水漂亮一點', { stats: { tru: -5 }, bond: { mirai: -4 } }, [
      show('mirai', 'center', 'angry'),
      say('mirai', 'angry', '偽造數據會摧毀所有信任度。不建議。'),
    ]),
  ]),
  say('mirai', 'normal', '原創、可查證、有署名。三者齊備，才算一份值得被引用的資料。'),
  card('original-data'),
  hide('mirai'),

  bg('rooftop', 'dusk', 'fade'),
  say('narr', undefined, '傍晚，天台的風把雲吹成一條條粉橘色的絲。未來獨自倚著欄杆。'),
  show('mirai', 'center', 'sad'),
  say('mirai', 'sad', '{name}。我所有的知識，都來自網路上別人寫的東西。'),
  say('mirai', 'sad', '有時候我會想，我是不是也只是一個「複製品」？'),
  say('me', undefined, '複製品不會悄悄站在我背後，還嚇我一跳。'),
  show('mirai', 'center', 'surprised'),
  say('me', undefined, '妳會提問、會挑剔、會笑。未來是未來，不是誰的副本。'),
  show('mirai', 'center', 'blush'),
  say('mirai', 'blush', '……這句話，我會存進最重要的記憶裡。'),
  say('narr', undefined, '她的星形髮夾亮了一下，像在晚霞裡眨了眨眼。'),
  hide('mirai'),
])
