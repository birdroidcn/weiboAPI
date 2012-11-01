weiboAPI(nodejs version)
======================
基于页面分析技术的新浪微博API
# 优势
新浪开放的API相对有限，主要集中于授权人的信息。基于页面分析而开发出的API权限更大，利用它可以做数据挖掘等更多事。
# Installation
安装
```
npm install weiboAPI -g
```
# Usage
```
//引入包
var weibo = require("weiboAPI")
//输入账号和密码 ，成功返回API对象
weibo.login('email','password',function(err,API){
	if(!err){
	     //并发请求
	     API.getTimeline('UID',1,function(err,result){
	         if(!err){
	             var data = result.data
	             //do something
	         }
	     })
     	 API.getComment('mid',function(err,result){
		     //do something
	     })
	}
```
# API
```
getShow(uid,callback)  //回调函数有两个参数，第一个为err，第二个为result
getFollow(uid,page,callback)
getFans(uid,page,callback)
getTimeline(uid,page,callback)
getComment(uid,callback)  //注意：每条微博最多返回10条评论
getSearch(keyword,page,callback)  //注意：返回结果未被解析
getData(uri,callback)  //uri是请求地址，回到函数有三个参数，第一个为err 第二个为响应结果，第三个为响应主体，均未解析
```

# License (MIT)
Copyright (c) 2012 QinLiujie
http://weibo.com/birdroid

The MIT License

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
