import { bg, bgm, choice, flag, hide, opt, say, scene, show, when } from '@/engine'

export default scene('date-rin-casual', [
  bgm('warm'),
  when(
    flag('dateCount.rin', 'gte', 3),
    [
      bg('street', 'dusk'),
      say('narr', undefined, '傍晚的商店街，凜提著剛出爐的菠蘿麵包站在書報攤前。'),
      show('rin', 'center', 'smile'),
      say('rin', 'smile', '……不是巧合。我想你這時間大概在附近，多買了一個。'),
      choice([
        opt('謝謝學姊，剛好肚子餓了', { bond: { rin: 2 } }, [say('rin', 'blush', '趁熱吃。……下次不用說謝謝也沒關係。')]),
        opt('學姊挑的肯定好吃', { bond: { rin: 2 } }, [say('rin', 'smile', '那是當然，排了十分鐘。')]),
      ]),
      hide('rin'),
    ],
    [
      bg('street', 'dusk'),
      say('narr', undefined, '傍晚的商店街，我和凜剛好在文具店碰上。'),
      show('rin', 'center', 'normal'),
      say('rin', 'normal', '巧合。我只是來買便利貼。'),
      say('me', undefined, '（她的籃子裡全是貓咪圖案。）'),
      say('rin', 'blush', '……看到了嗎。看到了就忘掉。'),
      choice([
        opt('很可愛，我不會說出去', { bond: { rin: 2 } }, [say('rin', 'smile', '……嗯。約好了。')]),
        opt('我都記起來了', { bond: { rin: 2 } }, [say('rin', 'angry', '那我現在就沒收你的鑰匙。')]),
      ]),
      hide('rin'),
    ],
  ),
])
