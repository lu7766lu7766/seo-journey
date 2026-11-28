import { bg, bgm, card, choice, hide, opt, say, scene, sfx, show } from '@/engine'

export default scene('prologue', [
  bgm('daily'),
  bg('gate', 'day'),
  say('narr', undefined, '四月，風把櫻花瓣一把一把灑進青葉學園的紅磚校門。'),
  sfx('choice'),
  bg('gate', 'day', 'flash'),
  show('hare', 'center', 'surprised'),
  say('hare', 'surprised', '讓一讓讓一讓——！結論先說：我煞不住！'),
  say('narr', undefined, '橘色旋風擦過肩膀，廣播稿像白鴿飛滿天。我撿起一張：「今日午餐，結論先說：咖哩。」'),
  show('hare', 'center', 'happy'),
  say('hare', 'happy', '啊，你是轉學生？結論先說：我們同班！我是夏川晴！'),
  say('me', undefined, '結論真的很先。我是{name}，請多指教。（低調計畫，三十秒破功。）'),
  hide('hare'),

  bg('classroom', 'day', 'fade'),
  say('narr', undefined, '晨會鐘響，教室的廣播喇叭沙地一聲，傳來冷靜清晰的女聲。'),
  say('rin', 'normal', '我是學生會長白鷺凜。依整併令，六週後的「搜尋祭」將評 SEO、AEO、GEO。'),
  show('hare', 'right', 'think'),
  say('hare', 'think', '順帶一提，AEO 評審就是我喔！大家加油～'),
  hide('hare'),

  bg('clubroom', 'day', 'fade'),
  say('narr', undefined, '午休，索老師像拎小貓一樣把我拎到走廊盡頭，門牌上寫著：404。'),
  show('sensei', 'center', 'smile'),
  say('sensei', 'smile', '歡迎來到網站研究社。我是顧問索千尋，咖啡續杯中，請見諒。'),
  say('sensei', 'normal', '其他社員？都畢業了。所以你現在是社長兼唯一社員，恭喜升官。'),
  say('sensei', 'think', '網站像一本書。SEO，是進圖書館目錄、被找得到；AEO，是讓館員翻到那頁，當場回答。'),
  say('me', undefined, '那 GEO 呢？'),
  say('sensei', 'smile', '學姊寫報告時，願意把你的書列進參考資料。當然，沒人能保證。'),
  card('what-is-seo-aeo-geo'),

  show('sensei', 'left', 'normal'),
  show('rin', 'right', 'normal'),
  say('rin', 'normal', '確認新社員名單。……只有一人。六週後沒達標，請交回鑰匙。'),
  choice([
    opt('一定會做到！', { bond: { rin: 1 } }, [
      say('rin', 'normal', '很有精神。但搜尋引擎看的是成果，不是口號。'),
    ]),
    opt('規則能讓我先看一下嗎？', { bond: { rin: 2 }, flags: { askedRules: true } }, [
      show('rin', 'right', 'surprised'),
      say('rin', 'surprised', '……你第一個問的是規則？'),
      show('rin', 'right', 'smile'),
      say('rin', 'smile', '規則，是為了讓好東西被看見。……期待你的表現。'),
    ]),
    opt('六週太短了吧……', {}, [
      say('rin', 'angry', '嫌短的話，現在放棄也行。'),
    ]),
  ]),
  hide('all'),

  bg('corridor', 'dusk', 'fade'),
  show('mirai', 'center', 'normal'),
  say('mirai', 'normal', '……已讀取。星野未來，搜尋祭的特邀評審。'),
  say('mirai', 'think', '你的社團網站，目前在網路上並不存在。'),
  say('narr', undefined, '她擦肩而過，星形髮夾閃了一下青色的光，人已經不見了。'),
  hide('mirai'),

  bg('clubroom', 'dusk', 'fade'),
  show('sensei', 'center', 'smile'),
  say('sensei', 'smile', '規則：平日排程養網站，放學接委託，週末約人出門。體力要顧好。'),
  hide('sensei'),
])
