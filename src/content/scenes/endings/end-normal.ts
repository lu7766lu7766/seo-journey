import { bg, bgm, cg, hide, say, scene, show } from '@/engine'

export default scene('end-normal', [
  bgm('daily'),
  bg('clubroom', 'dusk'),
  cg('end-normal'),
  say('narr', undefined, '總算驚險跨過及格線，網站研究社順利保留下來了！'),
  show('sensei', 'left', 'smile'),
  show('rin', 'right', 'smile'),
  say('sensei', 'smile', '幹得好，{name}！這杯咖啡敬我們保住的「404 號社辦」！'),
  say('rin', 'normal', '雖然離頂尖還有距離，但至少基礎站穩了。恭喜。'),
  say('me', undefined, '太好了……接下來還能繼續在這裡更新文章！'),
  say('narr', undefined, '雖然沒有特別亮眼的紀錄，但社辦的螢幕依然溫暖地亮著。'),
  hide('all'),
  cg('none'),
])
