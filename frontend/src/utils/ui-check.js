/**
 * UI Width Consistency Checker
 * Run in browser console: import('/src/utils/ui-check.js').then(m => m.check())
 * Or add ?debug=1 to URL to activate visual debug borders
 */

export function check() {
  const results = []
  const app = document.querySelector('#app')
  const appWidth = app ? app.getBoundingClientRect().width : 0

  console.group('🔍 UI Width Consistency Check')
  console.log('App width:', Math.round(appWidth) + 'px', '(expected: 800px)')

  const cards = document.querySelectorAll('.card')
  const widths = new Map()

  for (const card of cards) {
    const w = Math.round(card.getBoundingClientRect().width)
    if (!widths.has(w)) widths.set(w, [])
    widths.get(w).push(card)
  }

  if (widths.size === 0) {
    console.log('No .card elements found on this page')
  } else if (widths.size === 1) {
    const [w] = widths.keys()
    console.log(`%c✓ All ${cards.length} cards: ${w}px — consistent`, 'color:green')
  } else {
    console.log(`%c✗ Found ${widths.size} different card widths:`, 'color:red;font-weight:bold')
    for (const [w, els] of widths) {
      console.log(`  ${w}px: ${els.length} cards`, els)
    }
    results.push({ type: 'card-width-mismatch', widths: Array.from(widths.keys()) })
  }

  // Check all cards are within app max-width
  if (appWidth > 0) {
    const oversize = []
    for (const card of cards) {
      const w = Math.round(card.getBoundingClientRect().width)
      if (w > appWidth) oversize.push({ el: card, width: w })
    }
    if (oversize.length > 0) {
      console.log(`%c✗ ${oversize.length} cards overflow app width:`, 'color:red')
      for (const o of oversize) console.log(`  ${o.width}px > ${Math.round(appWidth)}px`, o.el)
      results.push({ type: 'overflow', count: oversize.length })
    } else if (cards.length > 0) {
      console.log('%c✓ All cards within app width', 'color:green')
    }
  }

  // Check modal cards
  const modals = document.querySelectorAll('.modal-card')
  if (modals.length > 0) {
    const modalWidths = new Set()
    for (const m of modals) modalWidths.add(Math.round(m.getBoundingClientRect().width))
    if (modalWidths.size === 1) {
      console.log(`%c✓ All ${modals.length} visible modals: ${[...modalWidths][0]}px`, 'color:green')
    } else {
      console.log(`%c✗ Modal width mismatch: ${[...modalWidths]}`, 'color:red')
    }
  }

  console.groupEnd()
  return results
}

/**
 * Activate visual debug mode: shows borders and width labels on all major containers.
 * Toggle with: import('/src/utils/ui-check.js').then(m => m.debug())
 */
export function debug() {
  const style = document.getElementById('ui-debug-style')
  if (style) {
    style.remove()
    console.log('Debug mode OFF')
    return
  }

  const css = document.createElement('style')
  css.id = 'ui-debug-style'
  css.textContent = `
    #app { outline: 3px dashed #1a73e8 !important; }
    #app::before {
      content: "#app " attr(data-debug-width);
      position: fixed; top: 0; left: 50%; transform: translateX(-50%);
      background: #1a73e8; color: #fff; padding: 2px 10px;
      font-size: 12px; z-index: 9999; border-radius: 0 0 4px 4px;
      pointer-events: none;
    }
    .card { outline: 1px dashed #188038 !important; }
    .card::after {
      content: attr(data-debug-width);
      position: absolute; top: 4px; right: 4px;
      background: #188038; color: #fff; padding: 1px 6px;
      font-size: 10px; border-radius: 3px; pointer-events: none;
    }
    .modal-card { outline: 2px dashed #f9ab00 !important; }
    .card { position: relative !important; }
  `
  document.head.appendChild(css)

  // Label elements with their widths
  function label() {
    const app = document.querySelector('#app')
    if (app) app.dataset.debugWidth = Math.round(app.getBoundingClientRect().width) + 'px'
    document.querySelectorAll('.card').forEach(c => {
      c.dataset.debugWidth = Math.round(c.getBoundingClientRect().width) + 'px'
    })
  }
  label()
  window.addEventListener('resize', label)

  console.log('Debug mode ON — green dashed = .card, blue dashed = #app, yellow dashed = .modal-card')
  console.log('Run again to toggle off')
}

// Auto-activate via URL param ?debug=1
if (typeof window !== 'undefined' && window.location.search.includes('debug=1')) {
  setTimeout(debug, 500)
}
