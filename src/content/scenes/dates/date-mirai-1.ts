import { bg, bgm, choice, hide, opt, say, scene, show } from '@/engine'

export default scene('date-mirai-1', [
  bgm('warm'),
  bg('planetarium', 'night'),
  say('narr', undefined, '天文館的圓頂暗了下來，星星一顆顆浮現。'),
  show('mirai', 'center', 'normal'),
  say('mirai', 'normal', '已讀取。你比預約時間早到三分鐘。'),
  say('me', undefined, '（星形髮夾在黑暗裡，微微發著青光。）'),
  say('mirai', 'think', '根據我的資料，這是我第一次來天文館。'),
  say('narr', undefined, '她仰著頭，銀紫色的髮梢在座椅上散開。'),
  say('mirai', 'smile', '星座，就像知識圖譜。星與星之間，有連線。'),
  say('mirai', 'think', '單獨的光點沒有意義，被連起來，才有故事。'),
  choice([
    opt('網站也是，頁面之間要有連結', { bond: { mirai: 5 } }, [
      say('mirai', 'surprised', '……比喻成立。你的推論，已記錄。'),
    ]),
    opt('我只看到好多星星，好美', { bond: { mirai: 6 } }, [
      say('mirai', 'blush', '「好美」……這個詞，沒有標準答案。'),
      say('mirai', 'smile', '但我的資料庫裡，正在增加一筆。'),
    ]),
  ]),
  say('narr', undefined, '流星的投影劃過圓頂，她輕輕「啊」了一聲。'),
  say('mirai', 'happy', '剛才的反應，不在我的預測內。……很有趣。'),
  hide('mirai'),
])
