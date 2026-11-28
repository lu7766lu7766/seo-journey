import { bg, bgm, cg, choice, hide, opt, say, scene, show } from '@/engine'

export default scene('date-hare-3', [
  bgm('theme_hare'),
  bg('beach', 'dusk'),
  say('narr', undefined, '海風帶著鹹味，浪一層一層捲上沙灘。'),
  show('hare', 'center', 'happy'),
  say('hare', 'happy', '看！夕陽像一顆蛋黃！'),
  say('me', undefined, '（她赤腳踩著浪花，裙襬被風吹得鼓鼓的。）'),
  say('narr', undefined, '她忽然安靜下來，只剩浪聲。'),
  say('hare', 'normal', '我平常話很多，但有一句，一直講不出口。'),
  say('hare', 'think', '想了很久，決定用一句話就好。'),
  choice([
    opt('我在聽，慢慢說', { bond: { hare: 9 } }, [
      say('hare', 'smile', '……嗯。你總是會等我。'),
    ]),
    opt('結論先說吧！', { bond: { hare: 6 } }, [
      say('hare', 'surprised', '被反將一軍！好，我說了！'),
    ]),
  ]),
  hide('hare'),
  bgm('warm'),
  cg('date-hare-3'),
  say('narr', undefined, '她站在金色的浪裡，把耳機輕輕戴到我的耳朵上。'),
  say('hare', 'blush', '結論先說。我想說的是……我……'),
  say('hare', 'blush', '不行！稿子明明背好了，一看到你全忘了！'),
  say('hare', 'smile', '結論先欠著。細節……可以用接下來的每一天，慢慢補。'),
  say('narr', undefined, '耳機裡傳來她的心跳聲，比浪還快。'),
  cg('none'),
])
