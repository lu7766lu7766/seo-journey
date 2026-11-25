import { bg, bgm, cg, hide, say, scene, show } from '@/engine'

export default scene('end-true', [
  bgm('festival'),
  bg('festival', 'day'),
  cg('end-true'),
  say('narr', undefined, '評分牌亮起全場最高分，煙火在青葉學園的天空綻放！'),
  show('rin', 'left', 'happy'),
  show('hare', 'center', 'happy'),
  show('mirai', 'right', 'happy'),
  say('rin', 'happy', '網站研究社正式保留！SEO、AEO、GEO 三項全數高分通過！'),
  say('hare', 'happy', '結論先說：{name} 是最棒的社長！我們社團變成傳說啦！'),
  say('mirai', 'happy', '三位評審一致認可的網站。……也成了我們四個人的起點。'),
  say('me', undefined, '多虧了大家一起修改每一個標題、每一份資料。'),
  say('narr', undefined, '夕陽下，門牌寫著「404」的社辦，今天擠滿了笑聲與新報名的同學。'),
  hide('all'),
  cg('none'),
])
