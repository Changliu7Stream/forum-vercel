/**
 * 用户相关路由（异步 Postgres 版）
 */
const express = require('express');
const router = express.Router();
const { query, queryOne, execute } = require('../db');
const { success, error } = require('../utils');
const { requireAuth, requireAdminOnly } = require('../middleware/auth');

/**
 * GET /api/users/admin/list - 管理员获取用户列表（在 /:id 之前注册）
 */
router.get('/admin/list', requireAdminOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.per_page) || 20;
    const offset = (page - 1) * perPage;
    const search = req.query.search || '';
    let where = 'WHERE 1=1';
    const params = [];
    if (search) { where += ' AND (username LIKE ? OR email LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    const totalRow = await queryOne(`SELECT count(*) as c FROM users ${where}`, params);
    const total = parseInt(totalRow?.c) || 0;
    const users = await query(
      `SELECT id, username, email, avatar, role, points, level, is_active, is_banned, created_at, last_login
       FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, perPage, offset]
    );
    res.json({ code: 200, message: 'success', data: { items: users, total, page, per_page: perPage, total_pages: Math.ceil(total / perPage) } });
  } catch (e) { console.error('Admin users error:', e.message); res.status(500).json(error('获取失败', 500)); }
});

/**
 * PUT /api/users/admin/:id/ban - 禁用/启用
 */
router.put('/admin/:id/ban', requireAdminOnly, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { is_banned } = req.body || {};
    await execute(`UPDATE users SET is_banned = ?, updated_at = now() WHERE id = ?`, [!!is_banned, userId]);
    res.json(success(null, is_banned ? '已禁用' : '已启用'));
  } catch (e) { res.status(500).json(error('操作失败', 500)); }
});

/**
 * PUT /api/users/admin/:id/role - 设置角色
 */
router.put('/admin/:id/role', requireAdminOnly, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body || {};
    if (!['user', 'moderator', 'admin'].includes(role)) return res.status(400).json(error('无效的角色'));
    await execute(`UPDATE users SET role = ?, updated_at = now() WHERE id = ?`, [role, userId]);
    res.json(success(null, '角色已更新'));
  } catch (e) { res.status(500).json(error('操作失败', 500)); }
});

/**
 * DELETE /api/users/admin/:id - 删除用户
 */
router.delete('/admin/:id', requireAdminOnly, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (userId === req.user.id) return res.status(400).json(error('不能删除自己'));
    await execute(`DELETE FROM users WHERE id = ?`, [userId]);
    res.json(success(null, '用户已删除'));
  } catch (e) { res.status(500).json(error('删除失败', 500)); }
});

/**
 * GET /api/users/:id - 获取用户公开信息
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await queryOne(
      `SELECT id, username, avatar, bio, website, role, points, level, created_at, last_login FROM users WHERE id = ? AND is_active = true`,
      [userId]
    );
    if (!user) return res.status(404).json(error('用户不存在', 404));
    const postsRow = await queryOne(`SELECT count(*) as c FROM posts WHERE user_id = ? AND status='published'`, [userId]);
    const commentsRow = await queryOne(`SELECT count(*) as c FROM comments WHERE user_id = ? AND status='published'`, [userId]);
    const stats = { posts: parseInt(postsRow?.c) || 0, comments: parseInt(commentsRow?.c) || 0, followers: 0 };
    res.json(success({ ...user, stats }));
  } catch (e) { res.status(500).json(error('获取失败', 500)); }
});

/**
 * GET /api/users/:id/posts - 获取用户的帖子
 */
router.get('/:id/posts', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.per_page) || 20;
    const offset = (page - 1) * perPage;
    const totalRow = await queryOne(`SELECT count(*) as c FROM posts WHERE user_id = ? AND status='published'`, [userId]);
    const total = parseInt(totalRow?.c) || 0;
    const posts = await query(
      `SELECT p.*, u.username, u.avatar, c.name as category_name, c.slug as category_slug
       FROM posts p LEFT JOIN users u ON p.user_id = u.id LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.user_id = ? AND p.status='published' ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
      [userId, perPage, offset]
    );
    res.json({ code: 200, message: 'success', data: { items: posts, total, page, per_page: perPage, total_pages: Math.ceil(total / perPage) } });
  } catch (e) { res.status(500).json(error('获取失败', 500)); }
});

/**
 * PUT /api/users/:id - 更新用户资料
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (req.user.id !== userId && req.user.role !== 'admin') return res.status(403).json(error('无权操作', 403));
    const { avatar, bio, website } = req.body || {};
    const updates = [], values = [];
    if (avatar !== undefined) { updates.push('avatar = ?'); values.push(avatar); }
    if (bio !== undefined) { updates.push('bio = ?'); values.push(bio); }
    if (website !== undefined) { updates.push('website = ?'); values.push(website); }
    if (updates.length === 0) return res.status(400).json(error('没有要更新的字段'));
    updates.push('updated_at = now()'); values.push(userId);
    await execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    const user = await queryOne(`SELECT id, username, email, avatar, bio, website, role, points, level FROM users WHERE id = ?`, [userId]);
    res.json(success(user, '更新成功'));
  } catch (e) { res.status(500).json(error('更新失败', 500)); }
});

module.exports = router;