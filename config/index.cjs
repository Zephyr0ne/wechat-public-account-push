/* eslint-disable */

/**
 * 此项目配置为方便新人使用，已缩减至最简配置。
 * 如若想使用更多功能，请查考文档中的 【3. config参数说明】
 * 自行添加属性，以支持更多个性化功能
 */
const USER_CONFIG = {
  //推送通道
  USE_PASSAGE: 'push-deer',
  PROVINCE: '四川',
  CITY: '成都',

  USERS: [
    {
      // 想要发送的人的名字
      name: 'Zephyr0ne',
      // PushDeer的key
      id: 'PDU18514T2vgqLx0Fo3gnjeIf6xFh2cXeporIZmbW',
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
      // PushDeer的key
      id: 'PDU18519T7b5aS7GRnzBWsejVj8bsEqnfnDAqA9Nf',
      // template-config中的id
      useTemplateId: '0002',
      // 新历生日, 仅用作获取星座运势, 格式必须为MM-DD
      horoscopeDate: '01-30',
      festivals: [
        // 注意：此条配置日期为阴历日期，因为`type`中 “生日” 之前有 * 符号
        {type: '*生日', name: '您', year: '1998', date: '01-03',isShowAge: true,},
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
    //   id: 'PDU18514TnkkUuF2kj3wbBOiiJd2xTGkM0VN4XXia',
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
    {
      name: '自己',
      // pushDeer中的key
      id: 'PDU18514T2vgqLx0Fo3gnjeIf6xFh2cXeporIZmbW',
    }
  ],

}

module.exports = USER_CONFIG

