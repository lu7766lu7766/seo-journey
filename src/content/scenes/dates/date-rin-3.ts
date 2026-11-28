import { bg, bgm, cg, choice, hide, opt, say, scene, show } from '@/engine'

export default scene('date-rin-3', [
  bgm('theme_rin'),
  bg('street', 'night'),
  say('narr', undefined, '春季夜市的夜晚，紙燈籠沿著商店街一路亮起來。'),
  show('rin', 'center', 'blush'),
  say('rin', 'blush', '學生會巡場剛結束，我直接過來了。……制服，會不會很不合時宜？'),
  say('me', undefined, '（紅色髮箍，加上學生會臂章。連逛夜市都這麼嚴謹，我一時說不出話。）'),
  choice([
    opt('制服也好看，我差點看呆了', { bond: { rin: 8 } }, [
      say('rin', 'blush', '笨蛋。……說得這麼直接，我要怎麼回答。'),
    ]),
    opt('這樣的妳，一點都不奇怪', { bond: { rin: 5 } }, [
      say('rin', 'smile', '……謝謝。'),
    ]),
  ]),
  say('narr', undefined, '我們走過攤販，金魚的水面反射著燈光。'),
  say('rin', 'normal', '以前我只想著，把事情做到沒有錯。'),
  say('rin', 'smile', '現在更想把重要的東西，讓人看見。'),
  say('narr', undefined, '第一發煙火拉著長長的哨音，升上夜空。'),
  hide('rin'),
  bgm('warm'),
  cg('date-rin-3'),
  say('narr', undefined, '煙火在她的眼裡綻放，轟隆聲震動了胸口。'),
  say('rin', 'blush', '被看見……原來是這種感覺。'),
  say('rin', 'blush', '{name}，謝謝你，看見了我。'),
  say('narr', undefined, '她的手背輕輕碰到我的，沒有收回去。'),
  cg('none'),
])
