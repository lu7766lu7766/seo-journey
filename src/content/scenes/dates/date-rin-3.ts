import { bg, bgm, cg, choice, hide, opt, say, scene, show } from '@/engine'

export default scene('date-rin-3', [
  bgm('warm'),
  bg('festival', 'night'),
  say('narr', undefined, '夏日祭的夜晚，紙燈籠一路亮到神社階梯。'),
  show('rin', 'center', 'blush'),
  say('rin', 'blush', '……浴衣，會不會很奇怪？'),
  say('me', undefined, '（紅色髮帶配上藍色浴衣。我一時說不出話。）'),
  choice([
    opt('很漂亮，我差點認不出來', { bond: { rin: 8 } }, [
      say('rin', 'blush', '笨蛋。……說得這麼直接，我要怎麼回答。'),
    ]),
    opt('很適合妳', { bond: { rin: 5 } }, [
      say('rin', 'smile', '……謝謝。'),
    ]),
  ]),
  say('narr', undefined, '他們走過攤販，金魚的水面反射著燈光。'),
  say('rin', 'normal', '以前我只想著，把事情做到沒有錯。'),
  say('rin', 'smile', '現在更想把重要的東西，讓人看見。'),
  say('narr', undefined, '第一發煙火拉著長長的哨音，升上夜空。'),
  hide('rin'),
  cg('date-rin-3'),
  say('narr', undefined, '花火在她的眼裡綻放，轟隆聲震動了胸口。'),
  say('rin', 'blush', '被看見……原來是這種感覺。'),
  say('rin', 'blush', '{name}，謝謝你，看見了我。'),
  say('narr', undefined, '她的手背輕輕碰到你的，沒有收回去。'),
  cg('none'),
])
