/**
 * 工具函数
 */
const API_BASE = '/api';

// Token 管理
const Token = {
  get() {
    return localStorage.getItem('forum_token');
  },
  set(token) {
    localStorage.setItem('forum_token', token);
  },
  remove() {
    localStorage.removeItem('forum_token');
  },
  clear() {
    localStorage.removeItem('forum_token');
    localStorage.removeItem('forum_user');
  }
};

// 当前用户
const CurrentUser = {
  get() {
    const data = localStorage.getItem('forum_user');
    return data ? JSON.parse(data) : null;
  },
  set(user) {
    localStorage.setItem('forum_user', JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem('forum_user');
  }
};

// API 请求
// 始终返回 { code, message, data? } 对象；网络错误返回 { code: 0, message: '网络错误' }
// 调用方通过 res.code === 200 判断成功
async function api(endpoint, options = {}) {
  const token = Token.get();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });
  } catch (err) {
    // 网络错误
    return { code: 0, message: '网络错误，请稍后重试' };
  }

  let json;
  try {
    json = await res.json();
  } catch (err) {
    // 响应不是 JSON（如 500 错误页）
    return { code: res.status, message: '服务器错误，请稍后重试' };
  }

  // 断言 code 字段存在
  if (json.code === undefined || json.code === null) {
    json.code = res.ok ? 200 : res.status;
  }
  if (json.message === undefined) {
    json.message = res.ok ? 'success' : '请求失败';
  }

  // 401：token 过期或未登录（排除登录接口本身的 401）
  if (res.status === 401 && !endpoint.startsWith('/auth/login')) {
    Token.clear();
    CurrentUser.clear();
    if (!window.location.pathname.includes('login') &&
        !window.location.pathname.includes('register') &&
        !window.location.pathname.includes('install')) {
      Toast.show('登录已过期，请重新登录', 'info');
    }
  }

  return json;
}

// GET 请求
async function apiGet(endpoint) {
  return api(endpoint, { method: 'GET' });
}

// POST 请求
async function apiPost(endpoint, data) {
  return api(endpoint, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

// PUT 请求
async function apiPut(endpoint, data) {
  return api(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

// DELETE 请求
async function apiDelete(endpoint) {
  return api(endpoint, { method: 'DELETE' });
}

// Toast 提示
const Toast = {
  container: null,

  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  show(message, type = 'info', duration = 3000) {
    this.init();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
      success: 'icon-check-circle',
      error: 'icon-x-circle',
      info: 'icon-info',
      warning: 'icon-alert-circle'
    };

    toast.innerHTML = `
      <i class="${icons[type] || icons.info}"></i>
      <span>${message}</span>
    `;

    this.container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideIn 0.3s ease reverse';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  success(message) { this.show(message, 'success'); },
  error(message) { this.show(message, 'error'); },
  info(message) { this.show(message, 'info'); }
};

// 时间格式化
function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = (now - date) / 1000;

  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}天前`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)}周前`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)}个月前`;
  return `${Math.floor(diff / 31536000)}年前`;
}

// 日期格式化
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// 数字格式化
function formatNumber(num) {
  if (num >= 10000) return (num / 10000).toFixed(1) + 'w';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
}

// URL 参数解析
function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

// 设置页面标题
function setPageTitle(title) {
  document.title = title ? `${title} - 论坛` : '论坛';
}

// 检查是否登录
function isLoggedIn() {
  return !!Token.get();
}

// 获取用户信息
function getUser() {
  return CurrentUser.get();
}

// 初始化主题
function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else if (saved === 'light') {
    document.documentElement.removeAttribute('data-theme');
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
}

// 切换主题
function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (isDark) {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('theme', 'light');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
  }
}

// 站点设置缓存
let siteSettingsCache = null;

// 应用主题样式设置（胶囊开关 / 过渡动画）
function applyThemeStyle(settings) {
  if (!document.body) return;
  const style = (settings && settings.theme_style) || 'default';
  const transition = (settings && settings.theme_transition) || 'true';
  document.body.classList.toggle('theme-pill', style === 'pill');
  document.body.classList.toggle('theme-anim', transition !== 'false');
}

// 加载站点设置（先读本地缓存避免闪烁，再异步刷新）
async function loadSettings() {
  try {
    const cached = localStorage.getItem('forum_settings');
    if (cached) applyThemeStyle(JSON.parse(cached));
  } catch (e) {}

  try {
    const res = await apiGet('/settings');
    if (res && res.data) {
      siteSettingsCache = res.data;
      try { localStorage.setItem('forum_settings', JSON.stringify(res.data)); } catch (e) {}
      applyThemeStyle(res.data);
    }
  } catch (e) {}
  return siteSettingsCache;
}

// 简单的 Markdown 渲染（用于前端预览）
function renderMarkdown(text) {
  if (!text) return '';
  let html = escapeHtml(text);

  // 代码块
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (m, lang, code) => {
    return `<pre class="code-block"><code>${code}</code></pre>`;
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

  // 粗体斜体
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // 链接
  html = html.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // 列表
  html = html.replace(/^\* (.+)$/gim, '<li>$1</li>');
  html = html.replace(/^- (.+)$/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`);

  // 引用
  html = html.replace(/^> (.+)$/gim, '<blockquote>$1</blockquote>');

  // 段落
  html = html.split(/\n\n+/).map(p => {
    if (p.startsWith('<h') || p.startsWith('<ul') || p.startsWith('<pre') ||
        p.startsWith('<blockquote') || p.includes('<li>')) {
      return p;
    }
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  }).join('\n');

  return html;
}

