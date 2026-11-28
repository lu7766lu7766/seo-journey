import { bg, bgm, choice, flag, hide, opt, say, scene, show, when } from '@/engine'

export default scene('date-mirai-casual', [
  bgm('theme_mirai'),
  when(
    flag('dateCount.mirai', 'gte', 3),
    [
      bg('library', 'day'),
      say('narr', undefined, '週末的圖書館靠窗位，未來在筆記本上畫著手繪星圖。'),
      show('mirai', 'center', 'smile'),
      say('mirai', 'smile', '今天沒帶電腦。……想試試看，用自己的手寫下來。'),
      choice([
        opt('手寫的字很有未來自己的風格', { bond: { mirai: 2 } }, [say('mirai', 'blush', '……謝謝。我想保留這頁，當作原稿。')]),
        opt('這顆星星畫得特別大耶', { bond: { mirai: 2 } }, [say('mirai', 'blush', '那個……是代表你的位置。')]),
      ]),
      hide('mirai'),
    ],
    [
      bg('library', 'day'),
      say('narr', undefined, '週末的圖書館，我在書架間碰見了未來。'),
      show('mirai', 'center', 'normal'),
      say('mirai', 'normal', '已讀取。你出現的機率，今天特別高。'),
      say('me', undefined, '（她手上抱著三本書，標題都是「貓」。）'),
      say('mirai', 'blush', '這是……研究。與使用者行為相關。'),
      choice([
        opt('那我陪妳一起研究', { bond: { mirai: 2 } }, [say('mirai', 'smile', '同意。研究員，增加一名。')]),
        opt('妳也喜歡貓啊', { bond: { mirai: 2 } }, [say('mirai', 'surprised', '「也」？……資料庫更新中。')]),
      ]),
      hide('mirai'),
    ],
  ),
])
