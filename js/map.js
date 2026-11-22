/**
 * Инициализация Leaflet в режиме `CRS.Simple`.
 *
 * Подложка — растровая условная схема поселка 1123 × 793. Границы карты задаются
 * как `[[0, 0], [793, 1123]]`; точка контракта `[x, y]` переводится в `[793 - y, x]`.
 */

import { MAP_HEIGHT, MAP_WIDTH, planBounds } from './contract.js'

export function createMap(container, contract) {
  if (!window.L) {
    throw new Error('библиотека Leaflet не загрузилась (vendor/leaflet.js)')
  }

  const bounds = [
    [0, 0],
    [MAP_HEIGHT, MAP_WIDTH],
  ]

  const map = window.L.map(container, {
    crs: window.L.CRS.Simple,
    minZoom: -1.5,
    maxZoom: 1.5,
    zoomSnap: 0.25,
    zoomDelta: 0.5,
    wheelPxPerZoomLevel: 90,
    attributionControl: false,
    zoomControl: false,
    preferCanvas: true,
    maxBoundsViscosity: 0.8,
  })

  map.fitBounds(planBounds())
  map.setMaxBounds(window.L.latLngBounds(bounds).pad(0.2))

  // слева сверху: справа сверху открывается карточка дачи и перекрыла бы кнопки
  window.L.control.zoom({ position: 'topleft' }).addTo(map)

  const plans = Array.isArray(contract.plans) ? contract.plans : []
  const plan = plans.find((item) => item.id === contract.defaultPlanId) || plans[0] || null

  if (plan && plan.imageUrl) {
    window.L.imageOverlay(plan.imageUrl, bounds, {
      className: 'ng-plan-image',
      interactive: false,
      alt: plan.title || 'Условная схема поселка',
    }).addTo(map)
  }

  // Внутри страницы /map колесо должно прокручивать страницу, а не зумить карту:
  // зум колесом включается кликом по карте и выключается, когда курсор ушёл.
  if (document.documentElement.classList.contains('is-embedded')) {
    map.scrollWheelZoom.disable()
    map.on('click', () => map.scrollWheelZoom.enable())
    map.on('mouseout', () => map.scrollWheelZoom.disable())
  }

  // пересчёт размеров после изменения контейнера (мобильная панель, поворот экрана)
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(container)
  }
  window.addEventListener('resize', () => map.invalidateSize())

  return { map, bounds, plan }
}
