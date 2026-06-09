/* eslint-disable */

/**
 * 此项目配置为方便新人使用，已缩减至最简配置。
 * 如若想使用更多功能，请查考文档中的 【3. config参数说明】
 * 自行添加属性，以支持更多个性化功能
 */
const getEnv = (...names) => {
  const name = names.find((item) => process.env[item])
  return name ? process.env[name] : ''
}

const USER_CONFIG = {
  //推送通道
  USE_PASSAGE: 'push-deer',
  PROVINCE: '四川',
  CITY: '成都',

  USERS: [
    {
      // 想要发送的人的名字
      name: 'Zephyr0ne',
      // PushDeer的key，GitHub Actions里配置为Secrets：PUSHDEER_KEY_1
      id: getEnv('PUSHDEER_KEY_1', 'PUSHDEER_KEY_ZEPHYRONE'),
      // template-config中的id
      useTemplateId: '0001',
      // 新历生日, 仅用作获取星座运势, 格式必须为MM-DD
      horoscopeDate: '07-28',
      festivals: [
        // 注意：此条配置日期为阴历日期，因为`type`中 “生日” 之前有 * 符号
        {type: '*生日', name: '您', year: '1998', date: '06-06',isShowAge: true,},
        {type: '节日', name: '你和你老婆的初见纪念日', year: '2021', date: '07-15',},
      ],
      // 我们在一起已经有xxxx天了的配置
      customizedDateList: [
        // 在一起的日子
        { keyword: 'love_day', date: '2021-07-28' },
        // 结婚纪念日
        { keyword: 'marry_day', date: '2022-09-29' },
      ],
    },
    {
      // 想要发送的人的名字
      name: '大宝贝',
      // PushDeer的key，GitHub Actions里配置为Secrets：PUSHDEER_KEY_2
      id: getEnv('PUSHDEER_KEY_2', 'PUSHDEER_KEY_DABAO'),
      // template-config中的id
      useTemplateId: '0002',
      // 新历生日, 仅用作获取星座运势, 格式必须为MM-DD
      horoscopeDate: '01-30',
      festivals: [
        // 注意：此条配置日期为阴历日期，因为`type`中 “生日” 之前有 * 符号
        {type: '*生日', name: '您', year: '1997', date: '01-03',isShowAge: true,},
        {type: '节日', name: '你和你老公的初见纪念日', year: '2021', date: '07-15',},
      ],
      // 我们在一起已经有xxxx天了的配置
      customizedDateList: [
        // 在一起的日子
        { keyword: 'love_day', date: '2021-07-28' },
        // 结婚纪念日
        { keyword: 'marry_day', date: '2022-09-29' },
      ],
    },

    //更多人员配置依次往下
    // {
    //   // 想要发送的人的名字
    //   name: '大帅哥',
    //   // PushDeer的key
    //   id: getEnv('PUSHDEER_KEY_3'),
    //   // template-config中的id
    //   useTemplateId: '0001',
    //   // 新历生日, 仅用作获取星座运势, 格式必须为MM-DD
    //   horoscopeDate: '07-28',
    //   festivals: [
    //     // 注意：此条配置日期为阴历日期，因为`type`中 “生日” 之前有 * 符号
    //     {type: '*生日', name: '您', year: '1998', date: '06-06',isShowAge: true,},
    //     {type: '节日', name: '你和欣欣大宝贝儿的搭讪纪念日', year: '2021', date: '07-15',},
    //   ],
    //   // 我们在一起已经有xxxx天了的配置
    //   customizedDateList: [
    //     // 在一起的日子
    //     { keyword: 'love_day', date: '2021-07-28' },
    //     // 结婚纪念日
    //     { keyword: 'marry_day', date: '2022-09-29' },
    //   ],
    // },




  ],


  // template-config.js中的id
  CALLBACK_TEMPLATE_ID: '9999',

  CALLBACK_USERS: [
    // {
    //   name: '自己',
    //   // pushDeer中的key
    //   id: getEnv('PUSHDEER_CALLBACK_KEY'),
    // }
  ],

  // 今日穿搭推荐：会根据天气自动选择衣橱图片并合成一张图
  OUTFIT_RECOMMENDATION: {
    enable: true,
    // local: 使用本地自动生成的样例衣橱；manifest: 使用云开发存储中的manifest.json读取清单
    source: 'manifest',
    // source为local时使用，首次运行会自动生成样例服装图
    localDir: 'runtime/sample-clothes',
    // 云开发存储的公网域名，用于读取manifest里的衣橱图片
    cosBaseUrl: 'https://636c-cloud1-d4grhuxzhf76cd169-1325169104.tcb.qcloud.la/',
    categoryFolders: ['短袖', '毛衣', '卫衣', '羽绒外套', '大衣', '裙子', '休闲裤', '牛仔裤', '背带裤', '鞋', '包'],
    // 直接读取云开发存储中的manifest.json，避免依赖目录列表权限
    manifestUrl: 'https://636c-cloud1-d4grhuxzhf76cd169-1325169104.tcb.qcloud.la/manifest.json',
    manifestFile: 'manifest.json',
    // 合成图输出目录；生成后会上传到ImgBB，供PushDeer显示
    outputDir: 'runtime/outfits',
    upload: {
      enable: true,
      provider: 'imgbb',
      // 建议优先配置环境变量 IMGBB_API_KEY；也可以直接填在这里
      imgbbApiKey: getEnv('IMGBB_API_KEY', 'OUTFIT_IMGBB_API_KEY'),
    },
    cleanup: {
      enable: true,
      // ImgBB云端图片会按上传时的expiration自动过期；这里负责清理本地合成图
      schedule: '0 0 1 * * *',
      deleteAtHour: 1,
      deleteAtMinute: 0,
      maxAgeHours: 24,
    },
  },

}

module.exports = USER_CONFIG
