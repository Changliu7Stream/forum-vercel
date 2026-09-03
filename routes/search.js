/**
 * 搜索路由（异步 Postgres 版）
 */
const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../db');
const { success, error } = require('../utils');

router.get('/', async (req, res) => {
  try {
    const q = req.query.q || '';
    const category_id = req.query.category_id ? parseInt(req.query.category_id) : null;
    const tag = req.query.tag || '';
    const author = req.query.author || '';
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.per_page) || 20;
    const offset = (page - 1) * perPage;

    if (!q && !category_id && !tag && !author) {
      return res.json({ code: 200, message: 'success', data: { items: [], total: 0, page, per_page: perPage, total_pages: 0 } });
    }

    let where = "WHERE p.status='published'";
    const params = [];
    if (q) { where += ' AND (p.title LIKE ? OR p.content LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
    if (category_id) { where += ' AND p.category_id = ?'; params.push(category_id); }
    if (tag) { where += ' AND p.id IN (SELECT post_id FROM post_tags pt JOIN tags t ON pt.tag_id=t.id WHERE t.slug = ?)'; params.push(tag); }
    if (author) { where += ' AND p.user_id IN (SELECT id FROM users WHERE username LIKE ?)'; params.push(`%${author}%`); }

    const totalRow = await queryOne(`SELECT count(*) as c FROM posts p ${where}`, params);
    const total = parseInt(totalRow?.c) || 0;
    const items = await query(
      `SELECT p.*, u.username, u.avatar, c.name as category_name, c.slug as category_slug
       FROM posts p LEFT JOIN users u ON p.user_id = u.id LEFT JOIN categories c ON p.category_id = c.id
       ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
      [...params, perPage, offset]
    );
    for (const post of items) {
      post.tags = await query(`SELECT t.id, t.name, t.slug FROM tags t JOIN post_tags pt ON t.id = pt.tag_id WHERE pt.post_id = ?`, [post.id]);
    }
    res.json({ code: 200, message: 'success', data: { items, total, page, per_page: perPage, total_pages: Math.ceil(total / perPage) } });
  } catch (e) { console.error('Search error:', e.message); res.status(500).json(error('搜索失败', 500)); }
});

module.exports = router;