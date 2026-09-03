/**
 * 认证相关路由（异步 Postgres 版）
 */
const express = require('express');
const router = express.Router();
const { queryOne, execute } = require('../db');
const {
  hashPassword, verifyPassword, validateUsername,
  validateEmail, validatePassword, success, error, addPoints
} = require('../utils');
const { generateToken, revokeToken, requireAuth } = require('../middleware/auth');

/**
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body || {};

    // 校验
    const errors = {};
    const usernameErr = validateUsername(username);
    if (usernameErr) errors.username = [usernameErr];
    const emailErr = validateEmail(email);
    if (emailErr) errors.email = [emailErr];
    const passwordErr = validatePassword(password);
    if (passwordErr) errors.password = [passwordErr];

    if (Object.keys(errors).length > 0) {
      return res.status(400).json(error('输入有误', 400, errors));
    }

    // 检查站点设置
    const setting = await queryOne(`SELECT value FROM settings WHERE "key" = 'allow_register'`);
    if (setting && setting.value === 'false') {
      return res.status(403).json(error('注册已关闭', 403));
    }

    // 检查用户名和邮箱唯一性
    const existingUser = await queryOne(
      `SELECT id FROM users WHERE username = ? OR email = ?`,
      [username, email]
    );
    if (existingUser) {
      return res.status(400).json(error('用户名或邮箱已被使用', 400));
    }

    // 创建用户
    const passwordHash = hashPassword(password);
    const ins = await execute(
      `INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)`,
      [username, email, passwordHash]
    );

    const user = await queryOne(
      `SELECT id, username, email, role, points, level, avatar, bio, website FROM users WHERE id = ?`,
      [ins.lastInsertRowid]
    );

    // 生成 token
    const token = await generateToken(user);

    res.json(success({ user, token }, '注册成功'));
  } catch (e) {
    console.error('Register error:', e.message);
    res.status(500).json(error('注册失败', 500));
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json(error('用户名和密码不能为空'));
    }

    const user = await queryOne(
      `SELECT * FROM users WHERE username = ? OR email = ?`,
      [username, username]
    );

    if (!user) {
      return res.status(401).json(error('用户名或密码错误', 401));
    }

    if (user.is_banned) {
      return res.status(403).json(error('账户已被禁用', 403));
    }

    if (!verifyPassword(password, user.password_hash)) {
      return res.status(401).json(error('用户名或密码错误', 401));
    }

    // 更新最后登录时间
    await execute(`UPDATE users SET last_login = now() WHERE id = ?`, [user.id]);

    // 登录积分
    await addPoints(user.id, 1, 'login', '每日登录奖励');

    // 生成 token
    delete user.password_hash;
    const token = await generateToken(user);

    res.json(success({ user, token }, '登录成功'));
  } catch (e) {
    console.error('Login error:', e.message);
    res.status(500).json(error('登录失败', 500));
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      await revokeToken(token);
    }
    res.json(success(null, '已登出'));
  } catch (e) {
    res.json(success(null, '已登出'));
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', requireAuth, (req, res) => {
  res.json(success(req.user));
});

/**
 * PUT /api/auth/password
 */
router.put('/password', requireAuth, async (req, res) => {
  try {
    const { old_password, new_password } = req.body || {};

    if (!old_password || !new_password) {
      return res.status(400).json(error('请填写完整'));
    }

    const passwordErr = validatePassword(new_password);
    if (passwordErr) {
      return res.status(400).json(error(passwordErr));
    }

    const user = await queryOne(`SELECT password_hash FROM users WHERE id = ?`, [req.user.id]);
    if (!verifyPassword(old_password, user.password_hash)) {
      return res.status(400).json(error('原密码错误'));
    }

    const newHash = hashPassword(new_password);
    await execute(`UPDATE users SET password_hash = ?, updated_at = now() WHERE id = ?`,
      [newHash, req.user.id]);

    res.json(success(null, '密码修改成功'));
  } catch (e) {
    console.error('Password change error:', e.message);
    res.status(500).json(error('修改失败', 500));
  }
});

module.exports = router;