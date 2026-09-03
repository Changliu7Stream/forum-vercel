/**
 * 收藏路由（异步 Postgres 版）
 */
const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../db');
const { success, error } = require('../utils');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.per_page) || 20;
    const offset = (page - 1) * perPage;
    const totalRow = await queryOne(`SELECT count(*) as c FROM favorites WHERE user_id = ?`, [req.user.id]);
    const total = parseInt(totalRow?.c) || 0;
    const items = await query(
      `SELECT p.*, u.username, u.avatar, f.created_at as favorited_at, c.name as category_name
       FROM favorites f JOIN posts p ON f.post_id = p.id LEFT JOIN users u ON p.user_id = u.id LEFT JOIN categories c ON p.category_id = c.id
       WHERE f.user_id = ? ORDER BY f.created_at DESC LIMIT ? OFFSET ?`,
      [req.user.id, perPage, offset]
    );
    res.json({ code: 200, message: 'success', data: { items, total, page, per_page: perPage, total_pages: Math.ceil(total / perPage) } });
  } catch (e) { res.status(500).json(error('获取失败', 500)); }
});

module.exports = router;