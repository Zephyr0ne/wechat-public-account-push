import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import axios from 'axios'
import dayjs from 'dayjs'
import tz from 'dayjs/plugin/timezone.js'
import utc from 'dayjs/plugin/utc.js'
import sharp from 'sharp'
import { JSDOM } from 'jsdom'
import config from '../../config/exp-config.js'

dayjs.extend(utc)
dayjs.extend(tz)

const currentFileName = fileURLToPath(import.meta.url)
const currentDirName = path.dirname(currentFileName)
const PROJECT_ROOT = path.resolve(currentDirName, '../..')
const IMAGE_EXT_REG = /\.(png|jpe?g|webp|gif)$/i
const DEFAULT_LOCAL_DIR = 'runtime/sample-clothes'
const DEFAULT_OUTPUT_DIR = 'runtime/outfits'
const DEFAULT_CATEGORY_FOLDERS = ['短袖', '毛衣', '卫衣', '羽绒外套', '大衣', '裙子', '休闲裤', '牛仔裤', '背带裤', '鞋', '包']
const BACKGROUND_TOLERANCE = 34
const DEFAULT_TIMEZONE = 'Asia/Shanghai'
const IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload'
const IMGBB_MIN_EXPIRATION_SECONDS = 60
const IMGBB_MAX_EXPIRATION_SECONDS = 15552000
const SVG_FONT_FAMILY = 'Noto Sans CJK SC, Noto Sans SC, PingFang SC, Microsoft YaHei, sans-serif'

const ROLE_BOX = {
  上装: {
    left: 280, top: 360, width: 340, height: 300,
  },
  下装: {
    left: 300, top: 575, width: 300, height: 455,
  },
  外套: {
    left: 245, top: 330, width: 410, height: 365,
  },
  鞋: {
    left: 325, top: 990, width: 250, height: 145,
  },
  包: {
    left: 625, top: 705, width: 180, height: 165,
  },
}

const COMPOSITE_ROLE_ORDER = ['下装', '鞋', '上装', '外套', '包']

const SAMPLE_CLOTHES = [
  {
    category: '短袖', file: 'white-t-shirt.png', label: '白色短袖', shape: 'tshirt', primary: '#f7f5ee', secondary: '#25324a',
  },
  {
    category: '毛衣', file: 'green-sweater.png', label: '绿色毛衣', shape: 'sweater', primary: '#758b62', secondary: '#4d6045',
  },
  {
    category: '卫衣', file: 'gray-hoodie.png', label: '灰色卫衣', shape: 'hoodie', primary: '#c9c7bf', secondary: '#5b6470',
  },
  {
    category: '羽绒外套', file: 'silver-down-jacket.png', label: '银色羽绒外套', shape: 'puffer', primary: '#d9d9d2', secondary: '#8f969a',
  },
  {
    category: '大衣', file: 'black-coat.png', label: '黑灰大衣', shape: 'coat', primary: '#44484b', secondary: '#1e2022',
  },
  {
    category: '裙子', file: 'black-skirt.png', label: '黑色裙子', shape: 'skirt', primary: '#33363d', secondary: '#6d727e',
  },
  {
    category: '休闲裤', file: 'khaki-pants.png', label: '卡其休闲裤', shape: 'pants', primary: '#b9ad8b', secondary: '#7b745d',
  },
  {
    category: '牛仔裤', file: 'blue-jeans.png', label: '蓝色牛仔裤', shape: 'pants', primary: '#4f667b', secondary: '#2f4051',
  },
  {
    category: '背带裤', file: 'denim-overalls.png', label: '牛仔背带裤', shape: 'overalls', primary: '#5e7280', secondary: '#34434d',
  },
  {
    category: '鞋', file: 'white-sneakers.png', label: '白色运动鞋', shape: 'shoes', primary: '#f3f1e7', secondary: '#222831',
  },
  {
    category: '包', file: 'brown-bag.png', label: '棕色包', shape: 'bag', primary: '#9a7251', secondary: '#5e422e',
  },
]

const resolveProjectPath = (targetPath) => {
  if (!targetPath) {
    return targetPath
  }
  return path.isAbsolute(targetPath) ? targetPath : path.resolve(PROJECT_ROOT, targetPath)
}

const exists = async (targetPath) => fs.access(targetPath).then(() => true).catch(() => false)

const escapeXml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;')

const splitText = (value, maxLength) => {
  const chars = [...String(value || '')]
  const lines = []
  let line = ''
  chars.forEach((char) => {
    if (line.length >= maxLength) {
      lines.push(line)
      line = ''
    }
    line += char
  })
  if (line) {
    lines.push(line)
  }
  return lines
}

