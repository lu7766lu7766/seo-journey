import { bg, card, choice, effect, minigame, opt, say, scene, show, when, hide, bgm } from '@/engine'
import { flag } from '@/engine/cond'

export default scene('demo', [
  bgm('daily'),
  bg('gate', 'day'),
  say('narr', undefined, '櫻花飛舞的早晨。轉學第一天，{name}站在青葉學園的校門口。'),
  show('hare', 'center', 'surprised'),
  say('hare', 'surprised', '啊！你是轉學生？結論先說：我們同班！'),
  say('me', undefined, '（她邊跑邊練廣播稿……好有精神。）'),
  bg('clubroom', 'dusk'),
  show('rin', 'left', 'normal'),
  say('rin', 'normal', '六週。做不到就請把鑰匙交回學生會。'),
  choice([
    opt('一定會做到！', { bond: { rin: 2 } }, [say('rin', 'normal', '……口號誰都會喊。')]),
    opt('規則能讓我先看一下嗎？', { bond: { rin: 4 }, flags: { askedRules: true } }, [
      say('rin', 'surprised', '……！'),
      say('rin', 'blush', '規則，是為了讓好東西被看見。……跟我來。'),
      choice([
        opt('好的！', { stats: { tec: 2 } }),
        opt('（偷笑）', undefined, [say('rin', 'angry', '笑什麼。')]),
      ]),
    ]),
    opt('六週太短了吧……'),
  ]),
  when(flag('askedRules'), [say('narr', undefined, '凜對你的態度似乎有一點點軟化。')], [say('narr', undefined, '凜依舊面無表情。')]),
  effect({ stats: { con: 3 }, stamina: -5 }),
  card('what-is-seo-aeo-geo'),
  hide('rin'),
  say('sensei', undefined, '先來練習一下吧。'),
  minigame('demo-quiz', { stats: { tec: 2 } }, { stress: 3 }),
  say('narr', undefined, '（示範劇本結束。）'),
])
