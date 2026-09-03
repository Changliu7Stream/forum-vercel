/**
 * 管理后台仪表盘（异步 Postgres 版）
 */
const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../db');
const { success, error } = require('../utils');
const { requireAdmin } = require('../middleware/auth');

router.get('/', requireAdmin, async (req, res) => {
  try {
    const stats = {
      total_users: parseInt((await queryOne(`SELECT count(*) as c FROM users`))?.c) || 0,
      total_posts: parseInt((await queryOne(`SELECT count(*) as c FROM posts WHERE status='published'`))?.c) || 0,
      total_comments: parseInt((await queryOne(`SELECT count(*) as c FROM comments WHERE status='published'`))?.c) || 0,
      today_posts: parseInt((await queryOne(`SELECT count(*) as c FROM posts WHERE created_at::date = CURRENT_DATE`))?.c) || 0,
      today_users: parseInt((await queryOne(`SELECT count(*) as c FROM users WHERE created_at::date = CURRENT_DATE`))?.c) || 0,
      pending_reports: parseInt((await queryOne(`SELECT count(*) as c FROM reports WHERE status='pending'`))?.c) || 0,
      banned_users: parseInt((await queryOne(`SELECT count(*) as c FROM users WHERE is_banned=true`))?.c) || 0
    };
    const recent_posts = await query(`SELECT p.id, p.title, p.created_at, u.username FROM posts p LEFT JOIN users u ON p.user_id = u.id ORDER BY p.created_at DESC LIMIT 10`);
    const recent_users = await query(`SELECT id, username, email, created_at, avatar FROM users ORDER BY created_at DESC LIMIT 10`);
    const hot_posts = await query(`SELECT p.id, p.title, p.view_count, p.like_count, p.comment_count, u.username FROM posts p LEFT JOIN users u ON p.user_id = u.id WHERE p.status='published' ORDER BY p.view_count DESC LIMIT 10`);
    res.json(success({ stats, recent_posts, recent_users, hot_posts }));
  } catch (e) { console.error('Dashboard error:', e.message); res.status(500).json(error('获取失败', 500)); }
});

module.exports = router;