import { bg, bgm, choice, hide, opt, say, scene, show } from '@/engine'

export default scene('date-hare-2', [
  bgm('theme_hare'),
  bg('broadcast', 'dusk'),
  say('narr', undefined, '廣播室的練習，一晃就到了天黑。'),
  show('hare', 'center', 'normal'),
  say('hare', 'normal', '各位同學晚安。我是……夏川晴。啊，重來。'),
  say('narr', undefined, '她對著麥克風試了第五次，耳機線被揪得皺皺的。'),
  say('me', undefined, '（燈光映在她的睫毛上，這個畫面我想記起來。）'),
  show('hare', 'center', 'sad'),
  say('hare', 'sad', '其實我……想當真正的主播。'),
  say('hare', 'sad', '可是我話太多，總講不出重點。'),
  say('narr', undefined, '窗外的蟲鳴，一陣一陣填進沉默的空檔。'),
  choice([
    opt('先講結論，再補細節，妳教我的', { bond: { hare: 5 } }, [
      say('hare', 'happy', '哈！用我的話來鼓勵我，犯規！'),
    ]),
    opt('妳的聲音，讓人想繼續聽下去', { bond: { hare: 8 } }, [
      say('hare', 'surprised', '……真的？'),
      say('hare', 'blush', '別、別突然講這麼溫柔的話啦！'),
    ]),
  ]),
  say('hare', 'smile', '那，{name}當我的第一位聽眾，好不好？'),
  bgm('warm'),
  say('narr', undefined, '她按下錄音鍵，對著我，輕輕地開口。'),
  say('hare', 'blush', '今晚的節目，只播給你一個人聽。'),
  hide('hare'),
])
