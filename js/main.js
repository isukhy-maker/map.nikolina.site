/**
 * Точка входа автономного модуля карты.
 *
 * Собирает состояние (слои, период, семья, поиск, выбранный объект), связывает
 * карту, панели и карточки. Данные приходят из `data.js` (postMessage / fetch / snapshot).
 */

import { resolveData, postToParent, isEmbedded } from './data.js'
import { createMap, setBasemap } from './map.js'
import { createLayers } from './layers.js'
import { findPlan, loadPlansCatalog } from './plans.js'
import { renderHouseCard, renderPlotCard } from './card.js'
import {
  renderBasemaps,
  renderFamilies,
  renderLayers,
  renderLegend,
  renderPeriods,
  renderSearchResults,
  updateLayersHint,
} from './panels.js'

const state = {
  layers: { houses: true, land: true, events: true, families: false, historical: false, lost: false },
  planId: '',
  geoJson: {},
  periodId: 'all',
  familyId: '',
  query: '',
  selectedHouseId: null,
  selectedPlotId: null,
  relatedHouseIds: new Set(),
}

let contract = null
let layersApi = null
let mapApi = null
let catalog = null

const elements = {
  status: document.getElementById('status'),
  card: document.getElementById('card'),
  search: document.getElementById('search'),
  results: document.getElementById('search-results'),
  layers: document.getElementById('layers'),
  layersHint: document.getElementById('layers-hint'),
  basemaps: document.getElementById('basemaps'),
  periods: document.getElementById('periods'),
  family: document.getElementById('family'),
  familyHint: document.getElementById('family-hint'),
  legend: document.getElementById('legend'),
  sidebar: document.getElementById('sidebar'),
  toggleSidebar: document.getElementById('toggle-sidebar'),
}

/* ------------------------------------------------------------------ */
/* Производные наборы                                                  */
/* ------------------------------------------------------------------ */

function derive() {
  const period = (contract.periods || []).find((item) => item.id === state.periodId) || { kind: 'all', year: null }
  const periodYear = period.kind === 'today' ? new Date().getFullYear() : period.year
  const query = state.query.trim().toLowerCase()

  const visibleHouseIds = new Set()
  const familyHouseIds = new Set()
  const familyLinkedHouseIds = new Set()
  const eventHouseIds = new Set()
  const familyPlotIds = new Set()

  for (const house of contract.houses) {
    const links = house.familyLinks || []

    if (links.length) familyLinkedHouseIds.add(house.id)
    if (links.some((link) => link.familyId === state.familyId)) familyHouseIds.add(house.id)
    if ((house.events || []).length) eventHouseIds.add(house.id)

    if (!state.layers.houses) continue

    if (query) {
      const number = String(house.number || '').toLowerCase()
      const title = String(house.title || '').toLowerCase()
      if (number.indexOf(query) === -1 && title.indexOf(query) === -1) continue
    }

    if (periodYear != null && house.builtYearNum != null && house.builtYearNum > periodYear) continue

    // семья не скрывает остальные дачи, а подсвечивает свои (см. highlightHouseIds)
    visibleHouseIds.add(house.id)
  }

  if (state.familyId) {
    for (const house of contract.houses) {
      if (familyHouseIds.has(house.id) && house.plotId) familyPlotIds.add(house.plotId)
    }
  }

  return {
    visibleHouseIds,
    familyHouseIds,
    familyLinkedHouseIds,
    // что подсвечивать: выбранная семья, а без выбора — все дачи со связями с семьями
    highlightHouseIds: state.familyId ? familyHouseIds : familyLinkedHouseIds,
    eventHouseIds,
    familyPlotIds,
    dimNonFamily: state.layers.families || !!state.familyId,
  }
}

/* ------------------------------------------------------------------ */
/* Отрисовка                                                           */
/* ------------------------------------------------------------------ */

function render() {
  if (!contract || !layersApi) return
  layersApi.apply(Object.assign({}, state, derive()))
  renderCard()
}

function renderCard() {
  if (state.selectedHouseId) {
    const house = contract.houses.find((item) => item.id === state.selectedHouseId)
    if (house) {
      renderHouseCard(elements.card, house, cardContext)
      elements.card.hidden = false
      return
    }
  }

  if (state.selectedPlotId) {
    const plot = contract.plots.find((item) => item.id === state.selectedPlotId)
    if (plot) {
      renderPlotCard(elements.card, plot, cardContext)
      elements.card.hidden = false
      return
    }
  }

  elements.card.hidden = true
  elements.card.innerHTML = ''
}

const cardContext = {
  get contract() {
    return contract
  },
  onClose() {
    state.selectedHouseId = null
    state.selectedPlotId = null
    render()
  },
  onFocusPlot(plotId) {
    const plot = contract.plots.find((item) => item.id === plotId)
    if (plot) layersApi.focusPlot(plot)
  },
  onSelectHouse(houseId) {
    selectHouse(houseId)
  },
  onSelectPlot(plotId) {
    selectPlot(contract.plots.find((item) => item.id === plotId))
  },
}

/* ------------------------------------------------------------------ */
/* Выбор объектов                                                      */
/* ------------------------------------------------------------------ */

function selectHouse(houseId, focus) {
  const house = contract.houses.find((item) => item.id === houseId)
  if (!house) return

  state.selectedHouseId = houseId
  state.selectedPlotId = null

  if (focus !== false) layersApi.focusHouse(house)

  render()
  postToParent({ type: 'house-selected', houseId })
}

function selectPlot(plot) {
  if (!plot) return
  state.selectedPlotId = plot.id
  state.selectedHouseId = null
  render()
}

/* ------------------------------------------------------------------ */
/* Панели                                                              */
/* ------------------------------------------------------------------ */

