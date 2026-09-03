/**
 * 工具函数
 */
const bcrypt = require('bcryptjs');
const { query, queryOne, execute } = require('./db');

/**
 * 密码加密
 */
function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

/**
 * 密码验证
 */
function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

/**
 * 生成 slug（URL 友好标识）
 */
function generateSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s\u4e00-\u9fa5]+/g, '-')
    .replace(/[^\w\-\u4e00-\u9fa5]+/g, '')
    .substring(0, 50);
}

/**
 * 简单的 HTML 转义（防 XSS）
 */
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 简单的 Markdown 渲染（基础）
 */
function renderMarkdown(text) {
  if (!text) return '';

  let html = escapeHtml(text);

  // 代码块
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre class="code-block"><code class="language-${lang || 'text'}">${code}</code></pre>`;
  });

  // 行内代码
  html = html.replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>');

  // 标题
  html = html.replace(/^###### (.*$)/gim, '<h6>$1</h6>');
  html = html.replace(/^##### (.*$)/gim, '<h5>$1</h5>');
  html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // 粗体和斜体
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // 链接
  html = html.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // 列表
  html = html.replace(/^\* (.+)$/gim, '<li>$1</li>');
  html = html.replace(/^- (.+)$/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);

  // 引用
  html = html.replace(/^> (.+)$/gim, '<blockquote>$1</blockquote>');

  // 水平线
  html = html.replace(/^---$/gim, '<hr>');

  // 段落
  html = html.split(/\n\n+/).map(p => {
    if (p.startsWith('<h') || p.startsWith('<ul') || p.startsWith('<pre') ||
        p.startsWith('<blockquote') || p.startsWith('<hr') || p.includes('<li>')) {
      return p;
    }
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  }).join('\n');

  return html;
}

/**
 * 计算用户等级（每 100 积分一级）
 */
function calculateLevel(points) {
  return Math.floor(points / 100) + 1;
}

/**
 * 添加积分并更新等级（异步）
 */
async function addPoints(userId, points, action, description) {
  // 添加积分记录
  await execute(
    `INSERT INTO point_logs (user_id, points, action, description) VALUES (?, ?, ?, ?)`,
    [userId, points, action, description]
  );

  // 更新用户积分和等级
  const user = await queryOne(`SELECT points FROM users WHERE id = ?`, [userId]);
  const newPoints = Math.max(0, (user?.points || 0) + points);
  const newLevel = calculateLevel(newPoints);

  await execute(
    `UPDATE users SET points = ?, level = ?, updated_at = now() WHERE id = ?`,
    [newPoints, newLevel, userId]
  );

  return { points: newPoints, level: newLevel };
}

/**
 * 统一响应格式
 */
function success(data = null, message = 'success') {
  return { code: 200, message, data };
}

function error(message, code = 400, errors = null) {
  const result = { code, message };
  if (errors) result.errors = errors;
  return result;
}

function paginated(items, total, pageNum, perPage) {
  return {
    code: 200,
    message: 'success',
    data: {
      items,
      total,
      page: pageNum,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage)
    }
  };
}

/**
 * 输入验证
 */
function validateUsername(username) {
  if (!username) return '用户名不能为空';
  if (username.length < 3 || username.length > 20) return '用户名长度需在3-20之间';
  if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) return '用户名只能包含字母、数字、下划线和中文';
  return null;
}

function validateEmail(email) {
  if (!email) return '邮箱不能为空';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '邮箱格式不正确';
  return null;
}

function validatePassword(password) {
  if (!password) return '密码不能为空';
  if (password.length < 6) return '密码长度至少6位';
  return null;
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateSlug,
  escapeHtml,
  renderMarkdown,
  calculateLevel,
  addPoints,
  success,
  error,
  paginated,
  validateUsername,
  validateEmail,
  validatePassword,
  query,
  queryOne,
  execute
};