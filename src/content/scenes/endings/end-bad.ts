import { bg, bgm, cg, hide, say, scene, show } from '@/engine'

export default scene('end-bad', [
  bgm('warm'),
  bg('clubroom', 'night'),
  cg('end-bad'),
  say('narr', undefined, '分數還是差了一點。放學後的 404 社辦安靜地等著歸還鑰匙。'),
  show('sensei', 'center', 'sad'),
  say('sensei', 'sad', '抱歉啊，{name}。看來這回網站研究社沒辦法留下來了。'),
  say('me', undefined, '是我沒能好好兼顧排程跟文章內容……'),
  show('sensei', 'center', 'smile'),
  say('sensei', 'smile', '別灰心，搜尋本來就是長期累積。你學到的觀念不會消失喔！'),
  say('narr', undefined, '關上舊電腦前，我把學過的網站草稿備份進隨身碟——總有一天會再出發。'),
  hide('sensei'),
  cg('none'),
])
