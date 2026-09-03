/**
 * 积分路由（异步 Postgres 版）
 */
const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../db');
const { success, error } = require('../utils');
const { requireAuth } = require('../middleware/auth');

router.get('/history', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.per_page) || 20;
    const offset = (page - 1) * perPage;
    const totalRow = await queryOne(`SELECT count(*) as c FROM point_logs WHERE user_id = ?`, [req.user.id]);
    const total = parseInt(totalRow?.c) || 0;
    const items = await query(`SELECT * FROM point_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`, [req.user.id, perPage, offset]);
    res.json({ code: 200, message: 'success', data: { items, total, page, per_page: perPage, total_pages: Math.ceil(total / perPage) } });
  } catch (e) { res.status(500).json(error('获取失败', 500)); }
});

module.exports = router;