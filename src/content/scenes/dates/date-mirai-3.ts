import { bg, bgm, cg, choice, hide, opt, say, scene, show } from '@/engine'

export default scene('date-mirai-3', [
  bgm('warm'),
  bg('rooftop', 'night'),
  say('narr', undefined, '夜裡的天台，風很涼，城市燈火在腳下閃爍。'),
  show('mirai', 'center', 'normal'),
  say('mirai', 'normal', '今天沒有資料可以引用。我自己說。'),
  say('narr', undefined, '她拉了拉過大的外套袖口，髮夾亮了一下。'),
  say('mirai', 'sad', '我一直怕，自己只是別人內容的複製品。'),
  say('mirai', 'think', '但那天，你說我寫的東西有溫度。'),
  choice([
    opt('妳不是複製品，妳是妳', { bond: { mirai: 9 } }, [
      say('mirai', 'blush', '……這句話，沒有任何來源。只屬於你。'),
    ]),
    opt('我會一直引用妳', { bond: { mirai: 10 } }, [
      say('mirai', 'surprised', '！這是……標準的告白格式嗎？'),
      say('mirai', 'blush', '不，不對。這不是格式，是心意。'),
    ]),
  ]),
  hide('mirai'),
  cg('date-mirai-3'),
  say('narr', undefined, '星空下，她轉過身，髮夾像一顆小小的星。'),
  say('mirai', 'blush', '我想成為被引用的來源，而不是被複製的內容。'),
  say('mirai', 'happy', '而第一個引用我的人，是你。謝謝，{name}。'),
  say('narr', undefined, '她的手指，輕輕勾住你的袖口。'),
  cg('none'),
])
