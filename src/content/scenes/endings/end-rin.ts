import { bg, bgm, cg, hide, say, scene, show } from '@/engine'

export default scene('end-rin', [
  bgm('warm'),
  bg('gate', 'dusk'),
  cg('end-rin'),
  say('narr', undefined, '搜尋祭圓滿落幕，社團保住了。黃昏的櫻花校門只剩我們兩人。'),
  show('rin', 'center', 'smile'),
  say('rin', 'smile', '網站研究社的鑰匙，不用交回學生會了。恭喜你，{name}。'),
  say('me', undefined, '這六週多虧學姊嚴格把關，我才能學到這麼多。'),
  show('rin', 'center', 'blush'),
  say('rin', 'blush', '……其實我本來以為，沒有人願意認真讀懂那些規則。'),
  say('rin', 'blush', '但你不只讓網站被看見，也讓我看見……原來努力是可以分享的。'),
  say('rin', 'smile', '明天開始，社辦的貓咪部落格，能繼續請你當第一位讀者嗎？'),
  say('narr', undefined, '晚風吹拂她的紅色髮帶，那抹溫柔的笑容，早已超越了任何索引。'),
  hide('rin'),
  cg('none'),
])
