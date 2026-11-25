import { bg, bgm, card, choice, hide, minigame, opt, say, scene, show } from '@/engine'

export default scene('w1', [
  bgm('daily'),
  bg('clubroom', 'day'),
  say('narr', undefined, '第一週週一，社團電腦剛開機，門就被輕輕敲響。'),
  show('rin', 'center', 'normal'),
  say('rin', 'think', '……奇怪。搜尋「青葉 網站研究社」，一筆結果都沒有。'),
  say('me', undefined, '明明伺服器已經啟動了，為什麼搜尋不到？'),
  say('rin', 'normal', '網站放在網路上，不等於搜尋引擎就能爬到、更不等於會收錄。'),
  say('rin', 'normal', '去檢查 robots.txt 和網頁的 HTML 標頭吧。'),
  minigame('w1-robots', { stats: { tec: 4 }, bond: { rin: 2 } }, { stats: { tec: 1 } }),

  show('rin', 'center', 'think'),
  say('rin', 'think', '找到了嗎？網站根目錄寫了 Disallow: /，還掛了 noindex。'),
  say('me', undefined, '這兩者差別在哪裡？'),
  say('rin', 'normal', 'robots.txt 管「能不能爬」，就像門口掛著請勿進入。'),
  say('rin', 'normal', '但想確保不被收錄，得靠 noindex，而且不能被 robots 擋住。'),
  say('rin', 'think', '要是爬蟲進不來，根本看不到裡面的 noindex 指示。'),
  card('robots-vs-noindex'),

  say('sensei', 'smile', '別忘了把公開頁面列成 Sitemap，送進 Search Console 檢查狀態喔！'),
  card('sitemap'),
  card('search-console'),

  say('rin', 'normal', '問題清楚了。你打算怎麼設定收錄清單？'),
  choice([
    opt('全部打開就好！', {}, [
      show('rin', 'center', 'angry'),
      say('rin', 'angry', '太草率了。測試頁跟私人檔案也要公開嗎？'),
    ]),
    opt('先列出哪些頁該被收錄', { bond: { rin: 5 }, stats: { tec: 3 } }, [
      show('rin', 'center', 'smile'),
      say('rin', 'smile', '判斷正確。該露面的整理好，不該露面的妥善隔離。'),
    ]),
  ]),
  say('narr', undefined, '我依照清單修改完設定並提交 Sitemap，終於鬆了一口氣。'),
  show('rin', 'center', 'blush'),
  say('rin', 'blush', '……做得不錯。下週我會再來確認索引狀況。'),
  hide('rin'),
])
