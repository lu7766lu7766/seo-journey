import { bg, bgm, card, choice, hide, opt, say, scene, show, when } from '@/engine'
import { bondIs } from '@/engine/cond'

export default scene('w5', [
  bgm('warm'),
  bg('library', 'day'),
  say('narr', undefined, '第五週週一。圖書館午後安靜得能聽見翻頁聲，我和未來並肩坐著。'),
  show('mirai', 'center', 'normal'),
  say('mirai', 'normal', '進入 GEO 課程。生成式搜尋會綜合多個來源寫答案，並附上引用。'),
  show('hare', 'right', 'think'),
  say('hare', 'think', '（小聲）結論先說：就是被當成「參考資料」對吧？'),
  say('mirai', 'smile', '推論正確。學姊只會引用「別人沒有的東西」，例如原創資料。'),
  say('mirai', 'normal', '再加上可查證的來源、清楚的作者。沒有任何方法能保證被引用。'),
  card('geo-citations'),
  say('hare', 'surprised', '那把 AI 爬蟲全擋在門外，不是比較安全嗎？'),
  say('mirai', 'think', '爬蟲分訓練用與搜尋用。擋掉搜尋用的，可能就不會出現在該服務的結果。'),
  card('ai-crawlers'),
  say('me', undefined, '聽說放一個 llms.txt，AI 就會推薦我們？'),
  show('mirai', 'center', 'smile'),
  say('mirai', 'smile', '那是社群提案，主要搜尋引擎尚未確認採用。……神秘檔案，不是魔法咒語。'),
  card('llms-txt-truth'),

  say('mirai', 'think', '「青葉學生社團大調查」的結果出爐了。草稿，請晴試讀。'),
  say('hare', 'surprised', '前兩頁都在講背景，答案在第三頁！讀者得先聽三分鐘天氣！'),
  say('mirai', 'normal', '同意。另外，重要文字別只靠 JS 才出現。那麼，如何開頭？'),
  choice([
    opt('開頭先放一兩句結論，方法接在後面', { bond: { hare: 2 }, stats: { ans: 2 } }, [
      show('hare', 'right', 'happy'),
      say('hare', 'happy', '就是這個！答案先上桌，細節慢慢端！'),
    ]),
    opt('開頭先交代方法與樣本數，建立可信度', { bond: { mirai: 2 }, stats: { tru: 4 } }, [
      show('mirai', 'center', 'smile'),
      say('mirai', 'smile', '可查證。……讀者要多讀兩段，但，值得。'),
    ]),
    opt('每段用問題當小標，一段答一題', { bond: { hare: 1, mirai: 1 }, stats: { ans: 2, str: 1 } }, [
      show('mirai', 'center', 'normal'),
      say('mirai', 'normal', '結構清楚。機器與人類，都容易定位。'),
    ]),
  ]),
  say('hare', 'normal', '小標寫成讀者會問的問題，答案放在下面第一句！'),
  card('question-headings'),
  say('mirai', 'normal', '還有，原創、可查證、有署名。數據一旦造假，信任歸零。'),
  card('original-data'),
  say('mirai', 'smile', '答案先行，人類好讀，機器也更容易讀對。這是 AEO 與 GEO 的交集。'),
  hide('all'),

  bg('rooftop', 'dusk', 'fade'),
  say('narr', undefined, '傍晚，天台的風把雲吹成一條條粉橘色的絲。未來獨自倚著欄杆。'),
  show('mirai', 'center', 'sad'),
  say('mirai', 'sad', '{name}。我所有的知識，都來自網路上別人寫的東西。'),
  say('mirai', 'sad', '有時候我會想，我是不是也只是一個「複製品」？'),
  say('me', undefined, '複製品不會悄悄站在我背後，還嚇我一跳。'),
  say('me', undefined, '妳會提問、會挑剔、會笑。未來是未來，不是誰的副本。'),
  show('mirai', 'center', 'surprised'),
  when(
    bondIs('mirai', 'gte', 20),
    [
      say('narr', undefined, '她沒有退開半步，肩膀輕輕靠了過來，髮夾的青光落在我的袖子上。'),
      show('mirai', 'center', 'blush'),
      say('mirai', 'blush', '……可以，再多存一會兒嗎？這片晚霞，我不想只存成截圖。'),
    ],
    [
      when(
        bondIs('mirai', 'lt', 12),
        [
          show('mirai', 'center', 'normal'),
          say('mirai', 'normal', '……謝謝。這句話，已記錄。'),
        ],
        [
          show('mirai', 'center', 'blush'),
          say('mirai', 'blush', '……這句話，我會存進最重要的記憶裡。'),
          say('narr', undefined, '她的星形髮夾亮了一下，像在晚霞裡眨了眨眼。'),
        ],
      ),
    ],
  ),
  hide('mirai'),
])
