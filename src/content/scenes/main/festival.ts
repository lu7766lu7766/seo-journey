import { bg, bgm, hide, say, scene, sfx, show, when } from '@/engine'
import { and, scoreIs } from '@/engine/cond'

export default scene('festival', [
  bgm('festival'),
  bg('festival', 'day'),
  say('narr', undefined, '六週的努力迎來終點。青葉學園「搜尋祭」盛大開幕！'),
  say('narr', undefined, '各社團的攤位前人聲鼎沸，燈籠在廣場上方輕輕搖晃。'),
  show('sensei', 'center', 'smile'),
  say('sensei', 'smile', '輪到網站研究社了，{name}。深呼吸，照你準備的去講吧！'),
  hide('sensei'),

  sfx('choice'),
  say('narr', undefined, '我站上木質舞台，打開「404 號社辦」全新整理的網站簡報。'),
  say('me', undefined, '各位評審好，這是我們用原創內容與清楚結構重新打造的社團網站！'),

  // 凜 (SEO) 講評
  show('rin', 'center', 'normal'),
  when(scoreIs('rin', 'gte', 65), [
    show('rin', 'center', 'smile'),
    say('rin', 'smile', 'SEO 評審白鷺凜講評：爬取順暢、速度優秀、結構嚴謹。'),
    say('rin', 'blush', '……好東西，確實被看見了。滿分的表現。'),
  ]),
  when(and(scoreIs('rin', 'gte', 40), scoreIs('rin', 'lt', 65)), [
    say('rin', 'think', 'SEO 評審白鷺凜講評：基本索引與標題規範皆已達標，尚有進步空間。'),
  ]),
  when(scoreIs('rin', 'lt', 40), [
    show('rin', 'center', 'angry'),
    say('rin', 'angry', 'SEO 評審白鷺凜講評：基礎技術與規則尚未紮穩，仍需大幅補強。'),
  ]),
  hide('rin'),

  // 晴 (AEO) 講評
  show('hare', 'center', 'normal'),
  when(scoreIs('hare', 'gte', 65), [
    show('hare', 'center', 'happy'),
    say('hare', 'happy', 'AEO 評審夏川晴講評：結論先說——超級清楚！一眼就能直接唸出答案！'),
  ]),
  when(and(scoreIs('hare', 'gte', 40), scoreIs('hare', 'lt', 65)), [
    say('hare', 'smile', 'AEO 評審夏川晴講評：不少段落有抓到重點，若問題標題更明確會更棒！'),
  ]),
  when(scoreIs('hare', 'lt', 40), [
    show('hare', 'center', 'sad'),
    say('hare', 'sad', 'AEO 評審夏川晴講評：讀者要找的結論藏太深了，我們再多練習吧！'),
  ]),
  hide('hare'),

  // 未來 (GEO) 講評
  show('mirai', 'center', 'normal'),
  when(scoreIs('mirai', 'gte', 65), [
    show('mirai', 'center', 'happy'),
    say('mirai', 'happy', 'GEO 評審星野未來講評：具原創資料、來源可信、實體明確。最值得引用的對象。'),
  ]),
  when(and(scoreIs('mirai', 'gte', 40), scoreIs('mirai', 'lt', 65)), [
    say('mirai', 'think', 'GEO 評審星野未來講評：可信度合格，若能再多一點第一手觀察會更亮眼。'),
  ]),
  when(scoreIs('mirai', 'lt', 40), [
    show('mirai', 'center', 'sad'),
    say('mirai', 'sad', 'GEO 評審星野未來講評：作者資訊與原創依據不足，尚難以被生成式搜尋引用。'),
  ]),
  hide('mirai'),

  say('narr', undefined, '三位評審低頭寫下最終分數，舞台的燈光聚向結果公布牌——'),
])
