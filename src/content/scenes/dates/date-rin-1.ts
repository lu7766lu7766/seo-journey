import { bg, bgm, choice, hide, opt, say, scene, show } from '@/engine'

export default scene('date-rin-1', [
  bgm('daily'),
  bg('street', 'day'),
  say('narr', undefined, '週末的商店街，書店門口的風鈴叮的一聲。'),
  say('me', undefined, '（那個黑長直的背影……是凜學姊？）'),
  show('rin', 'center', 'think'),
  say('rin', 'think', '《寫給人看的文章》……作者的語氣，值得參考。'),
  say('me', undefined, '學姊也會逛書店啊。'),
  show('rin', 'center', 'surprised'),
  say('rin', 'surprised', '！{name}！這是……調查。對，市場調查。'),
  say('narr', undefined, '她把書往身後藏，封面卻露出了一隻貓咪貼紙。'),
  say('me', undefined, '（封面寫著「寫作風格指南」。她在偷偷練習？）'),
  say('rin', 'blush', '不准笑。我只是……想讓社團的文章更好懂。'),
  choice([
    opt('我陪妳挑吧，我也想學', { bond: { rin: 5 } }, [
      say('rin', 'smile', '……那就一起。規則是：先看目錄，再看內容。'),
      say('narr', undefined, '兩人並肩翻書，肩膀偶爾輕輕碰到，她沒有躲開。'),
    ]),
    opt('學姊也有不擅長的事呢', { bond: { rin: 2 } }, [
      say('rin', 'angry', '多嘴。……不過，你說得沒錯。'),
    ]),
  ]),
  say('rin', 'smile', '好的文章，是替讀的人省力氣。搜尋也是同樣道理。'),
  say('narr', undefined, '風鈴又響了。她把那本書買下，小心地抱在胸前。'),
  say('rin', 'blush', '今天的事，不要告訴晴。……謝謝你，{name}。'),
  hide('rin'),
])
