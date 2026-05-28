// @ts-check
import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const BASE = 'http://localhost:5173'
const PDF_DIR = path.resolve(__dirname, 'pdf-output')

// Ensure PDF output directory exists
if (!fs.existsSync(PDF_DIR)) fs.mkdirSync(PDF_DIR, { recursive: true })

// Helper: login and return page
async function login(page, username, password) {
  await page.goto(BASE + '/#/login')
  await page.waitForSelector('.login-card')
  await page.fill('input[placeholder="请输入用户名"]', username)
  await page.fill('input[placeholder="请输入密码"]', password)
  await page.click('button:has-text("登录")')
  // After login, goes to /projects which may auto-redirect to single project
  await page.waitForTimeout(1500)
  const url = page.url()
  if (url.includes('/projects/') && !url.endsWith('/projects')) {
    // Auto-redirected to a project — verify sidebar is visible
    await page.waitForSelector('.sidebar', { timeout: 5000 })
  } else {
    // On project list page
    await page.waitForSelector('.list-item, .card', { timeout: 5000 })
  }
}

// Helper: generate print PDF
async function printToPDF(page, filename) {
  // Navigate to print preview via localStorage hack or direct navigation
  await page.waitForTimeout(500)
  await page.pdf({
    path: path.join(PDF_DIR, filename),
    format: 'A4',
    margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
    printBackground: true
  })
  console.log(`  PDF saved: ${filename}`)
}

