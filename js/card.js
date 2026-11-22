/**
 * Карточки поверх карты: выбранная дача и выбранный участок.
 * Ссылки на страницы музея — абсолютные (`pageUrl` из контракта) и открываются
 * в родительском окне (`target="_top"`), чтобы не открывать сайт внутри iframe.
 */

import { escapeHtml, formatPeriod, houseShort, houseTitle } from './contract.js'

const FAMILY_TYPE_LABELS = {
  owned: 'Семья владела',
  resided: 'Семья проживала',
  meeting_place: 'Место встреч',
  historically_connected: 'Исторически связана',
  owner: 'Владела',
  resident: 'Проживала',
}

function row(label, value) {
  if (!value) return ''
  return '<div class="ng-card-row"><span>' + escapeHtml(label) + ':</span><b>' + escapeHtml(value) + '</b></div>'
}

function familyLinksHtml(house) {
  const links = house.familyLinks || []
  if (!links.length) return '<p class="ng-empty">Связи с семьями уточняются.</p>'

  return links
    .map((link) => {
      const period = formatPeriod(link.startYear, link.endYear)
      const kind = link.direct
        ? '<span class="is-direct">прямая связь</span>'
        : '<span class="is-computed">вычислена из записей</span>'
      const href = link.familyUrl ? escapeHtml(link.familyUrl) : ''
      const name = escapeHtml(link.familyName || 'Семья')
      const title = href
        ? '<a href="' + href + '" target="_top" rel="noopener">' + name + '</a>'
        : '<strong>' + name + '</strong>'

      return (
        '<div class="ng-link-item">' +
        title +
        '<div class="ng-link-meta">' +
        escapeHtml(FAMILY_TYPE_LABELS[link.type] || link.type || 'Связь') +
        (period ? ' · ' + escapeHtml(period) : '') +
        '</div>' +
        '<div class="ng-link-meta">' +
        kind +
        '</div></div>'
      )
    })
    .join('')
}

function eventsHtml(house) {
  const events = house.events || []
  if (!events.length) return ''
  const items = events
    .map((event) => {
      const year = event.year ? escapeHtml(event.year) + ' — ' : ''
      return '<li>' + year + escapeHtml(event.title) + '</li>'
    })
    .join('')
  return '<div class="ng-card-section"><h4>События</h4><ul class="ng-list">' + items + '</ul></div>'
}

export function renderHouseCard(container, house, ctx) {
  const photo = house.photoUrl
    ? '<img class="ng-card-photo" src="' + escapeHtml(house.photoUrl) + '" alt="' + escapeHtml(houseTitle(house)) + '" loading="lazy" />'
    : ''

  const unknownYear = house.builtYearNum
    ? ''
    : '<div class="ng-card-row"><span>Год постройки уточняется.</span></div>'

  const offMap = house.point ? '' : '<div class="ng-card-row"><span>Положение на карте уточняется.</span></div>'

  const focusPlot = house.plotId
    ? '<button type="button" class="ng-btn" data-action="focus-plot">Показать участок</button>'
    : ''

  container.innerHTML =
    '<div class="ng-card-head">' +
    '<div><span class="ng-eyebrow">Дача</span><h3>' +
    escapeHtml(house.number ? 'Дача №' + house.number : 'Дача без номера') +
    '</h3></div>' +
    '<button type="button" class="ng-card-close" data-action="close" aria-label="Закрыть">✕</button>' +
    '</div>' +
    '<div class="ng-card-body">' +
    photo +
    (house.title ? '<div class="ng-card-title">' + escapeHtml(house.title) + '</div>' : '') +
    row('Построена', house.builtYear) +
    unknownYear +
    row('Архитектор', house.architect) +
    row('Адрес', house.currentAddress) +
    row('Исторические номера', house.historicalNumbers) +
    offMap +
    '<div class="ng-card-section"><h4>Связанные семьи</h4>' +
    familyLinksHtml(house) +
    '</div>' +
    eventsHtml(house) +
    '</div>' +
    '<div class="ng-card-foot">' +
    (house.pageUrl
      ? '<a class="ng-btn ng-btn-primary" href="' +
        escapeHtml(house.pageUrl) +
        '" target="_top" rel="noopener">Открыть историю дачи →</a>'
      : '') +
    focusPlot +
    '<button type="button" class="ng-btn" data-action="close">Закрыть</button>' +
    '</div>'

  container.querySelectorAll('[data-action="close"]').forEach((button) => {
    button.addEventListener('click', () => ctx.onClose())
  })

  const focusButton = container.querySelector('[data-action="focus-plot"]')
  if (focusButton) {
    focusButton.addEventListener('click', () => ctx.onFocusPlot(house.plotId))
  }
}

