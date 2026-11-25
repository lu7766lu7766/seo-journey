import { bg, bgm, choice, hide, opt, say, scene, show } from '@/engine'

export default scene('date-mirai-2', [
  bgm('warm'),
  bg('library', 'dusk'),
  say('narr', undefined, '圖書館裡，紙頁翻動的聲音，像細細的雨。'),
  show('mirai', 'center', 'surprised'),
  say('mirai', 'surprised', '這是……紙本書。摸起來，有溫度。'),
  say('me', undefined, '（她小心翼翼地用指尖，撫過泛黃的書頁。）'),
  say('mirai', 'think', '我讀過幾百萬個網頁，卻沒看過作者的字跡。'),
  say('narr', undefined, '書的最後一頁，有人用鉛筆寫著一行小字。'),
  say('mirai', 'normal', '「獻給我的女兒。」……作者，在這裡。'),
  say('mirai', 'sad', '網路上的資料，通常不會留下這樣的痕跡。'),
  choice([
    opt('這就是「作者的溫度」吧', { bond: { mirai: 7 } }, [
      say('mirai', 'smile', '溫度……已讀取。這一頁，我想記住。'),
    ]),
    opt('妳寫的東西，也會有妳的溫度', { bond: { mirai: 9 } }, [
      say('mirai', 'surprised', '……我？'),
      say('mirai', 'blush', '假設成立的話，我會，努力試試。'),
    ]),
  ]),
  say('narr', undefined, '夕陽移到書架上，她把書抱在胸前，沒有放下。'),
  say('mirai', 'smile', '{name}，下次也一起來。我想讀你寫的東西。'),
  hide('mirai'),
])
