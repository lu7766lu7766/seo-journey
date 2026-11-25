import { bg, bgm, choice, hide, opt, say, scene, show } from '@/engine'

export default scene('date-hare-1', [
  bgm('daily'),
  bg('street', 'day'),
  say('narr', undefined, '週末的商店街，炸物的香味和叫賣聲混在一起。'),
  show('hare', 'center', 'happy'),
  say('hare', 'happy', '{name}！結論先說：今天要吃遍整條街！'),
  say('me', undefined, '（耳機掛在脖子上，領結也歪著。她果然是這樣。）'),
  say('hare', 'think', '我要練習一句話介紹美食。聽好了。'),
  say('hare', 'normal', '這個可樂餅，外面酥、裡面燙，三十元。'),
  say('hare', 'surprised', '……啊，太燙了，講完就燙到舌頭！'),
  say('narr', undefined, '她吐著舌頭，用手猛搧風，你忍不住笑了出來。'),
  say('hare', 'blush', '笑什麼啦！你也來試試看！'),
  choice([
    opt('這個，是今天吃過最好吃的', { bond: { hare: 4 } }, [
      say('hare', 'happy', '太籠統了！但是……我喜歡這種直球！'),
    ]),
    opt('外酥內軟，咬下去有焦糖洋蔥甜味', { bond: { hare: 6 } }, [
      say('hare', 'surprised', '！具體又有畫面！{name}，你是天才！'),
      say('hare', 'happy', '就是這樣。有細節的答案，別人才記得住。'),
    ]),
  ]),
  say('narr', undefined, '夕陽落在她的瀏海，小馬尾隨著笑聲一晃一晃。'),
  say('hare', 'smile', '跟你說話，我就不會一直說個不停。……大概啦。'),
  hide('hare'),
])
