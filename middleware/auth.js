/**
 * 认证中间件（异步，Postgres 版）
 */
const jwt = require('jsonwebtoken');
const { queryOne, execute } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'forum-secret-key-change-in-production';
const TOKEN_EXPIRES_IN = '7d';

/**
 * 生成 JWT token
 */
async function generateToken(user) {
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRES_IN }
  );

  // 保存到 sessions 表用于吊销
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await execute(
    `INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)`,
    [user.id, token, expiresAt]
  );

  return token;
}

/**
 * 验证 JWT token 中间件（异步）
 */
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.substring(7);

  try {
    // 检查会话表
    const session = await queryOne(
      `SELECT * FROM sessions WHERE token = ? AND expires_at > now()`,
      [token]
    );

    if (!session) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await queryOne(
      `SELECT id, username, email, avatar, role, points, level, bio, website, is_active, is_banned FROM users WHERE id = ?`,
      [decoded.id]
    );

    if (!user || user.is_banned || !user.is_active) {
      req.user = null;
      return next();
    }

    req.user = user;
    next();
  } catch (err) {
    req.user = null;
    next();
  }
}

/**
 * 要求登录中间件
 */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      code: 401,
      message: '请先登录'
    });
  }
  next();
}

/**
 * 要求管理员权限中间件
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ code: 401, message: '请先登录' });
  }
  if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
    return res.status(403).json({ code: 403, message: '权限不足' });
  }
  next();
}

/**
 * 要求管理员权限（仅管理员）
 */
function requireAdminOnly(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ code: 401, message: '请先登录' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ code: 403, message: '仅管理员可操作' });
  }
  next();
}

/**
 * 登出（吊销 token）
 */
async function revokeToken(token) {
  await execute(`DELETE FROM sessions WHERE token = ?`, [token]);
}

/**
 * 清理过期会话
 */
async function cleanExpiredSessions() {
  await execute(`DELETE FROM sessions WHERE expires_at < now()`);
}

module.exports = {
  generateToken,
  authMiddleware,
  requireAuth,
  requireAdmin,
  requireAdminOnly,
  revokeToken,
  cleanExpiredSessions,
  JWT_SECRET
};