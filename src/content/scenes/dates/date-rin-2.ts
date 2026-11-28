import { bg, bgm, choice, hide, opt, say, scene, show } from '@/engine'

export default scene('date-rin-2', [
  bgm('theme_rin'),
  bg('council', 'dusk'),
  say('narr', undefined, '週末加班的學生會室，夕陽把文件堆染成橘色。'),
  show('rin', 'center', 'normal'),
  say('rin', 'normal', '你來得正好。公告要在明天前全部更新。'),
  say('me', undefined, '（桌上的文件，比我的身高還高……）'),
  say('narr', undefined, '筆尖沙沙作響。她寫完一張，又拉過下一張。'),
  say('me', undefined, '學姊，妳是不是一個人扛太多了？'),
  show('rin', 'center', 'sad'),
  say('rin', 'sad', '會長不能出錯。一個錯字，大家就不再相信公告。'),
  say('narr', undefined, '她的肩膀微微發抖，馬克杯裡的茶早就涼了。'),
  choice([
    opt('妳不用逞強，休息一下吧', { bond: { rin: 3 } }, [
      say('rin', 'normal', '……我知道。但工作不會自己消失。'),
    ]),
    opt('我來幫妳整理，妳先喝口熱茶', { bond: { rin: 7 } }, [
      say('rin', 'surprised', '……你泡的？'),
      say('rin', 'smile', '有點太濃。但是，很暖。'),
      say('narr', undefined, '她第一次在人前，放下了手中的筆。'),
    ]),
  ]),
  say('me', undefined, '我們把公告分成急件與一般件，一起排好順序。'),
  say('rin', 'happy', '先分類，再處理。你的想法，跟我很像。'),
  say('narr', undefined, '窗外的天色暗了。最後一份公告貼上時，她輕輕靠向椅背。'),
  say('rin', 'blush', '……有人在旁邊，原來這麼輕鬆。'),
  hide('rin'),
])
