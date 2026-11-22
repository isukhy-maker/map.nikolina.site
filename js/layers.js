/**
 * Слои карты: участки, подписи, связи участков, дома, события.
 *
 * Все объекты создаются один раз, а `apply(state)` только показывает/скрывает
 * группы и меняет оформление — так карта не «мигает» при каждом клике.
 */

import {
  escapeHtml,
  formatPeriod,
  houseTitle,
  planBounds,
  polygonCentroid,
  toLatLng,
} from './contract.js'
import { APP_BASE } from './plans.js'

const COLORS = {
  plotStroke: '#508b79',
  plotFill: '#a2a551',
  plotStrokeActive: '#115142',
  plotFillActive: '#115142',
  accent: '#d9912a',
  link: '#ba3912',
}

const FAMILY_TYPE_LABELS = {
  owned: 'Семья владела',
  resided: 'Семья проживала',
  meeting_place: 'Место встреч',
  historically_connected: 'Исторически связана',
  owner: 'Владела',
  resident: 'Проживала',
}

function plotTooltip(plot) {
  const head = plot.number ? 'Участок №' + escapeHtml(plot.number) : escapeHtml(plot.title || 'Участок')
  const tail = plot.title && plot.number ? '<br>' + escapeHtml(plot.title) : ''
  return '<strong>' + head + '</strong>' + tail
}

