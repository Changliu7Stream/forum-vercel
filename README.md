# 现代化社区论坛系统

一个功能完整的社区论坛系统，使用纯 HTML5/CSS3/JavaScript 作为前端，Node.js + Express 作为后端，SQLite 作为数据库。

## 功能特性

### 用户系统
- 用户注册与登录（JWT 认证）
- 个人资料管理
- 头像、个人简介、个人网站
- 密码修改

### 帖子系统
- 帖子发布与编辑（支持 Markdown）
- 点赞与收藏
- 置顶与精华（管理员）
- 浏览量统计
- 分类与标签

### 评论系统
- 多级嵌套回复
- 评论点赞
- 评论管理

### 分类与标签
- 分类管理（管理员）
- 标签管理（管理员）
- 标签云

### 搜索系统
- 全文搜索
- 按分类、标签、作者筛选

### 管理后台
- 仪表盘统计
- 用户管理（禁用/启用、角色设置）
- 帖子管理（置顶/精华/删除）
- 举报管理
- 系统设置

### 其他
- 通知系统（回复、点赞）
- 积分系统（发帖+10、评论+5、点赞+2、登录+1）
- 深色/浅色主题切换
- 响应式设计（支持移动端）

## 技术栈

- **前端**：纯 HTML5 + CSS3 + JavaScript（无框架）
- **后端**：Node.js + Express
- **数据库**：SQLite（sql.js 纯 JS 实现）
- **认证**：JWT
- **图标**：Lucide Icons
- **密码加密**：bcryptjs

## 快速启动

```bash
# 安装依赖
npm install

# 启动服务器
npm start

# 或开发模式（自动重载）
npm run dev
```

访问 http://localhost:3000

## 初始账号

- 用户名：admin@example.com
- 密码：admin123

## 项目结构

```
forum/
├── server.js           # 主服务器
├── db.js               # 数据库模块
├── utils.js            # 工具函数
├── middleware/
│   └── auth.js         # 认证中间件
├── routes/
│   ├── auth.js         # 认证路由
│   ├── users.js        # 用户路由
│   ├── posts.js        # 帖子路由
│   ├── comments.js     # 评论路由
│   ├── categories.js   # 分类路由
│   ├── tags.js         # 标签路由
│   ├── notifications.js # 通知路由
│   ├── reports.js      # 举报路由
│   ├── points.js       # 积分路由
│   ├── favorites.js     # 收藏路由
│   ├── settings.js     # 设置路由
│   ├── dashboard.js    # 仪表盘路由
│   └── search.js       # 搜索路由
├── admin/              # 管理后台页面
├── static/
│   ├── css/            # 样式文件
│   └── js/             # JavaScript 文件
├── index.html          # 首页
├── login.html          # 登录页
├── register.html       # 注册页
├── post.html           # 帖子详情页
├── new-post.html       # 发帖页
├── edit-post.html      # 编辑帖子页
├── profile.html        # 用户主页
├── settings.html       # 设置页
├── category.html       # 分类页
├── search.html         # 搜索页
├── notifications.html  # 通知页
├── favorites.html      # 收藏页
└── install.html       # 安装向导
```

## API 接口

详细 API 接口请参考项目文档。

### 认证相关
- POST /api/auth/register - 注册
- POST /api/auth/login - 登录
- POST /api/auth/logout - 登出
- GET /api/auth/me - 获取当前用户

### 帖子相关
- GET /api/posts - 获取帖子列表
- POST /api/posts - 创建帖子
- GET /api/posts/:id - 获取帖子详情
- PUT /api/posts/:id - 更新帖子
- DELETE /api/posts/:id - 删除帖子
- POST /api/posts/:id/like - 点赞
- POST /api/posts/:id/favorite - 收藏

### 管理后台
- GET /api/admin/dashboard - 仪表盘数据
- GET /api/admin/users - 用户列表
- GET /api/admin/posts - 帖子列表

## 许可证

MIT