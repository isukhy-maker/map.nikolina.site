/**
 * Получение данных карты. Три режима (по приоритету):
 *
 *  1. postMessage — страница `/map` на сайте музея передаёт готовый контракт
 *     (основной режим при встраивании в iframe);
 *  2. fetch — модуль сам запрашивает `api/map/export` (CORS на стороне сайта открыт);
 *  3. snapshot — рядом с модулем лежит `data.json` (полностью автономная работа).
 */

import {
  DEFAULT_API_URL,
  MESSAGE_NAMESPACE,
  PARENT_ORIGINS,
  PARENT_WAIT_MS,
  SNAPSHOT_URL,
} from './config.js'
import { MAP_CONTRACT_FORMAT, MAP_CONTRACT_VERSION } from './contract.js'

/** Модуль открыт внутри iframe. */
export function isEmbedded() {
  try {
    return !!window.parent && window.parent !== window
  } catch (error) {
    return false
  }
}

/** Отправить сообщение родительской странице (если она есть). */
export function postToParent(message) {
  if (!isEmbedded()) return
  try {
    window.parent.postMessage(Object.assign({ namespace: MESSAGE_NAMESPACE }, message), '*')
  } catch (error) {
    /* родитель недоступен — не мешаем карте работать */
  }
}

function originAllowed(origin) {
  if (!origin) return false
  if (origin === window.location.origin) return true
  return PARENT_ORIGINS.indexOf(origin) !== -1
}

/**
 * Ждёт от родителя сообщение `data` (готовый контракт) или `init` (адрес API).
 * Возвращает `null`, если родитель молчит дольше `timeoutMs`.
 */
function waitForParent(timeoutMs) {
  return new Promise((resolve) => {
    let settled = false

    const finish = (value) => {
      if (settled) return
      settled = true
      window.removeEventListener('message', onMessage)
      clearTimeout(timer)
      resolve(value)
    }

    function onMessage(event) {
      if (!originAllowed(event.origin)) return
      const data = event.data
      if (!data || data.namespace !== MESSAGE_NAMESPACE) return

      if (data.type === 'data' && data.contract) {
        finish({ contract: data.contract, options: data.options || {}, apiUrl: data.apiUrl || '' })
        return
      }
      if (data.type === 'init') {
        finish({ contract: null, options: data.options || {}, apiUrl: data.apiUrl || '' })
      }
    }

    const timer = setTimeout(() => finish(null), timeoutMs)
    window.addEventListener('message', onMessage)

    // сообщаем родителю, что модуль готов принимать данные
    postToParent({ type: 'ready' })
  })
}

/** Проверка, что пришли именно данные карты и модуль их понимает. */
export function validateContract(contract) {
  if (!contract || contract.format !== MAP_CONTRACT_FORMAT) {
    throw new Error('неизвестный формат данных карты')
  }
  if (Number(contract.version) > MAP_CONTRACT_VERSION) {
    throw new Error('данные новее, чем модуль карты — обновите модуль')
  }
  if (!Array.isArray(contract.plots) || !Array.isArray(contract.houses)) {
    throw new Error('в данных карты нет участков или домов')
  }
  return contract
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-cache' })
  if (!response.ok) throw new Error('HTTP ' + response.status + ' — ' + url)
  return await response.json()
}

/**
 * Возвращает `{ contract, options, source }`.
 * `options` — параметры от родительской страницы: `{ houseId, related }`.
 */
export async function resolveData(options) {
  const settings = options || {}
  const embedded = isEmbedded()
  const parent = embedded ? await waitForParent(PARENT_WAIT_MS) : null

  if (parent && parent.contract) {
    return {
      contract: validateContract(parent.contract),
      options: parent.options || {},
      source: 'postMessage',
    }
  }

  const apiUrl = (parent && parent.apiUrl) || settings.apiUrl || DEFAULT_API_URL
  const parentOptions = (parent && parent.options) || {}

  try {
    return { contract: validateContract(await fetchJson(apiUrl)), options: parentOptions, source: 'fetch' }
  } catch (error) {
    // запасной вариант — снимок рядом с модулем
    const snapshot = await fetchJson(SNAPSHOT_URL)
    return { contract: validateContract(snapshot), options: parentOptions, source: 'snapshot' }
  }
}
