/**
 * 设置路由（异步 Postgres 版）
 */
const express = require('express');
const router = express.Router();
const { query, execute } = require('../db');
const { success, error } = require('../utils');
const { requireAdminOnly } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const settings = await query(`SELECT * FROM settings`);
    const result = {};
    for (const s of settings) result[s.key] = s.value;
    res.json(success(result));
  } catch (e) { res.status(500).json(error('获取失败', 500)); }
});

router.put('/', requireAdminOnly, async (req, res) => {
  try {
    const updates = req.body || {};
    for (const [key, value] of Object.entries(updates)) {
      await execute(`UPDATE settings SET value = ?, updated_at = now() WHERE "key" = ?`, [String(value), key]);
    }
    res.json(success(null, '设置已更新'));
  } catch (e) { res.status(500).json(error('更新失败', 500)); }
});

module.exports = router;