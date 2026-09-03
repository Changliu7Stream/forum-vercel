/**
 * 数据库模块 - PostgreSQL (Supabase)
 * 使用 pg 包连接 Supabase Postgres，适配 Vercel Serverless
 *
 * 关键设计：
 * - query/queryOne/execute 全部异步（返回 Promise）
 * - 自动把 SQL 中的 ? 占位符转换为 pg 的 $1, $2... 格式
 *   （这样路由里的 SQL 语句无需逐个改占位符）
 * - execute 对 INSERT 语句自动追加 RETURNING id 以获取自增 ID
 */
const { Pool } = require('pg');

let pool = null;

/**
 * 获取连接池（单例）
 */
function getPool() {
  if (!pool) {
    // 优先用环境变量（推荐，更安全）；无环境变量时用 fallback 连接
    // Session pooler（端口 5432）支持自定义用户，Transaction pooler（6543）仅支持 postgres 用户
    const connectionString = process.env.DATABASE_URL ||
      'postgresql://forum_app.ofydzectpjylurtbcmis:Forum2026Secure%21@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres';
    pool = new Pool({
      connectionString,
      max: process.env.PG_MAX_CONN ? parseInt(process.env.PG_MAX_CONN) : 3,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 30000,
      ssl: process.env.PG_SSL === 'false' ? false : { rejectUnauthorized: false }
    });

    pool.on('error', (err) => {
      console.error('数据库连接池错误:', err.message);
    });
  }
  return pool;
}

/**
 * 把 ? 占位符转换为 $1, $2, ... 格式
 * 注意：不处理字符串字面量中的 ?（当前 SQL 中无此情况）
 */