function currentPlan() {
  return findPlan(catalog, state.planId) || (catalog && catalog.plans ? catalog.plans[0] : null)
}

function geoChecks() {
  const plan = currentPlan()
  const layers = (plan && plan.layers) || []
  return layers.map((layer) => ({
    label: layer.title || layer.id,
    checked: !!state.geoJson[layer.id],
    onChange: (checked) => {
      state.geoJson[layer.id] = checked
      render()
    },
  }))
}

async function applyPlan(planId) {
  const plan = findPlan(catalog, planId) || (catalog && catalog.plans ? catalog.plans[0] : null)
  if (!plan) return

  state.planId = plan.id
  setBasemap(mapApi, plan)

  state.geoJson = {}
  for (const layer of plan.layers || []) state.geoJson[layer.id] = layer.default === true
  if (layersApi) await layersApi.loadGeoJsonLayers(plan.layers || [])

  render()
}

function renderPanels() {
  renderLayers(
    elements.layers,
    state.layers,
    () => {
      updateLayersHint(elements.layersHint, state.layers)
      render()
    },
    geoChecks(),
  )
  updateLayersHint(elements.layersHint, state.layers)

  renderBasemaps(elements.basemaps, (catalog && catalog.plans) || [], state.planId, (planId) => {
    applyPlan(planId).then(() => renderPanels())
  })

  renderPeriods(elements.periods, contract.periods || [], state.periodId, (periodId) => {
    state.periodId = periodId
    renderPanels()
    render()
  })

  renderFamilies(elements.family, contract.families || [], state.familyId, (familyId) => {
    state.familyId = familyId
    elements.familyHint.hidden = !familyId
    if (familyId) {
      elements.familyHint.textContent = 'Подсвечены дачи, связанные с выбранной семьёй.'
    }
    render()
  })

  renderLegend(elements.legend)
}

/* ------------------------------------------------------------------ */
/* Поиск                                                               */
/* ------------------------------------------------------------------ */

function setupSearch() {
  elements.search.addEventListener('input', () => {
    state.query = elements.search.value
    const query = state.query.trim().toLowerCase()

    if (!query) {
      elements.results.hidden = true
      elements.results.innerHTML = ''
      render()
      return
    }

    const matches = contract.houses
      .filter((house) => {
        const number = String(house.number || '').toLowerCase()
        const title = String(house.title || '').toLowerCase()
        return number.indexOf(query) !== -1 || title.indexOf(query) !== -1
      })
      .slice(0, 8)

    renderSearchResults(elements.results, matches, (house) => {
      elements.search.value = ''
      state.query = ''
      elements.results.hidden = true
      elements.results.innerHTML = ''
      selectHouse(house.id)
    })

    render()
  })

  elements.search.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return
    const first = elements.results.querySelector('.ng-result')
    if (first) {
      event.preventDefault()
      first.click()
    }
  })
}

/* ------------------------------------------------------------------ */
/* Запуск                                                              */
/* ------------------------------------------------------------------ */

function readUrlOptions() {
  const params = new URLSearchParams(window.location.search)
  return {
    houseId: params.get('house') || '',
    related: params.get('related') === '1',
    planId: params.get('plan') || '',
    apiUrl: params.get('api') || '',
  }
}

function setupSidebarToggle() {
  if (!elements.toggleSidebar) return
  elements.toggleSidebar.addEventListener('click', () => {
    const hidden = elements.sidebar.classList.toggle('is-hidden')
    elements.toggleSidebar.setAttribute('aria-expanded', hidden ? 'false' : 'true')
    window.setTimeout(() => window.dispatchEvent(new Event('resize')), 60)
  })
}

async function boot() {
  // внутри iframe на странице /map заголовок модуля не нужен — h1 уже есть на странице
  if (isEmbedded()) document.documentElement.classList.add('is-embedded')

  const urlOptions = readUrlOptions()

  try {
    const resolved = await resolveData({ apiUrl: urlOptions.apiUrl })
    contract = resolved.contract

    const options = resolved.options || {}
    const houseId = options.houseId || urlOptions.houseId
    const related = options.related != null ? !!options.related : urlOptions.related

    mapApi = createMap(document.getElementById('map'), contract)
    layersApi = createLayers(mapApi.map, contract, {
      onPlotClick: selectPlot,
      onHouseClick: (house) => selectHouse(house.id),
    })

    // подложка берётся из каталога `data/plans.json`, а не из кода модуля
    catalog = await loadPlansCatalog(contract)
    await applyPlan(urlOptions.planId || catalog.defaultPlanId)

    renderPanels()
    setupSearch()
    setupSidebarToggle()

    // на телефоне внутри страницы панель по умолчанию свёрнута — иначе она
    // съедает половину высоты iframe и карта почти не видна
    if (isEmbedded() && window.matchMedia('(max-width: 860px)').matches) {
      elements.sidebar.classList.add('is-hidden')
      elements.toggleSidebar.setAttribute('aria-expanded', 'false')
      window.setTimeout(() => window.dispatchEvent(new Event('resize')), 60)
    }

    if (related && houseId) {
      const house = contract.houses.find((item) => item.id === houseId)
      for (const relatedId of (house && house.relatedHouseIds) || []) {
        state.relatedHouseIds.add(relatedId)
      }
    }

    elements.status.hidden = true
    render()

    if (houseId) selectHouse(houseId)

    postToParent({
      type: 'ready-state',
      counts: contract.counts || null,
      source: resolved.source,
    })
  } catch (error) {
    elements.status.hidden = false
    elements.status.className = 'ng-status is-error'
    elements.status.textContent =
      'Не удалось загрузить данные карты: ' + (error && error.message ? error.message : String(error))
  }
}

boot()
