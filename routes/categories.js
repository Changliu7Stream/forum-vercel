/**
 * 分类路由（异步 Postgres 版）
 */
const express = require('express');
const router = express.Router();
const { query, queryOne, execute } = require('../db');
const { success, error, generateSlug } = require('../utils');
const { requireAdminOnly } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const categories = await query(`SELECT * FROM categories ORDER BY sort_order ASC, id ASC`);
    res.json(success(categories));
  } catch (e) { res.status(500).json(error('获取失败', 500)); }
});

router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const category = await queryOne(`SELECT * FROM categories WHERE id = ?`, [id]);
    if (!category) return res.status(404).json(error('分类不存在', 404));
    res.json(success(category));
  } catch (e) { res.status(500).json(error('获取失败', 500)); }
});

router.post('/', requireAdminOnly, async (req, res) => {
  try {
    const { name, description, icon, sort_order } = req.body || {};
    if (!name) return res.status(400).json(error('名称不能为空'));
    const slug = generateSlug(name);
    const ins = await execute(`INSERT INTO categories (name, slug, description, icon, sort_order) VALUES (?, ?, ?, ?, ?) ON CONFLICT (slug) DO NOTHING`, [name, slug, description || '', icon || 'folder', sort_order || 0]);
    res.json(success({ id: ins.lastInsertRowid }, '创建成功'));
  } catch (e) { res.status(500).json(error('创建失败', 500)); }
});

router.put('/:id', requireAdminOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, icon, sort_order } = req.body || {};
    const updates = [], values = [];
    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (icon !== undefined) { updates.push('icon = ?'); values.push(icon); }
    if (sort_order !== undefined) { updates.push('sort_order = ?'); values.push(sort_order); }
    if (updates.length === 0) return res.status(400).json(error('没有要更新的字段'));
    values.push(id);
    await execute(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`, values);
    res.json(success(null, '更新成功'));
  } catch (e) { res.status(500).json(error('更新失败', 500)); }
});

router.delete('/:id', requireAdminOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const row = await queryOne(`SELECT count(*) as c FROM posts WHERE category_id = ?`, [id]);
    if (parseInt(row?.c) > 0) return res.status(400).json(error(`该分类下还有 ${row.c} 个帖子，无法删除`));
    await execute(`DELETE FROM categories WHERE id = ?`, [id]);
    res.json(success(null, '删除成功'));
  } catch (e) { res.status(500).json(error('删除失败', 500)); }
});

module.exports = router;