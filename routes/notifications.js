/**
 * 通知路由（异步 Postgres 版）
 */
const express = require('express');
const router = express.Router();
const { query, queryOne, execute } = require('../db');
const { success, error } = require('../utils');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.per_page) || 20;
    const offset = (page - 1) * perPage;
    const totalRow = await queryOne(`SELECT count(*) as c FROM notifications WHERE user_id = ?`, [req.user.id]);
    const total = parseInt(totalRow?.c) || 0;
    const items = await query(`SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`, [req.user.id, perPage, offset]);
    res.json({ code: 200, message: 'success', data: { items, total, page, per_page: perPage, total_pages: Math.ceil(total / perPage) } });
  } catch (e) { res.status(500).json(error('获取失败', 500)); }
});

router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const row = await queryOne(`SELECT count(*) as c FROM notifications WHERE user_id = ? AND is_read = false`, [req.user.id]);
    res.json(success({ count: parseInt(row?.c) || 0 }));
  } catch (e) { res.status(500).json(error('获取失败', 500)); }
});

router.put('/:id/read', requireAuth, async (req, res) => {
  try {
    await execute(`UPDATE notifications SET is_read = true WHERE id = ? AND user_id = ?`, [parseInt(req.params.id), req.user.id]);
    res.json(success(null, '已读'));
  } catch (e) { res.status(500).json(error('操作失败', 500)); }
});

router.put('/read-all', requireAuth, async (req, res) => {
  try {
    await execute(`UPDATE notifications SET is_read = true WHERE user_id = ?`, [req.user.id]);
    res.json(success(null, '全部已读'));
  } catch (e) { res.status(500).json(error('操作失败', 500)); }
});

module.exports = router;