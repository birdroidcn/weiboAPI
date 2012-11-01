var weibo = require("weiboapi")
var EventProxy =require('eventproxy')
var proxy = new EventProxy()
//查询用户的朋友，即相互关注
proxy.assign("fans", "follow", function (fans, follow) {
	var obj = {},friends={}
    for(var i=0;i<fans.length;i++){
    	obj[fans[i].uid] = true
    }
    for(i=0;i<follow.length;i++){
    	if(obj[follow[i].uid]){
    		friends[follow[i].uid] = {
    			              fnick : follow[i].fnick ,
                              sex : follow[i].sex
                              }
    	}
    }
    debugger
})

weibo.login('email','password',function(err,API){
	if(!err){
		var fans = [],follow = []
		API.getFans('uid',1,function(err,result){
			if(err) API.getFans('uid',result.page,arguments.callee)
			else{
				if( result.page < result.count){
					fans = fans.concat(result.data)
				    API.getFans('uid',result.page+1,arguments.callee)
				}else{
					proxy.trigger("fans", fans)
				}
			}
		})
		API.getFollow('uid',1,function(err,result){
			if(err) {
				API.getFollow('uid',result.page,arguments.callee)
			}else{
				if( result.page < result.count){
					follow = follow.concat(result.data)
				    API.getFollow('uid',result.page+1,arguments.callee)
				}else{
					proxy.trigger("follow", follow)
				}
			}
		})
	}
})
