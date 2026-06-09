import {
  buildOutfitPlan,
  getSecondsUntilNextDeleteTime,
  parseTemperature,
  selectOutfitItems,
} from '../src/services/outfit'

describe('outfit', () => {
  test('parseTemperature', () => {
    expect(parseTemperature('高温 29℃')).toBe(29)
    expect(parseTemperature('低温 -3℃')).toBe(-3)
    expect(parseTemperature('2级')).toBe(2)
    expect(parseTemperature('')).toBe(null)
  })

  test('buildOutfitPlan creates a light rainy outfit', () => {
    const plan = buildOutfitPlan({
      weather: '小雨',
      minTemperature: '25℃',
      maxTemperature: '29℃',
      windScale: '2级',
    })
    const selectedItems = selectOutfitItems({
      短袖: [{ name: 'white-t-shirt', url: '/tmp/white-t-shirt.png' }],
      休闲裤: [{ name: 'khaki-pants', url: '/tmp/khaki-pants.png' }],
      鞋: [{ name: 'white-sneakers', url: '/tmp/white-sneakers.png' }],
      包: [{ name: 'brown-bag', url: '/tmp/brown-bag.png' }],
    }, plan)

    expect(plan.title).toBe('闷热有雨的轻便穿搭')
    expect(selectedItems.map((item) => item.category)).toEqual(['短袖', '休闲裤', '鞋', '包'])
  })

  test('buildOutfitPlan keeps cold weather warm', () => {
    const plan = buildOutfitPlan({
      weather: '阴',
      minTemperature: '2℃',
      maxTemperature: '8℃',
      windScale: '3级',
    })

    expect(plan.title).toBe('低温天气的保暖穿搭')
    expect(plan.groups.map((group) => group.role)).toContain('外套')
    expect(plan.groups.find((group) => group.role === '外套').categories).toContain('羽绒外套')
  })

  test('getSecondsUntilNextDeleteTime uses next 1am in Shanghai', () => {
    expect(getSecondsUntilNextDeleteTime({
      deleteAtHour: 1,
      deleteAtMinute: 0,
    }, '2026-06-09T00:30:00+08:00')).toBe(1800)

    expect(getSecondsUntilNextDeleteTime({
      deleteAtHour: 1,
      deleteAtMinute: 0,
    }, '2026-06-09T01:30:00+08:00')).toBe(84600)
  })
})