// HTML 转义
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 生成默认头像 SVG
function defaultAvatar(name = 'U', size = 40) {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="${color}" rx="${size/2}"/>
    <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" 
          fill="white" font-size="${size * 0.45}" font-weight="600" font-family="Inter, sans-serif">
      ${name.charAt(0).toUpperCase()}
    </text>
  </svg>`;
}

// 获取头像 URL
function getAvatarUrl(user, size = 40) {
  if (!user) return defaultAvatar('U', size);
  if (user.avatar && user.avatar.startsWith('http')) return user.avatar;
  if (user.avatar && user.avatar.startsWith('/')) return user.avatar;
  if (user.avatar) return user.avatar;
  return defaultAvatar(user.username || user.username || 'U', size);
}

// 防抖
function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// 节流
function throttle(fn, delay) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= delay) {
      last = now;
      fn.apply(this, args);
    }
  };
}

// 空状态 HTML
function emptyState(icon, title, desc) {
  return `
    <div class="empty-state">
      <i class="${icon}"></i>
      <h3>${title}</h3>
      <p>${desc}</p>
    </div>
  `;
}

// 加载状态
function loading() {
  return `<div class="loading"><div class="spinner"></div><span>加载中...</span></div>`;
}

// 分页组件
function pagination(current, total, onPage) {
  if (total <= 1) return '';

  const pages = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - 2 && i <= current + 2)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  return `
    <div class="pagination">
      ${current > 1 ? `<a href="#" data-page="${current - 1}"><i class="icon-chevron-left"></i></a>` : ''}
      ${pages.map(p => p === '...'
        ? '<span>...</span>'
        : p === current
          ? `<span class="active">${p}</span>`
          : `<a href="#" data-page="${p}">${p}</a>`
      ).join('')}
      ${current < total ? `<a href="#" data-page="${current + 1}"><i class="icon-chevron-right"></i></a>` : ''}
    </div>
  `;
}

// 初始化通用功能
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadSettings();

  // 主题切换按钮
  document.addEventListener('click', e => {
    if (e.target.closest('.theme-toggle')) {
      toggleTheme();
    }
  });

  // 分页点击
  document.addEventListener('click', e => {
    const link = e.target.closest('[data-page]');
    if (link) {
      e.preventDefault();
      const page = parseInt(link.dataset.page);
      const fn = link.closest('.pagination')?.dataset.fn;
      if (fn && window[fn]) {
        window[fn](page);
      } else if (window.loadPage) {
        window.loadPage(page);
      }
    }
  });
});

// 导出
window.api = { get: apiGet, post: apiPost, put: apiPut, delete: apiDelete };
window.Toast = Toast;
window.Token = Token;
window.CurrentUser = CurrentUser;
window.timeAgo = timeAgo;
window.formatDate = formatDate;
window.formatNumber = formatNumber;
window.getQueryParam = getQueryParam;
window.setPageTitle = setPageTitle;
window.isLoggedIn = isLoggedIn;
window.getUser = getUser;
window.initTheme = initTheme;
window.toggleTheme = toggleTheme;
window.loadSettings = loadSettings;
window.applyThemeStyle = applyThemeStyle;
window.renderMarkdown = renderMarkdown;
window.escapeHtml = escapeHtml;
window.defaultAvatar = defaultAvatar;
window.getAvatarUrl = getAvatarUrl;
window.debounce = debounce;
window.throttle = throttle;
window.emptyState = emptyState;
window.loading = loading;
window.pagination = pagination;