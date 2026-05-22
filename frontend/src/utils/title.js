export function cleanTitle(title) {
  return (title || '').replace(/ - [^-]+$/, '')
}
