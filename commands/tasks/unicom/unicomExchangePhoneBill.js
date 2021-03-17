
const os = require('os')
const path = require('path')
const fs = require('fs-extra')
const axios = require('axios');
const { buildArgs } = require('../../../utils/util')
const moment = require('moment');
moment.locale('zh-cn');


let unicomExchangePhoneBill_Run = async function (argv) {
  console.info('---------------------------------------------------------------------------')
  console.info('开始时间  ' + moment().format('YYYY-MM-DD HH:mm:ss'))
  
  let phone
  let rephone
  let number
  let reChangeNo
  let maxnum
  
  process.argv.slice(2).forEach((val, index) => {
    let arr = val.split('=')
  	if(arr[0] == 'phone') {
  		phone = arr[1]
  	}
  	if(arr[0] == 'rephone') {
  		rephone = arr[1]
  	}
  	if(arr[0] == 'number') {
  		number = arr[1]
  	}
  });
  
  if(!phone) {
	  throw new Error('登陆号码phone不能为空')
  }
  
  if(!number) {
	  throw new Error('充值金额number不能为空')
  } else if(number == '5' || number == '10' || number == '20') {
	  maxnum = parseInt(number) * 100
  } else {
	  throw new Error('充值金额只能选择5,10,20')
  }
  
  if(!rephone) {
	  console.info('充值号码rephone为空，默认充值登陆号码')
	  reChangeNo = phone
  } else if(number == '20') {
	  console.info('20元会充值到登陆号码')
  } else {
	  reChangeNo = rephone
  }
  
  String.prototype.replaceWithMask = function (start, end) {
    return this.substr(0, start) + '******' + this.substr(-end, end)
  }
  
  console.info('登录号码: '+phone.replaceWithMask(2, 3))
  console.info('充值号码: '+reChangeNo.replaceWithMask(2, 3))
  
  let cookies
  let token_online
  let appId
  let dir = path.join(os.homedir(), '.AutoSignMachine')
  if (!fs.existsSync(dir)) {
    fs.mkdirpSync(dir)
  }
  let cookieFile = path.join(dir, 'cookieFile_unicom_' + phone + '.txt')
  if (fs.existsSync(cookieFile)) {
    cookies = fs.readFileSync(cookieFile).toString('utf-8')
  }
  //console.info(cookies)
  
  if (Object.prototype.toString.call(cookies) == '[object String]') {
    cookies.length && cookies.split('; ').forEach(cookie => {
      //cookiesjar.setCookieSync(cookie, uuuu.origin + '/', {})
  	  let arr = cookie.split('=')
  	  if(arr[0] == 'appId') {
  	  	appId = arr[1]
  	  }
  	  if(arr[0] == 'token_online') {
  	  	token_online = arr[1]
  	  }
    })
  }
  
  if(!token_online) {
	  throw new Error('token_online获取失败')
  }
  
  let transParams = (data) => {
    let params = new URLSearchParams();
    for (let item in data) {
      params.append(item, data['' + item + '']);
    }
    return params;
  };
  //console.info('token_online------------'+token_online)
  //console.info('appId------------'+appId)
  
  let params = {
    "appId": appId,
    "token_online": token_online,
    "version": "iphone_c@7.0500"
  }
  let res = await axios.request({
    url: 'https://m.client.10010.com/mobileService/onLine.htm',
    method: 'post',
    data: transParams(params)
  })
  
  //console.info(res.data)
  let cookie
  if(res.data.code == '0') {
  	cookie = 'ecs_token=' + res.data.ecs_token
	//console.info(cookie)
	let headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cookie": cookie,
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 13_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 unicom{version:iphone_c@7.0500}{systemVersion:dis}{yw_code:}"
    }
	let res_1 = await axios.request({
      url: 'https://m.client.10010.com/welfare-mall-front/mobile/show/bj2207/v1',
      method: 'get',
      headers: headers
    })
	let Fnumber = res_1.data.resdata.Fnumber		//奖励积分
	let Tnumber = res_1.data.resdata.Tnumber		//通信积分
	let Jnumber = Fnumber + Tnumber
	
	let goodsId
	let goodsId5 = '8a29ac8a75a30e4e0175ba89c3dc1009'
	let goodsId10 = '8a29ac8a75a30e4e0175b721ae490a5a'
	let goodsId20 = '8a29ac89747dfeed01747e48e50c0024'
	
	console.info('积分余额: '+Jnumber+', 奖励积分: '+Fnumber+', 通信积分: '+Tnumber)
	
	if(Jnumber >= maxnum) {
		if(number == '20') {
			goodsId = goodsId20
			console.info('即将兑换20元')
		} else 
		if(number == '10') {
			goodsId = goodsId10
			console.info('即将兑换10元')
		} else {
			goodsId = goodsId5
			console.info('即将兑换5元')
		}
		let res_2 = await axios.request({
		  url: 'https://m.client.10010.com/welfare-mall-front/mobile/show/bj2200/v2/' + goodsId + '/0000',
		  method: 'get'
		})
		
		let SHOP_INTEGRAL = res_2.data.resdata.goods.SHOP_INTEGRAL
        let GOODS_NAME = res_2.data.resdata.goods.GOODS_NAME

		let phoneb64 = Buffer.from(phone + '|2380').toString('base64');
        //console.info(phoneb64)
		
		let reqdata_2 = '{"pip":"0.0.0.0","goodsIdOrOrderNo":"' + goodsId + '","phone":"' + phoneb64 + '"}'
        
		let res_4 = await axios.request({
		  url: 'https://m.client.10010.com/welfare-mall-front/mobile/api/whetherNeedVerificationCodeNew/v1',
		  method: 'post',
		  headers: headers,
		  data: transParams({
                'reqdata': reqdata_2
            })
		})
		console.info(res_4.data.msg)
		
		let reqdata = '{"goodsId":"' + goodsId + '","reChangeNo":"' + reChangeNo + '","saleTypes":"TY","points":' + SHOP_INTEGRAL 
		+ ',"smsCode":null,"imei":"","sourceChannel":"KYJF9990000010001","proFlag":"","scene":"","promoterCode":"","sign":"","oneid":"","twoid":"","threeid":"","maxcash":"","floortype":"undefined","launchId":""}';
		//console.info(reqdata)
		let res_3 = await axios.request({
		  url: 'https://m.client.10010.com/welfare-mall-front/mobile/api/bj2402/v1',
		  method: 'post',
		  headers: headers,
		  data: transParams({
                'reqdata': reqdata
            })
		})
		console.info(GOODS_NAME + reChangeNo.replaceWithMask(2, 3) + res_3.data.msg)
		
	} else {
		console.info('积分不足')
	}
	
  } else {
	  console.info(res.data.msg)
  }
  
  console.info('结束时间  ' + moment().format('YYYY-MM-DD HH:mm:ss'))
  console.info('---------------------------------------------------------------------------')
}

unicomExchangePhoneBill_Run()
