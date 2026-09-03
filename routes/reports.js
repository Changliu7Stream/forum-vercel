/**
 * 举报路由（异步 Postgres 版）
 */
const express = require('express');
const router = express.Router();
const { query, queryOne, execute } = require('../db');
const { success, error } = require('../utils');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.post('/', requireAuth, async (req, res) => {
  try {
    const { post_id, comment_id, reason } = req.body || {};
    if (!reason) return res.status(400).json(error('请填写举报原因'));
    if (!post_id && !comment_id) return res.status(400).json(error('请指定举报对象'));
    await execute(`INSERT INTO reports (reporter_id, post_id, comment_id, reason) VALUES (?, ?, ?, ?)`, [req.user.id, post_id || null, comment_id || null, reason]);
    res.json(success(null, '举报已提交'));
  } catch (e) { res.status(500).json(error('提交失败', 500)); }
});

router.get('/', requireAdmin, async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.per_page) || 20;
    const offset = (page - 1) * perPage;
    let where = 'WHERE 1=1';
    const params = [];
    if (status !== 'all') { where += ' AND r.status = ?'; params.push(status); }
    const totalRow = await queryOne(`SELECT count(*) as c FROM reports r ${where}`, params);
    const total = parseInt(totalRow?.c) || 0;
    const items = await query(
      `SELECT r.*, u.username as reporter_username, ru.username as resolver_username, p.title as post_title, c.content as comment_content
       FROM reports r LEFT JOIN users u ON r.reporter_id = u.id LEFT JOIN users ru ON r.resolved_by = ru.id
       LEFT JOIN posts p ON r.post_id = p.id LEFT JOIN comments c ON r.comment_id = c.id
       ${where} ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
      [...params, perPage, offset]
    );
    res.json({ code: 200, message: 'success', data: { items, total, page, per_page: perPage, total_pages: Math.ceil(total / perPage) } });
  } catch (e) { res.status(500).json(error('获取失败', 500)); }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body || {};
    if (!['pending', 'resolved', 'dismissed'].includes(status)) return res.status(400).json(error('无效的状态'));
    await execute(`UPDATE reports SET status = ?, resolved_by = ?, resolved_at = now() WHERE id = ?`, [status, req.user.id, id]);
    res.json(success(null, '处理成功'));
  } catch (e) { res.status(500).json(error('操作失败', 500)); }
});

module.exports = router;