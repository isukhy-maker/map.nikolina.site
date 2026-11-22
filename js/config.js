/**
 * Настройки автономного модуля карты.
 *
 * Модуль живёт на GitHub Pages и не знает, где именно развернут сайт-музей,
 * поэтому адрес API задан здесь. Родительская страница может передать свой
 * адрес через postMessage (`init.apiUrl`) — он важнее значения по умолчанию.
 */

/** Пространство имён сообщений между страницей `/map` и этим модулем. */
export const MESSAGE_NAMESPACE = 'nikolina-map'

/** Адрес контракта карты на сайте музея. */
export const DEFAULT_API_URL = 'https://nikolina.site/nikolina-houses-2/api/map/export'

/** Локальный снимок данных (режим «snapshot», если API недоступен). */
export const SNAPSHOT_URL = './data.json'

/** Origin, сообщения от которых принимаются. */
export const PARENT_ORIGINS = ['https://nikolina.site', 'https://www.nikolina.site']

/** Сколько ждать данные от родительской страницы, прежде чем грузить самим. */
export const PARENT_WAIT_MS = 3000
