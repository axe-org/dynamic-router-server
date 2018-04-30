// 数据库，使用sqlite
const sqlite = require('sqlite')
const path = require('path')
let db
let sqlFile = path.join(global.workPath, 'dr.db')
sqlite.open(sqlFile, {Promise}).then(ret => {
  db = ret
  // 创建动态路由规则表
  // id 自增主键
  // module 模块名 Login
  // redirect 重定向路径，axe://Login/ , 默认补上这个/。
  // version 三段式版本号， 要求格式为 [0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3} 。 这里版本号，指从版本号开始，启用规则。
  // version_code 转换为数字格式， 即 a.b.c = a * 1000 * 1000 + b * 1000 + c, 以开始比较版本情况。
  // enable 值为 0/1是否启用， 可以关闭某个规则，但是不能删除和修改规则。
  // operation_time 操作时间 ,即创建时间和停止时间。
  // tags 通过tag 来处理一些动态性的需求， 这里tags存储的是 json数组。
  db.run(`CREATE TABLE IF NOT EXISTS rule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module VARCHAR(30) NOT NULL,
    redirect VARCHAR(50) NOT NULL,
    version VARCHAR(11) NOT NULL,
    version_code INTEGER NOT NULL,
    enable INT(1) NOT NULL,
    operation_time DATETIME NOT NULL,
    tags VARCHAR(100) NOT NULL
  )`)
}).catch(err => {
  throw err
})

// 管理员分页查询 规则列表
// 查询参数为 module : 指定模块
// versionCode : 指定app版本 , 指在该版本可以使用的规则。
// enable: 启动中
// tag : 设置tag过滤, 分页查询时， 设置的tag只能有一个
// pageNum : 分页数， 从0 开始
// pageSize : 分页大小， 默认为 12
function queryRuleList (query) {
  let data = {}
  let param = []
  let limitSQL = ' WHERE 1 = 1 '
  if (query.module) {
    limitSQL += ' AND module = ? '
    param.push(query.module)
  }
  if (query.versionCode) {
    limitSQL += ' AND version_code <= ? '
    param.push(query.versionCode)
  }
  if (query.tag) {
    limitSQL += ` AND tags LIKE ? `
    param.push(`%"${query.tag}"%`)
  }
  if (query.enable !== undefined) {
    if (query.enable) {
      limitSQL += ' AND enable = 1 '
    } else {
      limitSQL += ' AND enable = 0 '
    }
  }
  param.push(query.pageSize)
  param.push(query.pageNum * query.pageSize)
  return db.all(`SELECT * FROM rule ${limitSQL} ORDER BY operation_time DESC LIMIT ? OFFSET ?`, param).then(rows => {
    let list = []
    rows.forEach(row => {
      list.push({
        ruleID: row.id,
        module: row.module,
        redirect: row.redirect,
        version: row.version,
        enable: row.enable,
        operationTime: row.operation_time,
        tags: JSON.parse(row.tags)
      })
    })
    data['ruleList'] = list
  }).then(() => {
    param.pop()
    param.pop()// 移除分页参数.
    return db.get(`SELECT COUNT(*) AS count FROM rule ${limitSQL}`, param)
  }).then(row => {
    data['pageCount'] = parseInt(row.count / query.pageSize) + 1
    return data
  })
}

// 添加规则
function createRule (ruleInfo) {
  return db.run(`INSERT INTO rule VALUES(NULL, ? , ? , ? , ? , 1 , DATETIME('now', 'localtime'), ?)`,
    [ruleInfo.module, ruleInfo.redirect, ruleInfo.version, ruleInfo.versionCode, ruleInfo.tags])
}

// 操作规则，置为不可用状态
function disableRule (ruleID) {
  return db.run(`UPDATE rule SET enable = 0 , operation_time = DATETIME('now', 'localtime') WHERE id = ?`, ruleID)
}

// app查询设定的规则
// 规则命中由两个因素限定
// tags tag的目的是对于一个版本的 ，一个模块可以有两个实现， 以支持后续的灰度或者ab测试功能。
// version 版本号， 随着版本变更，app的模块实现发生了变化。 所以在一个模块，在tags相同的情况下，版本限定是必须不同的， 而 对于两个不同版本的规则，优先使用版本限定最高的规则。
function queryRules (versionCode, tags) {
  return db.all(`SELECT * FROM rule WHERE version_code <= ? AND enable = 1 ORDER BY version_code DESC`).then(rows => {
    let rules = {}
    rows.forEach(row => {
      let ruleTags = JSON.parse(row.tags)
      // tag命中，命中规则为 上传tags 包含所有规则tags.
      if (tags.length >= ruleTags.length) {
        for (let index in ruleTags) {
          if (!tags.includes(tags[index])) {
            return
          }
        }
        // 排序后，只设置最新的规则。
        if (!rules[row.module]) {
          rules[row.module] = row.redirect
        }
      }
    })
    return rules
  })
}

module.exports = {
  queryRuleList: queryRuleList,
  createRule: createRule,
  disableRule: disableRule,
  queryRules: queryRules
}
