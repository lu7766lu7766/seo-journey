import { describe, expect, it } from 'vitest'
import { voiceText } from '@/audio/voiceText'

describe('配音用文字：去掉 {name} 並收乾淨標點', () => {
  it.each([
    ['{name}，謝謝你', '謝謝你'],
    ['謝謝你，{name}。', '謝謝你。'],
    ['謝謝你，{name}', '謝謝你'],
    ['做得很好，{name}。明天，也要加油。', '做得很好。明天，也要加油。'],
    ['結論先說：{name}，我喜歡你', '結論先說：我喜歡你'],
    ['好！{name}，來吧', '好！來吧'],
    ['！{name}！這是……調查。', '！這是……調查。'],
    ['那，{name}當我的第一位聽眾，好不好？', '那，當我的第一位聽眾，好不好？'],
    ['{name}……你怎麼在這？', '……你怎麼在這？'],
    ['{name}、{name}，早安', '早安'],
    ['抱歉啊，{name}。是我這個人太急。', '抱歉啊。是我這個人太急。'],
  ])('%s → %s', (input, expected) => {
    expect(voiceText(input)).toBe(expected)
  })

  it('沒有 {name} 的台詞原樣保留（含開頭的刪節號、結尾標點）', () => {
    expect(voiceText('……那就一起。規則是：先看目錄，再看內容。')).toBe('……那就一起。規則是：先看目錄，再看內容。')
    expect(voiceText('哈！用我的話來鼓勵我，犯規！')).toBe('哈！用我的話來鼓勵我，犯規！')
  })
})

describe('配音用文字：去掉括號內的舞台指示', () => {
  it.each([
    ['（小聲）謝謝你', '謝謝你'],
    ['(小聲)謝謝你', '謝謝你'],
    ['謝謝你（笑）。', '謝謝你。'],
    ['（嘆氣），好吧', '好吧'],
    ['（小聲）{name}，謝謝你', '謝謝你'],
    ['謝謝（小聲（笑））你', '謝謝你'],
    ['好（停頓）……（點頭）嗯', '好……嗯'],
  ])('%s → %s', (input, expected) => {
    expect(voiceText(input)).toBe(expected)
  })
})

describe('配音用文字：處理後為空或只剩標點 → 不配音（null）', () => {
  it.each(['{name}', '{name}！', '{name}。', '（小聲）', '(嘆氣)', '……', '！？', '，', '', '  ', '{name}，{name}', '（笑）{name}……'])('%j → null', (input) => {
    expect(voiceText(input)).toBeNull()
  })

  it('有文字（含英數字）就配音', () => {
    expect(voiceText('SEO')).toBe('SEO')
    expect(voiceText('{name}，404！')).toBe('404！')
  })
})
