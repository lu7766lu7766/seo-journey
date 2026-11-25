import { bg, choice, hide, opt, say, scene, show } from '@/engine'

export default scene('date-mirai-casual', [
  bg('library', 'day'),
  say('narr', undefined, '週末的圖書館，你在書架間碰見了未來。'),
  show('mirai', 'center', 'normal'),
  say('mirai', 'normal', '已讀取。你出現的機率，今天特別高。'),
  say('me', undefined, '（她手上抱著三本書，標題都是「貓」。）'),
  say('mirai', 'blush', '這是……研究。與使用者行為相關。'),
  choice([
    opt('那我陪妳一起研究', { bond: { mirai: 2 } }, [say('mirai', 'smile', '同意。研究員，增加一名。')]),
    opt('妳也喜歡貓啊', { bond: { mirai: 2 } }, [say('mirai', 'surprised', '「也」？……資料庫更新中。')]),
  ]),
  hide('mirai'),
])
