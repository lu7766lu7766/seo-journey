import { describe, expect, it } from 'vitest'
import { buildChecklistMarkdown, CHECKLIST, CHECKLIST_AREAS } from '@/content/checklist'
import { KNOWLEDGE_IDS, KNOWLEDGE_TITLES } from '@/content/knowledge'

describe('take-away checklist', () => {
  it('covers all 31 knowledge cards, no more, no less', () => {
    expect(KNOWLEDGE_IDS).toHaveLength(31)
    expect(Object.keys(CHECKLIST).sort()).toEqual([...KNOWLEDGE_IDS].sort())
  })

  it('every action is an imperative of at most 40 characters in a valid area', () => {
    for (const id of KNOWLEDGE_IDS) {
      const item = CHECKLIST[id]
      const len = [...item.action].length
      expect(len, `${id}: ${item.action}`).toBeGreaterThanOrEqual(10)
      expect(len, `${id}: ${item.action} (${len})`).toBeLessThanOrEqual(40)
      expect(CHECKLIST_AREAS, id).toContain(item.area)
    }
  })

  it('never promises rankings or citations (plan §3.6)', () => {
    for (const id of KNOWLEDGE_IDS) {
      expect(CHECKLIST[id].action, id).not.toMatch(/(?<!不)保證|一定(會)?(被引用|排第一|收錄)|搶到第一/)
    }
  })

  it('the example from the brief is verbatim', () => {
    expect(CHECKLIST.canonical.action).toBe('在重複內容的頁面加上 rel=canonical 指向主要網址')
  })

  it('markdown: learned cards grouped by area as checkboxes, missing cards listed by title', () => {
    const md = buildChecklistMarkdown(['canonical', 'sitemap', 'answer-first', 'geo-citations'], KNOWLEDGE_TITLES, { playerName: '搜一' })
    expect(md).toContain('## SEO')
    expect(md).toContain('## AEO')
    expect(md).toContain('## GEO')
    expect(md).not.toContain('## 通用')
    expect(md).toContain(`- [ ] ${CHECKLIST.canonical.action}`)
    expect(md).toContain(`- [ ] ${CHECKLIST['answer-first'].action}`)
    expect(md.indexOf('## SEO')).toBeLessThan(md.indexOf('## AEO'))
    expect(md.indexOf('## AEO')).toBeLessThan(md.indexOf('## GEO'))
    expect(md).toContain('## 還沒學到的項目')
    const missingSection = md.slice(md.indexOf('## 還沒學到的項目'))
    expect(missingSection).toContain(`- ${KNOWLEDGE_TITLES['robots-vs-noindex']}`)
    expect(missingSection).not.toContain(KNOWLEDGE_TITLES.canonical)
    expect((md.match(/- \[ \]/g) ?? []).length).toBe(4)
    expect(md).toContain('已學 4 / 31')
  })

  it('markdown: all cards learned -> no missing section; none learned -> only the missing list', () => {
    const all = buildChecklistMarkdown(KNOWLEDGE_IDS, KNOWLEDGE_TITLES)
    expect(all).not.toContain('還沒學到的項目')
    expect((all.match(/- \[ \]/g) ?? []).length).toBe(31)
    const none = buildChecklistMarkdown([], KNOWLEDGE_TITLES)
    expect(none).not.toContain('- [ ]')
    expect((none.match(/^- /gm) ?? []).length).toBe(31)
  })
})