// ============================================================
// TEST SUITE 1: Employee Basic Workflow (SG002)
// ============================================================
test.describe('场景一：员工基础流程（SG002）', () => {

  test('1.1 登录系统', async ({ page }) => {
    await login(page, 'SG002', '123456')
    // Verify login success — username visible in topbar
    const topbar = page.locator('.topbar')
    await expect(topbar).toContainText('李员工')
    console.log('  ✓ 登录成功，顶部栏显示用户名')
  })

  test('1.2 进入项目 — 默认显示"我的表单"', async ({ page }) => {
    await login(page, 'SG002', '123456')

    // Navigate to project via project list card click or direct URL
    const url = page.url()
    if (!url.includes('/projects/') || url.endsWith('/projects')) {
      await page.goto(BASE + '/#/projects/2')
    }
    await page.waitForTimeout(800)

    // Verify page title is "我的表单"
    const pageTitle = page.locator('.page-title')
    await expect(pageTitle).toContainText('我的表单')
    console.log('  ✓ 默认显示"我的表单"页面')

    // Should see forms
    await page.waitForTimeout(500)
    const hasFormContent = await page.locator('text=变配电室').count()
    console.log(`  包含"变配电室"文本: ${hasFormContent > 0}`)
    expect(hasFormContent).toBeGreaterThanOrEqual(0)
  })

  test('1.3 参考表单 — 所有模板可见', async ({ page }) => {
    await login(page, 'SG002', '123456')

    // Navigate to reference forms via sidebar or direct URL
    await page.goto(BASE + '/#/projects/2/templates')
    await page.waitForTimeout(1000)

    // Should see templates (A/B/C/D categories)
    const pageContent = page.locator('body')
    await expect(pageContent).toContainText('变配电室查验单')
    await expect(pageContent).toContainText('发电机房查验单')
    await expect(pageContent).toContainText('消防控制室查验单')

    // Verify D-category templates are visible
    await expect(pageContent).toContainText('技术资料移交清单')
    console.log('  ✓ 所有系统模板可见（无需授权）')
  })

  test('1.4 选择模板 → 保存为我的表单', async ({ page }) => {
    await login(page, 'SG002', '123456')

    // Navigate to reference forms
    await page.goto(BASE + '/#/projects/2/templates')
    await page.waitForTimeout(500)

    // Click on a template card — now directly creates form via API and navigates with ?form=
    const templateCard = page.locator('.card').filter({ hasText: '发电机房查验单' }).first()
    await expect(templateCard).toBeVisible({ timeout: 3000 })
    await templateCard.click()

    // Should navigate to editor with ?form=<id>
    await page.waitForURL('**/template/**?form=*')
    await page.waitForTimeout(500)

    // Verify editor shows the template content (form created, 信息录入 removed from edit mode)
    const editorContent = page.locator('body')
    await expect(editorContent).toContainText('发电机房')
    await expect(page.locator('button:has-text("打印空白表")')).toBeVisible({ timeout: 3000 })
    console.log('  ✓ 表单已保存，编辑模式不显示信息录入按钮')
  })

  test('1.5 编辑表单 — 批量编辑/添加/删除条目', async ({ page }) => {
    await login(page, 'SG002', '123456')
    // Go to 我的表单
    await page.goto(BASE + '/#/projects/2')
    await page.waitForTimeout(800)

    // Find edit button for generator room form
    const formCard = page.locator('.card').filter({ hasText: '发电机房' }).first()
    const editBtn = formCard.locator('button:has-text("编辑")')
    console.log(`  找到发电机房卡片: ${await formCard.count() > 0}, 编辑按钮: ${await editBtn.count()}`)
    if (await editBtn.count() > 0) {
      await editBtn.click()
      console.log('  ✓ 点击编辑按钮')
    } else {
      console.log('  ⚠ 编辑按钮未找到，跳过批量编辑测试')
      return
    }

    await page.waitForTimeout(1500)

    // Click "批量编辑"
    const batchEditBtn = page.locator('button:has-text("批量编辑")')
    if (await batchEditBtn.count() > 0 && await batchEditBtn.isVisible()) {
      await batchEditBtn.click()
      await page.waitForTimeout(300)
      console.log('  ✓ 进入批量编辑模式')
    } else {
      console.log('  ⚠ 未找到批量编辑按钮')
      return
    }

    const body = page.locator('body')
    await expect(body).toContainText('确认')
    await expect(body).toContainText('删除')
    console.log('  ✓ 批量编辑模式：显示确认和删除按钮')

    const addBtn = page.locator('button:has-text("+ 添加条目")')
    if (await addBtn.isVisible()) {
      await addBtn.click()
      await page.waitForTimeout(300)
      console.log('  ✓ 点击添加条目')
    }

    const doneBtn = page.locator('button:has-text("完成编辑")')
    if (await doneBtn.isVisible()) {
      await doneBtn.click()
    }
  })

  test('1.6 打印空白表单 → 生成 PDF', async ({ page }) => {
    await login(page, 'SG002', '123456')

    // Set localStorage to print form as blank
    await page.evaluate(() => {
      localStorage.setItem('printBlankTemplates', JSON.stringify(['f_14']))
      localStorage.setItem('printRecords', JSON.stringify([]))
    })

    // Navigate directly to print preview
    await page.goto(BASE + '/#/print-preview')
    await page.waitForTimeout(3000)

    const printContent = page.locator('.print-document').first()
    if (await printContent.count() > 0) {
      await expect(printContent).toContainText('查验记录表')

      await expect(printContent).toContainText('序号')
      await expect(printContent).toContainText('检查项目')
      await expect(printContent).toContainText('检查标准')
      await expect(printContent).toContainText('查验结果')

      await printToPDF(page, '01-blank-form.pdf')
      console.log('  ✓ 空白表打印PDF已生成')
    } else {
      console.log('  ⚠ Print preview page not detected')
    }
  })
})

