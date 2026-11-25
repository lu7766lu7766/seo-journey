import { bg, choice, hide, opt, say, scene, show } from '@/engine'

export default scene('date-hare-casual', [
  bg('street', 'day'),
  say('narr', undefined, '週末的商店街，晴舉著兩支冰棒朝你揮手。'),
  show('hare', 'center', 'happy'),
  say('hare', 'happy', '結論先說！這支請你，因為我多買了！'),
  say('me', undefined, '（理由很晴式。）'),
  say('hare', 'smile', '快選！牛奶口味，還是汽水口味？'),
  choice([
    opt('汽水！', { bond: { hare: 2 } }, [say('hare', 'happy', '好品味！我們冰棒同款！')]),
    opt('妳想吃哪個，我就吃另一個', { bond: { hare: 2 } }, [say('hare', 'blush', '……你這樣說，我反而不知道選哪個了。')]),
  ]),
  hide('hare'),
])
