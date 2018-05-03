<template>
  <div class="container" v-loading="loading">
    <div class="option">
      <div class="left">
        <div class="label">查询版本</div>
        <el-input style="width:120px;" v-model="version" placeholder="筛选版本可用"/>
        <div class="label" style="margin-left: 10px;">指定模块</div>
        <el-input style="width: 120px;" v-model="module" placeholder="具体模块名">
        </el-input>
        <div class="label" style="margin-left: 10px;">查询tag</div>
        <el-input style="width: 125px;" v-model="tag" placeholder="包含tag的规则">
        </el-input>
        <el-radio-group v-model="enable" @change="loadData" style="width: 170px;margin-left: 10px;">
          <el-radio-button label="启用中"/>
          <el-radio-button label="已弃用"/>
        </el-radio-group>
      </div>
      <div class="right">
        <el-dialog title="添加规则" :visible.sync="addRuleDialogVisible" center width="500px" v-loading="addRuleLoading">
          <el-form :model="addRuleInfo" ref="addRuleFrom" :rules="validateRules" label-width="120px">
            <el-form-item label="模块名" prop="module">
              <el-input v-model="addRuleInfo.module" :maxlength="30" style="width: 250px" placeholder="如 login"/>
            </el-form-item>
            <el-form-item label="重定向地址" prop="redirect">
              <el-input v-model="addRuleInfo.redirect" :maxlength="50" style="width: 300px" placeholder="如 axe://login/"/>
            </el-form-item>
            <el-form-item label="APP支持版本" prop="version">
              <el-input v-model="addRuleInfo.version" :maxlength="11" style="width: 200px"/>
            </el-form-item>
            <el-form-item label="tag管理">
              <div class="tags">
                <el-tag class="tag" :key="tag" v-for="tag in addRuleInfo.tags" closable :disable-transitions="false" @close="handleTagDelete(tag)">
                  {{tag}}
                </el-tag>
                <el-input class="input-new-tag" :maxlength="15" v-if="addTagInputVisible" v-model="newTag" ref="saveTagInput" size="small" @keyup.enter.native="handleInputConfirm" @blur="handleInputConfirm"/>
                <el-button v-else class="button-new-tag" size="small" @click="showInput">添加Tag</el-button>
              </div>
            </el-form-item>
          </el-form>
          <div slot="footer" class="dialog-footer">
            <el-button @click="addRuleDialogVisible = false">取 消</el-button>
            <el-button type="primary" @click="submitRule">确 定</el-button>
          </div>
        </el-dialog>
        <el-button type="primary" @click="showAddDialog" icon ="el-icon-plus">添加</el-button>
        <el-button type="primary" @click="loadData" icon="el-icon-refresh">刷新</el-button>
      </div>
    </div>
    <el-table :data="ruleList" border class="table">
      <el-table-column label="模块" prop="module"/>
      <el-table-column label="重定向" prop="redirect"/>
      <el-table-column label="APP版本" prop="version"/>
      <el-table-column label="状态" prop="enableInfo"/>
      <el-table-column label="操作时间" prop="operationTime"/>
      <el-table-column label="tags">
        <template slot-scope="scope">
          <el-tag type="info" style="margin-right: 4px;margin-bottom: 3px;" v-for="tag in scope.row.tags" :key="tag">{{tag}}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="停用规则" v-if="selectEnable">
        <template slot-scope="scope">
          <el-button @click="disableRule(scope.row)" size="small">停用</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-dialog title="关闭规则" :visible.sync="disableDialogVisible" center width="450px" v-loading="disableLoading">
      <div>关闭路由规则 : {{ disableDialogText }} </div>
      <div slot="footer" class="dialog-footer">
        <el-button @click="disableDialogVisible = false">取 消</el-button>
        <el-button type="primary" @click="submitDisable">确 定</el-button>
      </div>
    </el-dialog>
    <el-pagination layout="prev,pager,next" :total="pageCount" :current-page.sync="pageNum" @current-change="loadData"/>
  </div>