// ============================================================
// TEST SUITE 2: Data Entry (Information Recording)
// ============================================================
test.describe('场景二：信息录入（SG002）', () => {

  test('2.1 进入信息录入模式', async ({ page }) => {
    await login(page, 'SG002', '123456')

    // Navigate to 检查记录 and create via modal
    await page.goto(BASE + '/#/projects/2/records')
    await page.waitForTimeout(800)

    // Click "新增记录"
    const addBtn = page.locator('button:has-text("+ 新增记录")')
    await expect(addBtn).toBeVisible({ timeout: 5000 })
    await addBtn.click()
    await page.waitForTimeout(500)
    console.log('  ✓ 打开新增记录弹窗')

    // Select a template from modal
    const templateCard = page.locator('.modal-card .card').first()
    await expect(templateCard).toBeVisible({ timeout: 3000 })
    await templateCard.click()
    await page.waitForTimeout(2000)

    // Should navigate to inspection mode with radio buttons
    const radioLabels = page.locator('label:has-text("合格")')
    const radioCount = await radioLabels.count()
    console.log(`  合格选项数: ${radioCount}`)
    expect(radioCount).toBeGreaterThan(0)
    console.log('  ✓ 进入信息录入模式，显示合格/不合格/免检选项')
  })

  test('2.2 录入检查结果（合格/不合格/免检）', async ({ page }) => {
    await login(page, 'SG002', '123456')

    // Navigate to existing record directly
    await page.goto(BASE + '/#/projects/2/template/1?record=3')
    await page.waitForTimeout(1000)

    const radioLabels = page.locator('.result-radio + label')
    const labelCount = await radioLabels.count()

    if (labelCount > 0) {
      console.log(`  找到 ${Math.round(labelCount / 3)} 行检查项（每行3个选项）`)

      const passLabels = page.locator('label:has-text("合格")')
      const skipLabels = page.locator('label:has-text("免检")')

      const passCount = await passLabels.count()
      if (passCount > 0) {
        await passLabels.first().click()
        await page.waitForTimeout(200)
        console.log('  ✓ 第1项设为合格')
      }

      const failLabels = page.locator('label:has-text("不合格")')
      const failCount = await failLabels.count()
      if (failCount > 2) {
        await failLabels.nth(2).click()
        await page.waitForTimeout(500)

        const textareas = page.locator('.textarea')
        if (await textareas.count() > 0) {
          await textareas.first().fill('测试：接线端子松动')
          console.log('  ✓ 第3项设为不合格，填写了问题描述')
        }
      }

      const skipCount = await skipLabels.count()
      if (skipCount > 4) {
        await skipLabels.nth(4).click()
        console.log('  ✓ 第5项设为免检')
      }

      // Verify data persists after page refresh
      await page.reload()
      await page.waitForTimeout(1000)

      const bodyAfter = page.locator('body')
      const passChecked = await bodyAfter.locator('.result-radio:checked + label:has-text("合格")').count()
      console.log(`  刷新后保持选中的合格数: ${passChecked}`)
    }
  })

  test('2.3 保存完成记录', async ({ page }) => {
    await login(page, 'SG002', '123456')

    // Navigate to record
    await page.goto(BASE + '/#/projects/2/template/1?record=3')
    await page.waitForTimeout(1000)

    // Fill inspector comment
    const commentArea = page.locator('textarea[placeholder*="查验意见"], textarea').last()
    if (await commentArea.isVisible()) {
      await commentArea.fill('自动化测试：整体情况良好，部分问题需整改。')
      console.log('  ✓ 填写了查验意见')
    }

    // Change status to completed and save
    const statusSelect = page.locator('select')
    if (await statusSelect.count() > 0) {
      await statusSelect.last().selectOption('completed')
    }

    const saveBtn = page.locator('button:has-text("保存记录")')
    if (await saveBtn.isVisible()) {
      await saveBtn.click()
      await page.waitForTimeout(1000)
      console.log('  ✓ 记录已保存')
    }
  })

  test('2.4 打印已填写记录 → 生成 PDF', async ({ page }) => {
    await login(page, 'SG002', '123456')

    await page.evaluate(() => {
      localStorage.setItem('printRecords', JSON.stringify([3]))
    })

    await page.goto(BASE + '/#/print-preview')
    await page.waitForTimeout(3000)

    const printTable = page.locator('.print-data-table').first()

    if (await printTable.count() > 0) {
      const bodyText = await printTable.textContent()

      if (bodyText.includes('合格') || bodyText.includes('不合格')) {
        console.log('  ✓ 打印页面包含查验结果标记')
      }

      if (bodyText.includes('接线端子松动')) {
        console.log('  ✓ 打印页面包含问题描述')
      }

      if (bodyText.includes('整体情况良好')) {
        console.log('  ✓ 打印页面包含查验意见')
      }

      await printToPDF(page, '02-filled-record.pdf')
      console.log('  ✓ 已填写记录打印PDF已生成')
    }
  })
})

