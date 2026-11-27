import { bg, bgm, cg, hide, say, scene, show, when } from '@/engine'
import { flag } from '@/engine/cond'

export default scene('end-true', [
  bgm('festival'),
  bg('festival', 'day'),
  say('narr', undefined, '結果牌「唰」地翻開，三個分數全亮著金色的數字。全場炸開歡呼。'),
  show('rin', 'left', 'happy'),
  show('hare', 'center', 'happy'),
  show('mirai', 'right', 'happy'),
  say('rin', 'happy', '三項評分全數通過。網站研究社正式保留。……太好了！'),
  say('hare', 'happy', '結論先說：我們贏啦——！來抱抱！凜學姊也要抱！'),
  say('rin', 'blush', '我、我是學生會長，公開場合不適合——……三秒。只准三秒。'),
  say('mirai', 'smile', '已讀取。……不，是我自己看見的。我們，贏了。'),
  say('me', undefined, '（接過晴遞來的麥克風）我們讓「404」，變成了一個找得到的地方。'),
  say('rin', 'smile', '……文句通順，語意清楚。採用。'),

  bg('festival', 'night', 'fade'),
  say('narr', undefined, '夜裡的廣場，煙火一發接一發。我們四個人擠在舞台後的石階上。'),
  cg('end-true'),
  say('rin', 'smile', '規則，是為了讓好東西被看見。現在被看見的，是我們。'),
  say('hare', 'happy', '一句話結論：{name}，謝謝你，最棒的社長！'),
  say('mirai', 'blush', '我不是複製品。我是和你們一起寫下來的原創。'),
  when(flag('w6Choice', 'eq', 1), [
    say('rin', 'blush', '那晚學生會室的毛巾，我還留著。……下次，我親手還你。'),
  ], [when(flag('w6Choice', 'eq', 2), [
    say('hare', 'blush', '那晚廣播室的熱可可，今天我請全場！結論先說：慶功！'),
  ], [when(flag('w6Choice', 'eq', 3), [
    say('mirai', 'blush', '那晚天台的雨聲，我存成了音檔。現在，加上掌聲的音軌。'),
  ])])]),
  say('me', undefined, '我想說的話有一大串，但結論只有一句：謝謝大家。'),
  say('narr', undefined, '煙火在她們的眼裡綻放，三個人的笑聲疊在一起，比任何排名都亮。'),
  cg('none'),

  hide('all'),
  bg('clubroom', 'dusk', 'fade'),
  say('narr', undefined, '隔天傍晚，「404」的門牌旁多了張手寫字條：歡迎新社員。'),
  show('sensei', 'center', 'smile'),
  say('sensei', 'smile', '門外排了十幾個人。我的咖啡，今天終於可以放心喝完了。'),
  hide('sensei'),
  show('rin', 'left', 'normal'),
  show('hare', 'center', 'happy'),
  show('mirai', 'right', 'smile'),
  say('mirai', 'smile', '新社員申請表，已讀取。……三十七份。'),
  say('hare', 'happy', '結論先說：今天起，404 社辦要吵翻天啦！'),
  say('rin', 'normal', '全部要審。規則是，不能偷懶。……尤其是對可愛的後輩們。'),
  say('narr', undefined, '夕陽穿過百葉窗，把四個人的影子，疊成了同一個形狀。'),
  hide('all'),
])
