var rsa = require('./lib/rsa.js') //weibo's rsa module
var request = require('request') //a third request module
/**
 * @overview sina weibo's login obj
 * If login successfully,it will pass API obj in callback
 */
var weibo = {
	info : {},
	/*
	 * @description Request to get params pubkey,servertime,nonce
	 */
	_preLogin : function(){
		var rest = {
			uri:'http://login.sina.com.cn/sso/prelogin.php?entry=sso&callback=sinaSSOController.preloginCallBack&su=dW5kZWZpbmVk&rsakt=mod&client=ssologin.js(v1.4.2)',
	        followRedirect : false,
	        method : 'get',
	        qs:{
	        	 su:this.info.su,
                 _:Date.now()
            }
        }
        var self = this
        request(rest,function(error,response,body){
           if(!error && response.statusCode == 200){
              var json = body.match(/{.*}/)[0];
              var para  = JSON.parse(json);

              var RSAKey = new rsa.RSAKey();
              RSAKey.setPublic(para.pubkey, '10001');
              var password = RSAKey.encrypt([para.servertime, para.nonce].join("\t") + "\n" + self.info.sp);

              self.info.sp = password;
              self._loginRest(para);
           }
        })
	},
	/**
	 * @description  Request to login with encrypt password and user
	 * If login successfully ,sina will return a url
	 * @param {Object} para response from _preLogin()
	 */
	_loginRest : function(para){
        var rest = {
           uri : 'http://login.sina.com.cn/sso/login.php?client=ssologin.js(v1.4.2)',
           qs : {
       		entry : 'weibo',
       		gateway : '1',
       		nonce : para.nonce,
       		useticket : '1',
       		ssosimplelogin : '1',
       		servertime : para.servertime,
       		su : this.info.su,
       		sp : this.info.sp,
       		service : 'miniblog',
       	    pwencode : 'rsa2',
       	    rsakv : para.rsakv,
       	    url : 'http://weibo.com/ajaxlogin.php?framelogin=1&callback=parent.sinaSSOController.feedBackUrlCallBack',
       	    returntype : 'META'
       	   },
       	   header : {
       		'User-Agent' : "Mozilla/5.0 (Windows NT 5.1) AppleWebKit/537.13 (KHTML, like Gecko) Chrome/24.0.1290.1 Safari/537.13",
       		'Content-Type' : 'application/x-www-form-urlencoded'
           },
           method : 'post'
       	}
       	var self = this
       	request(rest,function(error,response,body){
       		if( !error && response.statusCode == 200 ){
       			try{
       		      var url = body.match(/location\.replace\('(.*)'\)/)[1]
                  self._login(url)
               }catch(e){
               	  console.log(e)
                  self.callback(error || "login fail")
               }
           }else{
               self.callback(error || "login fail")
           }
       	})		
	},
	/**
	 * @description request to get cookies
	 * @param {String} url
	 */
	_login : function(url){
		var self = this;
		request(url,function(error,res,body){
			if (!error && res.headers['set-cookie']) {
			     API.header.cookies = [
			         "USRV5WB=usrmdins312_139",
                     " USRV36WB=usrmdins211174", 
			     	 " _s_tentry=weibo.com",
			     	 " wvr=5"
			     ].concat(res.headers['set-cookie']).join(';');
			     
			}
			self.callback(error,API)		    
	    })		
	},
	/**
	 * @description interface for user 
	 * When callback function called,it will 
	 * pass two params : err and API(obj)
	 * @param {String} user user's email
	 * @param {String} psw user's password
	 * @param {Function} callback 
	 */
	login : function(user,psw,callback){
		if(   typeof user === 'string' 
		   && typeof psw === 'string'
		   && typeof callback === 'function'){
			this.info.su = new Buffer(user).toString('base64')
			this.info.sp = psw
			this.callback = callback
			this._preLogin()
		}else{
			var err = new Error('user or password is illigel!')
			callback(err)
		}
	}
}
/**
 * @overview sina weibo's api
 */
