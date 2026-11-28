import { bg, bgm, choice, flag, hide, opt, say, scene, show, when } from '@/engine'

export default scene('date-hare-casual', [
  bgm('warm'),
  when(
    flag('dateCount.hare', 'gte', 3),
    [
      bg('street', 'day'),
      say('narr', undefined, '週末的商店街長椅，晴戴著一邊耳機朝我招手。'),
      show('hare', 'center', 'happy'),
      say('hare', 'happy', '結論先說：另一邊耳機是留給你的！一起聽我練的新開場白！'),
      choice([
        opt('好，我當第一個聽眾', { bond: { hare: 2 } }, [say('hare', 'blush', '嘿嘿，有你在旁邊，念起來特別順！')]),
        opt('今天也要十秒內講完重點喔', { bond: { hare: 2 } }, [say('hare', 'happy', '沒問題！三秒就夠了！')]),
      ]),
      hide('hare'),
    ],
    [
      bg('street', 'day'),
      say('narr', undefined, '週末的商店街，晴舉著兩支冰棒朝我揮手。'),
      show('hare', 'center', 'happy'),
      say('hare', 'happy', '結論先說！這支請你，因為我多買了！'),
      say('me', undefined, '（理由很晴式。）'),
      say('hare', 'smile', '快選！牛奶口味，還是汽水口味？'),
      choice([
        opt('汽水！', { bond: { hare: 2 } }, [say('hare', 'happy', '好品味！我們冰棒同款！')]),
        opt('妳想吃哪個，我就吃另一個', { bond: { hare: 2 } }, [say('hare', 'blush', '……你這樣說，我反而不知道選哪個了。')]),
      ]),
      hide('hare'),
    ],
  ),
])
