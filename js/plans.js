/**
 * Каталог картографических подложек.
 *
 * Подложки хранятся отдельно от интерактивной геометрии — в файле
 * `map-app/data/plans.json`. Чтобы заменить изображение, достаточно поправить
 * этот файл (и увеличить `version`), код модуля менять не нужно.
 *
 * Координатное пространство одно и то же для всех подложек: пиксели схемы
 * 1123 × 793, начало координат — левый верхний угол. Подложка, у которой
 * заявлена другая система координат, другие размеры, другие границы или
 * незакрытая калибровка, НЕ применяется автоматически (см. `checkPlan`).
 */

import { MAP_HEIGHT, MAP_WIDTH } from './contract.js'

/** Корень модуля (`map-app/`) — относительно него задаются пути в конфиге. */
export const APP_BASE = new URL('../', import.meta.url)

/** Конфигурационный файл каталога подложек. */
export const PLANS_URL = new URL('./data/plans.js', APP_BASE).href

/** Идентификатор координатного пространства схемы. */
export const SPACE_CRS = 'simple'
export const SPACE_ID = 'simple-1123x793'

/** Адрес изображения с версией — чтобы браузер не показал старый кэш. */
export function planImageUrl(plan) {
  const url = String((plan && plan.image) || '')
  if (!url) return ''
  const version = plan && plan.version != null ? String(plan.version) : ''
  if (!version) return url
  return url + (url.indexOf('?') === -1 ? '?' : '&') + 'v=' + encodeURIComponent(version)
}

/** Границы подложки в формате Leaflet `[[lat, lng], [lat, lng]]`. */
export function planBoundsLatLng(plan) {
  const box = (plan && plan.bounds) || null
  if (!box) {
    return [
      [0, 0],
      [MAP_HEIGHT, MAP_WIDTH],
    ]
  }
  const x = Number(box.x) || 0
  const y = Number(box.y) || 0
  const width = Number(box.width) || MAP_WIDTH
  const height = Number(box.height) || MAP_HEIGHT
  return [
    [MAP_HEIGHT - (y + height), x],
    [MAP_HEIGHT - y, x + width],
  ]
}

/**
 * Проверка совместимости подложки с координатным пространством схемы.
 * Возвращает список проблем: если он не пуст, подложку ставить нельзя.
 */
export function checkPlan(plan, space) {
  const problems = []
  if (!plan) return { ok: false, problems: ['подложка не найдена в каталоге'] }

  if (!plan.image) problems.push('не задан адрес изображения (image)')
  if (plan.status === 'archive') {
    problems.push('это архивный оригинал — он не привязан к координатной сетке схемы')
  }

  const crs = plan.crs || SPACE_CRS
  if (crs !== (space.crs || SPACE_CRS)) {
    problems.push('другая система координат: «' + crs + '», нужна «' + (space.crs || SPACE_CRS) + '»')
  }

  const width = Number(space.width) || MAP_WIDTH
  const height = Number(space.height) || MAP_HEIGHT
  if (plan.width != null && Number(plan.width) !== width) {
    problems.push('ширина ' + plan.width + ' px не совпадает с ' + width + ' px')
  }
  if (plan.height != null && Number(plan.height) !== height) {
    problems.push('высота ' + plan.height + ' px не совпадает с ' + height + ' px')
  }

  const box = plan.bounds
  if (!box) {
    problems.push('не заданы границы подложки (bounds)')
  } else if (
    Number(box.x) !== 0 ||
    Number(box.y) !== 0 ||
    Number(box.width) !== width ||
    Number(box.height) !== height
  ) {
    problems.push('границы подложки не совпадают с координатным пространством схемы')
  }

  const calibration = plan.calibration || {}
  if (calibration.required && !calibration.confirmed) {
    problems.push('не подтверждена калибровка' + (calibration.note ? ': ' + calibration.note : ''))
  }

  return { ok: problems.length === 0, problems }
}

/** Можно ли поставить подложку на карту. */
export function isPlanUsable(plan, space) {
  return plan && plan.status === 'active' && checkPlan(plan, space).ok
}

/** Найти подложку по идентификатору. */
export function findPlan(catalog, planId) {
  if (!catalog || !Array.isArray(catalog.plans)) return null
  return catalog.plans.find((plan) => plan.id === planId) || null
}

/** Вторая подложка той же пары (архивный оригинал ↔ реконструкция). */
export function pairOf(catalog, plan) {
  if (!catalog || !plan || !plan.pairId) return null
  return catalog.plans.find((item) => item.pairId === plan.pairId && item.id !== plan.id) || null
}

/** Координатное пространство каталога (с запасными значениями). */
export function catalogSpace(catalog) {
  const space = (catalog && catalog.space) || {}
  return {
    id: space.id || SPACE_ID,
    crs: space.crs || SPACE_CRS,
    unit: space.unit || 'px',
    origin: space.origin || 'top-left',
    width: Number(space.width) || MAP_WIDTH,
    height: Number(space.height) || MAP_HEIGHT,
  }
}

/** Каталог из контракта — запасной вариант, если `plans.json` недоступен. */
function catalogFromContract(contract) {
  const plans = (contract && Array.isArray(contract.plans) ? contract.plans : []).map((plan) => ({
    id: plan.id,
    title: plan.title || plan.id,
    kind: 'reconstructed',
    year: '',
    pairId: '',
    image: plan.imageUrl || '',
    format: '',
    width: plan.width || MAP_WIDTH,
    height: plan.height || MAP_HEIGHT,
    bounds: { x: 0, y: 0, width: MAP_WIDTH, height: MAP_HEIGHT },
    crs: SPACE_CRS,
    version: '',
    status: 'active',
    attribution: plan.attribution || '',
    sourceDocument: null,
    calibration: { required: false, confirmed: true, note: '' },
    layers: [],
  }))

  return {
    format: 'nikolina-map-plans',
    version: 1,
    space: { id: SPACE_ID, crs: SPACE_CRS, unit: 'px', origin: 'top-left', width: MAP_WIDTH, height: MAP_HEIGHT },
    defaultPlanId: (contract && contract.defaultPlanId) || (plans[0] && plans[0].id) || '',
    plans,
    fallback: true,
  }
}

/** Загрузить каталог подложек; при ошибке — собрать его из контракта. */
export async function loadPlansCatalog(contract) {
  try {
    // Каталог — обычный конфигурационный файл с данными (ES-модуль, чтобы он
    // отдавался и статикой Chatium, и GitHub Pages). Метка времени в адресе
    // гарантирует, что редактор увидит свежий каталог сразу после публикации,
    // а не закешированную копию GitHub Pages.
    const module = await import(PLANS_URL + '?t=' + Date.now())
    const raw = (module && (module.plansCatalog || module.default)) || null
    if (!raw || !Array.isArray(raw.plans) || raw.plans.length === 0) {
      throw new Error('в каталоге нет подложек')
    }
    return Object.assign({ fallback: false }, raw)
  } catch (error) {
    if (window.console) console.warn('Каталог подложек не загрузился, беру подложки из контракта:', error)
    return catalogFromContract(contract)
  }
}
