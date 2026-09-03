/**
 * 标签路由（异步 Postgres 版）
 */
const express = require('express');
const router = express.Router();
const { query, queryOne, execute } = require('../db');
const { success, error, generateSlug } = require('../utils');
const { requireAdminOnly } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const tags = await query(`SELECT * FROM tags ORDER BY post_count DESC, name ASC`);
    res.json(success(tags));
  } catch (e) { res.status(500).json(error('获取失败', 500)); }
});

router.get('/popular', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const tags = await query(`SELECT * FROM tags WHERE post_count > 0 ORDER BY post_count DESC LIMIT ?`, [limit]);
    res.json(success(tags));
  } catch (e) { res.status(500).json(error('获取失败', 500)); }
});

router.post('/', requireAdminOnly, async (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name) return res.status(400).json(error('名称不能为空'));
    const slug = generateSlug(name);
    const existing = await queryOne(`SELECT id FROM tags WHERE name = ? OR slug = ?`, [name, slug]);
    if (existing) return res.status(400).json(error('标签已存在'));
    const ins = await execute(`INSERT INTO tags (name, slug) VALUES (?, ?) ON CONFLICT DO NOTHING`, [name, slug]);
    res.json(success({ id: ins.lastInsertRowid }, '创建成功'));
  } catch (e) { res.status(500).json(error('创建失败', 500)); }
});

router.delete('/:id', requireAdminOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await execute(`DELETE FROM tags WHERE id = ?`, [id]);
    res.json(success(null, '删除成功'));
  } catch (e) { res.status(500).json(error('删除失败', 500)); }
});

module.exports = router;