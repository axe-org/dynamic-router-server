# dynamic-router-server

dynamic router server for axe 

[DEMO](https://proxy-dynamic.demo.axe-org.cn/admin/)

为 `Axe`中的动态路由提供简单的服务器实现，动态路由负责配置`axe`系统中 声明路由和实现路由的映射关系 ，提供一定的动态化能力 。 

安装与使用 ：

	npm install dynamic-router-server -g
	
	# 参数是文件路径， 以存放数据。
	dynamic-router-server path/to/save
	

### 版本限定

设置版本，如 设置 `login => react://login/`  ,版本为`1.0.0` ，表示从 `1.0.0`版本（包括）的APP开始，该规则生效。 

而如果之后再次设置`login`的路由， 如 `2.0.0`版本，我们把`login`模块做了一份原生实现， 则配置了`login => axe://login/` ,版本号限定为`2.0.0` 

所以，对于`2.0.0`及以上的APP，使用的是`axe://login/` , 而对 `1.0.0` -> `2.0.0`这中间的部分APP， 依旧使用`react://login/`的规则。

即版本限定，优先使用最新版本的配置。

### tag限定

设置`tag`的目的，是为了更加灵活的进行设置: 设置了`tag`的规则，只对满足`tag`请求下发这条规则。 `tag`可以用来解决 多版本APP问题，如一个系统支持多个APP （不建议这样做， 最好还是能一个系统对应一个APP。）。

`tag`最重要的功能在于 之后可以对接 灰度测试或者 AB测试系统。 如在一个版本上，我们同时有多种实现时 ， 我们可以通过`tag`来设定 APP选择具体路由规则。详细示例 ：

如一开始我们有路由 `login => axe://login/`, 之后我们开发了一个`react-native`版本， 则我们需要验证一下效果，而不是全部替换。 则我们设定规则`login => react://login/` , 对该规则设定了一个`tag` : `react-test` 。 

对接`AB`测试， 则业务系统会给每个用户发放`tag` ， 如设定规则 5%的用户来进行这次测试。 所以有两个用户根据AB测试系统下发的`tag`， A带着 `react-test` ， B带着`xxx` ,来请求动态路由服务器， 而服务器根据`tag`的设定不同，使A 使用 `login => react://login/` 规则， 而 B使用 `login => axe://login/`

`tag`判断时， 前端可以带多个`tag`， 而规则命中`tag`的要求是， 配置的`tag`在用户的标签列表内。

## 注意事项

* 系统只有添加和停止两个操作， 没有修改操作， 也没有删除操作。 对于废弃的规则，要及时停止。
* 在一个版本上， 相同`tag`设定只应该有一个规则。
* 权限控制，生产环境的管理页面的权限控制，参考[axe-demo](https://github.com/axe-org/axe-admin-docker/tree/master/demo)的做法，前置一层`nginx`来做访问限定。