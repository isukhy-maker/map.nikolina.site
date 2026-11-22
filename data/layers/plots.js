/**
 * Векторный слой участков в формате GeoJSON.
 *
 * Данные построены из реальных контуров участков (`plots.mapShape`) в том же
 * координатном пространстве, что и подложка: 1123 × 793 px.
 *
 * ВАЖНО про координаты: GeoJSON по стандарту хранит пары `[долгота, широта]`,
 * а Leaflet в режиме `CRS.Simple` читает их как `[lng, lat]` → точка схемы
 * `[x, y]` записывается как `[x, 793 - y]`.
 *
 * Слой подключается в `data/plans.js` → `plans[].layers[]` и включается
 * галочкой в панели «Слои». Файл можно заменить на свой `.geojson`
 * (тогда в конфиге указывается `url` вместо `module`).
 *
 * Служебные строки — первая и последняя — не трогайте. Внутри обычный JSON.
 */

export const featureCollection = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { number: '28' }, geometry: { type: 'Polygon', coordinates: [[[684, 400], [758, 420], [758, 350], [684, 330]]] } },
    { type: 'Feature', properties: { number: '26' }, geometry: { type: 'Polygon', coordinates: [[[586, 470], [640, 490], [640, 420], [586, 400]]] } },
    { type: 'Feature', properties: { number: '18' }, geometry: { type: 'Polygon', coordinates: [[[297, 345], [351, 360], [351, 290], [297, 275]]] } },
    { type: 'Feature', properties: { number: '32' }, geometry: { type: 'Polygon', coordinates: [[[836, 360], [890, 380], [890, 310], [836, 290]]] } },
    { type: 'Feature', properties: { number: '70' }, geometry: { type: 'Polygon', coordinates: [[[819, 290], [873, 310], [873, 240], [819, 220]]] } },
    { type: 'Feature', properties: { number: '2' }, geometry: { type: 'Polygon', coordinates: [[[94, 360], [158, 380], [158, 310], [94, 290]]] } },
    { type: 'Feature', properties: { number: '14' }, geometry: { type: 'Polygon', coordinates: [[[128, 225], [192, 245], [192, 175], [128, 155]]] } },
    { type: 'Feature', properties: { number: '16' }, geometry: { type: 'Polygon', coordinates: [[[873, 250], [937, 270], [937, 200], [873, 180]]] } },
    { type: 'Feature', properties: { number: '' }, geometry: { type: 'Polygon', coordinates: [[[505, 305], [579, 325], [579, 255], [505, 235]]] } },
    { type: 'Feature', properties: { number: '20' }, geometry: { type: 'Polygon', coordinates: [[[365, 315], [439, 335], [439, 265], [365, 245]]] } },
    { type: 'Feature', properties: { number: '13' }, geometry: { type: 'Polygon', coordinates: [[[677, 325], [741, 345], [741, 275], [677, 255]]] } },
    { type: 'Feature', properties: { number: '22' }, geometry: { type: 'Polygon', coordinates: [[[897, 205], [955, 205], [955, 108], [897, 108]]] } },
    { type: 'Feature', properties: { number: '34' }, geometry: { type: 'Polygon', coordinates: [[[378, 400], [442, 420], [442, 350], [378, 330]]] } },
    { type: 'Feature', properties: { number: '24' }, geometry: { type: 'Polygon', coordinates: [[[647, 450], [677, 460], [677, 390], [647, 380]]] } },
    { type: 'Feature', properties: { number: '30' }, geometry: { type: 'Polygon', coordinates: [[[765, 400], [829, 420], [829, 350], [765, 330]]] } },
    { type: 'Feature', properties: { number: '12' }, geometry: { type: 'Polygon', coordinates: [[[748, 325], [812, 345], [812, 275], [748, 255]]] } },
    { type: 'Feature', properties: { number: '' }, geometry: { type: 'Polygon', coordinates: [[[458, 440], [512, 460], [512, 390], [458, 370]]] } },
    { type: 'Feature', properties: { number: '' }, geometry: { type: 'Polygon', coordinates: [[[525, 460], [579, 480], [579, 410], [525, 390]]] } },
    { type: 'Feature', properties: { number: '6' }, geometry: { type: 'Polygon', coordinates: [[[236, 425], [256, 425], [256, 355], [236, 355]]] } },
    { type: 'Feature', properties: { number: '5' }, geometry: { type: 'Polygon', coordinates: [[[263, 350], [327, 365], [327, 295], [263, 280]]] } },
    { type: 'Feature', properties: { number: '12' }, geometry: { type: 'Polygon', coordinates: [[[236, 345], [290, 360], [290, 290], [236, 275]]] } },
    { type: 'Feature', properties: { number: '33' }, geometry: { type: 'Polygon', coordinates: [[[334, 350], [398, 365], [398, 295], [334, 280]]] } },
    { type: 'Feature', properties: { number: '8' }, geometry: { type: 'Polygon', coordinates: [[[165, 425], [229, 440], [229, 370], [165, 355]]] } },
    { type: 'Feature', properties: { number: '10' }, geometry: { type: 'Polygon', coordinates: [[[165, 345], [229, 360], [229, 290], [165, 275]]] } },
  ],
}

export default featureCollection
