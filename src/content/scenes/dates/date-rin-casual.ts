import { bg, choice, hide, opt, say, scene, show } from '@/engine'

export default scene('date-rin-casual', [
  bg('street', 'dusk'),
  say('narr', undefined, '傍晚的商店街，你和凜剛好在文具店碰上。'),
  show('rin', 'center', 'normal'),
  say('rin', 'normal', '巧合。我只是來買便利貼。'),
  say('me', undefined, '（她的籃子裡全是貓咪圖案。）'),
  say('rin', 'blush', '……看到了嗎。看到了就忘掉。'),
  choice([
    opt('很可愛，我不會說出去', { bond: { rin: 2 } }, [say('rin', 'smile', '……嗯。約好了。')]),
    opt('我都記起來了', { bond: { rin: 2 } }, [say('rin', 'angry', '那我現在就沒收你的鑰匙。')]),
  ]),
  hide('rin'),
])
