/**
 * Панели управления: слои, периоды, фильтр семьи, легенда, результаты поиска.
 * Панели строятся обычным DOM — без фреймворков, чтобы модуль оставался статическим.
 */

import { escapeHtml, houseShort } from './contract.js'

const LAYER_DEFS = [
  { id: 'houses', label: 'Дома' },
  { id: 'land', label: 'Земля' },
  { id: 'events', label: 'События' },
  { id: 'families', label: 'Семьи' },
  { id: 'historical', label: 'Исторические места', hint: 'Сведения об исторических местах уточняются.' },
  { id: 'lost', label: 'Утраченные здания', hint: 'Сведения об утраченных зданиях уточняются.' },
]

export function renderLayers(container, layers, onChange, extra) {
  container.innerHTML = ''
  for (const def of LAYER_DEFS) {
    const label = document.createElement('label')
    label.className = 'ng-check'

    const input = document.createElement('input')
    input.type = 'checkbox'
    input.checked = !!layers[def.id]
    input.addEventListener('change', () => {
      layers[def.id] = input.checked
      onChange()
    })

    label.appendChild(input)
    label.appendChild(document.createTextNode(def.label))
    container.appendChild(label)
  }

  // дополнительные слои, которые описывает каталог подложек (например, GeoJSON)
  for (const def of extra || []) {
    const label = document.createElement('label')
    label.className = 'ng-check'

    const input = document.createElement('input')
    input.type = 'checkbox'
    input.checked = !!def.checked
    input.addEventListener('change', () => def.onChange(input.checked))

    label.appendChild(input)
    label.appendChild(document.createTextNode(def.label))
    container.appendChild(label)
  }
}

export function updateLayersHint(hint, layers) {
  const lines = []
  if (layers.events) lines.push('События подсвечивают дома с историческими событиями.')
  if (layers.families) lines.push('Дачи без связей с семьями приглушаются.')
  if (layers.historical) lines.push('Сведения об исторических местах уточняются.')
  if (layers.lost) lines.push('Сведения об утраченных зданиях уточняются.')
  hint.innerHTML = lines.map((line) => escapeHtml(line)).join('<br>')
  hint.hidden = lines.length === 0
}

export function renderPeriods(container, periods, activeId, onChange) {
  container.innerHTML = ''
  for (const period of periods) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'ng-chip' + (period.id === activeId ? ' is-active' : '')
    button.textContent = period.label
    button.addEventListener('click', () => onChange(period.id))
    container.appendChild(button)
  }
}

export function renderFamilies(select, families, activeId, onChange) {
  select.innerHTML = ''

  const all = document.createElement('option')
  all.value = ''
  all.textContent = 'Все семьи'
  select.appendChild(all)

  const sorted = families
    .slice()
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ru'))

  for (const family of sorted) {
    const option = document.createElement('option')
    option.value = family.id
    option.textContent = family.name || 'Семья без названия'
    select.appendChild(option)
  }

  select.value = activeId || ''
  select.onchange = () => onChange(select.value)
}

export function renderLegend(container) {
  const items = [
    { color: '#3f5144', text: 'Дача с историей' },
    { color: '#8fa08f', text: 'Данные уточняются (пунктир)' },
    { color: '#7a6a2f', text: 'Дом с событием' },
    { color: '#115142', ring: true, text: 'Связанная семья' },
    { line: true, text: 'Разделение участка' },
  ]

  container.innerHTML = items
    .map((item) => {
      const swatch = item.line
        ? '<span class="ng-swatch is-line"></span>'
        : '<span class="ng-swatch" style="background:' +
          item.color +
          (item.ring ? ';box-shadow:0 0 0 2px #d9912a' : '') +
          '"></span>'
      return '<li>' + swatch + '<span>' + escapeHtml(item.text) + '</span></li>'
    })
    .join('')
}

export function renderBasemaps(container, plans, activeId, onSelect) {
  container.innerHTML = ''

  const usable = (plans || []).filter((plan) => plan.status === 'active')
  const archived = (plans || []).filter((plan) => plan.status === 'archive')

  for (const plan of usable) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'ng-basemap' + (plan.id === activeId ? ' is-active' : '')

    const title = document.createElement('strong')
    title.textContent = plan.title || plan.id
    button.appendChild(title)

    const meta = document.createElement('span')
    meta.textContent = [plan.year, plan.format ? String(plan.format).toUpperCase() : '']
      .filter(Boolean)
      .join(' · ')
    if (meta.textContent) button.appendChild(meta)

    button.addEventListener('click', () => onSelect(plan.id))
    container.appendChild(button)
  }

  if (!archived.length) return

  const block = document.createElement('div')
  block.className = 'ng-basemap-archive'

  const heading = document.createElement('h3')
  heading.textContent = 'Архивные оригиналы'
  block.appendChild(heading)

  const hint = document.createElement('p')
  hint.className = 'ng-hint'
  hint.textContent =
    'Хранятся для сверки и не подставляются как подложка, пока не откалиброваны по опорным точкам.'
  block.appendChild(hint)

  for (const plan of archived) {
    const link = document.createElement('a')
    link.className = 'ng-basemap-original'
    link.href = plan.image
    link.target = '_blank'
    link.rel = 'noopener'
    link.textContent = plan.title + (plan.width ? ' · ' + plan.width + '×' + plan.height : '')
    block.appendChild(link)
  }

  container.appendChild(block)
}

export function renderSearchResults(container, houses, onPick) {
  container.innerHTML = ''

  if (!houses.length) {
    const empty = document.createElement('p')
    empty.className = 'ng-empty'
    empty.textContent = 'Ничего не найдено.'
    container.appendChild(empty)
    container.hidden = false
    return
  }

  for (const house of houses) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'ng-result'
    button.innerHTML =
      '<strong>' +
      escapeHtml(houseShort(house)) +
      '</strong><span>' +
      escapeHtml(house.title || '') +
      '</span>' +
      (house.point ? '' : '<em>не на карте</em>')
    button.addEventListener('click', () => onPick(house))
    container.appendChild(button)
  }

  container.hidden = false
}
