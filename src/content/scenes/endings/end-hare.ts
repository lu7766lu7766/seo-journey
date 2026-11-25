import { bg, bgm, cg, hide, say, scene, show } from '@/engine'

export default scene('end-hare', [
  bgm('warm'),
  bg('broadcast', 'dusk'),
  cg('end-hare'),
  say('narr', undefined, '搜尋祭結束後的黃昏，晴把我拉回熟悉的廣播社錄音室。'),
  show('hare', 'center', 'happy'),
  say('hare', 'happy', '大成功！AEO 評分超高，連校長都誇我們問答寫得超好懂！'),
  say('me', undefined, '這都是和妳一起練習「先講結論」的成果啊。'),
  show('hare', 'center', 'blush'),
  say('hare', 'blush', '其實我以前總是怕講太少大家會無聊，才一直繞遠路……'),
  say('hare', 'blush', '但現在我決定不繞彎了。結論先說——'),
  say('hare', 'happy', '我最喜歡和{name}一起做網站、一起廣播了！以上，報告完畢！'),
  say('narr', undefined, '錄音室紅燈雖然沒亮，她那句直球卻準確地傳進了我心裡。'),
  hide('hare'),
  cg('none'),
])
