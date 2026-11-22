/**
 * Координаты и мелкие хелперы карты.
 *
 * Контракт (см. `shared/mapContract.ts` на сайте музея) использует точки `[x, y]`
 * в пикселях подложки 1123 × 793, начало координат — левый верхний угол.
 * Leaflet в режиме `CRS.Simple` ждёт `[lat, lng]`, причём `lat` растёт ВВЕРХ,
 * поэтому точка контракта переводится как `[MAP_HEIGHT - y, x]`.
 */

export const MAP_WIDTH = 1123
export const MAP_HEIGHT = 793
export const MAP_CONTRACT_FORMAT = 'nikolina-map'
export const MAP_CONTRACT_VERSION = 1

/**
 * Полезная часть подложки: схема поселка занимает не весь лист 1123 × 793 —
 * сверху и снизу остаются поля. Стартовый вид и «сброс» показывают только схему
 * (как `viewBox="0 200 1123 440"` в SVG-версии карты на сайте).
 */
export const PLAN_VIEW = { x: 0, y: 200, width: MAP_WIDTH, height: 440 }

/** Границы полезной части в формате Leaflet `[[lat, lng], [lat, lng]]`. */
export function planBounds() {
  return [
    [MAP_HEIGHT - (PLAN_VIEW.y + PLAN_VIEW.height), PLAN_VIEW.x],
    [MAP_HEIGHT - PLAN_VIEW.y, PLAN_VIEW.x + PLAN_VIEW.width],
  ]
}

/** `[x, y]` контракта → `[lat, lng]` Leaflet. */
export function toLatLng(point) {
  return [MAP_HEIGHT - point[1], point[0]]
}

/** `[lat, lng]` Leaflet → `[x, y]` контракта. */
export function toPoint(latlng) {
  return [latlng.lng, MAP_HEIGHT - latlng.lat]
}

/** Экранирование текста для вставки в HTML. */
export function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Первый год из строки периода («1930-е» → 1930). */
export function parseYear(value) {
  const match = String(value == null ? '' : value).match(/\d{3,4}/)
  return match ? Number(match[0]) : null
}

/**
 * Период только датами, через тире: «1927 — 1929».
 * Только начало → «1970-е»; только конец → конец; дат нет → пустая строка.
 */
export function formatPeriod(startYear, endYear) {
  const start = String(startYear == null ? '' : startYear).trim()
  const end = String(endYear == null ? '' : endYear).trim()
  if (!start && !end) return ''
  if (start && end) return start + ' — ' + end
  return start || end
}

/** Геометрический центр контура (по площади); для вырожденного — среднее точек. */
export function polygonCentroid(points) {
  const valid = (points || []).filter(
    (point) => point && Number.isFinite(point[0]) && Number.isFinite(point[1]),
  )
  if (valid.length === 0) return null

  const average = () => {
    let sx = 0
    let sy = 0
    for (const point of valid) {
      sx += point[0]
      sy += point[1]
    }
    return [sx / valid.length, sy / valid.length]
  }

  if (valid.length < 3) return average()

  let twiceArea = 0
  let cx = 0
  let cy = 0
  for (let i = 0; i < valid.length; i++) {
    const current = valid[i]
    const previous = valid[(i + valid.length - 1) % valid.length]
    const cross = previous[0] * current[1] - current[0] * previous[1]
    twiceArea += cross
    cx += (previous[0] + current[0]) * cross
    cy += (previous[1] + current[1]) * cross
  }

  if (Math.abs(twiceArea) < 1e-9) return average()

  const divisor = twiceArea * 3
  return [cx / divisor, cy / divisor]
}

/** Габариты контура в пикселях подложки. */
export function polygonBBox(points) {
  const valid = (points || []).filter(
    (point) => point && Number.isFinite(point[0]) && Number.isFinite(point[1]),
  )
  if (valid.length === 0) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const point of valid) {
    if (point[0] < minX) minX = point[0]
    if (point[1] < minY) minY = point[1]
    if (point[0] > maxX) maxX = point[0]
    if (point[1] > maxY) maxY = point[1]
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}

/** Подпись дачи: «Дача №13 — Дача Калашниковых». */
export function houseTitle(house) {
  const number = String(house && house.number ? house.number : '').trim()
  const title = String(house && house.title ? house.title : '').trim()
  const head = number ? 'Дача №' + number : 'Дача'
  return title ? head + ' — ' + title : head
}

/** Короткая подпись дачи: «№13» или «Дача без номера». */
export function houseShort(house) {
  const number = String(house && house.number ? house.number : '').trim()
  return number ? '№' + number : 'Дача без номера'
}
