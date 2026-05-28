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
}

test('Equipment maintenance: add plan, record, edit, upload photo', async ({ page }) => {
  // Collect console errors
  const errors = []
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text())
  })

  await loginAs(page, 'SG001', '123456')

  // Ensure we're in a project
  const url = page.url()
  if (!url.includes('/projects/') || url.endsWith('/projects')) {
    await page.locator('.data-grid-item').first().click()
    await page.waitForSelector('.sidebar', { timeout: 5000 })
  }

  // Navigate to equipment
  await page.click('.sidebar-link:has-text("设备档案")')
  await page.waitForTimeout(800)

  // Enter first equipment detail
  await page.locator('.action-btn.primary:has-text("查看")').first().click()
  await page.waitForTimeout(800)

  // Switch to maintenance tab
  await page.click('.tab:has-text("维护计划")')
  await page.waitForTimeout(500)

  // Log page state
  console.log('URL:', page.url())
  console.log('Console errors so far:', errors)

  // Check for visible error messages
  const errEl = page.locator('.error-msg')
  if (await errEl.isVisible().catch(() => false)) {
    console.log('PAGE ERROR:', await errEl.textContent())
  }

  // Add a plan: fill date then content
  const dateInput = page.locator('input[type="date"]').first()
  const contentInput = page.locator('input[placeholder*="检查"]')
  const addBtn = page.locator('button:has-text("+ 添加")')

  console.log('Date input visible:', await dateInput.isVisible())
  console.log('Content input visible:', await contentInput.isVisible())
  console.log('Add button visible:', await addBtn.isVisible())

  const today = new Date().toISOString().slice(0, 10)
  await dateInput.fill(today)
  await contentInput.fill('E2E测试-检查运行状态')
  await addBtn.click()
  await page.waitForTimeout(1500)

  // Check for errors after add
  console.log('Console errors after add:', errors)
  if (await errEl.isVisible().catch(() => false)) {
    console.log('ERROR AFTER ADD:', await errEl.textContent())
  }

  // Check plan list updated
  const rows = await page.locator('.schedule-row').count()
  console.log(`Plan rows: ${rows}`)

  // Click first pending row to record it
  const pendingBtn = page.locator('.schedule-row button:has-text("记录")').first()
  if (await pendingBtn.count() > 0) {
    console.log('Found pending record button, clicking...')
    await pendingBtn.click()
  } else {
    // Try clicking the row itself
    console.log('No pending record button, clicking first row...')
    await page.locator('.schedule-row').first().click()
  }
  await page.waitForTimeout(800)

  // Check modal
  const modal = page.locator('.modal-card')
  console.log('Modal visible:', await modal.isVisible().catch(() => false))

  // Set status to completed
  await page.locator('.modal-card label:has-text("已完成")').click()
  await page.waitForTimeout(300)

  // Fill notes
  const notesArea = page.locator('.modal-card textarea')
  if (await notesArea.isVisible()) {
    await notesArea.fill('E2E测试-维护完成')
  }

  // Save
  await page.locator('.modal-card button:has-text("保存")').click()
  await page.waitForTimeout(1500)

  // Check status updated
  console.log('After save URL:', page.url())
  const badges = page.locator('.schedule-row .badge-pass')
  console.log('Completed badges:', await badges.count())
  console.log('Final errors:', errors)

  // Test manual upload tab
  await page.click('.tab:has-text("说明书")')
  await page.waitForTimeout(500)
  console.log('Manuals tab loaded')

  // Test back navigation
  await page.click('.tab:has-text("基本信息")')
  await page.waitForTimeout(500)
  console.log('Info tab loaded')

  console.log('=== TEST COMPLETE ===')
})
