import { bg, bgm, card, choice, hide, minigame, opt, say, scene, show } from '@/engine'

export default scene('w4', [
  bgm('daily'),
  bg('corridor', 'day'),
  say('narr', undefined, '第四週週一，校慶宣傳將近，社團網站卻在手機上卡到動彈不得。'),
  show('rin', 'left', 'think'),
  show('hare', 'right', 'surprised'),
  say('hare', 'surprised', '圖片還沒載完，按鈕又突然跳走，我按到別的地方了啦！'),
  say('rin', 'normal', 'Google 早已採用行動版優先索引，手機體驗不好會連帶受影響。'),
  say('rin', 'think', '看看 Core Web Vitals 三大指標：LCP、INP 與 CLS 吧。'),
  minigame('w4-cwv', { stats: { tec: 4 }, bond: { rin: 2, hare: 2 } }, { stats: { tec: 1 } }),
  card('core-web-vitals'),
  card('mobile-first'),
  hide('all'),

  bg('gate', 'dusk', 'fade'),
  say('narr', undefined, '傍晚整理完圖片尺寸準備離校時，一個戴著黑色棒球帽的男生攔住我。'),
  show('kuro', 'center', 'smug'),
  say('kuro', 'smug', '喂，青葉的小弟！我是鄰校流量學院的黑川翔。'),
  say('kuro', 'smug', '辛苦寫什麼原創？我這有「萬能流量包」：一千條外連配五百頁 AI 文！'),
  say('kuro', 'normal', '流量就是正義！要試試看嗎？馬上幫你衝上去喔！'),
  show('rin', 'left', 'angry'),
  say('rin', 'angry', '{name}，別理他！'),
  choice([
    opt('聽起來不錯……讓我試試', { inc: { blackhat: 1 }, stats: { con: 15 }, bond: { rin: -3, hare: -3, mirai: -3 } }, [
      say('kuro', 'smug', '哈哈，識貨！等著看數據暴漲吧！'),
      say('rin', 'sad', '……你竟然選擇走捷徑。'),
    ]),
    opt('那是違反垃圾內容政策的，我拒絕', { bond: { rin: 3, hare: 3, mirai: 3 } }, [
      show('kuro', 'center', 'shock'),
      say('kuro', 'shock', '切，死腦筋！別後悔啊！'),
      show('rin', 'left', 'smile'),
      say('rin', 'smile', '說得好。真正的網站靠的是價值，不是作弊。'),
    ]),
    opt('讓我考慮一下', { flags: { kuroPending: true } }, [
      say('kuro', 'smug', '行，過兩週我再來問你。想通了隨時找我。'),
    ]),
  ]),
  card('spam-policies'),
  hide('all'),
])
