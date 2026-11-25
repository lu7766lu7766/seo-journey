import { bg, bgm, cg, hide, say, scene, show } from '@/engine'

export default scene('end-blackhat', [
  bgm('daily'),
  bg('council', 'dusk'),
  cg('end-blackhat'),
  say('narr', undefined, '結果公布當天，網站研究社的網址從搜尋引擎中徹底消失。'),
  show('rin', 'center', 'angry'),
  say('rin', 'angry', '這就是投機取巧的代價——人工處罰。'),
  show('kuro', 'left', 'shock'),
  say('kuro', 'shock', '連我的備用網域也被一起拔掉了……我錯了，真的對不起！'),
  say('rin', 'normal', '規則不是拿來鑽漏洞的。想把網站做好，沒有捷徑。'),
  say('sensei', 'sad', '先從刪除垃圾頁、送出重新審查申請開始吧，{name}。'),
  say('narr', undefined, '雖然失去了資格，但看著灰頭土臉的黑川，我們決定一起從零再來。'),
  hide('all'),
  cg('none'),
])
