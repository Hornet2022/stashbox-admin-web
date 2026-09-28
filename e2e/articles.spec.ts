import { test, expect } from './fixtures'

/**
 * 文章管理页 —— 列表 + 强制重试 Modal（不真提交，避免副作用）。
 */

test.describe('articles', () => {
  test('页面标题 + 工具栏 + 表格列', async ({ authedPage }) => {
    await authedPage.goto('/articles')
    await expect(authedPage.getByRole('heading', { name: '文章管理' })).toBeVisible()
    await expect(authedPage.getByText('数据源：GET /api/v1/articles')).toBeVisible()

    // 表头
    for (const col of ['ID', '标题', '状态', '标签', '质量分', '创建时间', '操作']) {
      await expect(authedPage.getByRole('columnheader', { name: col })).toBeVisible()
    }
  })

  test('权限允许时表格出现操作按钮', async ({ authedPage, role }) => {
    await authedPage.goto('/articles')
    if (role !== 'super_admin' && role !== 'operator') {
      // 操作列只能看，不能点 → 占位 —
      await expect(authedPage.locator('text=—').first()).toBeVisible()
      return
    }

    const retryBtn = authedPage.locator('button[aria-label^="强制重试文章"]').first()
    await retryBtn.waitFor({ state: 'visible', timeout: 10_000 })
    await expect(authedPage.locator('button[aria-label^="失效文章"]').first()).toBeVisible()
    await expect(authedPage.locator('button[aria-label^="删除文章"]').first()).toBeVisible()
  })

  test('点击强制重试 → 打开 Modal → 关闭', async ({ authedPage, role }) => {
    test.skip(role !== 'super_admin' && role !== 'operator', '当前角色无操作权限，跳过')

    await authedPage.goto('/articles')
    const retryBtn = authedPage.locator('button[aria-label^="强制重试文章"]').first()
    await retryBtn.waitFor({ state: 'visible', timeout: 10_000 })

    await retryBtn.click()
    await expect(authedPage.getByRole('heading', { name: /强制重试/ })).toBeVisible()
    await expect(authedPage.getByLabel('操作原因')).toBeVisible()

    // 取消按钮关闭（aria-label 是 "取消操作"）
    await authedPage.getByRole('button', { name: '取消操作' }).click()
    await expect(authedPage.getByRole('heading', { name: /强制重试/ })).not.toBeVisible()
  })

  test('打开新建文章抽屉', async ({ authedPage, role }) => {
    test.skip(role !== 'super_admin' && role !== 'operator', '当前角色无操作权限，跳过')

    await authedPage.goto('/articles')
    // 新建文章按钮（具体文案去 ArticlesToolbar 确认）
    const newBtn = authedPage.getByRole('button', { name: /新建|创建/ }).first()
    await newBtn.waitFor({ state: 'visible', timeout: 10_000 })
    await newBtn.click()

    // URL 出现 input 后立即关闭
    const urlInput = authedPage.locator('input[name="url"], input[placeholder*="http"]').first()
    await urlInput.waitFor({ state: 'visible', timeout: 5_000 })
    await expect(urlInput).toBeVisible()

    // Esc / 点击遮罩关闭
    await authedPage.keyboard.press('Escape')
  })
})