export function renderPlotCard(container, plot, ctx) {
  const contract = ctx.contract || {}
  const houseById = new Map((contract.houses || []).map((house) => [house.id, house]))
  const plotById = new Map((contract.plots || []).map((item) => [item.id, item]))

  const houseIds = (plot.houseIds || []).slice()
  if (plot.houseId && houseIds.indexOf(plot.houseId) === -1) houseIds.push(plot.houseId)

  const housesHtml = houseIds.length
    ? houseIds
        .map((houseId) => {
          const house = houseById.get(houseId)
          if (!house) return ''
          return (
            '<button type="button" class="ng-result" data-house="' +
            escapeHtml(houseId) +
            '"><strong>' +
            escapeHtml(houseShort(house)) +
            '</strong><span>' +
            escapeHtml(house.title || '') +
            '</span></button>'
          )
        })
        .join('')
    : '<p class="ng-empty">Дома на участке не указаны.</p>'

  const neighbours = []
  if (plot.parentPlotId) {
    const parent = plotById.get(plot.parentPlotId)
    if (parent) neighbours.push({ plot: parent, label: 'Образован из участка' })
  }
  for (const childId of plot.childPlotIds || []) {
    const child = plotById.get(childId)
    if (child) neighbours.push({ plot: child, label: 'Из него образован участок' })
  }

  const neighboursHtml = neighbours.length
    ? '<div class="ng-card-section"><h4>Связи участка</h4>' +
      neighbours
        .map(
          (item) =>
            '<div class="ng-link-item"><a href="#" data-plot="' +
            escapeHtml(item.plot.id) +
            '">' +
            escapeHtml(item.plot.number ? 'Участок №' + item.plot.number : item.plot.title || 'Участок') +
            '</a><div class="ng-link-meta">' +
            escapeHtml(item.label) +
            '</div></div>',
        )
        .join('') +
      '</div>'
    : ''

  const links = (contract.plotLinks || []).filter(
    (link) => link.sourcePlotId === plot.id || link.targetPlotId === plot.id,
  )
  const linksHtml = links.length
    ? '<div class="ng-card-section"><h4>Разделения и объединения</h4>' +
      links
        .map((link) => {
          const otherId = link.sourcePlotId === plot.id ? link.targetPlotId : link.sourcePlotId
          const other = otherId ? plotById.get(otherId) : null
          const parts = []
          if (link.year) parts.push(escapeHtml(link.year))
          if (link.type === 'merge') parts.push('объединение')
          if (other) parts.push(escapeHtml(other.number ? 'участок №' + other.number : other.title || 'участок'))
          if (link.newOwnerName) parts.push(escapeHtml(link.newOwnerName))
          return '<div class="ng-link-item"><div class="ng-link-meta">' + parts.join(' · ') + '</div></div>'
        })
        .join('') +
      '</div>'
    : ''

  container.innerHTML =
    '<div class="ng-card-head">' +
    '<div><span class="ng-eyebrow">Участок</span><h3>' +
    escapeHtml(plot.number ? 'Участок №' + plot.number : 'Участок') +
    '</h3></div>' +
    '<button type="button" class="ng-card-close" data-action="close" aria-label="Закрыть">✕</button>' +
    '</div>' +
    '<div class="ng-card-body">' +
    (plot.title ? '<div class="ng-card-title">' + escapeHtml(plot.title) + '</div>' : '') +
    (plot.description ? '<div class="ng-card-row"><span>' + escapeHtml(plot.description) + '</span></div>' : '') +
    '<div class="ng-card-section"><h4>Дома на участке</h4>' + housesHtml + '</div>' +
    neighboursHtml +
    linksHtml +
    '</div>' +
    '<div class="ng-card-foot">' +
    '<button type="button" class="ng-btn" data-action="focus-plot">Показать на карте</button>' +
    '<button type="button" class="ng-btn" data-action="close">Закрыть</button>' +
    '</div>'

  container.querySelectorAll('[data-action="close"]').forEach((button) => {
    button.addEventListener('click', () => ctx.onClose())
  })

  const focusButton = container.querySelector('[data-action="focus-plot"]')
  if (focusButton) {
    focusButton.addEventListener('click', () => ctx.onFocusPlot(plot.id))
  }

  container.querySelectorAll('[data-house]').forEach((button) => {
    button.addEventListener('click', () => ctx.onSelectHouse(button.getAttribute('data-house')))
  })

  container.querySelectorAll('[data-plot]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault()
      ctx.onSelectPlot(button.getAttribute('data-plot'))
    })
  })
}
