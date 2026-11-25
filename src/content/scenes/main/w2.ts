import { bg, bgm, card, choice, hide, minigame, opt, say, scene, show } from '@/engine'

export default scene('w2', [
  bgm('daily'),
  bg('broadcast', 'day'),
  say('narr', undefined, '第二週週一，晴把我拉進了廣播社的小錄音室。'),
  show('hare', 'center', 'sad'),
  say('hare', 'sad', '嗚嗚……我的「校園一問一答」節目被聽眾抱怨講太長了！'),
  say('me', undefined, '聽眾想知道什麼，結果妳聊到哪裡去了？'),
  say('hare', 'think', '人家想先講點前情提要嘛……結果重點放到最後才講。'),
  say('hare', 'normal', '老師說做網站跟廣播一樣，也要先懂讀者想找什麼！'),
  card('search-intent'),

  show('hare', 'center', 'happy'),
  say('hare', 'happy', '所以這週來幫社團首頁改寫標題和摘要吧！用倒金字塔法！'),
  minigame('w2-serp', { stats: { ans: 4, str: 2 }, bond: { hare: 2 } }, { stats: { ans: 1 } }),

  show('hare', 'center', 'smile'),
  say('hare', 'smile', '結論先說：把最核心的資訊放在最前面，後面再補細節！'),
  say('hare', 'normal', '標題與描述前段要放重點，避免太長被截斷；搜尋引擎有時也會自己改寫。'),
  card('title-and-meta'),
  card('answer-first'),

  show('hare', 'center', 'sad'),
  say('hare', 'sad', '那個……{name}，我是不是真的很吵啊？'),
  choice([
    opt('妳的熱情是優點，只是要先講結論', { bond: { hare: 6 } }, [
      show('hare', 'center', 'happy'),
      say('hare', 'happy', '真的嗎？！好，結論先說：謝謝你，我超開心的！'),
    ]),
    opt('對，有點吵', { bond: { hare: -2 } }, [
      show('hare', 'center', 'sad'),
      say('hare', 'sad', '唔……雖然有點刺耳，我會試著安靜一點的……'),
    ]),
    opt('我喜歡聽妳講話', { bond: { hare: 4 } }, [
      show('hare', 'center', 'blush'),
      say('hare', 'blush', '咦、咦咦？！突然講這種話太犯規了吧！！'),
    ]),
  ]),
  say('narr', undefined, '紅著臉的晴抓起耳機，笑著朝我比了個加油手勢。'),
  hide('hare'),
])
