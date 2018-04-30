const sql = require('./sql')
const hash = require('string-hash')
// 设置缓存时间为0， 即我们缓存所有请求， 而当进行新增修改操作时，清空缓存。
const NodeCache = require('node-cache')
const cache = new NodeCache({checkperiod: 0})

// app 访问接口， 以获取路由配置， 这里使用缓存以提高性能
function queryDynamicRouter (req, res) {
  let version = req.body.version
  // 前端传入tags 为数组类型
  let tags = req.body.tags
  if (version === undefined) {
    return res.json({error: '参数传递错误'})
  }
  if (!(tags instanceof Array)) {
    tags = []
  }
  tags = tags.sort()
  // 然后拿 version + tags 作为key
  let key = version + JSON.stringify(tags)
  // 简单快速hash
  key = hash(key)
  let data = cache.get(key)
  if (data) {
    res.json(data)
  } else {
    // 没有缓存
    let splited = version.split('.')
    let versionCode = parseInt(splited[0]) * 1000 * 1000 + parseInt(splited[1]) * 1000 + parseInt(splited[2])
    sql.queryRules(versionCode, tags).then(data => {
      res.json(data)
      cache.set(key, data)
    }).catch(err => {
      res.json({error: err.message})
    })
  }
}

// 接下来是管理接口。
function disableRule (req, res) {
  let ruleID = req.body.ruleID
  if (ruleID === undefined) {
    return res.json({error: '参数传递错误！！'})
  }
  ruleID = parseInt(ruleID)
  sql.disableRule(ruleID).then(() => {
    res.json({})
    // 清空本地缓存
    cache.flushAll()
  }).catch(err => {
    res.json({error: err.message})
  })
}

// 提交规则
function createRule (req, res) {
  let module = req.body.module
  let redirect = req.body.redirect
  let version = req.body.version
  // tags 传的是字符串， 前端为空时， 传"[]"
  let tags = req.body.tags
  if (module === undefined || redirect === undefined || version === undefined || tags === undefined) {
    return res.json({error: '参数传递错误！'})
  }
  let splited = version.split('.')
  let versionCode = parseInt(splited[0]) * 1000 * 1000 + parseInt(splited[1]) * 1000 + parseInt(splited[2])
  sql.createRule({
    module: module,
    redirect: redirect,
    version: version,
    versionCode: versionCode,
    tags: tags
  }).then(() => {
    res.json({})
    cache.flushAll()
  }).catch(err => {
    res.json({error: err.message})
  })
}

// 查询列表
function queryRuleList (req, res) {
  let version = req.body.version
  let enable = req.body.enable
  let module = req.body.module
  let tag = req.body.tag
  // 只有pageNum是必须的
  let pageNum = req.body.pageNum
  if (pageNum === undefined) {
    return res.json({error: '参数传递错误'})
  }
  pageNum = parseInt(pageNum) - 1
  let query = {
    pageNum: pageNum,
    pageSize: 12
  }
  if (version) {
    let splited = version.split('.')
    let versionCode = parseInt(splited[0]) * 1000 * 1000 + parseInt(splited[1]) * 1000 + parseInt(splited[2])
    query['versionCode'] = versionCode
  }
  if (tag) {
    query['tag'] = tag
  }
  if (enable !== undefined) {
    query['enable'] = enable ? 1 : 0
  }
  if (module) {
    query['module'] = module
  }
  sql.queryRuleList(query).then(data => {
    res.json(data)
  }).catch(err => {
    res.json({error: err.message})
  })
}

function route (app) {
  app.post('/query', queryDynamicRouter)
  app.post('/admin/list', queryRuleList)
  app.post('/admin/create', createRule)
  app.post('/admin/close', disableRule)
}

module.exports = route
