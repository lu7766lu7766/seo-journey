import { and, bg, bgm, effect, say, scene, scoreIs, topHeroine, when } from '@/engine'

export default scene('weekend-rest', [
  bgm('warm'),
  bg('home', 'day'),
  say('narr', undefined, '週末的早晨，窗簾縫裡漏進一道暖暖的光。'),
  say('me', undefined, '睡到自然醒、喝熱可可、什麼都不想。完美。'),
  effect({ stamina: 30, stress: -20 }),
  say('narr', undefined, '手機震了一下，有人傳來訊息。'),
  when(
    and(topHeroine('rin'), scoreIs('rin', 'gte', 40)),
    [say('narr', undefined, '凜：「別忘了補水。……我沒有在擔心你，只是例行提醒。」')],
    [
      when(
        and(topHeroine('hare'), scoreIs('hare', 'gte', 40)),
        [say('narr', undefined, '晴：「結論先說！今天天氣超好！下週一起加油！」')],
        [
          when(
            and(topHeroine('mirai'), scoreIs('mirai', 'gte', 40)),
            [say('narr', undefined, '未來：「已讀取你的作息。建議：再睡十分鐘。」')],
            [say('narr', undefined, '晴：「休息也是排程的一部分！結論先說，睡飽！」')],
          ),
        ],
      ),
    ],
  ),
  say('me', undefined, '（嘴角不自覺揚起。好，下週也要加油。）'),
])
