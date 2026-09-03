/**
 * 评论相关路由（异步 Postgres 版）
 */
const express = require('express');
const router = express.Router();
const { query, queryOne, execute } = require('../db');
const { success, error, addPoints } = require('../utils');
const { requireAuth } = require('../middleware/auth');

/**
 * POST /api/comments - 创建评论
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { post_id, parent_id, content } = req.body || {};
    if (!post_id || !content) return res.status(400).json(error('参数不完整'));
    const post = await queryOne(`SELECT id, user_id, is_locked FROM posts WHERE id = ?`, [post_id]);
    if (!post) return res.status(404).json(error('帖子不存在', 404));
    if (post.is_locked) return res.status(403).json(error('帖子已锁定', 403));

    const ins = await execute(
      `INSERT INTO comments (content, user_id, post_id, parent_id) VALUES (?, ?, ?, ?)`,
      [content.trim(), req.user.id, post_id, parent_id || null]
    );
    const commentId = ins.lastInsertRowid;
    await execute(`UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?`, [post_id]);

    if (parent_id) {
      const parentComment = await queryOne(`SELECT user_id FROM comments WHERE id = ?`, [parent_id]);
      if (parentComment && parentComment.user_id !== req.user.id) {
        await execute(
          `INSERT INTO notifications (user_id, type, title, content, link) VALUES (?, 'reply', '有人回复了你的评论', ?, ?)`,
          [parentComment.user_id, `${req.user.username} 回复了你`, `/post.html?id=${post_id}#comment-${commentId}`]
        );
      }
    } else if (post.user_id !== req.user.id) {
      await execute(
        `INSERT INTO notifications (user_id, type, title, content, link) VALUES (?, 'reply', '你的帖子有新回复', ?, ?)`,
        [post.user_id, `${req.user.username} 回复了你的帖子`, `/post.html?id=${post_id}#comment-${commentId}`]
      );
    }
    await addPoints(req.user.id, 5, 'comment', '发表回复奖励');
    res.json(success({ id: commentId }, '评论成功'));
  } catch (e) {
    console.error('Create comment error:', e.message);
    res.status(500).json(error('评论失败', 500));
  }
});

/**
 * PUT /api/comments/:id - 更新评论
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const commentId = parseInt(req.params.id);
    const { content } = req.body || {};
    const comment = await queryOne(`SELECT * FROM comments WHERE id = ?`, [commentId]);
    if (!comment) return res.status(404).json(error('评论不存在', 404));
    if (comment.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json(error('无权操作', 403));
    }
    if (!content) return res.status(400).json(error('内容不能为空'));
    await execute(`UPDATE comments SET content = ?, updated_at = now() WHERE id = ?`, [content, commentId]);
    res.json(success(null, '更新成功'));
  } catch (e) { res.status(500).json(error('更新失败', 500)); }
});

/**
 * DELETE /api/comments/:id - 删除评论
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const commentId = parseInt(req.params.id);
    const comment = await queryOne(`SELECT * FROM comments WHERE id = ?`, [commentId]);
    if (!comment) return res.status(404).json(error('评论不存在', 404));
    if (comment.user_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'moderator') {
      return res.status(403).json(error('无权操作', 403));
    }
    await execute(`UPDATE comments SET status = 'deleted' WHERE id = ?`, [commentId]);
    await execute(`UPDATE posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = ?`, [comment.post_id]);
    res.json(success(null, '已删除'));
  } catch (e) { res.status(500).json(error('删除失败', 500)); }
});

/**
 * POST /api/comments/:id/like - 点赞评论
 */
router.post('/:id/like', requireAuth, async (req, res) => {
  try {
    const commentId = parseInt(req.params.id);
    const comment = await queryOne(`SELECT user_id FROM comments WHERE id=?`, [commentId]);
    if (!comment) return res.status(404).json(error('评论不存在', 404));
    const existing = await queryOne(`SELECT id FROM likes WHERE user_id=? AND comment_id=?`, [req.user.id, commentId]);
    if (existing) return res.status(400).json(error('已点赞'));
    await execute(`INSERT INTO likes (user_id, comment_id) VALUES (?, ?)`, [req.user.id, commentId]);
    await execute(`UPDATE comments SET like_count = like_count + 1 WHERE id = ?`, [commentId]);
    if (comment.user_id !== req.user.id) await addPoints(comment.user_id, 2, 'like_received', '评论收到点赞');
    res.json(success(null, '点赞成功'));
  } catch (e) { res.status(500).json(error('点赞失败', 500)); }
});

/**
 * DELETE /api/comments/:id/like - 取消点赞评论
 */
router.delete('/:id/like', requireAuth, async (req, res) => {
  try {
    const commentId = parseInt(req.params.id);
    await execute(`DELETE FROM likes WHERE user_id=? AND comment_id=?`, [req.user.id, commentId]);
    await execute(`UPDATE comments SET like_count = GREATEST(0, like_count - 1) WHERE id = ?`, [commentId]);
    res.json(success(null, '已取消点赞'));
  } catch (e) { res.status(500).json(error('操作失败', 500)); }
});

module.exports = router;