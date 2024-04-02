/* eslint-disable */
const TEMPLATE_CONFIG = [
  {
    id: '0001',
    title: '轻舟已过万重山',
    desc:
    /*开始*/
      `
      **{{date.DATA}}**
      
    ---      
      下个休息日：{{holidaytts.DATA}}
      
    ---
      
      城市：{{city.DATA}}
      
      天气：{{weather.DATA}}
      
      最低气温: {{min_temperature.DATA}}
      
      最高气温：{{max_temperature.DATA}}
      
      风向: {{wind_direction.DATA}}
      
      风级: {{wind_scale.DATA}}
      
      提醒:  {{ganmao.DATA}}
      
      注意:  {{notice.DATA}}
    
      ---
      
      今天是你和你老婆相识的第{{love_day.DATA}}天
      
      {{birthday_message.DATA}}
      
      ---
      
      文化熏陶： {{poetry_content.DATA}}
      
      {{love_horoscope.DATA}}
      
      {{career_horoscope.DATA}}
      
      {{wealth_horoscope.DATA}}
      
      {{healthy_horoscope.DATA}}


    `
    /*结束*/
  },
  {
    id: '0002',
    title: '一日之计在于晨',
    desc:
    /*开始*/
      `
      **{{date.DATA}}**
      
    ---      
      下个休息日：{{holidaytts.DATA}}
    
    ---
      
      城市：{{city.DATA}}
      
      天气：{{weather.DATA}}
      
      最低气温: {{min_temperature.DATA}}
      
      最高气温：{{max_temperature.DATA}}
      
      风向: {{wind_direction.DATA}}
      
      风级: {{wind_scale.DATA}}
      
      提醒:  {{ganmao.DATA}}
      
      注意:  {{notice.DATA}}
    
      ---
      
      今天是你和你老公相识的第{{love_day.DATA}}天
      
      {{birthday_message.DATA}}
      
      ---
      
       文化熏陶： {{poetry_content.DATA}}
      
      {{love_horoscope.DATA}}
      
      {{career_horoscope.DATA}}
      
      {{wealth_horoscope.DATA}}
      
      {{healthy_horoscope.DATA}}


    `
    /*结束*/
  },
  {
    id: '9999',
    title: '推送完成提醒',
    desc: `
      服务器信息：{{post_time_zone.DATA}} {{post_time.DATA}}
      
      ---
      
      共推送 {{need_post_num.DATA}} 人
      
      成功: {{success_post_num.DATA}} | 失败: {{fail_post_num.DATA}}
      
      成功用户: {{success_post_ids.DATA}}
      
      失败用户: {{fail_post_ids.DATA}}
    `
  },

]

module.exports = TEMPLATE_CONFIG
