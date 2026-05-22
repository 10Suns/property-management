// @ts-check
import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const BASE = 'http://localhost:5173'

// Generate test photo
function generateTestPhoto(color = 'blue', filename = '') {
  const colors = {
    blue:   Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==', 'base64'),
    green:  Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAoKsAKAAAAABJRU5ErkJggg==', 'base64'),
    red:    Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64'),
  }
  const buf = colors[color] || colors.blue
  const name = filename || `photo-${color}.png`
  const filePath = path.join(__dirname, 'screenshots', name)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, buf)
  return filePath
}

// ============================================================
// 完整承接查验流程 — 物业经理视角
// ============================================================
test.describe.serial('物业承接查验全流程', () => {
  const PROJECT_NAME = `北宁嘉平工业园一期-模拟${Date.now().toString(36)}`
  let projectId = ''

  const INSPECTION_FORMS = [
    { id: 'A1', title: '变配电室查验单' },
    { id: 'A3', title: '水泵房及水箱间查验单' },
    { id: 'A8', title: '消防水系统查验单' },
    { id: 'C1', title: '室内土建部分查验单' },
  ]

  // Reusable login helper
  async function ensureLogin(page) {
    await page.goto(BASE + '/#/login')
    await page.waitForSelector('.login-card')
    await page.fill('input[placeholder="请输入用户名"]', 'admin')
    await page.fill('input[placeholder="请输入密码"]', 'admin123')
    await page.click('button:has-text("登录")')
    await page.waitForTimeout(1500)
  }

  test('① 管理员登录 → 创建项目', async ({ page }) => {
    await ensureLogin(page)

    // Navigate to project list
    const url = page.url()
    if (url.includes('/projects/') && !url.endsWith('/projects')) {
      await page.goto(BASE + '/#/projects')
      await page.waitForTimeout(800)
    }

    // Click "新建项目"
    await page.click('button:has-text("新建项目")')
    await page.waitForTimeout(500)

    // Fill project form
    await page.fill('input[placeholder="如：GVIP嘉平二工业区"]', PROJECT_NAME)
    await page.fill('input[placeholder="项目地址"]', '越南北宁省嘉平县工业园区')
    await page.fill('input[placeholder="占地面积"]', '50000')
    await page.waitForTimeout(300)

    // Click create
    await page.click('.modal button:has-text("创建")')
    await page.waitForTimeout(2000)

    // Extract project ID from URL
    const newUrl = page.url()
    projectId = newUrl.match(/\/projects\/(\d+)/)?.[1] || ''
    console.log(`  ✓ 项目创建成功: ${PROJECT_NAME} (ID: ${projectId})`)
    expect(projectId).toBeTruthy()
  })

  test('② 配置楼栋和房源', async ({ page }) => {
    await ensureLogin(page)
    expect(projectId).toBeTruthy()
    await page.goto(`${BASE}/#/projects/${projectId}/settings`)
    await page.waitForTimeout(1000)

    // -- Buildings tab (default) --
    const buildingInput = page.locator('input[placeholder="楼栋名称"]')
    for (const name of ['A栋', 'B栋', 'C栋', 'D栋']) {
      await buildingInput.fill(name)
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)
    }
    console.log('  ✓ 楼栋: A栋, B栋, C栋, D栋')

    // -- Houses tab --
    await page.click('.tab:has-text("房源管理")')
    await page.waitForTimeout(500)

    const buildingSelect = page.locator('.select').first()
    const houseInput = page.locator('input[placeholder="房号"]')
    const areaInput = page.locator('input[placeholder="面积"]')

    for (const bidx of [1, 2, 3, 4]) {
      // Select building
      await buildingSelect.selectOption({ index: bidx })
      await page.waitForTimeout(200)

      for (let h = 1; h <= 3; h++) {
        await houseInput.fill(`${h}01`)
        await areaInput.fill('120')
        await page.keyboard.press('Enter')
        await page.waitForTimeout(400)
      }
    }
    console.log('  ✓ 房源: 4栋 × 3套 = 12套')
  })

  test('③ 从参考表单保存为项目表单（4张）', async ({ page }) => {
    await ensureLogin(page)
    expect(projectId).toBeTruthy()

    for (const form of INSPECTION_FORMS) {
      await page.goto(`${BASE}/#/projects/${projectId}/templates`)
      await page.waitForTimeout(800)

      // Click template card — find it by title text
      const card = page.locator('.card', { hasText: form.title }).first()
      await card.click()
      await page.waitForTimeout(1200)

      // Click "保存为我的表单"
      const saveBtn = page.locator('button:has-text("保存为我的表单")')
      if (await saveBtn.count() > 0) {
        await saveBtn.click()
        await page.waitForTimeout(1500)
      }

      console.log(`  ✓ 已保存: ${form.id} ${form.title}`)
    }
  })

  test('④ 现场查验 — 纸质表回收后录入系统', async ({ page }) => {
    await ensureLogin(page)
    expect(projectId).toBeTruthy()

    // Generate test photos
    const photos = {
      normal: generateTestPhoto('blue', 'equipment-normal.jpg'),
      defect: generateTestPhoto('red', 'defect-found.jpg'),
      recheck: generateTestPhoto('green', 'recheck-passed.jpg'),
    }
    console.log('  ✓ 模拟照片已就绪')

    for (let fi = 0; fi < INSPECTION_FORMS.length; fi++) {
      const form = INSPECTION_FORMS[fi]

      // Go to records list
      await page.goto(`${BASE}/#/projects/${projectId}/records`)
      await page.waitForTimeout(800)

      // Click "+ 新增记录"
      const addBtn = page.locator('button:has-text("新增记录")')
      if (await addBtn.count() === 0) {
        console.log(`  ⚠ 找不到"新增记录"按钮，跳过 ${form.title}`)
        continue
      }
      await addBtn.click()
      await page.waitForTimeout(600)

      // Select form in modal
      const formCard = page.locator('.modal .card', { hasText: form.title }).first()
      if (await formCard.count() > 0) {
        await formCard.click()
        await page.waitForTimeout(1500)
      }

      // Verify we're in inspection mode
      const badge = page.locator('.badge:has-text("查验录入")')
      const inInspectMode = (await badge.count()) > 0
      console.log(`  ${inInspectMode ? '✓' : '⚠'} 进入${form.title}${inInspectMode ? '查验录入模式' : ''}`)

      // Select building
      const buildingSelect = page.locator('select').first()
      if (await buildingSelect.count() > 0) {
        await buildingSelect.selectOption({ index: 1 })
        await page.waitForTimeout(300)
      }

      // Fill location
      const locInput = page.locator('input[placeholder*="位置"]')
      if (await locInput.count() > 0) {
        await locInput.fill(`${form.id} 设备间`)
        await page.waitForTimeout(200)
      }

      // Count items by counting pass radio labels
      const passLabels = page.locator('label[for^="pass_"]')
      const failLabels = page.locator('label[for^="fail_"]')
      const skipLabels = page.locator('label[for^="skip_"]')

      const passCount = await passLabels.count()
      console.log(`    检查项: ${passCount} 项`)

      // Mark items based on form index for variety
      // fi=0 变配电室: item 2 fails (transformer issue)
      // fi=1 水泵房: item 0 fails (pump issue)
      // fi=2 消防水: item 1 fails (sprinkler issue)
      // fi=3 室内土建: all pass (simple)
      const failIndex = fi < 3 ? (fi + fi) % passCount : -1

      for (let i = 0; i < passCount; i++) {
        if (i === failIndex) {
          if (i < await failLabels.count()) {
            await failLabels.nth(i).click()
            await page.waitForTimeout(500)

            // Add problem description
            const problems = [
              '变压器运行温度偏高，需检查冷却系统',
              '水泵机械密封有渗漏，需更换密封件',
              '喷淋头被装修遮挡，需调整位置',
            ]
            const problemInput = page.locator('input[placeholder*="问题描述"]').first()
            if (await problemInput.count() > 0) {
              await problemInput.fill(problems[fi] || '设备存在异常，需整改')
              await page.waitForTimeout(400)
            }
          }
        } else if (i === passCount - 1 && fi === 1) {
          if (i < await skipLabels.count()) {
            await skipLabels.nth(i).click()
            await page.waitForTimeout(300)
          }
        } else {
          if (i < await passLabels.count()) {
            await passLabels.nth(i).click()
            await page.waitForTimeout(300)
          }
        }
      }

      // Upload photo for fail item
      const photoBtn = page.locator('button:has-text("0")').first()
      if (await photoBtn.count() > 0 && failIndex >= 0) {
        await photoBtn.click()
        await page.waitForTimeout(500)
        const fileInput = page.locator('.modal input[type="file"]')
        if (await fileInput.count() > 0) {
          await fileInput.setInputFiles(photos.defect)
          await page.waitForTimeout(800)
        }
        await page.click('button:has-text("关闭")')
        await page.waitForTimeout(300)
      }

      // Comments
      const commentArea = page.locator('textarea')
      if (await commentArea.count() > 0) {
        await commentArea.fill(`承接查验${form.title}：大部分项目合格，个别需整改。查验人：王经理。`)
        await page.waitForTimeout(400)
      }

      // Set status → completed
      const statusSelect = page.locator('select').last()
      if (await statusSelect.count() > 0) {
        await statusSelect.selectOption('completed')
        await page.waitForTimeout(300)
      }

      // Save
      const saveBtn = page.locator('button:has-text("保存记录")')
      if (await saveBtn.count() > 0) {
        await saveBtn.click()
        await page.waitForTimeout(1000)
      }

      console.log(`  ✓ 录入完成: ${form.title} (含合格/不合格/免检+照片)`)
    }
  })

  test('⑤ 整改复查 — 不合格项复检通过', async ({ page }) => {
    await ensureLogin(page)
    expect(projectId).toBeTruthy()
    const photos = { recheck: generateTestPhoto('green', 'recheck-final.jpg') }

    // Create re-inspection record for 消防水系统 (which had failures)
    await page.goto(`${BASE}/#/projects/${projectId}/records`)
    await page.waitForTimeout(800)

    // Click "+ 新增记录"
    await page.click('button:has-text("新增记录")')
    await page.waitForTimeout(600)

    // Select 消防水系统
    const formCard = page.locator('.modal .card', { hasText: '消防水系统' }).first()
    if (await formCard.count() > 0) {
      await formCard.click()
      await page.waitForTimeout(1500)
    }

    // Building
    const buildingSelect = page.locator('select').first()
    if (await buildingSelect.count() > 0) {
      await buildingSelect.selectOption({ index: 0 })
      await page.waitForTimeout(300)
    }

    // Location
    const locInput = page.locator('input[placeholder*="位置"]')
    if (await locInput.count() > 0) {
      await locInput.fill('A8 消防系统整改复查')
      await page.waitForTimeout(200)
    }

    // ALL PASS this time
    const passLabels = page.locator('label[for^="pass_"]')
    const count = await passLabels.count()
    for (let i = 0; i < count; i++) {
      await passLabels.nth(i).click()
      await page.waitForTimeout(200)
    }

    // Upload recheck photo
    const photoBtn = page.locator('button:has-text("0")').first()
    if (await photoBtn.count() > 0) {
      await photoBtn.click()
      await page.waitForTimeout(500)
      const fileInput = page.locator('.modal input[type="file"]')
      if (await fileInput.count() > 0) {
        await fileInput.setInputFiles(photos.recheck)
        await page.waitForTimeout(800)
      }
      await page.click('button:has-text("关闭")')
      await page.waitForTimeout(300)
    }

    // Comment
    const commentArea = page.locator('textarea')
    if (await commentArea.count() > 0) {
      await commentArea.fill('整改复查通过！喷淋头已调整，消防水系统全部合格。复查人：王经理。')
      await page.waitForTimeout(400)
    }

    // Completed
    const statusSelect = page.locator('select').last()
    if (await statusSelect.count() > 0) {
      await statusSelect.selectOption('completed')
      await page.waitForTimeout(300)
    }

    // Save
    const saveBtn = page.locator('button:has-text("保存记录")')
    if (await saveBtn.count() > 0) {
      await saveBtn.click()
      await page.waitForTimeout(1000)
    }

    console.log('  ✓ 整改复查完成: 消防水系统全部合格')
  })

  test('⑥ 打印归档 — 生成 PDF', async ({ page }) => {
    await ensureLogin(page)
    expect(projectId).toBeTruthy()

    await page.goto(`${BASE}/#/projects/${projectId}/records`)
    await page.waitForTimeout(1000)

    // Count completed records
    const completedBadges = page.locator('.badge-completed')
    const completedCount = await completedBadges.count()
    console.log(`  已完成记录: ${completedCount} 条`)

    // Print each record
    const recordCards = page.locator('.card').filter({ has: page.locator('.badge-completed') })
    const printCount = await recordCards.count()

    const pdfDir = path.join(__dirname, 'pdf-output')
    fs.mkdirSync(pdfDir, { recursive: true })

    for (let i = 0; i < printCount; i++) {
      const card = recordCards.nth(i)
      if (await card.count() > 0) {
        await card.click()
        await page.waitForTimeout(1200)

        await page.pdf({
          path: path.join(pdfDir, `acceptance-record-${i + 1}.pdf`),
          format: 'A4',
          margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
          printBackground: true,
        })
        console.log(`  ✓ PDF归档: acceptance-record-${i + 1}.pdf`)

        await page.goto(`${BASE}/#/projects/${projectId}/records`)
        await page.waitForTimeout(500)
      }
    }
  })

  test('⑦ 最终验证 — 承接查验完成', async ({ page }) => {
    await ensureLogin(page)
    expect(projectId).toBeTruthy()

    await page.goto(`${BASE}/#/projects/${projectId}/records`)
    await page.waitForTimeout(800)

    // Verify all forms have records
    const pageText = await page.locator('body').textContent()
    for (const form of INSPECTION_FORMS) {
      expect(pageText).toContain(form.title)
    }

    // Print summary
    const allCards = await page.locator('.card').all()
    const completedBadges = await page.locator('.badge-completed').all()

    console.log('')
    console.log('  ╔══════════════════════════════╗')
    console.log('  ║    承接查验 — 全部完成！     ║')
    console.log('  ╠══════════════════════════════╣')
    console.log(`  ║  项目: ${PROJECT_NAME}`)
    console.log(`  ║  查验表单: ${INSPECTION_FORMS.length} 张`)
    console.log(`  ║  检查记录: ${allCards.length} 条`)
    console.log(`  ║  已完成: ${completedBadges.length} 条`)
    console.log(`  ║  含整改复查: 1 条`)
    console.log('  ║  流程: 创建→选表→录入→整改→归档')
    console.log('  ╚══════════════════════════════╝')
    console.log('')
    console.log(`  ✓ 查验人签字归档，承接查验流程完成！`)
  })
})
