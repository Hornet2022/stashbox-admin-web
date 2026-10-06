import { test, expect, canWrite } from './fixtures'

/**
 * 文章管理页 —— 列表 + 强制重试 Modal（不真提交，避免副作用）。
 */

test.describe('articles', () => {
  test('页面标题 + 工具栏 + 表格列', async ({ authedPage }) => {
    await authedPage.goto('/articles')
    await expect(authedPage.getByRole('heading', { name: '文章管理' })).toBeVisible()
    // 页副标题原来写的是「数据源：GET /api/v1/articles」——那是开发信息，
    // 不是运营语言。改成断言业务描述，顺带守住「不再暴露端点」这条。
    await expect(
      authedPage.getByText('剪藏入库的文章。可以对失败的任务重新蒸馏，或让已生成的音频失效重取。')
    ).toBeVisible()
    await expect(authedPage.getByText(/数据源：GET/)).toHaveCount(0)

    // 表头
    // 标签/质量分两列按数据显隐：整列为空时不渲染（见 constants.ts::visibleColumns），
    // 数据到了列自然回来。所以这里只断言无条件存在的那几列。
    for (const col of ['ID', '标题', '状态', '创建时间', '操作']) {
      await expect(authedPage.getByRole('columnheader', { name: col })).toBeVisible()
    }
  })

  test('权限允许时表格出现操作按钮', async ({ authedPage, role }) => {
    await authedPage.goto('/articles')
    if (!canWrite(role)) {
      // 操作列只能看，不能点 → 占位 —
      // 原来等的是表格里某个「—」占位符（死列的兜底）。那些列已经改成
      // 「整列为空就不渲染」，所以改成等一个真实存在的行内元素。
      await expect(authedPage.getByText('已就绪').or(authedPage.getByText('待蒸馏')).first()).toBeVisible()
      return
    }

    const retryBtn = authedPage.locator('button[aria-label^="强制重试文章"]').first()
    await retryBtn.waitFor({ state: 'visible', timeout: 10_000 })
    await expect(authedPage.locator('button[aria-label^="失效文章"]').first()).toBeVisible()
    await expect(authedPage.locator('button[aria-label^="删除文章"]').first()).toBeVisible()
  })

  test('点击强制重试 → 打开 Modal → 关闭', async ({ authedPage, role }) => {
    test.skip(!canWrite(role), `当前角色 ${role} 无操作权限，跳过`)

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
    test.skip(!canWrite(role), `当前角色 ${role} 无操作权限，跳过`)

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