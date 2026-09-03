/**
 * 帖子相关路由（异步 Postgres 版）
 */
const express = require('express');
const router = express.Router();
const { query, queryOne, execute } = require('../db');
const { success, error, addPoints } = require('../utils');
const { requireAuth, requireAdmin } = require('../middleware/auth');

/**
 * GET /api/posts - 获取帖子列表
 */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.per_page) || 20;
    const offset = (page - 1) * perPage;
    const sort = req.query.sort || 'latest';
    const category_id = req.query.category_id ? parseInt(req.query.category_id) : null;
    const search = req.query.search || '';
    const tag = req.query.tag || '';

    let where = "WHERE p.status = 'published'";
    const params = [];

    if (category_id) { where += ' AND p.category_id = ?'; params.push(category_id); }
    if (search) { where += ' AND (p.title LIKE ? OR p.content LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (tag) { where += ' AND p.id IN (SELECT post_id FROM post_tags pt JOIN tags t ON pt.tag_id = t.id WHERE t.slug = ?)'; params.push(tag); }

    let orderBy = 'p.is_pinned DESC, p.created_at DESC';
    if (sort === 'hot') {
      orderBy = 'p.is_pinned DESC, (p.like_count * 3 + p.comment_count * 2 + p.view_count) DESC';
    } else if (sort === 'featured') {
      where += ' AND p.is_featured = true';
    }

    const totalRow = await queryOne(`SELECT count(*) as c FROM posts p ${where}`, params);
    const total = parseInt(totalRow?.c) || 0;

    const posts = await query(
      `SELECT p.id, p.title, p.user_id, p.category_id, p.is_pinned, p.is_featured, p.is_locked,
              p.view_count, p.like_count, p.comment_count, p.favorite_count, p.created_at, p.updated_at,
              u.username, u.avatar, u.level, c.name as category_name, c.slug as category_slug
       FROM posts p
       LEFT JOIN users u ON p.user_id = u.id
       LEFT JOIN categories c ON p.category_id = c.id
       ${where}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, perPage, offset]
    );

    // 加载标签
    for (const post of posts) {
      const tags = await query(
        `SELECT t.id, t.name, t.slug FROM tags t JOIN post_tags pt ON t.id = pt.tag_id WHERE pt.post_id = ?`,
        [post.id]
      );
      post.tags = tags;
    }

    res.json({
      code: 200, message: 'success',
      data: { items: posts, total, page, per_page: perPage, total_pages: Math.ceil(total / perPage) }
    });
  } catch (e) {
    console.error('Get posts error:', e.message);
    res.status(500).json(error('获取帖子失败', 500));
  }
});

/**
 * GET /api/posts/:id - 获取帖子详情
 */
router.get('/:id', async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const post = await queryOne(
      `SELECT p.*, u.username, u.avatar, u.bio, u.level, u.points, c.name as category_name, c.slug as category_slug
       FROM posts p LEFT JOIN users u ON p.user_id = u.id LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?`,
      [postId]
    );
    if (!post) return res.status(404).json(error('帖子不存在', 404));

    const tags = await query(
      `SELECT t.id, t.name, t.slug FROM tags t JOIN post_tags pt ON t.id = pt.tag_id WHERE pt.post_id = ?`, [postId]
    );
    post.tags = tags;

    if (req.user) {
      const liked = await queryOne(`SELECT id FROM likes WHERE user_id=? AND post_id=?`, [req.user.id, postId]);
      const favorited = await queryOne(`SELECT id FROM favorites WHERE user_id=? AND post_id=?`, [req.user.id, postId]);
      post.is_liked = !!liked;
      post.is_favorited = !!favorited;
    }
    res.json(success(post));
  } catch (e) {
    console.error('Get post error:', e.message);
    res.status(500).json(error('获取帖子失败', 500));
  }
});

/**
 * POST /api/posts - 创建帖子
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, content, category_id, tag_ids } = req.body || {};
    if (!title || !content) return res.status(400).json(error('标题和内容不能为空'));

    const setting = await queryOne(`SELECT value FROM settings WHERE "key"='post_moderation'`);
    const status = (setting && setting.value === 'true') ? 'pending' : 'published';

    const ins = await execute(
      `INSERT INTO posts (title, content, user_id, category_id, status) VALUES (?, ?, ?, ?, ?)`,
      [title, content, req.user.id, category_id || null, status]
    );
    const postId = ins.lastInsertRowid;

    if (Array.isArray(tag_ids)) {
      for (const tagId of tag_ids) {
        await execute(`INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?) ON CONFLICT DO NOTHING`, [postId, tagId]);
      }
      await query(`UPDATE tags SET post_count = (SELECT count(*) FROM post_tags WHERE tag_id = tags.id)`);
    }
    if (category_id) {
      await execute(
        `UPDATE categories SET post_count = (SELECT count(*) FROM posts WHERE category_id = ? AND status='published') WHERE id = ?`,
        [category_id, category_id]
      );
    }
    if (status === 'published') await addPoints(req.user.id, 10, 'post', '发布帖子奖励');

    res.json(success({ id: postId }, '发布成功'));
  } catch (e) {
    console.error('Create post error:', e.message);
    res.status(500).json(error('发布失败', 500));
  }
});

/**
 * PUT /api/posts/:id - 更新帖子
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const post = await queryOne(`SELECT * FROM posts WHERE id = ?`, [postId]);
    if (!post) return res.status(404).json(error('帖子不存在', 404));
    if (post.user_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'moderator') {
      return res.status(403).json(error('无权编辑', 403));
    }

    const { title, content, category_id, tag_ids } = req.body || {};
    const updates = [], values = [];
    if (title !== undefined) { updates.push('title = ?'); values.push(title); }
    if (content !== undefined) { updates.push('content = ?'); values.push(content); }
    if (category_id !== undefined) { updates.push('category_id = ?'); values.push(category_id); }
    if (updates.length > 0) {
      updates.push('updated_at = now()');
      values.push(postId);
      await execute(`UPDATE posts SET ${updates.join(', ')} WHERE id = ?`, values);
    }
    if (Array.isArray(tag_ids)) {
      await execute(`DELETE FROM post_tags WHERE post_id = ?`, [postId]);
      for (const tagId of tag_ids) {
        await execute(`INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?) ON CONFLICT DO NOTHING`, [postId, tagId]);
      }
      await query(`UPDATE tags SET post_count = (SELECT count(*) FROM post_tags WHERE tag_id = tags.id)`);
    }
    res.json(success(null, '更新成功'));
  } catch (e) {
    console.error('Update post error:', e.message);
    res.status(500).json(error('更新失败', 500));
  }
});

/**
 * DELETE /api/posts/:id - 删除帖子
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const post = await queryOne(`SELECT * FROM posts WHERE id = ?`, [postId]);
    if (!post) return res.status(404).json(error('帖子不存在', 404));
    if (post.user_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'moderator') {
      return res.status(403).json(error('无权删除', 403));
    }
    await execute(`DELETE FROM posts WHERE id = ?`, [postId]);
    await query(`UPDATE categories SET post_count = (SELECT count(*) FROM posts WHERE category_id = categories.id AND status='published')`);
    await query(`UPDATE tags SET post_count = (SELECT count(*) FROM post_tags WHERE tag_id = tags.id)`);
    res.json(success(null, '删除成功'));
  } catch (e) {
    console.error('Delete post error:', e.message);
    res.status(500).json(error('删除失败', 500));
  }
});

/**
 * POST /api/posts/:id/like - 点赞
 */
router.post('/:id/like', requireAuth, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const post = await queryOne(`SELECT user_id, like_count, title FROM posts WHERE id=?`, [postId]);
    if (!post) return res.status(404).json(error('帖子不存在', 404));
    const existing = await queryOne(`SELECT id FROM likes WHERE user_id=? AND post_id=?`, [req.user.id, postId]);
    if (existing) return res.status(400).json(error('已经点赞过了'));

    await execute(`INSERT INTO likes (user_id, post_id) VALUES (?, ?)`, [req.user.id, postId]);
    await execute(`UPDATE posts SET like_count = like_count + 1 WHERE id = ?`, [postId]);

    if (post.user_id !== req.user.id) {
      await execute(
        `INSERT INTO notifications (user_id, type, title, content, link) VALUES (?, 'like', '你的帖子收到新点赞', ?, ?)`,
        [post.user_id, `《${post.title || '你的帖子'}》收到了新点赞`, `/post.html?id=${postId}`]
      );
      await addPoints(post.user_id, 2, 'like_received', '收到点赞奖励');
    }
    res.json(success(null, '点赞成功'));
  } catch (e) {
    console.error('Like error:', e.message);
    res.status(500).json(error('点赞失败', 500));
  }
});

/**
 * DELETE /api/posts/:id/like - 取消点赞
 */
router.delete('/:id/like', requireAuth, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    await execute(`DELETE FROM likes WHERE user_id=? AND post_id=?`, [req.user.id, postId]);
    await execute(`UPDATE posts SET like_count = GREATEST(0, like_count - 1) WHERE id = ?`, [postId]);
    res.json(success(null, '已取消点赞'));
  } catch (e) {
    res.status(500).json(error('操作失败', 500));
  }
});

/**
 * POST /api/posts/:id/favorite - 收藏
 */
router.post('/:id/favorite', requireAuth, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const post = await queryOne(`SELECT id FROM posts WHERE id=?`, [postId]);
    if (!post) return res.status(404).json(error('帖子不存在', 404));
    const existing = await queryOne(`SELECT id FROM favorites WHERE user_id=? AND post_id=?`, [req.user.id, postId]);
    if (existing) return res.status(400).json(error('已经收藏过了'));

    await execute(`INSERT INTO favorites (user_id, post_id) VALUES (?, ?)`, [req.user.id, postId]);
    await execute(`UPDATE posts SET favorite_count = favorite_count + 1 WHERE id = ?`, [postId]);
    res.json(success(null, '收藏成功'));
  } catch (e) {
    res.status(500).json(error('收藏失败', 500));
  }
});

/**
 * DELETE /api/posts/:id/favorite - 取消收藏
 */
router.delete('/:id/favorite', requireAuth, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    await execute(`DELETE FROM favorites WHERE user_id=? AND post_id=?`, [req.user.id, postId]);
    await execute(`UPDATE posts SET favorite_count = GREATEST(0, favorite_count - 1) WHERE id = ?`, [postId]);
    res.json(success(null, '已取消收藏'));
  } catch (e) {
    res.status(500).json(error('操作失败', 500));
  }
});

/**
 * GET /api/posts/:id/comments - 获取帖子的评论
 */
router.get('/:id/comments', async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const comments = await query(
      `SELECT c.*, u.username, u.avatar, u.level FROM comments c LEFT JOIN users u ON c.user_id = u.id WHERE c.post_id = ? AND c.status = 'published' ORDER BY c.created_at ASC`,
      [postId]
    );

    if (req.user) {
      for (const c of comments) {
        const liked = await queryOne(`SELECT id FROM likes WHERE user_id=? AND comment_id=?`, [req.user.id, c.id]);
        c.is_liked = !!liked;
      }
    }

    // 构建嵌套结构
    const commentMap = new Map();
    const rootComments = [];
    for (const c of comments) {
      c.replies = [];
      commentMap.set(c.id, c);
      if (c.parent_id) {
        const parent = commentMap.get(c.parent_id);
        if (parent) parent.replies.push(c);
        else rootComments.push(c);
      } else {
        rootComments.push(c);
      }
    }
    res.json(success(rootComments));
  } catch (e) {
    console.error('Get comments error:', e.message);
    res.status(500).json(error('获取评论失败', 500));
  }
});

/**
 * POST /api/posts/:id/view - 增加浏览量
 */
router.post('/:id/view', async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    await execute(`UPDATE posts SET view_count = view_count + 1 WHERE id = ?`, [postId]);
    res.json(success(null));
  } catch (e) {
    res.json(success(null));
  }
});

/**
 * POST /api/admin/posts/:id/pin - 置顶
 */
router.post('/admin/:id/pin', requireAdmin, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const { is_pinned } = req.body || {};
    await execute(`UPDATE posts SET is_pinned = ? WHERE id = ?`, [!!is_pinned, postId]);
    res.json(success(null, is_pinned ? '已置顶' : '已取消置顶'));
  } catch (e) { res.status(500).json(error('操作失败', 500)); }
});

/**
 * POST /api/admin/posts/:id/feature - 精华
 */
router.post('/admin/:id/feature', requireAdmin, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const { is_featured } = req.body || {};
    await execute(`UPDATE posts SET is_featured = ? WHERE id = ?`, [!!is_featured, postId]);
    res.json(success(null, is_featured ? '已设为精华' : '已取消精华'));
  } catch (e) { res.status(500).json(error('操作失败', 500)); }
});

/**
 * POST /api/admin/posts/:id/lock - 锁定
 */
router.post('/admin/:id/lock', requireAdmin, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const { is_locked } = req.body || {};
    await execute(`UPDATE posts SET is_locked = ? WHERE id = ?`, [!!is_locked, postId]);
    res.json(success(null, is_locked ? '已锁定' : '已解锁'));
  } catch (e) { res.status(500).json(error('操作失败', 500)); }
});

module.exports = router;