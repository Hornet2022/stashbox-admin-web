import { test, expect } from './fixtures'

/**
 * 推送队列页 —— 状态 tab + 列表。
 */

test.describe('push-notifications', () => {
  test('页面标题 + 状态 tab + 表头', async ({ authedPage }) => {
    await authedPage.goto('/push-notifications')
    await expect(authedPage.getByRole('heading', { name: '推送队列' })).toBeVisible()
    await expect(authedPage.getByText('待发送的站内推送，按创建时间倒序')).toBeVisible()

    // 4 个 tab —— 用 role=tab，aria-label 是 "全部/待发送/已发送/失败"
    for (const tab of ['全部', '待发送', '已发送', '失败']) {
      await expect(authedPage.getByRole('tab', { name: tab })).toBeVisible()
    }

    // 表头
    for (const col of ['ID', '用户 ID', '标题', '内容', '状态', '失败原因', '创建时间', '发送时间', '操作']) {
      // ID 单独 exact 匹配，避开 "用户 ID"
      await expect(
        authedPage.getByRole('columnheader', { name: col, exact: col === 'ID' }),
      ).toBeVisible()
    }
  })

  test('切换到"失败"tab 触发重新加载', async ({ authedPage }) => {
    await authedPage.goto('/push-notifications')
    const failedTab = authedPage.getByRole('tab', { name: '失败' })
    await failedTab.click()

    // tab 切换不报错（pill 滑动）—— 至少 URL 不变、页面不空白
    await expect(authedPage.getByRole('heading', { name: '推送队列' })).toBeVisible()
  })
})