const svgTextLines = (value, x, y, options = {}) => {
  const {
    maxLength = 24,
    lineHeight = 32,
    size = 24,
    weight = 500,
    fill = '#3f454f',
  } = options
  return splitText(value, maxLength).map((line, index) => (
    `<text x="${x}" y="${y + index * lineHeight}" font-family="${SVG_FONT_FAMILY}" font-size="${size}" font-weight="${weight}" fill="${fill}">${escapeXml(line)}</text>`
  )).join('')
}

const encodeObjectKey = (key) => key.split('/').map((part) => encodeURIComponent(part)).join('/')

const stripQuery = (value) => String(value || '').split('?')[0].split('#')[0]

const getNameFromUrl = (url) => decodeURIComponent(path.basename(stripQuery(url))).replace(IMAGE_EXT_REG, '')

const buildAssetUrl = (asset, baseUrl = '') => {
  if (!asset) {
    return ''
  }
  if (/^https?:\/\//i.test(asset) || path.isAbsolute(asset)) {
    return asset
  }
  if (/^https?:\/\//i.test(baseUrl)) {
    return new URL(encodeObjectKey(asset), baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).href
  }
  return resolveProjectPath(asset)
}

const addCatalogItem = (catalog, category, item) => {
  if (!category || !item || !item.url) {
    return
  }
  if (!catalog[category]) {
    catalog[category] = []
  }
  catalog[category].push({
    category,
    name: item.name || getNameFromUrl(item.url),
    url: item.url,
  })
}

const normalizeCatalog = (rawCatalog, baseUrl = '') => {
  const catalog = {}
  const data = rawCatalog && rawCatalog.categories ? rawCatalog.categories : rawCatalog
  const finalBaseUrl = rawCatalog && rawCatalog.baseUrl ? rawCatalog.baseUrl : baseUrl

  if (Array.isArray(data)) {
    data.forEach((item) => {
      addCatalogItem(catalog, item.category, {
        name: item.name,
        url: buildAssetUrl(item.url || item.path, finalBaseUrl),
      })
    })
    return catalog
  }

  Object.keys(data || {}).forEach((category) => {
    const items = Array.isArray(data[category]) ? data[category] : []
    items.forEach((item) => {
      if (typeof item === 'string') {
        addCatalogItem(catalog, category, {
          url: buildAssetUrl(item, finalBaseUrl),
        })
      } else {
        addCatalogItem(catalog, category, {
          name: item.name,
          url: buildAssetUrl(item.url || item.path, finalBaseUrl),
        })
      }
    })
  })
  return catalog
}