function convertPlaceholders(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

/**
 * 查询（异步，返回行数组）
 */
async function query(sql, params = []) {
  const p = getPool();
  const sqlNorm = convertPlaceholders(sql);
  try {
    const result = await p.query(sqlNorm, params);
    return result.rows;
  } catch (e) {
    console.error('Query error:', e.message, '\nSQL:', sqlNorm.substring(0, 200));
    throw e;
  }
}

/**
 * 查询单行（异步）
 */
async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * 执行 INSERT/UPDATE/DELETE（异步）
 * 对 INSERT 语句自动追加 RETURNING id 以获取自增主键
 * 返回 { lastInsertRowid, changes }
 */
async function execute(sql, params = []) {
  const p = getPool();
  let sqlNorm = convertPlaceholders(sql);

  // 对 INSERT 自动追加 RETURNING id（如果没有 RETURNING）
  if (/^\s*INSERT\s/i.test(sqlNorm) && !/RETURNING/i.test(sqlNorm)) {
    // 去掉末尾分号
    sqlNorm = sqlNorm.replace(/;\s*$/, '');
    sqlNorm += ' RETURNING id';
  }

  try {
    const result = await p.query(sqlNorm, params);
    let lastId = 0;
    if (result.rows && result.rows.length > 0 && result.rows[0].id !== undefined) {
      lastId = result.rows[0].id;
    }
    return {
      lastInsertRowid: lastId,
      changes: result.rowCount || 0
    };
  } catch (e) {
    console.error('Execute error:', e.message, '\nSQL:', sqlNorm.substring(0, 200));
    throw e;
  }
}

/**
 * 在事务中执行多个操作
 */
async function withTransaction(callback) {
  const p = getPool();
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const result = await callback({
      query: async (sql, params = []) => {
        const r = await client.query(convertPlaceholders(sql), params);
        return r.rows;
      },
      queryOne: async (sql, params = []) => {
        const r = await client.query(convertPlaceholders(sql), params);
        return r.rows[0] || null;
      },
      execute: async (sql, params = []) => {
        let sqlNorm = convertPlaceholders(sql);
        if (/^\s*INSERT\s/i.test(sqlNorm) && !/RETURNING/i.test(sqlNorm)) {
          sqlNorm = sqlNorm.replace(/;\s*$/, '');
          sqlNorm += ' RETURNING id';
        }
        const r = await client.query(sqlNorm, params);
        let lastId = 0;
        if (r.rows && r.rows.length > 0 && r.rows[0].id !== undefined) {
          lastId = r.rows[0].id;
        }
        return { lastInsertRowid: lastId, changes: r.rowCount || 0 };
      }
    });
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/**
 * 检查并初始化管理员账号和示例帖子（首次部署时）
 * 表结构已通过 Supabase migration 创建，这里只 seed 管理员和示例内容
 */
async function ensureSeed() {
  const bcrypt = require('bcryptjs');

  // 检查/创建管理员
  let admin = await queryOne(`SELECT id FROM users WHERE role='admin' LIMIT 1`);
  if (!admin) {
    console.log('创建管理员账号...');
    const hash = bcrypt.hashSync('admin123', 10);
    await execute(
      `INSERT INTO users (username, email, password_hash, role, bio) VALUES (?, ?, ?, 'admin', ?)`,
      ['admin', 'admin@example.com', hash, '系统管理员']
    );
    admin = await queryOne(`SELECT id FROM users WHERE username = 'admin'`);
  }

  // 检查帖子是否为空，为空则创建示例帖子
  const postRow = await queryOne(`SELECT count(*) as c FROM posts`);
  if (parseInt(postRow?.c) > 0) return false;

  console.log('创建示例帖子...');
  const samplePosts = [
    {
      title: '欢迎来到我的论坛社区',
      content: `# 欢迎来到这里\n\n这是一个使用 Node.js + Express + PostgreSQL(Supabase) 构建的现代化论坛系统，已部署在 Vercel。\n\n## 主要功能\n\n- 用户注册与登录\n- 帖子发布与评论\n- 点赞与收藏\n- 标签与分类\n- 通知系统\n- 管理后台\n\n## 技术栈\n\n- **前端**：纯HTML5 + CSS3 + JavaScript\n- **后端**：Node.js + Express（Vercel Serverless）\n- **数据库**：PostgreSQL（Supabase）\n- **图标**：Lucide Icons + 动画图标\n\n开始你的论坛之旅吧！`,
      category_id: 5, tag_ids: [8, 9], featured: true
    },
    {
      title: 'Python 学习路线分享',
      content: `# Python 学习路线\n\n## 入门阶段\n\n1. Python 基础语法\n2. 数据类型与流程控制\n3. 函数与模块\n4. 文件操作\n5. 异常处理\n\n## 进阶阶段\n\n- 面向对象编程\n- 网络编程\n- 数据库操作\n- Web 开发（Django/Flask）\n\n## 高级阶段\n\n- 机器学习\n- 异步编程\n- 性能优化\n\n希望对大家有所帮助！`,
      category_id: 2, tag_ids: [1, 8], featured: false
    },
    {
      title: '前端性能优化技巧',
      content: `# 前端性能优化\n\n## 加载优化\n\n- 图片懒加载\n- 代码分割\n- 资源压缩\n- 使用 CDN\n\n## 渲染优化\n\n- 减少重排重绘\n- 使用 CSS 动画替代 JS\n- 虚拟列表\n- 防抖与节流\n\n## 缓存策略\n\n- 浏览器缓存\n- Service Worker\n- HTTP 缓存`,
      category_id: 2, tag_ids: [2, 6, 9], featured: false
    }
  ];

  for (const p of samplePosts) {
    const res = await execute(
      `INSERT INTO posts (title, content, user_id, category_id, is_featured) VALUES (?, ?, ?, ?, ?)`,
      [p.title, p.content, admin.id, p.category_id, p.featured]
    );
    const postId = res.lastInsertRowid;
    if (p.tag_ids) {
      for (const tagId of p.tag_ids) {
        await execute(
          `INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?) ON CONFLICT DO NOTHING`,
          [postId, tagId]
        );
      }
    }
  }

  await query(`UPDATE categories SET post_count = (SELECT count(*) FROM posts WHERE posts.category_id = categories.id AND posts.status = 'published')`);
  await query(`UPDATE tags SET post_count = (SELECT count(*) FROM post_tags WHERE post_tags.tag_id = tags.id)`);

  console.log('示例数据初始化完成');
  return true;
}

module.exports = {
  getPool,
  query,
  queryOne,
  execute,
  withTransaction,
  ensureSeed,
  convertPlaceholders
};