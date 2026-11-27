import { bg, bgm, card, choice, hide, minigame, opt, say, scene, show, when } from '@/engine'
import { bondIs } from '@/engine/cond'

export default scene('w1', [
  bgm('daily'),
  bg('clubroom', 'day'),
  say('narr', undefined, '第一週週一。老電腦的風扇呼呼轉，門外傳來三步、停頓、敲門兩下的腳步聲。'),
  show('rin', 'center', 'normal'),
  say('rin', 'normal', '例行檢查。……搜尋「青葉 網站研究社」，結果，零筆。'),
  say('me', undefined, '零筆？我們是網路上的透明人嗎？'),
  say('rin', 'think', '網站在線上，不等於搜尋引擎找得到，更不等於會被收錄。'),
  show('sensei', 'left', 'smile'),
  say('sensei', 'smile', 'robots.txt 是社辦門口的「謝絕參觀」牌子。'),
  say('sensei', 'normal', 'noindex 則是貼在書頁上的「請勿登記」貼紙。'),
  say('me', undefined, '一個管能不能進門，一個管進門後能不能登記？'),
  show('rin', 'center', 'smile'),
  say('rin', 'smile', '理解速度，合格。去找出我們網站上的那兩個問題。'),
  minigame('w1-robots', { stats: { tec: 4 }, bond: { rin: 1 } }, { stats: { tec: 1 } }),

  show('rin', 'center', 'think'),
  say('rin', 'think', '根目錄 Disallow: /，頁面還掛著 noindex。'),
  say('rin', 'normal', 'robots.txt 管能不能爬，noindex 管能不能收錄。'),
  say('rin', 'think', '被 robots.txt 擋住的頁面，爬蟲看不到它的 noindex。'),
  card('robots-vs-noindex'),
  say('sensei', 'normal', 'Sitemap 是給爬蟲的導覽圖。能幫助探索，但不保證收錄。'),
  card('sitemap'),

  show('hare', 'right', 'surprised'),
  say('hare', 'surprised', '打擾了！結論先說：我帶了炸雞排，還有，舊公告頁搬家了！'),
  show('rin', 'center', 'angry'),
  say('rin', 'angry', '夏川同學，社辦禁止飲食。……搬家，是什麼意思？'),
  show('hare', 'right', 'think'),
  say('hare', 'think', '舊網址點開是空的，新網址卻有兩份一模一樣的公告！'),
  say('sensei', 'smile', '舊門貼「本社永久搬遷」是 301；貼「午休，晚點回來」是 302。'),
  say('me', undefined, '搬家卻貼成午休，訪客會一直回來敲舊門。'),
  show('rin', 'center', 'normal'),
  say('rin', 'normal', '永久搬家用 301，暫時借道才用 302。'),
  card('redirects'),
  say('hare', 'think', '那兩份公告，就像同一張海報貼在兩面牆！哪份是正本？'),
  say('me', undefined, '在副本上寫「請以另一份為準」？'),
  say('rin', 'think', '那叫 canonical，標出代表網址。它是提示，不是命令。'),
  say('rin', 'normal', '重複內容未必受罰，但會讓搜尋引擎無從挑選。'),
  card('canonical'),
  card('duplicate-content'),
  hide('hare'),
  hide('sensei'),

  say('rin', 'normal', '三件事都急。{name}，這週你先做哪一件？'),
  choice([
    opt('先整理收錄清單：哪些頁該露面', { bond: { rin: 2 }, stats: { tec: 3 } }, [
      show('rin', 'center', 'smile'),
      say('rin', 'smile', '先打地基。穩當，我喜歡。'),
    ]),
    opt('先處理舊公告：轉址並指定正本', { bond: { hare: 2 }, stats: { str: 3 } }, [
      show('hare', 'right', 'happy'),
      say('hare', 'happy', '耶！我的炸雞排情報派上用場了！'),
    ]),
    opt('先提交 Sitemap，再開 Search Console', { bond: { rin: 1, hare: 1 }, stats: { tec: 2, str: 1 } }, [
      show('rin', 'center', 'normal'),
      say('rin', 'normal', '兩頭都顧到。……穩健派。'),
    ]),
  ]),
  hide('hare'),
  say('rin', 'normal', '之後每週用 Search Console，看收錄狀態。'),
  card('search-console'),
  when(
    bondIs('rin', 'gte', 6),
    [
      say('narr', undefined, '她轉身要走，貓咪鑰匙圈叮的一聲掉在地上。這次，她沒有急著藏。'),
      show('rin', 'center', 'blush'),
      say('rin', 'blush', '……長這樣。備品。你敢笑，就罰你抄規則三遍。'),
      say('rin', 'smile', '今天做得很好，{name}。明天，也這樣。'),
    ],
    [
      when(
        bondIs('rin', 'lt', 4),
        [
          show('rin', 'center', 'normal'),
          say('rin', 'normal', '本週進度，合格。下週同一時間，請準時。'),
        ],
        [
          say('narr', undefined, '她轉身要走，口袋裡的貓咪鑰匙圈叮的一聲掉在地上。'),
          say('rin', 'surprised', '那、那是學生會備品！'),
          say('me', undefined, '備品長這樣？'),
          show('rin', 'center', 'blush'),
          say('rin', 'blush', '……長這樣。總之，今天的你，做得不錯。'),
        ],
      ),
    ],
  ),
  hide('rin'),
])