var API = {
	/**
	 * @description request header
	 */
	header : {
	   'User-Agent' : "Mozilla/5.0 (Windows NT 5.1) AppleWebKit/537.13 (KHTML, like Gecko) Chrome/24.0.1290.1 Safari/537.13",
       'X-Requested-With': 'XMLHttpRequest',
       'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
	},
	/**
	 * @description get user's information 
	 * It return err and result(obj) when callback called
	 * @param {String} id user id
	 * @param {Function} callback
	 */
	getShow : function(id,callback){
		 var rest ={
	 	     uri:'http://weibo.com/aj/user/cardv5?_wv=5&type=1&_t=0',
             qs : {
             	'id' : id,
             	'__rnd' : Date.now()
             },
             method : 'get',
             followRedirect : false,
             header : this.header
	     }
	     request(rest,function(err,res,body){
	     	if(!err && res.statusCode == 200){
	     		var result = {
	     		}
	     		var items =body.match(/uid=\d+&fnick=.+?&sex=(m|f)/)[0].split('&')
     			var obj = {}
     			for(var i=0;i<items.length;i++){
     				item = items[i].split('=')
     				obj[item[0]] = item[1]
     			}
     			result.data = obj
	     		callback(err,result)
	     	}else{
	     		callback(err || res.statusCode)
	     	}
	     })		
	},
	/**
	 * @description get user's followers 
	 * It return err and result(obj) when callback called
	 * @param {String} id user id
	 * @param {number} page
	 * @param {Function} callback
	 */	
	getFollow : function(id,page,callback){
		 var rest ={
	 	     uri:'http://weibo.com/' + id + '/follow',
             qs : {
             	'page' : typeof page === 'number' ? page : 1
             },
             method : 'get',
             followRedirect : false,
             header : this.header
	     }
	     request(rest,function(err,res,body){
	     	if(!err && res.statusCode == 200){
	     		var result = {
	     			count : 0,
	     			page : page,
	     			data : []
	     		}
	     		var pages = body.match(/page=\d+\\">\d+<\\\/a>/g)
	     		result.count = pages ? pages[pages.length-1].match(/\d+/) : 1
     		
	     		var array =body.match(/<li class=\\"clearfix S_line1\\" action-type=\\"itemClick\\" action-data=\\"uid=\d{10}&fnick=.{1,30}&sex=(m|f)/g) || []
	     		array.forEach(function(str){
	     			var items = str.substr(str.indexOf('uid')).split('&')
	     			var obj = {}
	     			for(var i=0;i<items.length;i++){
	     				item = items[i].split('=')
	     				obj[item[0]] = item[1]
	     			}
	     			result.data.push(obj)
	     		})
	     		callback(err,result)
	     	}else{
	     		callback(err || res.statusCode)
	     	}
	     })	
	},
	/**
	 * @description get user's fans 
	 * It return err and result(obj) when callback called
	 * @param {String} id user id
	 * @param {number} page
	 * @param {Function} callback
	 */	
	getFans : function(id,page,callback){
		 var rest ={
	 	     uri:'http://weibo.com/' + id + '/fans',
             qs : {
             	'page' : typeof page === 'number' ? page : 1
             },
             method : 'get',
             followRedirect : false,
             header : this.header
	     }
	     request(rest,function(err,res,body){
	     	if(!err && res.statusCode == 200){
	     		var result = {
	     			count : 0,
	     			page : page,
	     			data : []
	     		}
	     		var pages = body.match(/page=\d+\\">\d+<\\\/a>/g)
	     		result.count = pages ? pages[pages.length-1].match(/\d+/) : 1
	     		
	     		var array =body.match(/<li class=\\"clearfix S_line1\\" action-type=\\"itemClick\\" action-data=\\"uid=\d{10}&fnick=.{1,30}&sex=(m|f)/g) || []
	     		array.forEach(function(str){
	     			var items = str.substr(str.indexOf('uid')).split('&')
	     			var obj = {}
	     			for(var i=0;i<items.length;i++){
	     				item = items[i].split('=')
	     				obj[item[0]] = item[1]
	     			}
	     			result.data.push(obj)
	     		})
	     		callback(err,result)
	     	}else{
	     		callback(err || res.statusCode)
	     	}
	     })		
	},
	/**
	 * @description get user's weibo 
	 * It return err and result(obj) when callback called
	 * @param {String} id user id
	 * @param {number} page
	 * @param {Function} callback
	 */	
	getTimeline : function(id,page,callback){
		 var rest ={
	 	     uri:'http://weibo.com/aj/mblog/mbloglist?',
             qs : {
             	'page' : typeof page === 'number' ? page : 1,
             	'uid'  : id,
             	'_wv'  : '5'
             },
             method : 'get',
             followRedirect : false,
             encoding : 'utf8',
             header : this.header
	     }
	     var self = this
	     var pagebar = 0
	 	 var result = {
 			count : 0,
 			page : page,
 			data : []
	 	 }
	     request(rest,function(err,res,body){
	     	if(!err && res.statusCode == 200){
                
				var patt = /mid=\\"(\d+)\\"\s+class=\\"WB_feed_type SW_fun \\">.+?<div class=\\"WB_text\\" node-type=\\"feed_list_content\\" nick-name=\\".+?\\">(.+?)<\\\/div>.+?(?=<div action-type=\\"feed_list_item\\")/g
				var re = ''
				while ( (re = patt.exec(body) )!= null ){
					var weibo = {
						mid : re[1],
						text : self._decode(re[2].replace(/<.+?>/g,''))
					}
					var pic = re[0].match(/<img.+?node-type=\\"feed_list_media_bgimg\\" src=\\"(.+?)\\"/)
					if(pic){
						weibo.pic = pic[1].replace(/\\/g,'')
					}
					result.data.push(weibo)
				}
	     		//一页分为三次请求
	     		if( pagebar < 2){
	               rest.qs.pre_page = rest.qs.page,
	               rest.qs.pagebar = pagebar ++
	     		   request(rest,arguments.calleee)
	     		}else{
	     		   result.count = body.match(/action-data=\\"page=(\d+)\\"/)[1]
	     		   callback(err,result)
	     		}
	     	}else{
	     		callback(err || res.statusCode)
	     	}
	     })
		
	},
	/**
	 * @description get weibo's comments
	 * It return err and result(obj) when callback called
	 * @param {String} mid weibo's id
	 * @param {number} page
	 * @param {Function} callback
	 */	
	getComment : function(mid,page,callback){
		 var rest ={
	 	     uri: 'http://weibo.com/aj/comment/big',
             qs : {
             	'id'  : mid,
             	'_wv'  : '5',
             	'page' : page
             },
             method : 'get',
             followRedirect : false,
             encoding : 'utf8',
             header : this.header
	     }
	     var self = this
	     request(rest,function(err,res,body){
	     	
	     	if(!err && res.statusCode == 200){
	     		var result = {
	     			count : 0,
	     			data : []
	     		}
				var patt = /<dl class=\\"comment_list S_line1\\"\s+mid=.+?>.+?<dd>.+?<a.+?id=(\d+).+?>(.+?)<\\\/a>(.+?)<div class=\\"info\\">.+?<\\\/dd>.+?<\\\/dl>/g
				var re = ''
				while ( (re = patt.exec(body) )!= null ){
					var comment = {
						id : re[1],
						name : self._decode(re[2]),
						text : self._decode(re[3].replace(/(<.+?>)|(\\t)/g,''))
					}
					result.data.push(comment)
				}
			    re = body.match(/"count":"(\d+)"/)
			    result.count = re ? re[1] : 0
						
	     		callback(err,result)
	     	}else{
	     		callback(err || res.statusCode)
	     	}
	     })
		
	},
  /**
   *@description get person of interest
   * @param qs {object}
   * {
   *   page: (page of result)
   *   sex : (0:unlimited f:female m:male),
   *   scho: (name of school),
   *   comp: (name of company),
   *   isv : (user type, 4:unlimited 0:normal 1:verification),
   *   prov: ,city: ,(string)
   *   age:1983-1989(range of age),
   *   single:(0:unlimited 1:single),
   *   tag1:,tage2:,tageN:,
   *   sexual: (0:unlimited f:female m:male)
   * }
   * @param callback {function}
   */
  searchUser : function(qs,callback){
    var rest ={
      uri: 'http://weibo.com/find/f',
      method : 'get',
      followRedirect : false,
      encoding : 'utf8',
      header : this.header
    }

    var location = {prov11: "东城区,西城区,崇文区,宣武区,朝阳区,丰台区,石景山区,海淀区,门头沟区,房山区,通州区,顺义区,昌平区,大兴区,怀柔区,平谷区,密云县,延庆县",
                     code11: "1,2,3,4,5,6,7,8,9,11,12,13,14,15,16,17,28,29",prov12: "和平区,河东区,河西区,南开区,河北区,红桥区,塘沽区,汉沽区,大港区,东丽区,西青区,津南区,北辰区,武清区,宝坻区,宁河县,静海县,蓟县,滨海新区,保税区",code12: "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,21,23,25,26,27",prov13: "石家庄,唐山,秦皇岛,邯郸,邢台,保定,张家口,承德,沧州,廊坊,衡水",code13: "1,2,3,4,5,6,7,8,9,10,11",prov14: "太原,大同,阳泉,长治,晋城,朔州,晋中,运城,忻州,临汾,吕梁",code14: "1,2,3,4,5,6,7,8,9,10,23",prov15: "呼和浩特,包头,乌海,赤峰,通辽,鄂尔多斯,呼伦贝尔,兴安盟,锡林郭勒盟,乌兰察布盟,巴彦淖尔盟,阿拉善盟",code15: "1,2,3,4,5,6,7,22,25,26,28,29",prov21: "沈阳,大连,鞍山,抚顺,本溪,丹东,锦州,营口,阜新,辽阳,盘锦,铁岭,朝阳,葫芦岛",code21: "1,2,3,4,5,6,7,8,9,10,11,12,13,14",prov22: "长春,吉林,四平,辽源,通化,白山,松原,白城,延边朝鲜族自治州",code22: "1,2,3,4,5,6,7,8,24",prov23: "哈尔滨,齐齐哈尔,鸡西,鹤岗,双鸭山,大庆,伊春,佳木斯,七台河,牡丹江,黑河,绥化,大兴安岭",code23: "1,2,3,4,5,6,7,8,9,10,11,12,27",prov32: "南京,无锡,徐州,常州,苏州,南通,连云港,淮安,盐城,扬州,镇江,泰州,宿迁",code32: "1,2,3,4,5,6,7,8,9,10,11,12,13",prov33: "杭州,宁波,温州,嘉兴,湖州,绍兴,金华,衢州,舟山,台州,丽水",code33: "1,2,3,4,5,6,7,8,9,10,11",prov34: "合肥,芜湖,蚌埠,淮南,马鞍山,淮北,铜陵,安庆,黄山,滁州,阜阳,宿州,巢湖,六安,亳州,池州,宣城",code34: "1,2,3,4,5,6,7,8,10,11,12,13,14,15,16,17,18",prov35: "福州,厦门,莆田,三明,泉州,漳州,南平,龙岩,宁德",code35: "1,2,3,4,5,6,7,8,9",prov36: "南昌,景德镇,萍乡,九江,新余,鹰潭,赣州,吉安,宜春,抚州,上饶",code36: "1,2,3,4,5,6,7,8,9,10,11",prov37: "济南,青岛,淄博,枣庄,东营,烟台,潍坊,济宁,泰安,威海,日照,莱芜,临沂,德州,聊城,滨州,菏泽",code37: "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17",prov31: "黄浦区,卢湾区,徐汇区,长宁区,静安区,普陀区,闸北区,虹口区,杨浦区,闵行区,宝山区,嘉定区,浦东新区,金山区,松江区,青浦区,南汇区,奉贤区,崇明县",code31: "1,3,4,5,6,7,8,9,10,12,13,14,15,16,17,18,19,20,30",prov41: "郑州,开封,洛阳,平顶山,安阳,鹤壁,新乡,焦作,濮阳,许昌,漯河,三门峡,南阳,商丘,信阳,周口,驻马店,济源",code41: "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18",prov42: "武汉,黄石,十堰,宜昌,襄阳,鄂州,荆门,孝感,荆州,黄冈,咸宁,随州,恩施土家族苗族自治州,仙桃,潜江,天门,神农架",code42: "1,2,3,5,6,7,8,9,10,11,12,13,28,29,30,31,32",prov43: "长沙,株洲,湘潭,衡阳,邵阳,岳阳,常德,张家界,益阳,郴州,永州,怀化,娄底,湘西土家族苗族自治州",code43: "1,2,3,4,5,6,7,8,9,10,11,12,13,31",prov44: "广州,韶关,深圳,珠海,汕头,佛山,江门,湛江,茂名,肇庆,惠州,梅州,汕尾,河源,阳江,清远,东莞,中山,潮州,揭阳,云浮",code44: "1,2,3,4,5,6,7,8,9,12,13,14,15,16,17,18,19,20,51,52,53",prov45: "南宁,柳州,桂林,梧州,北海,防城港,钦州,贵港,玉林,百色,贺州,河池,来宾,崇左",code45: "1,22,3,4,5,6,7,8,9,10,11,12,13,14",prov46: "海口,三亚,其他",code46: "1,2,90",
                      prov50: "万州区,涪陵区,渝中区,大渡口区,江北区,沙坪坝区,九龙坡区,南岸区,北碚区,万盛区,双桥区,渝北区,巴南区,黔江区,长寿区,綦江县,潼南县,铜梁县,大足县,荣昌县,璧山县,梁平县,城口县,丰都县,垫江县,武隆县,忠县,开县,云阳县,奉节县,巫山县,巫溪县,石柱土家族自治县,秀山土家族苗族自治县,酉阳土家族苗族自治县,彭水苗族土家族自治县,江津区,合川区,永川区,南川区",
                     code50: "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,40,41,42,43,81,82,83,84",prov51: "成都,自贡,攀枝花,泸州,德阳,绵阳,广元,遂宁,内江,乐山,南充,眉山,宜宾,广安,达州,雅安,巴中,资阳,阿坝,甘孜,凉山",code51: "1,3,4,5,6,7,8,9,10,11,13,14,15,16,17,18,19,20,32,33,34",prov52: "贵阳,六盘水,遵义,安顺,铜仁,黔西南,毕节,黔东南,黔南",code52: "1,2,3,4,22,23,24,26,27",prov53: "昆明,曲靖,玉溪,保山,昭通,楚雄,红河,文山,思茅,西双版纳,大理,德宏,丽江,怒江,迪庆,临沧",code53: "1,3,4,5,6,23,25,26,27,28,29,31,32,33,34,35",prov54: "拉萨,昌都,山南,日喀则,那曲,阿里,林芝",code54: "1,21,22,23,24,25,26",prov61: "西安,铜川,宝鸡,咸阳,渭南,延安,汉中,榆林,安康,商洛",code61: "1,2,3,4,5,6,7,8,9,10",prov62: "兰州,嘉峪关,金昌,白银,天水,武威,张掖,平凉,酒泉,庆阳,定西,陇南,临夏,甘南",code62: "1,2,3,4,5,6,7,8,9,10,24,26,29,30",prov63: "西宁,海东,海北,黄南,海南,果洛,玉树,海西",code63: "1,21,22,23,25,26,27,28",prov64: "银川,石嘴山,吴忠,固原,中卫",code64: "1,2,3,4,5",prov65: "乌鲁木齐,克拉玛依,吐鲁番,哈密,昌吉,博尔塔拉,巴音郭楞,阿克苏,克孜勒苏,喀什,和田,伊犁,塔城,阿勒泰,石河子",code65: "1,2,21,22,23,27,28,29,30,31,32,40,42,43,44",prov71: "台北市,高雄市,基隆市,台中市,台南市,新竹市,嘉义市,台北县,宜兰县,桃园县,新竹县,苗栗县,台中县,彰化县,南投县,云林县,嘉义县,台南县,高雄县,屏东县,澎湖县,台东县,花莲县,其他",code71: "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,90",prov81: "中西区,东区,九龙城区,观塘区,南区,深水埗区,黄大仙区,湾仔区,油尖旺区,离岛区,葵青区,北区,西贡区,沙田区,屯门区,大埔区,荃湾区,元朗区,其他",code81: "2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,1",prov82: "花地玛堂区,圣安多尼堂区,大堂区,望德堂区,风顺堂区,氹仔,路环,其他",code82: "2,3,4,5,6,7,8,1",prov400: "美国,英国,法国,俄罗斯,加拿大,巴西,澳大利亚,印尼,泰国,马来西亚,新加坡,菲律宾,越南,印度,日本,新西兰,韩国,德国,意大利,爱尔兰,荷兰,瑞士,乌克兰,南非,芬兰,瑞典,奥地利,西班牙,比利时,挪威,丹麦,波兰,阿根廷,白俄罗斯,哥伦比亚,古巴,埃及,希腊,匈牙利,伊朗,蒙古,墨西哥,葡萄牙,沙特阿拉伯,土耳其,其他",code400: "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,16",prov100: "",code100: "",
                      prov: "安徽,北京,重庆,福建,甘肃,广东,广西,贵州,海南,河北,黑龙江,河南,湖北,湖南,内蒙古,江苏,江西,吉林,辽宁,宁夏,青海,山西,山东,上海,四川,天津,西藏,新疆,云南,浙江,陕西,台湾,香港,澳门,海外,其他",
                      code: "34,11,50,35,62,44,45,52,46,13,23,41,42,43,15,32,36,22,21,64,63,14,37,31,51,12,54,65,53,33,61,71,81,82,400,100"};
    var getCode = function(code,loc){
      var locs = location['prov'+code].split(','),i = 0
      for( i in locs){
        if(locs[i] == loc){
          break
        }
      }
      return location['code'+code].split(',')[i]        
    }
    
    qs.prov = qs.prov ? getCode('',qs.prov) : undefined
    qs.city = qs.city ? getCode(qs.prov,qs.city) : undefined
    
    qs.type = 1
    qs.search = 1
    
    rest.qs = qs
    var self = this
    request(rest,function(err,res,body){

      if(!err  && res.statusCode == 200){
        var result = {
          count : 0,
          data : []
        }
        var patt = /<li class=\\"clearfix\\" data-follow=\\"uid=(\d+)&fnick=(.+?)\\".+?<img  alt=.+?src=\\"(.+?)\\">.+?(male|female).+?>(.+?)\\t.+?follow\\">(\d+).+?fans\\">(\d+).+?info\\">(.+?)<.+?/g
        var re = ''
        while ( (re = patt.exec(body) )!= null ){
          var person = {
            id : re[1],
            name : re[2],
            pic : re[3].replace(/\\/g,''),
            sex : re[4],
            location : re[5],
            follow : re[6],
            fans : re[7],
            profile : re[8]
          }
          result.data.push(person)
        }

        re = body.match(/conResult_VerTitle.+?<h3>.+?(\d+)/)
        result.count = re ? re[1] : 0

        callback(err,result)
      }else{
        callback(err || res.statusCode)
      }
    })
  },
	/**
	 * @description get weio search result
	 * It return err ,response and response'data when callback called
	 * Todo parse data ,now it only return raw data it scrap
	 * @param {String} word keyword to search
	 * @param {number} page result's page
	 * @param {Function} callback
	 */	
	getSearch : function(word,page,callback){
		 var rest ={
	 	     uri: 'http://s.weibo.com/weibo/' + word,
             qs : {
             	'page' : typeof page === 'number' ? page : 1
             },
             method : 'get',
             followRedirect : false,
             header : this.header
	     }
	     request(rest,arguments[arguments.length-1])		
	},
	/**
	 * @description  API only realize several mainly inferface,if
	 * you want to get more ,use it and parse data 
	 * It return err ,response and response'data when callback called
	 * @param {String} uri uri of resource
	 * @param {Function} callback
	 */	
	getData : function(uri,callback){
		 var rest ={
		 	 uri : uri,
             method : 'get',
             followRedirect : false,
             header : this.header
	     }
	     request(rest,callback)		
	},
	/**
	 * Unicode to Chinese ,like \u9a6c to 马
	 * @param {string} str
	 * @return {string} 
	 */
	_decode : function(str){
		return unescape(str.replace(/\\/g,'%'))
	}
	
}
module.exports = weibo
