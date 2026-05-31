// @ts-check
import { test } from '@playwright/test'

test('D1 print preview - footer visible on page 2', async ({ page }) => {
  // Login
  await page.goto('http://localhost:5173/#/login')
  await page.waitForSelector('.login-card')
  await page.fill('input[placeholder="请输入用户名"]', 'admin')
  await page.fill('input[placeholder="请输入密码"]', 'admin123')
  await page.click('button:has-text("登录")')
  await page.waitForTimeout(1500)

  const currentUrl = page.url()
  console.log('URL after login:', currentUrl)

  // The D1 record has id=64. Set localStorage so PrintPreview can load it.
  await page.evaluate(() => {
    localStorage.setItem('printRecords', JSON.stringify([64]))
    localStorage.setItem('printBlankTemplates', JSON.stringify([]))
  })

  // Navigate to the print preview page
  await page.goto('http://localhost:5173/#/print-preview')
  await page.waitForTimeout(3000)

  // Take screenshot
  await page.screenshot({ path: 'test-results/print-preview-full.png', fullPage: true })

  // Check page content for footer elements (inspection opinion + signature)
  const pageContent = await page.textContent('body')
  console.log('Page content length:', pageContent.length)

  // These are the bilingual footer labels: 查验意见 / Ý kiến kiểm tra
  const hasFooter = pageContent.includes('查验意见') || pageContent.includes('Ý kiến')
  console.log('Footer (查验意见) visible:', hasFooter)
  // Signature line: 查验人签字
  const hasSignature = pageContent.includes('签字') || pageContent.includes('ký tên')
  console.log('Signature (签字/ký tên) visible:', hasSignature)
  // Page 2 continuation marker
  const hasPage2 = pageContent.includes('续') || pageContent.includes('tiếp theo')
  console.log('Page 2 (续) visible:', hasPage2)
  // Page 3 continuation marker
  const hasPage3 = pageContent.includes('续二') || pageContent.includes('tiếp theo 2')
  console.log('Page 3 (续二) visible:', hasPage3)

  // Check total item count rendered
  const seqCells = page.locator('.print-data-table tbody tr td:first-child')
  const totalItems = await seqCells.count()
  console.log('Total data rows rendered:', totalItems)

  // Take screenshot of page 2 footer area specifically
  const doc2 = page.locator('.print-document').nth(0)
  if (await doc2.count() > 0) {
    // Scroll to second page
    const pages = page.locator('.print-page')
    const pageCount = await pages.count()
    console.log('Total print pages:', pageCount)
    if (pageCount >= 2) {
      await pages.nth(1).scrollIntoViewIfNeeded()
      await page.waitForTimeout(500)
      await pages.nth(1).screenshot({ path: 'test-results/print-page2-footer.png' })
    }
  }
})