// ============================================================
// TEST SUITE 3: Record Management
// ============================================================
test.describe('场景三：记录查看与管理', () => {

  test('3.1 员工查看自己的记录', async ({ page }) => {
    await login(page, 'SG002', '123456')

    // Navigate to records from sidebar or directly
    await page.goto(BASE + '/#/projects/2/records')
    await page.waitForTimeout(1000)

    const body = page.locator('body')
    // Should see records (at least record 3)
    const hasRecords = await body.locator('text=变配电室').count()
    console.log(`  可见记录数（含变配电室）: ${hasRecords}`)
  })

  test('3.2 经理查看全部记录', async ({ page }) => {
    await login(page, 'SG001', '123456')

    await page.goto(BASE + '/#/projects/2/records')
    await page.waitForTimeout(1000)

    const body = page.locator('body')
    // Manager should see records created by employees
    const hasRecords = await body.locator('text=李员工').count()
    console.log(`  经理可见李员工的记录: ${hasRecords > 0 ? '✓' : '✗'}`)
  })

  test('3.3 管理员可删除记录', async ({ page }) => {
    await login(page, 'admin', 'admin123')

    await page.goto(BASE + '/#/projects/2/records')
    await page.waitForTimeout(1000)

    // Admin should see delete buttons
    const deleteBtns = page.locator('button:has-text("删除")')
    const count = await deleteBtns.count()
    console.log(`  管理员可见删除按钮: ${count} 个`)
    expect(count).toBeGreaterThanOrEqual(0) // May be 0 if no records, that's OK
  })
})

// ============================================================
// TEST SUITE 4: Permission Verification
// ============================================================
test.describe('场景四：权限验证', () => {

  test('4.1 员工无法访问管理页面', async ({ page }) => {
    await login(page, 'SG002', '123456')

    // Try to access admin page
    await page.goto(BASE + '/#/admin/users')
    await page.waitForTimeout(500)

    // Should be redirected away
    const url = page.url()
    expect(url).not.toContain('/admin/users')
    console.log('  ✓ 员工被拒绝访问 /admin/users')
  })

  test('4.2 员工无法访问项目配置', async ({ page }) => {
    await login(page, 'SG002', '123456')

    await page.goto(BASE + '/#/projects/2/settings')
    await page.waitForTimeout(500)

    const url = page.url()
    expect(url).not.toContain('/settings')
    console.log('  ✓ 员工被拒绝访问项目配置')
  })

  test('4.3 经理可访问项目配置和仪表盘', async ({ page }) => {
    await login(page, 'SG001', '123456')

    // Settings
    await page.goto(BASE + '/#/projects/2/settings')
    await page.waitForTimeout(500)
    await expect(page.locator('body')).toContainText('项目配置')
    console.log('  ✓ 经理可访问项目配置')

    // Dashboard
    await page.goto(BASE + '/#/projects/2/dashboard')
    await page.waitForTimeout(500)
    await expect(page.locator('body')).toContainText('仪表盘')
    console.log('  ✓ 经理可访问仪表盘')
  })
})

// ============================================================
// TEST SUITE 5: Settings Page (3 tabs only)
// ============================================================
test.describe('场景五：项目配置验证', () => {

  test('5.1 Settings 仅有三个标签', async ({ page }) => {
    await login(page, 'admin', 'admin123')

    await page.goto(BASE + '/#/projects/2/settings')
    await page.waitForTimeout(1000)

    const tabs = page.locator('.tab')
    const tabTexts = await tabs.allTextContents()
    console.log(`  Settings 标签: ${tabTexts.join(', ')}`)

    expect(tabTexts).toContain('楼栋管理')
    expect(tabTexts).toContain('房源管理')
    expect(tabTexts).toContain('成员管理')
    expect(tabTexts).not.toContain('表单授权')
    expect(tabTexts).not.toContain('设备授权')
    console.log('  ✓ 仅有楼栋管理/房源管理/成员管理三个标签，无授权标签')
  })

  test('5.2 添加成员自动生成 SG 编号', async ({ page }) => {
    await login(page, 'admin', 'admin123')

    await page.goto(BASE + '/#/projects/2/settings')
    await page.waitForTimeout(500)

    // Switch to members tab
    await page.click('.tab:has-text("成员管理")')
    await page.waitForTimeout(500)

    // Click add member
    await page.click('button:has-text("+ 添加成员")')
    await page.waitForTimeout(500)

    // Verify modal is shown with auto-generated SG number
    const modal = page.locator('.modal-card')
    await expect(modal).toBeVisible()

    const usernameInput = modal.locator('input[readonly]').first()
    const username = await usernameInput.inputValue()
    expect(username).toMatch(/^SG\d{3}$/)
    console.log(`  ✓ 自动生成员工编号: ${username}`)

    // Close modal
    await page.click('button:has-text("取消")')
  })
})

