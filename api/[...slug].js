/**
 * Vercel Serverless Function 入口（catch-all）
 * 处理所有 /api/* 请求
 *
 * Vercel 无持久文件系统，这里切换到内存模式：
 * - setMemoryMode() 让 sql.js 使用纯内存数据库（不读写 forum.db）
 * - 每次冷启动自动重新初始化（seed 初始数据）
 */
const { setMemoryMode } = require('../db');

// 必须先切换到内存模式，再加载 server（因为 server 会 require db 并定义路由）
setMemoryMode();

// 导出 Express app，Vercel 会自动识别并处理 /api/* 请求
module.exports = require('../server');