export function createLayers(map, contract, handlers) {
  const groups = {
    land: window.L.layerGroup(),
    links: window.L.layerGroup(),
    labels: window.L.layerGroup(),
    events: window.L.layerGroup(),
    houses: window.L.layerGroup(),
  }

  const plotById = new Map()
  const houseById = new Map()
  const plotLayers = new Map()
  const houseMarkers = new Map()

  for (const plot of contract.plots) plotById.set(plot.id, plot)
  for (const house of contract.houses) houseById.set(house.id, house)

  /* ---------------- участки ---------------- */

  for (const plot of contract.plots) {
    if (!plot.geometry || plot.geometry.length < 3) continue
    const polygon = window.L.polygon(plot.geometry.map(toLatLng), {
      color: COLORS.plotStroke,
      weight: 1.2,
      opacity: 0.85,
      fillColor: COLORS.plotFill,
      fillOpacity: 0.1,
    })
    polygon.on('click', () => handlers.onPlotClick(plot))
    polygon.bindTooltip(plotTooltip(plot), { sticky: true, className: 'ng-tooltip' })
    polygon.addTo(groups.land)
    plotLayers.set(plot.id, polygon)
  }

  /* ---------------- подписи участков ---------------- */

  for (const plot of contract.plots) {
    if (!plot.labelPoint) continue
    const label = plot.label || plot.number
    if (!label) continue
    window.L.marker(toLatLng(plot.labelPoint), {
      interactive: false,
      keyboard: false,
      icon: window.L.divIcon({
        className: 'ng-plot-label',
        html: '<span class="ng-plot-label-inner">' + escapeHtml(label) + '</span>',
        iconSize: [0, 0],
      }),
    }).addTo(groups.labels)
  }

  /* ---------------- связи участков (разделения/объединения) ---------------- */

  for (const link of contract.plotLinks || []) {
    const source = plotById.get(link.sourcePlotId)
    const target = plotById.get(link.targetPlotId)
    if (!source || !target) continue

    const from = polygonCentroid(source.geometry)
    const to = polygonCentroid(target.geometry)
    if (!from || !to) continue

    window.L.polyline([toLatLng(from), toLatLng(to)], {
      color: COLORS.link,
      weight: 1.5,
      dashArray: '5 4',
      opacity: 0.75,
    }).addTo(groups.links)

    const middle = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2]
    const caption = link.year || (link.type === 'merge' ? 'объединение' : 'разделение')
    window.L.marker(toLatLng(middle), {
      interactive: false,
      keyboard: false,
      icon: window.L.divIcon({
        className: 'ng-link-label',
        html: '<span class="ng-link-label-inner">' + escapeHtml(caption) + '</span>',
        iconSize: [0, 0],
      }),
    }).addTo(groups.links)
  }

  /* ---------------- дома ---------------- */

  for (const house of contract.houses) {
    if (!house.point) continue

    const marker = window.L.marker(toLatLng(house.point), {
      keyboard: true,
      riseOnHover: true,
      title: houseTitle(house),
      icon: window.L.divIcon({
        className: 'ng-marker',
        html: '<span class="ng-marker-dot">' + escapeHtml(house.number || '') + '</span>',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      }),
    })

    marker.on('click', () => handlers.onHouseClick(house))
    marker.bindTooltip('<strong>' + escapeHtml(houseTitle(house)) + '</strong>', {
      direction: 'top',
      offset: [0, -16],
      className: 'ng-tooltip',
    })
    marker.addTo(groups.houses)
    houseMarkers.set(house.id, marker)
  }

  /* ---------------- события ---------------- */

  for (const house of contract.houses) {
    if (!house.point || !house.events || house.events.length === 0) continue

    const lines = house.events.map((event) => {
      const year = event.year ? escapeHtml(event.year) + ' — ' : ''
      return year + escapeHtml(event.title)
    })

    window.L.marker(toLatLng(house.point), {
      keyboard: false,
      icon: window.L.divIcon({
        className: 'ng-event-badge',
        html: String(house.events.length),
        iconSize: [18, 18],
        iconAnchor: [-8, 22],
      }),
    })
      .bindTooltip(lines.join('<br>'), { direction: 'top', offset: [0, -10], className: 'ng-tooltip' })
      .addTo(groups.events)
  }

  /* ---------------- показ групп ---------------- */

  function toggle(group, visible) {
    if (visible && !map.hasLayer(group)) group.addTo(map)
    if (!visible && map.hasLayer(group)) map.removeLayer(group)
  }

  /* ---------------- дополнительные векторные слои GeoJSON ---------------- */

  // Слои описываются в каталоге подложек (`data/plans.json` → `plans[].layers`)
  // и лежат отдельными файлами `.geojson` — код при их замене не меняется.
  const geoLayers = new Map()

  function geoStyle(config) {
    return {
      color: config.color || COLORS.plotStroke,
      weight: config.weight != null ? Number(config.weight) : 1,
      opacity: 0.9,
      fillColor: config.fillColor || config.color || COLORS.plotFill,
      fillOpacity: config.fillOpacity != null ? Number(config.fillOpacity) : 0.12,
    }
  }

  async function loadGeoJsonData(config) {
    // Слой может лежать отдельным файлом `.geojson` (поле `url`) или
    // ES-модулем с тем же GeoJSON внутри (поле `module`).
    if (config.module) {
      const module = await import(new URL(config.module, APP_BASE).href)
      return (module && (module.featureCollection || module.default)) || null
    }
    if (!config.url) return null
    const response = await fetch(new URL(config.url, APP_BASE).href, { cache: 'no-cache' })
    if (!response.ok) throw new Error('HTTP ' + response.status)
    return await response.json()
  }

  async function loadGeoJsonLayers(configs) {
    for (const layer of geoLayers.values()) {
      if (layer && map.hasLayer(layer)) map.removeLayer(layer)
    }
    geoLayers.clear()

    for (const config of configs || []) {
      if (!config || config.type !== 'geojson') continue
      try {
        const data = await loadGeoJsonData(config)
        if (!data) throw new Error('нет данных слоя')
        geoLayers.set(
          config.id,
          window.L.geoJSON(data, {
            style: () => geoStyle(config),
            interactive: false,
          }),
        )
      } catch (error) {
        geoLayers.set(config.id, null)
        if (window.console) console.warn('GeoJSON-слой «' + config.id + '» не загрузился:', error)
      }
    }

    return geoLayers
  }

  function applyGeoJson(state) {
    const visible = state.geoJson || {}
    geoLayers.forEach((layer, id) => {
      if (!layer) return
      const show = !!visible[id]
      if (show && !map.hasLayer(layer)) layer.addTo(map)
      if (!show && map.hasLayer(layer)) map.removeLayer(layer)
    })
  }

  function apply(state) {
    applyGeoJson(state)
    toggle(groups.land, state.layers.land)
    toggle(groups.labels, state.layers.land)
    toggle(groups.links, state.layers.land)
    toggle(groups.events, state.layers.events)
    toggle(groups.houses, state.layers.houses)

    // участки: выбранный и связанные с выбранной семьёй
    plotLayers.forEach((polygon, plotId) => {
      const selected = state.selectedPlotId === plotId
      const family = state.familyPlotIds.has(plotId)
      polygon.setStyle({
        color: selected ? COLORS.plotStrokeActive : family ? COLORS.accent : COLORS.plotStroke,
        weight: selected ? 2.5 : family ? 2 : 1.2,
        fillColor: selected ? COLORS.plotFillActive : COLORS.plotFill,
        fillOpacity: selected ? 0.22 : family ? 0.2 : 0.1,
      })
    })

    // дома: видимость и оформление
    houseMarkers.forEach((marker, houseId) => {
      const element = marker.getElement()
      const dot = element ? element.querySelector('.ng-marker-dot') : null
      const house = houseById.get(houseId)
      const visible = state.layers.houses && state.visibleHouseIds.has(houseId)

      if (element) element.style.display = visible ? '' : 'none'
      if (!dot || !house) return

      const classes = ['ng-marker-dot']
      if (!house.builtYearNum) classes.push('is-unknown')
      if (state.eventHouseIds.has(houseId)) classes.push('is-event')
      if (state.familyHouseIds.has(houseId)) classes.push('is-family')
      if (state.relatedHouseIds.has(houseId)) classes.push('is-related')
      if (state.selectedHouseId === houseId) classes.push('is-selected')
      if (state.dimNonFamily && !state.highlightHouseIds.has(houseId)) classes.push('is-dim')
      dot.className = classes.join(' ')
    })
  }

  /* ---------------- навигация ---------------- */

  function focusHouse(house) {
    if (!house) return
    if (house.point) {
      // выше 1 подложка 1123 px растягивается и мылится — держим масштаб 1:1
      const zoom = Math.min(Math.max(map.getZoom(), 0.75), 1)
      map.setView(toLatLng(house.point), zoom)
      return
    }
    const plot = house.plotId ? plotById.get(house.plotId) : null
    if (plot) focusPlot(plot)
  }

  function focusPlot(plot) {
    if (!plot || !plot.geometry || plot.geometry.length < 3) return
    const bounds = window.L.latLngBounds(plot.geometry.map(toLatLng))
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 1 })
  }

  function resetView() {
    map.fitBounds(planBounds())
  }

  return {
    apply,
    focusHouse,
    focusPlot,
    resetView,
    plotById,
    houseById,
    familyTypeLabels: FAMILY_TYPE_LABELS,
    formatPeriod,
    loadGeoJsonLayers,
    geoLayerCount: () => geoLayers.size,
  }
}
