/**
 * 论坛主服务器（Vercel Serverless 兼容版）
 *
 * 改动：
 * - 移除 app.listen()（Vercel 不需要监听端口）
 * - 移除 sql.js 文件系统逻辑（改用 pg + Supabase）
 * - 导出 Express app 供 Vercel @vercel/node 包装
 * - 冷启动时自动 seed 管理员和示例数据（幂等）
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { ensureSeed } = require('./db');
const { authMiddleware } = require('./middleware/auth');

// 路由
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');
const categoryRoutes = require('./routes/categories');
const tagRoutes = require('./routes/tags');
const notificationRoutes = require('./routes/notifications');
const reportRoutes = require('./routes/reports');
const pointsRoutes = require('./routes/points');
const favoritesRoutes = require('./routes/favorites');
const settingsRoutes = require('./routes/settings');
const dashboardRoutes = require('./routes/dashboard');
const searchRoutes = require('./routes/search');

const app = express();

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 认证中间件（让所有路由都能拿到 req.user）
app.use(authMiddleware);

// 静态资源
app.use('/static', express.static(path.join(__dirname, 'static')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use('/uploads', express.static(path.join(__dirname, 'static/uploads')));

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/admin/dashboard', dashboardRoutes);
app.use('/api/search', searchRoutes);

// 安装 API
app.post('/api/install', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const { queryOne, execute } = require('./db');
    const { admin_username, admin_email, admin_password, admin_bio } = req.body || {};
    if (!admin_username || !admin_email || !admin_password) return res.status(400).json({ code: 400, message: '请填写完整信息' });
    if (admin_password.length < 6) return res.status(400).json({ code: 400, message: '密码至少6位' });
    const hash = bcrypt.hashSync(admin_password, 10);
    const existing = await queryOne(`SELECT id FROM users WHERE username = ? OR email = ?`, [admin_username, admin_email]);
    if (existing) return res.status(400).json({ code: 400, message: '用户名或邮箱已存在' });
    await execute(`INSERT INTO users (username, email, password_hash, role, bio) VALUES (?, ?, ?, 'admin', ?)`, [admin_username, admin_email, hash, admin_bio || '系统管理员']);
    res.json({ code: 200, message: '安装成功' });
  } catch (e) { res.status(500).json({ code: 500, message: '安装失败: ' + e.message }); }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ code: 200, message: 'ok', data: { time: new Date().toISOString(), db: 'postgres' } });
});

// 安装状态
app.get('/api/install/status', async (req, res) => {
  try {
    const { queryOne } = require('./db');
    const row = await queryOne(`SELECT count(*) as c FROM users`);
    res.json({ code: 200, data: { initialized: parseInt(row?.c) > 0 } });
  } catch (e) {
    res.json({ code: 200, data: { initialized: false } });
  }
});

// 前端 HTML 页面路由
const pages = [
  '/', '/login.html', '/register.html', '/post.html', '/new-post.html',
  '/edit-post.html', '/profile.html', '/settings.html', '/category.html',
  '/search.html', '/notifications.html', '/favorites.html', '/install.html'
];
pages.forEach(p => {
  if (p === '/') {
    app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
  } else {
    app.get(p, (req, res) => res.sendFile(path.join(__dirname, p.substring(1))));
  }
});

// 管理后台 HTML
const adminPages = ['index', 'users', 'posts', 'categories', 'tags', 'reports', 'settings'];
adminPages.forEach(p => {
  app.get(`/admin/${p}.html`, (req, res) => res.sendFile(path.join(__dirname, 'admin', `${p}.html`)));
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ code: 500, message: '服务器错误' });
});

// 404
app.use((req, res) => {
  res.status(404).json({ code: 404, message: '接口不存在' });
});

// 冷启动时自动 seed（幂等：有数据则跳过）
// 不 await，避免阻塞请求；错误只记日志
ensureSeed().catch(e => console.error('Seed error:', e.message));

// Vercel: 导出 app（@vercel/node 自动包装为 serverless handler）
// 本地开发: 若非 Vercel 环境则监听端口
if (process.env.VERCEL !== '1' && !process.env.NOW_REGION) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`论坛系统运行于端口 ${PORT}`);
    console.log(`访问地址: http://localhost:${PORT}`);
  });
}

module.exports = app;