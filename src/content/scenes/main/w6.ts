import { bg, bgm, card, choice, hide, opt, say, scene, show, when } from '@/engine'
import { flag } from '@/engine/cond'

export default scene('w6', [
  bgm('warm'),
  bg('clubroom', 'day', 'rain'),
  say('narr', undefined, '第六週週一，窗外下起滂沱大雨。搜尋引擎恰巧發布了核心更新。'),
  say('me', undefined, '什麼？！很多網站的排名突然劇烈波動了！'),
  show('sensei', 'center', 'normal'),
  say('sensei', 'normal', '冷靜！核心更新時別去追逐每次波動，專注在以人為本的有幫助內容。'),
  say('sensei', 'think', '展現真實經驗與專業，補齊作者頁與聯絡資訊——這就是 E-E-A-T。'),
  card('core-update'),
  card('helpful-content'),
  card('eeat'),
  card('author-pages'),
  hide('sensei'),

  when(flag('blackhat', 'gte', 1), [
    bg('clubroom', 'day', 'flash'),
    show('rin', 'center', 'angry'),
    say('rin', 'angry', '站長工具跳出「人工處罰」通知！之前的黑帽內容被抓到了！'),
    say('narr', undefined, '網站的曝光瞬間暴跌，內容力與信任力大幅倒扣……'),
    { k: 'effect', effects: { stats: { con: -20, tru: -10 } } },
    hide('rin'),
  ]),

  bg('gate', 'dusk', 'rain'),
  show('kuro', 'center', 'sad'),
  say('kuro', 'sad', '哈……我的網站全軍覆沒了。被人工處罰，整個從搜尋消失。'),
  when(flag('kuroPending'), [
    say('kuro', 'normal', '喂……最後問一次，我還有備用網域，你要不要跟我一起衝？'),
    choice([
      opt('好，趁最後賭一把', { inc: { blackhat: 1 }, stats: { con: -10, tru: -10 } }, [
        say('kuro', 'sad', '……你竟然還敢跟著我跳火坑啊。'),
      ]),
      opt('不要，我們一起堂堂正正重來吧', { bond: { rin: 1, hare: 1, mirai: 1 } }, [
        say('kuro', 'shock', '重來嗎……原來，流量並不是正義啊。'),
      ]),
    ]),
  ]),
  say('kuro', 'sad', '原來……一直騙演算法，最後被淘汰的是自己。'),
  hide('kuro'),

  bg('rain', 'dusk', 'rain'),
  say('narr', undefined, '離搜尋祭只剩最後幾天，雨聲敲打著屋簷。此刻我想去見誰？'),
  choice([
    opt('去學生會室找凜', { flags: { w6Choice: 1 }, bond: { rin: 8 } }, [
      bg('council', 'dusk', 'fade'),
      show('rin', 'center', 'think'),
      say('rin', 'think', '這麼大雨還跑來，淋濕了會感冒的。給，毛巾。'),
      show('rin', 'center', 'blush'),
      say('rin', 'blush', '不管下週結果如何，你這六週遵循規則的努力，我看見了。'),
      say('rin', 'smile', '……加油。我在評審席等你的簡報。'),
    ]),
    opt('去廣播室找晴', { flags: { w6Choice: 2 }, bond: { hare: 8 } }, [
      bg('broadcast', 'dusk', 'fade'),
      show('hare', 'center', 'normal'),
      say('hare', 'normal', '哇，你濕答答的！結論先說：喝這杯熱可可！'),
      show('hare', 'center', 'blush'),
      say('hare', 'blush', '雨天雖然有點讓人緊張，但想到我們一起練到現在，我就不怕了！'),
      say('hare', 'happy', '搜尋祭那天，用一句話讓全場聽見我們吧！'),
    ]),
    opt('去天台找未來', { flags: { w6Choice: 3 }, bond: { mirai: 8 } }, [
      bg('rooftop', 'dusk', 'rain'),
      show('mirai', 'center', 'normal'),
      say('mirai', 'normal', '雨聲的頻率，讓人平靜。你也是來吹風的嗎？'),
      show('mirai', 'center', 'smile'),
      say('mirai', 'smile', '根據我的紀錄，這六週和你一起修正每個頁面的時間，無可取代。'),
      say('mirai', 'blush', '搜尋祭，我會用自己的意志好好評分。'),
    ]),
  ]),
  hide('all'),
])
