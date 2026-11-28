import { bg, bgm, card, choice, hide, minigame, opt, say, scene, show, when } from '@/engine'
import { bondIs } from '@/engine/cond'

export default scene('w2', [
  bgm('daily'),
  bg('broadcast', 'day'),
  say('narr', undefined, '第二週週一。隔音棉吃掉所有雜音，只剩 ON AIR 的紅燈安靜地亮著。'),
  show('hare', 'center', 'sad'),
  say('hare', 'sad', '嗚嗚……「校園一問一答」又被投訴了！說我講太長！'),
  say('hare', 'think', '聽眾問「炸雞排為什麼賣完」，我先聊了天氣、便當……'),
  show('hare', 'center', 'blush'),
  say('hare', 'blush', '在第三分鐘。……我知道，這不叫廣播，叫散步。'),
  show('sensei', 'left', 'smile'),
  say('sensei', 'smile', '想像你去買珍珠奶茶，店員先聊三分鐘天氣，才告訴你「半糖少冰好了」。'),
  say('me', undefined, '我會當場走掉。'),
  hide('sensei'),
  show('hare', 'center', 'happy'),
  say('hare', 'happy', '所以要先說需求！聽的人想找什麼，就是搜尋意圖！'),
  card('search-intent'),
  say('hare', 'normal', '標題跟描述也要前段放重點、別塞誇大詞，太長尾端會被截斷！'),
  minigame('w2-serp', { stats: { ans: 4, str: 2 }, bond: { hare: 1 } }, { stats: { ans: 1 } }),

  show('hare', 'center', 'smile'),
  show('sensei', 'left', 'normal'),
  say('sensei', 'normal', '不過沒有固定的「正確字數」，搜尋引擎有時也會自己改寫。'),
  hide('sensei'),
  card('title-and-meta'),
  say('hare', 'think', '試播一次！今日一問：炸雞排為什麼賣完？'),
  say('hare', 'normal', '答：週三限量一百份，十二點前售完。以上，十秒。'),
  show('hare', 'center', 'surprised'),
  say('hare', 'surprised', '我自己都嚇到！……答案先給，細節後補，原來這麼爽！'),
  card('answer-first'),
  say('hare', 'think', '節目單也要改！別叫「午間閒談」，叫「炸雞排為什麼賣完？」'),
  say('me', undefined, '聽眾一看標題，就知道這一集在回答什麼。'),
  say('hare', 'normal', '小標寫成讀者會問的問題，答案放在下面第一句！'),
  card('question-headings'),

  say('narr', undefined, '夕陽把耳機線染成金色，晴忽然安靜下來，捏著領結的一角。'),
  show('hare', 'center', 'sad'),
  say('hare', 'sad', '我想當能用一句話打動聽眾的主播……但我是不是總是很吵？'),
  choice([
    opt('熱情是優點，只是要先講結論', { bond: { hare: 2 }, stats: { ans: 1 } }, [
      show('hare', 'center', 'happy'),
      say('hare', 'happy', '真的嗎？！好，結論先說：謝謝你，我超開心的！'),
    ]),
    opt('我喜歡聽妳講話，不用改太多', { bond: { hare: 2 } }, [
      show('hare', 'center', 'blush'),
      say('hare', 'blush', '咦、咦咦？！突然講這種話太犯規了吧！！'),
    ]),
    opt('那我們每天練一句話，一起改', { bond: { hare: 1 }, stats: { ans: 2 } }, [
      show('hare', 'center', 'smile'),
      say('hare', 'smile', '每天一句……好！有社長監督，我不敢偷懶！'),
    ]),
  ]),
  when(
    bondIs('hare', 'gte', 6),
    [
      say('narr', undefined, '她戴上耳機，又摘了下來，在門口回過頭。'),
      show('hare', 'center', 'blush'),
      say('hare', 'blush', '今天的結論是：和你聊天，十分鐘根本不夠用。'),
    ],
    [
      when(
        bondIs('hare', 'lt', 5),
        [
          show('hare', 'center', 'normal'),
          say('hare', 'normal', '謝謝你的建議，社長！我會努力的！'),
        ],
        [say('narr', undefined, '她抓起耳機戴上，朝我比了個加油手勢，紅燈映在她的臉頰上。')],
      ),
    ],
  ),
  hide('hare'),
])
