// Shared VI backfill — loads template_items into a Map for O(1) lookups
export function buildViMap(db, templateId) {
  const rows = db.prepare('SELECT item_name, name_vi, standard_vi FROM template_items WHERE template_id=?').all(templateId)
  return new Map(rows.map(r => [r.item_name, { name_vi: r.name_vi || '', standard_vi: r.standard_vi || '' }]))
}

export function backfillItemVi(viMap, item) {
  const ti = viMap.get(item.item_name)
  if (ti) {
    if (!item.item_name_vi) item.item_name_vi = ti.name_vi
    if (!item.check_standard_vi) item.check_standard_vi = ti.standard_vi
  }
}
