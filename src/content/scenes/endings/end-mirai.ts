import { bg, bgm, cg, hide, say, scene, show } from '@/engine'

export default scene('end-mirai', [
  bgm('warm'),
  bg('planetarium', 'night'),
  cg('end-mirai'),
  say('narr', undefined, '搜尋祭後，未來約我來到校外熟悉的天文館圓頂之下。'),
  show('mirai', 'center', 'smile'),
  say('mirai', 'smile', '已讀取。你的網站獲得了最多次真實引用，成功續留社團。'),
  say('me', undefined, '那未來呢？還覺得自己只是別人的複製品嗎？'),
  show('mirai', 'center', 'blush'),
  say('mirai', 'blush', '……不。因為你寫下的原創文章，讓我學會了什麼是第一手的情感。'),
  say('mirai', 'happy', '星圖會把光線連在一起。我也想把自己的未來，連結在你的身邊。'),
  say('mirai', 'blush', '這不是從資料庫抄來的句子。是我自己的話。'),
  say('narr', undefined, '星形髮夾在星光下輕輕閃爍，照亮了她溫柔而堅定的側臉。'),
  hide('mirai'),
  cg('none'),
])