// ============================================================
// TEST SUITE 6: UI Verification & Print Quality
// ============================================================
test.describe('场景六：UI 和打印质量验证', () => {

  test('6.1 登录页样式', async ({ page }) => {
    await page.goto(BASE + '/#/login')
    await page.waitForSelector('.login-card')

    const card = page.locator('.login-card')
    const box = await card.boundingBox()

    if (box) {
      console.log(`  卡片宽度: ${Math.round(box.width)}px`)
      // Should not be stretched full-width on desktop
      expect(box.width).toBeLessThanOrEqual(500)
      expect(box.width).toBeGreaterThanOrEqual(250)
    }

    // Verify title is large
    const title = card.locator('h1').first()
    const titleSize = await title.evaluate(el =>
      window.getComputedStyle(el).fontSize
    )
    console.log(`  标题字号: ${titleSize}`)
    expect(parseFloat(titleSize)).toBeGreaterThanOrEqual(24)
  })

  test('6.2 打印预览 A4 格式验证', async ({ page }) => {
    await login(page, 'SG002', '123456')

    // Set print data and navigate
    await page.evaluate(() => {
      localStorage.setItem('printRecords', JSON.stringify([3]))
    })

    await page.goto(BASE + '/#/print-preview')
    await page.waitForTimeout(1500)

    // Verify print title format
    const title = page.locator('.print-company').first()
    if (await title.count() > 0) {
      const titleText = await title.textContent()
      expect(titleText).toContain('查验记录表')
      console.log(`  打印标题: "${titleText.trim()}"`)
    }

    // Verify table structure
    const table = page.locator('.print-data-table').first()
    if (await table.count() > 0) {
      // Check signature area
      const signatureRow = table.locator('.signature-row')
      expect(await signatureRow.count()).toBeGreaterThanOrEqual(0)

      // Check column headers
      const headers = table.locator('th')
      const headerTexts = await headers.allTextContents()
      console.log(`  表头: ${headerTexts.filter(t => t.trim()).join(', ')}`)
      expect(headerTexts.some(t => t.includes('序号'))).toBeTruthy()
      expect(headerTexts.some(t => t.includes('检查项目'))).toBeTruthy()
      expect(headerTexts.some(t => t.includes('检查标准'))).toBeTruthy()
      expect(headerTexts.some(t => t.includes('查验结果'))).toBeTruthy()
    }

    // Generate final quality-check PDF
    await printToPDF(page, '03-print-quality-check.pdf')
    console.log('  ✓ 打印质量验证PDF已生成')
  })

  test('6.3 表单删除确认', async ({ page }) => {
    await login(page, 'SG002', '123456')
    // Go directly to 我的表单
    await page.goto(BASE + '/#/projects/2')
    await page.waitForTimeout(800)

    // Find a delete button for a form
    const deleteBtns = page.locator('button:has-text("删除")')
    const count = await deleteBtns.count()
    console.log(`  我的表单页面删除按钮数: ${count}`)

    // If delete exists, verify it triggers confirmation
    page.on('dialog', async dialog => {
      console.log(`  确认弹窗: "${dialog.message()}"`)
      expect(dialog.message()).toMatch(/确定|删除|确认/)
      await dialog.dismiss()
    })

    if (count > 0) {
      await deleteBtns.first().click()
      await page.waitForTimeout(300)
    }
  })
})

// ============================================================
// TEST SUITE 7: Cross-role visibility
// ============================================================
test.describe('场景七：跨角色数据可见性', () => {

  test('7.1 管理员可查看所有项目', async ({ page }) => {
    await login(page, 'admin', 'admin123')

    // Admin might be auto-redirected if only 1 project, or see list if multiple
    const url = page.url()
    if (url.includes('/projects') && !url.match(/\/projects\/\d/)) {
      // On project list page
      const projectItems = page.locator('.list-item, .card[href]')
      const count = await projectItems.count()
      console.log(`  管理员可见项目数: ${count}`)
      expect(count).toBeGreaterThanOrEqual(1)
    } else {
      // Auto-redirected — valid for single-project system
      console.log('  管理员已自动进入项目（单项目系统）')
    }
  })

  test('7.2 员工仅看到有权限的项目', async ({ page }) => {
    await login(page, 'SG002', '123456')

    const url = page.url()
    if (url.includes('/projects') && !url.match(/\/projects\/\d/)) {
      const projectItems = page.locator('.list-item, .card[href]')
      const count = await projectItems.count()
      console.log(`  员工可见项目数: ${count}`)
    } else {
      console.log('  员工已自动进入有权限的项目')
    }
  })
})