</template>
<script>
import axios from 'axios'
export default {
  name: 'DynamicRouter',
  data () {
    return {
      version: '',
      module: '',
      tag: '',
      enable: '启用中',
      loading: false,
      pageCount: 1,
      pageNum: 1,
      ruleList: [],
      lastForm: {//记录查询的form表单，以判断是否需要重置分页。

      },
      disableDialogVisible: false,
      disableLoading: false,
      disableDialogText: '',
      disableSelectedRuleID: '',
      addRuleDialogVisible: false,
      addRuleLoading: false,
      addRuleInfo: {
        module: '',
        redirect: '',
        version: '',
        tags: []
      },
      validateRules: {
        version: [
          { type: 'string', required: true, message: '请输入版本号', trigger: 'blur' },
          { min: 5, max: 11, pattern: /^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/, message: '请输入正确的三段式版本号', trigger: 'blur' }
        ],
        redirect: [
          { type: 'string', required: true, message: '请输入重定向地址', trigger: 'blur'},
          { min:6 , max: 50, pattern: /^\w+:\/\/.+$/, message: '请输入正确的重定向地址', trigger: 'blur' }
        ],
        module: [
          { type: 'string', required: true, message: '请输入模块名', trigger:'blur'},
          { min:1, max: 30, pattern:/^\w[\w\d_]*$/, message: '请输入正确格式的模块名！！', trigger: 'blur'}
        ]
      },
      addTagInputVisible: false,
      newTag: ''
    }
  },
  computed: {
    selectEnable () {
      return this.enable === '启用中'
    }
  },
  methods: {
    handleTagDelete(tag) {
      this.addRuleInfo.tags.splice(this.addRuleInfo.tags.indexOf(tag), 1);
    },
    showInput() {
      this.addTagInputVisible = true;
      this.$nextTick(_ => {
        this.$refs.saveTagInput.$refs.input.focus();
      });
    },
    handleInputConfirm() {
      let inputValue = this.newTag.trim();
      if (inputValue !== '') {
        this.addRuleInfo.tags.push(inputValue);
      }
      this.addTagInputVisible = false;
      this.newTag = '';
    },
    submitRule () {
      this.$refs['addRuleFrom'].validate((valid) => {
        if (!valid) {
          return
        }
        let form = {
          ...this.addRuleInfo
        }
        form.tags = JSON.stringify(form.tags)
        if (form.tags.length >= 100) {
          // 设置该字段最多100字节。 即规则不可能无限多。
          return this.$message({
            type: 'error',
            message: 'tag 设置过多， 请减少tag数量！！！！',
            duration: 0,
            showClose: true
          })
        }
        if (form.redirect.substring(form.redirect.length - 1) !== '/') {
          // 以 / 结尾
          form.redirect = form.redirect + '/'
        }
        this.addRuleLoading = true
        axios.post('./create', form).then(res => {
          this.addRuleLoading = false
          if (res.data.error) {
            return this.$message({
              type: 'error',
              message: res.data.error,
              duration: 0,
              showClose: true
            })
          }
          this.$message({
            type: 'success',
            message: '提交规则成功！！'
          })
          this.addRuleDialogVisible = false
          // 刷新数据
          this.loadData()
          // 重置添加页面表单
          this.addRuleInfo = {
            module: '',
            redirect: '',
            version: '',
            tags: []
          }
          this.addTagInputVisible = false
          this.newTag = ''
        }).catch(err => {
          this.addRuleLoading = false
          this.$message({
            type: 'error',
            message: err.message,
            duration: 0,
            showClose: true
          })
        })
      })
    },
    disableRule (rule) {
      this.disableSelectedRuleID = rule.ruleID
      this.disableDialogText = rule.module + " => " + rule.redirect
      this.disableDialogVisible = true
    },
    submitDisable () {
      this.disableLoading = true
      axios.post('./close', {
        ruleID: this.disableSelectedRuleID
      }).then(res => {
        this.disableLoading = false
        if (res.data.error) {
          return this.$message({
            type: 'error',
            message: res.data.error,
            duration: 0,
            showClose: true
          })
        }
        this.disableDialogVisible = false
        this.loadData()
      }).catch(err => {
        this.disableLoading = false
        this.$message({
          type: 'error',
          message: err.message,
          duration: 0,
          showClose: true
        })
      })
    },
    showAddDialog () {
      this.addRuleDialogVisible = true
    },
    loadData () {
      let form = {}
      let version = this.version.trim()
      if (version !== '') {
        // 检测一下版本格式，必须要为三段式
        if (! /^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/.test(version)) {
          return this.$message({
            type: 'error',
            message: '请输入正确格式的APP版本号， 为三段式！',
            duration: 0,
            showClose: true
          })
        }
        form.version = version
      }
      this.loading = true
      let module = this.module.trim()
      if (module !== '') {
        form.module = module
      }
      let tag = this.tag.trim()
      if (tag !== '') {
        form.tag = tag
      }
      let enable = this.selectEnable
      if (this.selectEnable) {
        form.enable = 1
      } else {
        form.enable = 0
      }
      form['pageNum'] = this.pageNum
      if (this.lastForm.version !== form.version || this.lastForm.module !== form.module || this.lastForm.tag !== form.tag
      || this.lastForm.enable !== form.enable) {
        // 修改选项，重置分页情况
        form['pageNum'] = 1
      }
      this.lastForm = form
      // 请求数据。
      axios.post('./list', form).then(res => {
        this.loading = false
        if (res.data.error) {
          return this.$message({
            showClose: true,
            duration: 0,
            message: res.data.error,
            type: 'error'
          })
        }
        this.pageCount = res.data.pageCount
        this.pageNum = form.pageNum
        res.data.ruleList.forEach(rule => {
          rule['enableInfo'] = rule.enable ? '启用中' : '已停用'
        })
        this.ruleList = res.data.ruleList
      }).catch(err => {
        this.loading = false
        this.$message({
          showClose: true,
          duration: 0,
          message: err.message,
          type: 'error'
        })
      })
    }
  },
  mounted () {
    this.pageCount = 1
    this.pageNum = 1
    this.loadData()
  }
}
</script>
<style scoped>
.container {
  margin: 20px;
  box-sizing: border-box;
  width: auto;
  height: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.option {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  height: 50px;
  width: 100%;
  margin-bottom: 20px;
}
.left {
  display: flex;
  height: 50px;
  justify-content: flex-start;
  align-items: center;
}
.right {
  display: flex;
  height: 50px;
  justify-content: flex-end;
  align-items: center;
}
.tag {
  margin-left: 8px;
}
.button-new-tag {
  margin-left: 10px;
  height: 32px;
  line-height: 30px;
  padding-top: 0;
  padding-bottom: 0;
}
.input-new-tag {
  width: 90px;
  margin-left: 10px;
  vertical-align: bottom;
}
.label {
  width: 60px;
  color: #909399;
  font-size: 14px;
}
</style>
