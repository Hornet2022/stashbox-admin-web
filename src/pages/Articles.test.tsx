import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/**
 * 文章管理页「新建文章」抽屉的三种录入方式 —— 2026-10-23。
 *
 * ## 这个用例在守什么
 *
 * 抽屉现在有三种互斥的录入方式（链接 / 上传文件 / 粘贴文本）。
 * 真正容易坏的**不是**渲染，而是**校验跟着模式走**：
 *
 * · 切到「上传文件」模式后提交 → 报的必须是「请选择一个文档文件」，
 *   而不是「URL 不能为空」（那是链接模式的判据）；
 * · 切到「粘贴文本」模式后提交 → 报「正文不能为空」；
 * · 链接模式的原有行为**不能变**（回归护栏）。
 *
 * 校验不跟模式走的后果很具体：运营选了文件、点了创建、看到「URL 不能为空」，
 * 会以为自己漏贴了链接 —— 然后在「上传文件」模式下**永远填不出这个 URL**。
 */

vi.mock('../api/admin', () => ({
  listArticles: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  // 分类候选（抽屉打开时拉一次）
  listTags: vi.fn().mockResolvedValue({
    items: [
      { id: 1, name: '科技', slug: 'tech' },
      { id: 2, name: '财经', slug: 'finance' },
    ],
    total: 2,
  }),
  createArticle: vi.fn().mockResolvedValue(undefined),
  createArticleFromDocument: vi.fn().mockResolvedValue(undefined),
  deleteAdminArticle: vi.fn(),
  forceRetryArticle: vi.fn(),
  invalidateAudio: vi.fn(),
  downloadCsv: vi.fn(),
}))

vi.mock('../hooks/useRole', () => ({
  useRole: () => 'admin',
  hasPermission: () => true,
  STAFF_ROLES: ['admin', 'operator'],
  useCanAnnotate: () => true,
}))

import { Articles } from './Articles'
import { createArticle, createArticleFromDocument } from '../api/admin'

const mockedCreateArticle = vi.mocked(createArticle)
const mockedCreateDocument = vi.mocked(createArticleFromDocument)

beforeEach(() => {
  vi.clearAllMocks()
})

async function openDrawer(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /新建文章|创建文章/ }))
  await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())
}

describe('新建文章抽屉 · 三种录入方式', () => {
  it('默认是链接模式，URL 为空时报「URL 不能为空」', async () => {
    const user = userEvent.setup()
    render(<Articles />)
    await openDrawer(user)

    await user.click(screen.getByRole('button', { name: '确认创建文章' }))
    expect(await screen.findByText('URL 不能为空')).toBeTruthy()
    expect(mockedCreateArticle).not.toHaveBeenCalled()
  })

  it('切到「上传文件」模式后，报的错是「请选择一个文档文件」', async () => {
    const user = userEvent.setup()
    render(<Articles />)
    await openDrawer(user)

    await user.click(screen.getByRole('tab', { name: '上传文件' }))
    await user.click(screen.getByRole('button', { name: '确认创建文章' }))

    expect(await screen.findByText('请选择一个文档文件')).toBeTruthy()
    // 关键：不能是链接模式的判据
    expect(screen.queryByText('URL 不能为空')).toBeNull()
    expect(mockedCreateDocument).not.toHaveBeenCalled()
  })

  it('切到「粘贴文本」模式后，报的错是「正文不能为空」', async () => {
    const user = userEvent.setup()
    render(<Articles />)
    await openDrawer(user)

    await user.click(screen.getByRole('tab', { name: '粘贴文本' }))
    await user.click(screen.getByRole('button', { name: '确认创建文章' }))

    expect(await screen.findByText('正文不能为空')).toBeTruthy()
    expect(mockedCreateDocument).not.toHaveBeenCalled()
  })

  it('上传文件模式选了文件 → 走 admin 文档端点，且**只发文件不发文本**', async () => {
    const user = userEvent.setup()
    render(<Articles />)
    await openDrawer(user)

    await user.click(screen.getByRole('tab', { name: '上传文件' }))
    const fileInput = screen.getByLabelText('选择文档文件') as HTMLInputElement
    const file = new File(['# 正文内容'], '运营文档.md', { type: 'text/markdown' })
    await user.upload(fileInput, file)

    await user.click(screen.getByRole('button', { name: '确认创建文章' }))

    await waitFor(() => expect(mockedCreateDocument).toHaveBeenCalledTimes(1))
    const [f, t] = mockedCreateDocument.mock.calls[0]
    expect(f).toBeTruthy()
    expect((f as File).name).toBe('运营文档.md')
    // 二选一：文本必须是 null（服务端也会这么判）
    expect(t).toBeNull()
    expect(mockedCreateArticle).not.toHaveBeenCalled()
  })

  it('粘贴文本模式 → 只发文本不发文件', async () => {
    const user = userEvent.setup()
    render(<Articles />)
    await openDrawer(user)

    await user.click(screen.getByRole('tab', { name: '粘贴文本' }))
    await user.type(screen.getByLabelText('粘贴正文'), '粘过来的正文')
    await user.click(screen.getByRole('button', { name: '确认创建文章' }))

    await waitFor(() => expect(mockedCreateDocument).toHaveBeenCalledTimes(1))
    const [f, t] = mockedCreateDocument.mock.calls[0]
    expect(f).toBeNull()
    expect(t).toBe('粘过来的正文')
  })


  it('选中分类后提交时把分类带上（运营指定优先于模型猜的）', async () => {
    const user = userEvent.setup()
    render(<Articles />)
    await openDrawer(user)

    // 分类选择器：点「科技」选中
    await user.click(await screen.findByRole('button', { name: '科技' }))
    expect(screen.getByRole('button', { name: '科技' }).getAttribute('aria-pressed')).toBe('true')

    await user.type(screen.getByPlaceholderText('https://...'), 'https://example.com/b')
    await user.click(screen.getByRole('button', { name: '确认创建文章' }))

    await waitFor(() => expect(mockedCreateArticle).toHaveBeenCalledTimes(1))
    expect(mockedCreateArticle.mock.calls[0][2]).toEqual(['科技'])
  })

  it('再次点击取消选中', async () => {
    const user = userEvent.setup()
    render(<Articles />)
    await openDrawer(user)

    const chip = await screen.findByRole('button', { name: '科技' })
    await user.click(chip)
    expect(chip.getAttribute('aria-pressed')).toBe('true')
    await user.click(chip)
    expect(chip.getAttribute('aria-pressed')).toBe('false')
  })

  it('链接模式仍然只发 URL（回归护栏）', async () => {
    const user = userEvent.setup()
    render(<Articles />)
    await openDrawer(user)

    await user.type(screen.getByPlaceholderText('https://...'), 'https://example.com/a')
    await user.click(screen.getByRole('button', { name: '确认创建文章' }))

    await waitFor(() => expect(mockedCreateArticle).toHaveBeenCalledTimes(1))
    expect(mockedCreateArticle.mock.calls[0][0]).toBe('https://example.com/a')
    expect(mockedCreateDocument).not.toHaveBeenCalled()
  })
})
