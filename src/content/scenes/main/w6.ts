import { bg, bgm, card, choice, effect, hide, minigame, opt, say, scene, sfx, show, when } from '@/engine'
import { bondIs, flag, or, seen } from '@/engine/cond'

export default scene('w6', [
  bgm('tense'),
  bg('clubroom', 'day', 'rain'),
  say('narr', undefined, '第六週週一。雨聲大得蓋過了電腦風扇，螢幕上的排名曲線像雲霄飛車。'),
  sfx('shock'),
  bg('clubroom', 'day', 'flash'),
  bg('clubroom', 'day', 'rain'),
  say('me', undefined, '排名猛然下墜、彈起、再下墜……我們是被丟進洗衣機了嗎？！'),
  show('rin', 'left', 'normal'),
  show('hare', 'center', 'surprised'),
  show('mirai', 'right', 'normal'),
  say('rin', 'normal', '冷靜。步驟一，確認網站沒壞。步驟二，看官方公告。步驟三，先別亂改。'),
  say('hare', 'surprised', '完蛋了完蛋了！是標題太吵？還是重複內容被罰了？！'),
  say('rin', 'normal', '夏川同學。'),
  show('hare', 'center', 'think'),
  say('hare', 'think', '……呼。結論先說：我們慌了，但網站還沒壞。'),
  say('rin', 'think', '重複內容多半是整理問題，不是處罰。用 301、canonical 收斂。'),
  card('duplicate-content'),
  say('mirai', 'think', '已讀取公告。此次為全面性的核心更新，並非針對單一網站。'),
  say('mirai', 'sad', '數據只能告訴我這些。……還有，我有點不安。這個，沒有資料。'),
  hide('hare'),
  show('sensei', 'center', 'normal'),
  say('sensei', 'smile', '都到齊了。別急著把標題全改一遍。排名像天氣，網站的品質才是氣候。'),
  say('sensei', 'normal', '官方的建議很樸素：專注做有幫助、以人為本的內容。'),
  card('core-update'),
  say('sensei', 'think', '所謂有幫助，先問自己：這是誰寫的？他真的做過這件事嗎？'),
  card('helpful-content'),
  say('rin', 'think', 'E-E-A-T 是經驗、專業、權威、信任，不是單一排名分數。最後一個，最重要。'),
  card('eeat'),
  say('rin', 'smile', '作者頁的格式，我來整理。'),
  hide('sensei'),
  show('hare', 'center', 'happy'),
  say('hare', 'happy', '作者簡介我來寫！三十字，結論先說！'),
  say('mirai', 'smile', '我負責核對，名字與頁面資料要一致。'),
  card('author-pages'),
  minigame('w6-update', { stats: { tru: 4 } }, { stats: { tru: 1 } }),
  hide('all'),

  when(flag('blackhat', 'gte', 1), [
    bg('clubroom', 'day', 'flash'),
    bg('clubroom', 'day', 'rain'),
    show('rin', 'center', 'angry'),
    say('rin', 'angry', '等等，Search Console 有「人工處罰」通知。……這不是天氣，是我們種的因。'),
    effect({ stats: { con: -25, tec: -10, tru: -15 }, bond: { rin: -2, hare: -2, mirai: -2 } }),
    hide('rin'),
  ]),

  bgm('melancholy'),
  bg('gate', 'dusk', 'rain'),
  show('kuro', 'center', 'sad'),
  say('kuro', 'sad', '哈……我的網站全軍覆沒。人工處罰，整個從搜尋消失。'),
  when(or(flag('kuroPending'), flag('blackhat', 'gte', 1)), [
    say('kuro', 'normal', '最後問一次，我還有備用網域，要不要一起衝？'),
    choice([
      opt('不要，我們一起堂堂正正重來吧', { bond: { rin: 1, hare: 1, mirai: 1 } }, [
        say('kuro', 'shock', '重來嗎……原來，流量並不是正義啊。'),
        say('kuro', 'sad', '一直騙演算法，最後被淘汰的，是自己。'),
      ]),
      opt('好，趁最後賭一把', { inc: { blackhat: 1 }, stats: { con: -10, tru: -10 } }, [
        say('kuro', 'smug', '哈哈，夠種！……不過，為什麼我的手一直在抖？'),
      ]),
    ]),
  ], [
    when(seen('sq-x1'), [
      say('me', undefined, '你在商店街給我的那張傳單，還貼在社辦牆上。'),
    ], [
      say('me', undefined, '先停手吧。真正的讀者，還在等你寫給人看的內容。'),
    ]),
    say('kuro', 'sad', '一直騙演算法，最後被淘汰的，是自己。'),
  ]),
  hide('kuro'),

  bg('rain', 'night', 'rain'),
  say('narr', undefined, '夜裡的雨還沒停。離搜尋祭只剩幾天，我撐著傘，想去見一個人。'),
  choice([
    opt('去學生會室找凜', { flags: { w6Choice: 1 }, bond: { rin: 5 } }, [
      bg('council', 'night', 'fade'),
      bgm('warm'),
      say('narr', undefined, '學生會室的燈還亮著，凜獨自對著堆成小山的文件。'),
      show('rin', 'center', 'think'),
      say('rin', 'think', '這麼大的雨還跑來。……給，毛巾。淋濕會感冒。'),
      show('rin', 'center', 'blush'),
      say('rin', 'blush', '規則不能保證結果。但這六週，你每一步都照規則走，我都看見了。'),
      say('me', undefined, '學姊也會怕嗎？'),
      when(
        flag('askedRules'),
        [say('rin', 'blush', '其實我也會怕。……所以才需要一個會問「規則能先看一下嗎」的人。')],
        [say('rin', 'blush', '其實我也會怕。……所以才需要一個陪我把規則走到最後的人。')],
      ),
      say('narr', undefined, '她把毛巾輕輕蓋在我頭上，指尖停了一秒，又縮了回去。'),
      when(
        bondIs('rin', 'gte', 28),
        [
          say('rin', 'blush', '剛剛那個，不是在確認毛巾的材質。……是想多碰你一秒。'),
          say('rin', 'smile', '搜尋祭那天，我在評審席等你的簡報。'),
        ],
        [
          say('rin', 'surprised', '剛、剛剛只是在確認毛巾的材質！不准說出去！'),
          say('rin', 'smile', '搜尋祭那天，我在評審席等你的簡報。'),
        ],
      ),
    ]),
    opt('去廣播室找晴', { flags: { w6Choice: 2 }, bond: { hare: 5 } }, [
      bg('broadcast', 'night', 'fade'),
      bgm('warm'),
      say('narr', undefined, '廣播室只亮著 ON AIR 的紅燈，晴抱著膝蓋坐在調音台前。'),
      show('hare', 'center', 'normal'),
      say('hare', 'normal', '哇，你濕答答的！結論先說：快喝這杯熱可可，別感冒了！'),
      show('hare', 'center', 'blush'),
      say('hare', 'blush', '我剛剛超怕的。排名一掉，就覺得之前講的全都白講了。'),
      say('narr', undefined, '她把可可塞進我手心，杯子燙燙的，她的指尖卻有點涼。'),
      say('me', undefined, '手這麼涼，妳在發抖嗎？'),
      say('hare', 'surprised', '才沒有！是……麥克風的後座力！'),
      when(
        bondIs('hare', 'gte', 28),
        [
          say('hare', 'blush', '騙你的。……是因為你來了。所以，我現在不抖了。'),
          say('hare', 'happy', '結論先說：搜尋祭那天，我要用一句話讓全場聽見我們！'),
        ],
        [
          say('hare', 'smile', '可是我想起來，這六週你每次都把我的話聽完。'),
          say('hare', 'happy', '所以結論先說：搜尋祭那天，我要用一句話讓全場聽見我們！'),
        ],
      ),
    ]),
    opt('去天台找未來', { flags: { w6Choice: 3 }, bond: { mirai: 5 } }, [
      bg('rooftop', 'night', 'rain'),
      bgm('warm'),
      say('narr', undefined, '天台上沒有別人，只有雨聲，和她髮夾上微微發亮的一點青色。'),
      show('mirai', 'center', 'normal'),
      say('mirai', 'normal', '雨聲的頻率，讓人平靜。你也是來吹風的嗎？還是……來找我？'),
      show('mirai', 'center', 'smile'),
      say('narr', undefined, '雨滴打在透明傘面上，每一滴，都有不同的音高。'),
      say('mirai', 'smile', '根據我的紀錄，這六週你好多次選了比較慢、但真實的做法。'),
      say('me', undefined, '因為，我想讓妳讀到的，是真的我。'),
      show('mirai', 'center', 'blush'),
      say('mirai', 'blush', '資料庫沒教過我這種感覺。……我想把它存成：原創，只屬於我。'),
      when(
        bondIs('mirai', 'gte', 28),
        [
          say('mirai', 'happy', '搜尋祭，我會用自己的意志評分。……還有，傘，可以靠近一點。'),
        ],
        [
          say('mirai', 'happy', '搜尋祭，我會用自己的意志評分。……你的未來，我也想參與。'),
        ],
      ),
    ]),
  ]),
  hide('all'),
])
