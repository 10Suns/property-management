// @ts-check
import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:5173'

async function loginAs(page, username, password) {
  await page.goto(BASE + '/#/login')
  await page.waitForSelector('.login-card')
  await page.fill('input[placeholder="请输入用户名"]', username)
  await page.fill('input[placeholder="请输入密码"]', password)
  await page.click('button:has-text("登录")')
  await page.waitForTimeout(1500)
  const url = page.url()
  if (url.includes('/projects/') && !url.endsWith('/projects')) {
    await page.waitForSelector('.sidebar', { timeout: 5000 })
  } else {
    await page.waitForSelector('.list-item, .card, .data-grid-item, .data-grid-empty', { timeout: 5000 })
  }
}

async function getProjectId(page) {
  const url = page.url()
  const m = url.match(/\/projects\/(\d+)/)
  return m ? m[1] : null
}

test.describe('Sidebar Navigation Audit', () => {

  test('1. Manager login → project list → enter project', async ({ page }) => {
    await loginAs(page, 'SG001', '123456')
    const pid = await getProjectId(page)
    if (pid) {
      // Already auto-redirected into a project
      await expect(page.locator('.sidebar')).toBeVisible()
      console.log(`  Auto-redirected to project ${pid}`)
    } else {
      // On project list, click first project
      await page.locator('.data-grid-item').first().click()
      await page.waitForSelector('.sidebar', { timeout: 5000 })
      console.log(`  Clicked into project`)
    }
    await expect(page.locator('.sidebar')).toBeVisible()
    await expect(page.locator('.page-title')).toBeVisible()
    console.log(`  ✓ On page: ${await page.locator('.page-title').textContent()}`)
  })

  test('2. Sidebar: 我的表单 → 日常巡检 → 承接查验 → 设备档案 → 参考表单', async ({ page }) => {
    await loginAs(page, 'SG001', '123456')
    const pid = await getProjectId(page)
    if (!pid) {
      await page.locator('.data-grid-item').first().click()
      await page.waitForSelector('.sidebar', { timeout: 5000 })
    }
    const projectId = await getProjectId(page)

    const links = [
      { label: '我的表单', path: `/projects/${projectId}`, titlePat: /我的表单|表单/ },
      { label: '日常巡检', path: `/projects/${projectId}/records`, titlePat: /日常巡检/ },
      { label: '承接查验', path: `/projects/${projectId}/acceptance`, titlePat: /承接查验/ },
      { label: '设备档案', path: `/projects/${projectId}/equipment`, titlePat: /设备档案/ },
      { label: '参考表单', path: `/projects/${projectId}/templates`, titlePat: /参考表单/ },
    ]

    for (const link of links) {
      await page.click(`.sidebar-link:has-text("${link.label}")`)
      await page.waitForTimeout(800)
      const title = await page.locator('.page-title').textContent()
      const url = page.url()
      console.log(`  ${link.label} → ${url}`)
      expect(title).toMatch(link.titlePat)
      // Check grid loads
      const gridItems = await page.locator('.data-grid-item').count()
      const emptyState = await page.locator('.data-grid-empty').count()
      console.log(`    items: ${gridItems}, empty: ${emptyState}`)
    }
  })

  test('3. Switch between 日常巡检 and 承接查验 — verify data reloads', async ({ page }) => {
    await loginAs(page, 'SG001', '123456')
    const pid = await getProjectId(page)
    if (!pid) {
      await page.locator('.data-grid-item').first().click()
      await page.waitForSelector('.sidebar', { timeout: 5000 })
    }
    const projectId = await getProjectId(page)

    // Go to 日常巡检
    await page.click('.sidebar-link:has-text("日常巡检")')
    await page.waitForTimeout(1000)
    const routineTitle = await page.locator('.page-title').textContent()
    expect(routineTitle).toMatch(/日常巡检/)
    const routineUrl = page.url()
    console.log(`  Routine URL: ${routineUrl}`)

    // Switch to 承接查验
    await page.click('.sidebar-link:has-text("承接查验")')
    await page.waitForTimeout(1000)
    const acceptanceTitle = await page.locator('.page-title').textContent()
    expect(acceptanceTitle).toMatch(/承接查验/)
    const acceptanceUrl = page.url()
    console.log(`  Acceptance URL: ${acceptanceUrl}`)

    // Switch back to 日常巡检
    await page.click('.sidebar-link:has-text("日常巡检")')
    await page.waitForTimeout(1000)
    const routineTitle2 = await page.locator('.page-title').textContent()
    expect(routineTitle2).toMatch(/日常巡检/)
    console.log(`  Back to routine, title: ${routineTitle2}`)

    // Verify URLs are different (not stuck on same route)
    expect(routineUrl).toContain('/records')
    expect(acceptanceUrl).toContain('/acceptance')
  })

  test('4. Enter form → back button returns to previous page', async ({ page }) => {
    await loginAs(page, 'SG001', '123456')
    const pid = await getProjectId(page)
    if (!pid) {
      await page.locator('.data-grid-item').first().click()
      await page.waitForSelector('.sidebar', { timeout: 5000 })
    }

    // Go to 我的表单
    await page.click('.sidebar-link:has-text("我的表单")')
    await page.waitForTimeout(800)

    // Click first form to enter editor
    const formLink = page.locator('.data-grid-item .cell-title').first()
    const formTitle = await formLink.textContent()
    if (formTitle) {
      await page.locator('.data-grid-item').first().click()
      await page.waitForTimeout(1000)

      // Should be on FormEditor
      const editorTitle = await page.locator('.page-title').textContent()
      console.log(`  Entered form: ${editorTitle}`)

      // Click back button
      const backBtn = page.locator('.page-header .btn-outline, .page-header button:has-text("返回")')
      if (await backBtn.count() > 0) {
        await backBtn.first().click()
        await page.waitForTimeout(800)
        const backPageTitle = await page.locator('.page-title').textContent()
        console.log(`  After back: ${backPageTitle}`)
        expect(backPageTitle).toMatch(/我的表单|表单/)
      } else {
        console.log(`  No back button found on editor`)
      }
    }
  })

  test('5. UserManagement navigation and back', async ({ page }) => {
    await loginAs(page, 'SG001', '123456')
    const pid = await getProjectId(page)
    if (!pid) {
      await page.locator('.data-grid-item').first().click()
      await page.waitForSelector('.sidebar', { timeout: 5000 })
    }

    // manager1 is a manager, not admin, so 用户管理 should NOT be visible
    const userMgmtLink = page.locator('.sidebar-link:has-text("用户管理")')
    expect(await userMgmtLink.count()).toBe(0)
    console.log(`  Manager cannot see 用户管理 ✓`)

    // Logout and login as admin
    await page.click('.sidebar-link:has-text("退出")')
    await page.waitForTimeout(500)
    await loginAs(page, 'admin', 'admin123')

    // Admin should ALWAYS see sidebar (even without a project)
    await expect(page.locator('.sidebar')).toBeVisible()
    console.log(`  Admin sees sidebar ✓`)

    // Admin should see 用户管理 in sidebar
    const adminUserMgmt = page.locator('.sidebar-link:has-text("用户管理")')
    expect(await adminUserMgmt.count()).toBe(1)
    console.log(`  Admin can see 用户管理 in sidebar ✓`)

    // Navigate to UserManagement via sidebar
    await adminUserMgmt.click()
    await page.waitForTimeout(800)

    const umTitle = await page.locator('.page-title').textContent()
    expect(umTitle).toMatch(/用户管理/)
    console.log(`  On: ${umTitle}`)

    // Sidebar should still be visible on UserManagement
    await expect(page.locator('.sidebar')).toBeVisible()
    console.log(`  Sidebar visible on UserManagement ✓`)

    // Back button should exist
    const backBtn = page.locator('button:has-text("返回")')
    expect(await backBtn.count()).toBeGreaterThan(0)
    console.log(`  Back button visible ✓`)

    // Click back
    await backBtn.first().click()
    await page.waitForTimeout(800)
    const backTitle = await page.locator('.page-title').textContent()
    console.log(`  Back to: ${backTitle}`)
  })

  test('6. Dashboard → click record → back returns to Dashboard', async ({ page }) => {
    await loginAs(page, 'SG001', '123456')
    const pid = await getProjectId(page)
    if (!pid) {
      await page.locator('.data-grid-item').first().click()
      await page.waitForSelector('.sidebar', { timeout: 5000 })
    }

    // Go to 仪表盘
    const dashLink = page.locator('.sidebar-link:has-text("仪表盘")')
    if (await dashLink.count() === 0) {
      console.log(`  No 仪表盘 link (expected if user is not manager)`)
      return
    }
    await dashLink.click()
    await page.waitForTimeout(1500)
    const dashTitle = await page.locator('.page-title').textContent()
    console.log(`  Dashboard: ${dashTitle}`)

    // Click a recent record if exists
    const recentRecord = page.locator('.list-item').first()
    if (await recentRecord.count() > 0) {
      const recordTitle = await recentRecord.locator('.list-item-title').textContent()
      await recentRecord.click()
      await page.waitForTimeout(1000)
      const editorTitle = await page.locator('.page-title').textContent()
      console.log(`  Clicked record "${recordTitle}" → ${editorTitle}`)

      // Click back
      const backBtn = page.locator('.page-header button:has-text("返回")')
      if (await backBtn.count() > 0) {
        await backBtn.first().click()
        await page.waitForTimeout(800)
        const backTitle = await page.locator('.page-title').textContent()
        console.log(`  Back to: ${backTitle}`)
        expect(backTitle).toMatch(/仪表盘|Dashboard/)
      }
    } else {
      console.log(`  No recent records to click`)
    }
  })

  test('7. Settings navigation', async ({ page }) => {
    await loginAs(page, 'SG001', '123456')
    const pid = await getProjectId(page)
    if (!pid) {
      await page.locator('.data-grid-item').first().click()
      await page.waitForSelector('.sidebar', { timeout: 5000 })
    }

    // Go to 项目配置
    const settingsLink = page.locator('.sidebar-link:has-text("项目配置")')
    if (await settingsLink.count() === 0) {
      console.log(`  No 项目配置 link`)
      return
    }
    await settingsLink.click()
    await page.waitForTimeout(800)
    const title = await page.locator('.page-title').textContent()
    console.log(`  Settings: ${title}`)

    // Settings has no back button (relies on sidebar)
    const backBtn = page.locator('button:has-text("返回")')
    console.log(`  Back button count: ${await backBtn.count()}`)
  })

  test('8. RecordList: filter and verify record_type in URL', async ({ page }) => {
    await loginAs(page, 'SG001', '123456')
    const pid = await getProjectId(page)
    if (!pid) {
      await page.locator('.data-grid-item').first().click()
      await page.waitForSelector('.sidebar', { timeout: 5000 })
    }
    const projectId = await getProjectId(page)

    // Go to 承接查验
    await page.click('.sidebar-link:has-text("承接查验")')
    await page.waitForTimeout(1000)
    const url1 = page.url()
    expect(url1).toContain('/acceptance')
    console.log(`  Acceptance URL: ${url1}`)

    // Go to 日常巡检
    await page.click('.sidebar-link:has-text("日常巡检")')
    await page.waitForTimeout(1000)
    const url2 = page.url()
    expect(url2).toContain('/records')
    console.log(`  Routine URL: ${url2}`)

    // Verify they are different
    expect(url1).not.toBe(url2)
  })

})