const createSampleSvg = (item) => {
  const {
    shape, primary, secondary,
  } = item
  const shapeMap = {
    tshirt: `
      <path d="M104 76 L132 54 H188 L216 76 L258 118 L226 152 L204 130 V245 H116 V130 L94 152 L62 118 Z" fill="${primary}" stroke="${secondary}" stroke-width="8" stroke-linejoin="round"/>
      <path d="M136 62 Q160 84 184 62" fill="none" stroke="${secondary}" stroke-width="8" stroke-linecap="round"/>
    `,
    hoodie: `
      <path d="M120 80 Q160 42 200 80 L226 250 H94 Z" fill="${primary}" stroke="${secondary}" stroke-width="8" stroke-linejoin="round"/>
      <path d="M104 94 L62 142 L92 174 L116 142" fill="${primary}" stroke="${secondary}" stroke-width="8" stroke-linejoin="round"/>
      <path d="M216 94 L258 142 L228 174 L204 142" fill="${primary}" stroke="${secondary}" stroke-width="8" stroke-linejoin="round"/>
      <path d="M132 92 Q160 116 188 92" fill="none" stroke="${secondary}" stroke-width="8" stroke-linecap="round"/>
      <path d="M160 110 V174" stroke="${secondary}" stroke-width="5" stroke-linecap="round" opacity=".6"/>
    `,
    sweater: `
      <path d="M112 78 H208 L232 246 H88 Z" fill="${primary}" stroke="${secondary}" stroke-width="8" stroke-linejoin="round"/>
      <path d="M110 88 L58 176 L88 200 L118 140" fill="${primary}" stroke="${secondary}" stroke-width="8" stroke-linejoin="round"/>
      <path d="M210 88 L262 176 L232 200 L202 140" fill="${primary}" stroke="${secondary}" stroke-width="8" stroke-linejoin="round"/>
      <path d="M126 82 Q160 108 194 82" fill="none" stroke="${secondary}" stroke-width="8" stroke-linecap="round"/>
      <path d="M96 220 H224" stroke="${secondary}" stroke-width="6" opacity=".45"/>
    `,
    puffer: `
      <path d="M104 74 H216 L250 142 L222 166 L212 250 H108 L98 166 L70 142 Z" fill="${primary}" stroke="${secondary}" stroke-width="8" stroke-linejoin="round"/>
      <path d="M160 78 V250 M108 122 H212 M104 164 H216 M108 206 H212" stroke="${secondary}" stroke-width="6" opacity=".55"/>
      <path d="M130 76 Q160 102 190 76" fill="none" stroke="${secondary}" stroke-width="8" stroke-linecap="round"/>
    `,
    coat: `
      <path d="M102 64 H218 L244 258 H76 Z" fill="${primary}" stroke="${secondary}" stroke-width="8" stroke-linejoin="round"/>
      <path d="M160 68 V258" stroke="${secondary}" stroke-width="7"/>
      <path d="M120 72 L160 124 L200 72" fill="none" stroke="${secondary}" stroke-width="8" stroke-linejoin="round"/>
      <path d="M106 116 L72 194 M214 116 L248 194" stroke="${secondary}" stroke-width="8" stroke-linecap="round"/>
    `,
    skirt: `
      <path d="M116 82 H204 L248 250 H72 Z" fill="${primary}" stroke="${secondary}" stroke-width="8" stroke-linejoin="round"/>
      <path d="M116 104 H204 M138 110 L120 240 M160 110 V244 M182 110 L204 240" stroke="${secondary}" stroke-width="5" opacity=".45"/>
    `,
    pants: `
      <path d="M108 58 H212 L224 260 H172 L160 130 L148 260 H96 Z" fill="${primary}" stroke="${secondary}" stroke-width="8" stroke-linejoin="round"/>
      <path d="M160 64 V132 M116 98 H204" stroke="${secondary}" stroke-width="6" opacity=".55"/>
      <circle cx="160" cy="82" r="5" fill="${secondary}"/>
    `,
    overalls: `
      <path d="M126 52 H194 L206 122 H114 Z" fill="${primary}" stroke="${secondary}" stroke-width="8" stroke-linejoin="round"/>
      <path d="M108 116 H212 L224 260 H172 L160 145 L148 260 H96 Z" fill="${primary}" stroke="${secondary}" stroke-width="8" stroke-linejoin="round"/>
      <path d="M130 54 L116 118 M190 54 L204 118 M160 118 V145" stroke="${secondary}" stroke-width="7" stroke-linecap="round"/>
    `,
    shoes: `
      <path d="M54 164 Q98 134 144 162 L148 198 H48 Q36 190 54 164 Z" fill="${primary}" stroke="${secondary}" stroke-width="8" stroke-linejoin="round"/>
      <path d="M174 164 Q218 134 264 162 L268 198 H168 Q156 190 174 164 Z" fill="${primary}" stroke="${secondary}" stroke-width="8" stroke-linejoin="round"/>
      <path d="M70 176 H136 M190 176 H256" stroke="${secondary}" stroke-width="5" opacity=".55"/>
    `,
    bag: `
      <path d="M102 120 H218 L238 248 H82 Z" fill="${primary}" stroke="${secondary}" stroke-width="8" stroke-linejoin="round"/>
      <path d="M122 122 Q160 58 198 122" fill="none" stroke="${secondary}" stroke-width="10" stroke-linecap="round"/>
      <path d="M106 154 H214" stroke="${secondary}" stroke-width="6" opacity=".45"/>
    `,
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
      <rect width="320" height="320" fill="none"/>
      ${shapeMap[shape] || shapeMap.tshirt}
    </svg>
  `
}

export const ensureSampleClothes = async (localDir = DEFAULT_LOCAL_DIR) => {
  const absoluteDir = resolveProjectPath(localDir)
  await fs.mkdir(absoluteDir, { recursive: true })
  await Promise.all(SAMPLE_CLOTHES.map(async (item) => {
    const categoryDir = path.join(absoluteDir, item.category)
    const filePath = path.join(categoryDir, item.file)
    await fs.mkdir(categoryDir, { recursive: true })
    if (await exists(filePath)) {
      return
    }
    await sharp(Buffer.from(createSampleSvg(item))).png().toFile(filePath)
  }))
  return absoluteDir
}

const loadLocalCatalog = async (localDir = DEFAULT_LOCAL_DIR) => {
  const absoluteDir = resolveProjectPath(localDir)
  await ensureSampleClothes(absoluteDir)
  const entries = await fs.readdir(absoluteDir, { withFileTypes: true }).catch(() => [])
  const catalog = {}

  await Promise.all(entries.filter((entry) => entry.isDirectory()).map(async (entry) => {
    const categoryDir = path.join(absoluteDir, entry.name)
    const files = await fs.readdir(categoryDir, { withFileTypes: true }).catch(() => [])
    files.filter((file) => file.isFile() && IMAGE_EXT_REG.test(file.name)).forEach((file) => {
      addCatalogItem(catalog, entry.name, {
        name: file.name.replace(IMAGE_EXT_REG, ''),
        url: path.join(categoryDir, file.name),
      })
    })
  }))

  return catalog
}

const loadManifestCatalog = async (manifestUrl) => {
  const res = await axios.get(manifestUrl, {
    headers: {
      'Content-Type': 'application/json',
    },
  })
  const baseUrl = manifestUrl.substring(0, manifestUrl.lastIndexOf('/') + 1)
  return normalizeCatalog(res.data, baseUrl)
}

const loadCosCatalog = async (outfitConfig) => {
  const {
    cosBaseUrl,
    categoryFolders = DEFAULT_CATEGORY_FOLDERS,
    maxKeys = 100,
  } = outfitConfig
  const catalog = {}
  const baseUrl = String(cosBaseUrl || '').replace(/\/$/, '')

  await Promise.all(categoryFolders.map(async (category) => {
    const prefix = `${category}/`
    const listUrl = `${baseUrl}/?prefix=${encodeURIComponent(prefix)}&delimiter=&max-keys=${maxKeys}`
    const res = await axios.get(listUrl)
    const dom = new JSDOM(res.data, { contentType: 'text/xml' })
    const keys = [...dom.window.document.getElementsByTagName('Key')]
      .map((node) => node.textContent)
      .filter((key) => IMAGE_EXT_REG.test(key))

    keys.forEach((key) => {
      addCatalogItem(catalog, category, {
        name: getNameFromUrl(key),
        url: `${baseUrl}/${encodeObjectKey(key)}`,
      })
    })
  }))

  return catalog
}

const hasCatalogItems = (catalog) => Object.keys(catalog || {}).some((category) => (
  Array.isArray(catalog[category]) && catalog[category].length
))

const buildDefaultManifestUrl = (cosBaseUrl, manifestFile = 'manifest.json') => (
  new URL(manifestFile, String(cosBaseUrl || '').endsWith('/') ? cosBaseUrl : `${cosBaseUrl}/`).href
)

export const loadOutfitCatalog = async (outfitConfig = {}) => {
  if (outfitConfig.manifestUrl) {
    return loadManifestCatalog(outfitConfig.manifestUrl)
  }
  if (outfitConfig.source === 'cos' && outfitConfig.cosBaseUrl) {
    try {
      const catalog = await loadCosCatalog(outfitConfig)
      if (hasCatalogItems(catalog)) {
        return catalog
      }
    } catch {
      console.log('云端衣橱目录列表不可用，尝试读取manifest.json')
    }
    return loadManifestCatalog(buildDefaultManifestUrl(outfitConfig.cosBaseUrl, outfitConfig.manifestFile))
  }
  return loadLocalCatalog(outfitConfig.localDir || DEFAULT_LOCAL_DIR)
}

export const parseTemperature = (value) => {
  const matched = String(value || '').match(/-?\d+(\.\d+)?/)
  return matched ? Number(matched[0]) : null
}

const hasWeather = (weather, keywords) => keywords.some((keyword) => String(weather || '').indexOf(keyword) !== -1)

const buildReason = ({
  weather, minTemperature, maxTemperature, windScale, averageTemperature,
}) => {
  const parts = []
  if (weather) {
    parts.push(`天气${weather}`)
  }
  if (minTemperature !== null && maxTemperature !== null) {
    parts.push(`${minTemperature}-${maxTemperature}℃`)
  } else if (averageTemperature !== null) {
    parts.push(`体感约${averageTemperature}℃`)
  }
  if (windScale !== null && windScale >= 4) {
    parts.push('风力偏大')
  }
  return parts.join('，')
}

export const buildOutfitPlan = (weatherInfo = {}) => {
  const weather = weatherInfo.weather || ''
  const minTemperature = parseTemperature(weatherInfo.minTemperature)
  const maxTemperature = parseTemperature(weatherInfo.maxTemperature)
  const windScale = parseTemperature(weatherInfo.windScale)
  let averageTemperature = null
  if (minTemperature !== null && maxTemperature !== null) {
    averageTemperature = Math.round((minTemperature + maxTemperature) / 2)
  } else {
    averageTemperature = maxTemperature !== null ? maxTemperature : minTemperature
  }
  const isRainy = hasWeather(weather, ['雨', '雷', '雪'])
  const isWindy = windScale !== null && windScale >= 4
  let groups = []
  let title = '轻便利落出门'
  let advice = '今天以舒适透气为主，整体轻一点，行动会更自在。'

  if (averageTemperature !== null && averageTemperature >= 27) {
    title = isRainy ? '闷热有雨的轻便穿搭' : '暖热天气的清爽穿搭'
    advice = isRainy ? '气温偏高但可能潮湿，选短袖配易走动的裤装，鞋子尽量耐脏防滑。' : '温度偏高，短袖加轻薄下装就够了，配一个小包方便出门。'
    groups = [
      { role: '上装', categories: ['短袖', '卫衣'] },
      { role: '下装', categories: isRainy ? ['休闲裤', '牛仔裤'] : ['裙子', '休闲裤', '牛仔裤'] },
      { role: '鞋', categories: ['鞋'] },
      { role: '包', categories: ['包'] },
    ]
  } else if (averageTemperature !== null && averageTemperature >= 21) {
    title = isRainy ? '温暖阴雨的稳妥穿搭' : '舒适温暖的日常穿搭'
    advice = isRainy ? '温度不低但天气不够干爽，短袖或薄卫衣搭裤装更安心。' : '温度舒服，可以短袖配裤装或裙装，早晚怕凉就换薄卫衣。'
    groups = [
      { role: '上装', categories: ['短袖', '卫衣'] },
      { role: '下装', categories: isRainy ? ['休闲裤', '牛仔裤'] : ['休闲裤', '牛仔裤', '裙子'] },
      { role: '鞋', categories: ['鞋'] },
      { role: '包', categories: ['包'] },
    ]
  } else if (averageTemperature !== null && averageTemperature >= 14) {
    title = isRainy || isWindy ? '微凉天气的保暖穿搭' : '微凉日常的层次穿搭'
    advice = isRainy || isWindy ? '体感会比温度更凉，卫衣或毛衣配长裤，必要时加外套。' : '上身用卫衣或毛衣做一点厚度，长裤更稳妥。'
    groups = [
      { role: '上装', categories: ['卫衣', '毛衣'] },
      { role: '下装', categories: ['牛仔裤', '休闲裤', '背带裤'] },
      { role: '外套', categories: isRainy || isWindy ? ['大衣', '羽绒外套'] : ['大衣'] },
      { role: '鞋', categories: ['鞋'] },
      { role: '包', categories: ['包'] },
    ]
  } else {
    title = '低温天气的保暖穿搭'
    advice = '今天优先保暖，厚上装加外套，再配长裤和好走的鞋。'
    groups = [
      { role: '上装', categories: ['毛衣', '卫衣'] },
      { role: '外套', categories: ['羽绒外套', '大衣'] },
      { role: '下装', categories: ['牛仔裤', '休闲裤', '背带裤'] },
      { role: '鞋', categories: ['鞋'] },
      { role: '包', categories: ['包'] },
    ]
  }

  return {
    title,
    advice,
    reason: buildReason({
      weather,
      minTemperature,
      maxTemperature,
      windScale,
      averageTemperature,
    }),
    averageTemperature,
    groups,
  }
}

const pickItem = (items, offset = 0) => {
  if (!items || !items.length) {
    return null
  }
  const seed = Number(dayjs().format('YYYYMMDD')) + offset
  return items[seed % items.length]
}

export const selectOutfitItems = (catalog, plan) => plan.groups.map((group, index) => {
  const category = group.categories.find((name) => catalog[name] && catalog[name].length)
  if (!category) {
    return null
  }
  return {
    ...pickItem(catalog[category], index),
    role: group.role,
    category,
  }
}).filter(Boolean)

const loadImageBuffer = async (url) => {
  if (/^https?:\/\//i.test(url)) {
    const res = await axios.get(url, { responseType: 'arraybuffer' })
    return Buffer.from(res.data)
  }
  return fs.readFile(url)
}

const getPixelOffset = (x, y, width) => (y * width + x) * 4

const isCloseToBackground = (pixels, offset, backgroundColor) => {
  const alpha = pixels[offset + 3]
  if (alpha < 16) {
    return true
  }
  const redDiff = Math.abs(pixels[offset] - backgroundColor.red)
  const greenDiff = Math.abs(pixels[offset + 1] - backgroundColor.green)
  const blueDiff = Math.abs(pixels[offset + 2] - backgroundColor.blue)
  const isNearWhite = pixels[offset] > 238 && pixels[offset + 1] > 238 && pixels[offset + 2] > 238
  return isNearWhite || (redDiff + greenDiff + blueDiff <= BACKGROUND_TOLERANCE)
}

const getBackgroundColor = (pixels, width, height) => {
  const points = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ]
  const color = points.reduce((acc, [x, y]) => {
    const offset = getPixelOffset(x, y, width)
    return {
      red: acc.red + pixels[offset],
      green: acc.green + pixels[offset + 1],
      blue: acc.blue + pixels[offset + 2],
    }
  }, { red: 0, green: 0, blue: 0 })
  return {
    red: Math.round(color.red / points.length),
    green: Math.round(color.green / points.length),
    blue: Math.round(color.blue / points.length),
  }
}

const removeEdgeBackground = async (input) => {
  const image = sharp(input).rotate().ensureAlpha()
  const { width, height } = await image.metadata()
  if (!width || !height) {
    return input
  }

  const pixels = await image.raw().toBuffer()
  const visited = new Uint8Array(width * height)
  const queue = []
  const backgroundColor = getBackgroundColor(pixels, width, height)
  const enqueue = (x, y) => {
    const index = y * width + x
    if (visited[index]) {
      return
    }
    const offset = getPixelOffset(x, y, width)
    if (!isCloseToBackground(pixels, offset, backgroundColor)) {
      return
    }
    visited[index] = 1
    queue.push([x, y])
  }

  for (let x = 0; x < width; x++) {
    enqueue(x, 0)
    enqueue(x, height - 1)
  }
  for (let y = 1; y < height - 1; y++) {
    enqueue(0, y)
    enqueue(width - 1, y)
  }

  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i]
    pixels[getPixelOffset(x, y, width) + 3] = 0
    if (x > 0) enqueue(x - 1, y)
    if (x < width - 1) enqueue(x + 1, y)
    if (y > 0) enqueue(x, y - 1)
    if (y < height - 1) enqueue(x, y + 1)
  }

  return sharp(pixels, {
    raw: {
      width,
      height,
      channels: 4,
    },
  }).png().toBuffer()
}

const fallbackBox = (index) => ({
  left: 95 + (index % 2) * 405,
  top: 380 + Math.floor(index / 2) * 270,
  width: 300,
  height: 240,
})

const getRoleBox = (item, index, selectedItems) => {
  const lowerItem = selectedItems.find((selectedItem) => selectedItem.role === '下装')
  if (item.role === '下装' && item.category === '裙子') {
    return {
      left: 300, top: 565, width: 300, height: 330,
    }
  }
  if (item.role === '下装' && item.category === '背带裤') {
    return {
      left: 292, top: 505, width: 316, height: 520,
    }
  }
  if (item.role === '鞋' && lowerItem && lowerItem.category === '裙子') {
    return {
      left: 325, top: 875, width: 250, height: 145,
    }
  }
  return ROLE_BOX[item.role] || fallbackBox(index)
}

const createBaseImage = (plan, selectedItems, meta = {}) => {
  const dateText = dayjs().format('YYYY-MM-DD')
  const cityText = [meta.province, meta.city].filter(Boolean).join(' ')
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="1400" viewBox="0 0 900 1400">
      <text x="70" y="112" font-family="${SVG_FONT_FAMILY}" font-size="44" font-weight="800" fill="#242832">${escapeXml(plan.title)}</text>
      <text x="72" y="164" font-family="${SVG_FONT_FAMILY}" font-size="24" font-weight="600" fill="#707782">${escapeXml([dateText, cityText].filter(Boolean).join(' · '))}</text>
      ${svgTextLines(plan.reason || '天气信息不足，按日常舒适穿搭生成。', 72, 222, {
    maxLength: 29,
    lineHeight: 34,
    size: 25,
    weight: 600,
    fill: '#4d5560',
  })}
      ${svgTextLines(plan.advice, 72, 302, {
    maxLength: 28,
    lineHeight: 32,
    size: 23,
    weight: 500,
    fill: '#555e68',
  })}
    </svg>
  `
}

export const renderOutfitImage = async ({
  plan,
  selectedItems,
  outputPath,
  meta,
}) => {
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  const baseBuffer = await sharp(Buffer.from(createBaseImage(plan, selectedItems, meta))).png().toBuffer()
  const composites = []
  const sortedItems = [...selectedItems].sort((a, b) => (
    COMPOSITE_ROLE_ORDER.indexOf(a.role) - COMPOSITE_ROLE_ORDER.indexOf(b.role)
  ))

  for (let i = 0; i < sortedItems.length; i++) {
    const item = sortedItems[i]
    const box = getRoleBox(item, i, selectedItems)
    const input = await loadImageBuffer(item.url)
    const transparentInput = await removeEdgeBackground(input).catch(() => input)
    const buffer = await sharp(transparentInput)
      .trim()
      .resize({
        width: box.width,
        height: box.height,
        fit: 'contain',
        background: {
          r: 255, g: 255, b: 255, alpha: 0,
        },
      })
      .png()
      .toBuffer()
    composites.push({
      input: buffer,
      left: box.left,
      top: box.top,
    })
  }

  await sharp(baseBuffer).composite(composites).png().toFile(outputPath)
  return outputPath
}

const getEnvValue = (value, envNames) => {
  if (value) {
    return value
  }
  const envName = envNames.find((name) => process.env[name])
  return envName ? process.env[envName] : ''
}

const getServiceErrorText = (error) => {
  if (!error) {
    return ''
  }
  return [
    error.code || error.errorCode || error.errCode,
    error.statusCode || error.response?.status,
    error.response?.data?.error?.message,
    error.response?.data?.message,
    error.message || error.msg || error.errMsg,
  ].filter(Boolean).join(' / ')
}

export const getSecondsUntilNextDeleteTime = (cleanupConfig = {}, now = dayjs()) => {
  const timeZone = cleanupConfig.timezone || cleanupConfig.timeZone || DEFAULT_TIMEZONE
  const deleteAtHour = Number.isFinite(Number(cleanupConfig.deleteAtHour)) ? Number(cleanupConfig.deleteAtHour) : 1
  const deleteAtMinute = Number.isFinite(Number(cleanupConfig.deleteAtMinute)) ? Number(cleanupConfig.deleteAtMinute) : 0
  const current = dayjs.isDayjs(now) ? now.tz(timeZone) : dayjs(now).tz(timeZone)
  let target = current
    .hour(deleteAtHour)
    .minute(deleteAtMinute)
    .second(0)
    .millisecond(0)

  if (!target.isAfter(current)) {
    target = target.add(1, 'day')
  }

  return Math.min(
    IMGBB_MAX_EXPIRATION_SECONDS,
    Math.max(IMGBB_MIN_EXPIRATION_SECONDS, target.diff(current, 'second')),
  )
}

const getUploadOptions = (outfitConfig) => {
  const uploadConfig = outfitConfig.upload || {}
  const cleanupConfig = {
    deleteAtHour: 1,
    deleteAtMinute: 0,
    ...(outfitConfig.cleanup || {}),
  }
  const configuredExpiration = Number(uploadConfig.expirationSeconds)
  return {
    uploadConfig,
    provider: uploadConfig.provider || 'imgbb',
    imgbbApiKey: getEnvValue(uploadConfig.imgbbApiKey || uploadConfig.apiKey, [
      'IMGBB_API_KEY',
      'OUTFIT_IMGBB_API_KEY',
    ]),
    expirationSeconds: Number.isFinite(configuredExpiration)
      ? Math.min(IMGBB_MAX_EXPIRATION_SECONDS, Math.max(IMGBB_MIN_EXPIRATION_SECONDS, configuredExpiration))
      : getSecondsUntilNextDeleteTime(cleanupConfig),
  }
}

const uploadImgbbOutfitImage = async (imagePath, uploadOptions) => {
  const {
    imgbbApiKey,
    expirationSeconds,
    uploadConfig,
  } = uploadOptions

  if (!imgbbApiKey) {
    console.log('穿搭图未上传：请配置 ImgBB API key（upload.imgbbApiKey 或环境变量 IMGBB_API_KEY）')
    return ''
  }

  try {
    const body = new URLSearchParams()
    body.append('image', await fs.readFile(imagePath, 'base64'))
    body.append('name', path.basename(imagePath, path.extname(imagePath)))

    const res = await axios.post(IMGBB_UPLOAD_URL, body.toString(), {
      params: {
        key: imgbbApiKey,
        expiration: expirationSeconds,
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: uploadConfig.timeout || 30000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      validateStatus: () => true,
    })

    const imageUrl = res.data?.data?.display_url
      || res.data?.data?.url
      || res.data?.data?.image?.url
      || ''
    if (res.status < 200 || res.status >= 300 || res.data?.success !== true || !imageUrl) {
      console.log(`穿搭图上传到 ImgBB 失败，已跳过图片推送：${getServiceErrorText({ response: res }) || JSON.stringify(res.data || {})}`)
      return ''
    }

    console.log(`穿搭图已上传到 ImgBB，将在约 ${Math.ceil(expirationSeconds / 60)} 分钟后自动删除`)
    return imageUrl
  } catch (e) {
    console.log(`穿搭图上传到 ImgBB 失败，已跳过图片推送：${getServiceErrorText(e)}`)
    return ''
  }
}

const uploadOutfitImage = async (imagePath, outfitConfig) => {
  const uploadOptions = getUploadOptions(outfitConfig)
  if (uploadOptions.uploadConfig.enable !== true) {
    return ''
  }
  if (uploadOptions.provider !== 'imgbb') {
    console.log(`穿搭图未上传：当前只支持 ImgBB 上传，已忽略 provider=${uploadOptions.provider}`)
    return ''
  }
  return uploadImgbbOutfitImage(imagePath, uploadOptions)
}

const getImageExpireAt = (fileName, fallbackMtime, cleanupConfig) => {
  const matched = path.basename(fileName).match(/^outfit-(\d{4}-\d{2}-\d{2})-/)
  if (matched) {
    return dayjs(matched[1])
      .add(1, 'day')
      .hour(cleanupConfig.deleteAtHour)
      .minute(cleanupConfig.deleteAtMinute)
      .second(0)
      .millisecond(0)
  }
  return dayjs(fallbackMtime).add(cleanupConfig.maxAgeHours, 'hour')
}

const isExpiredOutfitImage = (fileName, fallbackMtime, cleanupConfig, now = dayjs()) => (
  now.isAfter(getImageExpireAt(fileName, fallbackMtime, cleanupConfig))
)

const cleanupLocalOutfitImages = async (outfitConfig, cleanupConfig, now) => {
  const outputDir = resolveProjectPath(outfitConfig.outputDir || DEFAULT_OUTPUT_DIR)
  const entries = await fs.readdir(outputDir, { withFileTypes: true }).catch(() => [])
  let deletedCount = 0

  for (const entry of entries) {
    if (entry.isFile() && /^outfit-.*\.png$/i.test(entry.name)) {
      const filePath = path.join(outputDir, entry.name)
      const stat = await fs.stat(filePath).catch(() => null)
      if (stat && isExpiredOutfitImage(entry.name, stat.mtime, cleanupConfig, now)) {
        await fs.unlink(filePath).catch(() => null)
        deletedCount++
      }
    }
  }

  return deletedCount
}

const toSafeFilename = (value) => String(value || 'default').replace(/[^\w\u4e00-\u9fa5-]+/g, '-')

export const cleanupOutfitImages = async (outfitConfig = config.OUTFIT_RECOMMENDATION || {}) => {
  if (outfitConfig.enable !== true) {
    return {
      localDeleted: 0,
      uploadedDeleted: 0,
    }
  }
  const cleanupConfig = {
    enable: true,
    deleteAtHour: 1,
    deleteAtMinute: 0,
    maxAgeHours: 24,
    ...(outfitConfig.cleanup || {}),
  }
  if (cleanupConfig.enable !== true) {
    return {
      localDeleted: 0,
      uploadedDeleted: 0,
    }
  }

  const now = dayjs()
  const localDeleted = await cleanupLocalOutfitImages(outfitConfig, cleanupConfig, now)
  if (localDeleted) {
    console.log(`穿搭图清理完成：本地 ${localDeleted} 张`)
  }
  return {
    localDeleted,
    uploadedDeleted: 0,
  }
}

export const getDailyOutfit = async (weatherInfo = {}, meta = {}) => {
  const outfitConfig = config.OUTFIT_RECOMMENDATION || {}
  if (outfitConfig.enable !== true) {
    return null
  }

  try {
    const catalog = await loadOutfitCatalog(outfitConfig)
    const plan = buildOutfitPlan(weatherInfo)
    const selectedItems = selectOutfitItems(catalog, plan)
    if (!selectedItems.length) {
      return {
        recommendation: '今日穿搭：衣橱里暂时没有匹配到可用图片。',
        image: '',
        imagePath: '',
        imageUrl: '',
      }
    }

    const outputDir = resolveProjectPath(outfitConfig.outputDir || DEFAULT_OUTPUT_DIR)
    const cityName = toSafeFilename(meta.city || config.CITY)
    const outputPath = path.join(outputDir, `outfit-${dayjs().format('YYYY-MM-DD')}-${cityName}.png`)
    await renderOutfitImage({
      plan,
      selectedItems,
      outputPath,
      meta,
    })

    const imageUrl = await uploadOutfitImage(outputPath, outfitConfig)
    const itemText = selectedItems.map((item) => `${item.role}${item.category ? `(${item.category})` : ''}`).join(' + ')
    const recommendation = `今日穿搭：${plan.title}。${plan.advice} 已选：${itemText}。`
    const image = imageUrl ? `![今日穿搭](${imageUrl})` : ''

    return {
      recommendation,
      image,
      imagePath: outputPath,
      imageUrl,
      selectedItems,
      plan,
    }
  } catch (e) {
    console.error('今日穿搭生成失败', e)
    return {
      recommendation: '今日穿搭：生成失败，请检查衣橱图片配置。',
      image: '',
      imagePath: '',
      imageUrl: '',
    }
  }
}
