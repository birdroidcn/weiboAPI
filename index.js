var rsa = require('rsa.js') //weibo's rsa module
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
       		if(response.statusCode == 200 && !error){
       			try{
       		      var url = body.match(/location\.replace\('(.*)'\)/)[1]
                  self._login(url)
               }catch(e){
               	  console.log(e)
               }
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
			if (res.headers['set-cookie']) {
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
	     		debugger
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
   *
   *
   * @param word {string}
   * @param type {string} 'all' | 'nickname' | 'school' | 'tag' | 'work'
   * @param page {number}   1-50
   * @param callback {function}
   */
  searchUser : function(wd,type,page,callback){
    var rest ={
      uri: 'http://s.weibo.com/user',
      qs : {
        'page' : page
      },
      method : 'get',
      followRedirect : false,
      encoding : 'utf8',
      header : this.header
    }

    if(type == 'all'){
      rest.uri += wd
    }else if(  type == 'nickname' || type == 'school'
                || type == 'tag' || type == 'work'){
      rest.qs[type] = wd
    }

    var self = this
    request(rest,function(err,res,body){

      if(!err && res.statusCode == 200){
        var result = {
          count : 0,
          data : []
        }
        var pattStr = '<div class=\\"list_person clearfix\\">.+?'
          + '<img src=\\"(.+?)\\" usercard'
          + ''
        var patt = new RegExp(pattStr,'g')
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
