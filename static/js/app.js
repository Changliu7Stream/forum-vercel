/**
 * 主应用逻辑
 */

// 渲染导航栏
function renderNavbar() {
  const user = getUser();
  const isAdmin = user && (user.role === 'admin' || user.role === 'moderator');

  const html = `
    <div class="navbar-logo">
      <animated-lucide-message-circle size="24"></animated-lucide-message-circle>
      <span>论坛</span>
    </div>
    <nav class="navbar-links">
      <a href="/" class="nav-home">
        <animated-lucide-home size="16"></animated-lucide-home>
        首页
      </a>
      <a href="/category.html" class="nav-category">
        <animated-lucide-folder size="16"></animated-lucide-folder>
        分类
      </a>
      <a href="/search.html" class="nav-search">
        <animated-lucide-search size="16"></animated-lucide-search>
        搜索
      </a>
    </nav>
    <div class="navbar-search">
      <svg class="nav-search-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      <input type="text" id="nav-search-input" placeholder="搜索帖子..." autocomplete="off">
    </div>
    <div class="navbar-actions">
      <button class="theme-toggle" title="切换主题" aria-label="切换主题">
        <animated-lucide-moon class="icon-moon"></animated-lucide-moon>
        <animated-lucide-sun class="icon-sun"></animated-lucide-sun>
        <span class="theme-pill-thumb"></span>
      </button>
      <button class="mobile-nav-toggle" id="mobile-menu-toggle" aria-label="菜单">
        <animated-lucide-menu></animated-lucide-menu>
      </button>
      ${user ? `
        <a href="/notifications.html" class="notif-btn" id="notif-btn" title="通知">
          <animated-lucide-bell size="20"></animated-lucide-bell>
          <span class="badge" id="notif-badge" style="display:none"></span>
        </a>
        <div class="navbar-user" id="user-menu-btn">
          <img src="${getAvatarUrl(user)}" alt="${user.username}" class="avatar avatar-sm">
          <span class="username">${user.username}</span>
          <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
          <div class="user-dropdown" id="user-dropdown">
            <a href="/profile.html?id=${user.id}">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> 个人主页
            </a>
            <a href="/favorites.html">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg> 我的收藏
            </a>
            <a href="/notifications.html">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg> 通知
              <span class="badge" id="dropdown-notif-badge" style="display:none">0</span>
            </a>
            <div class="divider"></div>
            <a href="/settings.html">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg> 设置
            </a>
            ${isAdmin ? `
              <a href="/admin/index.html">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> 管理后台
              </a>
            ` : ''}
            <div class="divider"></div>
            <a href="#" id="logout-btn">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg> 退出
            </a>
          </div>
        </div>
      ` : `
        <a href="/login.html" class="btn btn-ghost btn-sm">登录</a>
        <a href="/register.html" class="btn btn-primary btn-sm">注册</a>
      `}
    </div>
    <!-- 移动端菜单 -->
    <div class="navbar-mobile-menu" id="mobile-menu">
      <a href="/">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        首页
      </a>
      <a href="/category.html">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
        分类
      </a>
      <a href="/search.html">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        搜索
      </a>
      <div class="divider"></div>
      ${user ? `
        <a href="/notifications.html">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          通知
        </a>
        <a href="/profile.html?id=${user.id}">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          个人主页
        </a>
        <a href="/favorites.html">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
          我的收藏
        </a>
        <a href="/settings.html">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          设置
        </a>
        ${isAdmin ? `
          <a href="/admin/index.html">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            管理后台
          </a>
        ` : ''}
        <div class="navbar-mobile-actions">
          <a href="#" id="mobile-logout-btn" class="btn btn-secondary btn-full">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            退出登录
          </a>
        </div>
      ` : `
        <div class="navbar-mobile-actions">
          <a href="/login.html" class="btn btn-outline btn-full">登录</a>
          <a href="/register.html" class="btn btn-primary btn-full">注册</a>
        </div>
      `}
    </div>
  `;

  return html;
}

// 初始化导航栏
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    navbar.innerHTML = `<div class="navbar-inner">${renderNavbar()}</div>`;
    initNavbarEvents();
    loadNotificationCount();
  }
}

// 导航栏事件
function initNavbarEvents() {
  // 移动端菜单切换
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  if (mobileToggle && mobileMenu) {
    mobileToggle.addEventListener('click', () => {
      mobileMenu.classList.toggle('show');
    });
    // 点击外部关闭
    document.addEventListener('click', (e) => {
      if (!mobileToggle.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.remove('show');
      }
    });
  }

  // 用户菜单
  const userMenuBtn = document.getElementById('user-menu-btn');
  const userDropdown = document.getElementById('user-dropdown');
  if (userMenuBtn && userDropdown) {
    userMenuBtn.addEventListener('click', e => {
      e.stopPropagation();
      userDropdown.classList.toggle('show');
    });
    document.addEventListener('click', () => {
      userDropdown.classList.remove('show');
    });
  }

  // 退出
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async e => {
      e.preventDefault();
      await api.post('/auth/logout');
      Token.clear();
      CurrentUser.clear();
      Toast.success('已退出登录');
      window.location.href = '/';
    });
  }

  // 移动端退出
  const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
  if (mobileLogoutBtn) {
    mobileLogoutBtn.addEventListener('click', async e => {
      e.preventDefault();
      await api.post('/auth/logout');
      Token.clear();
      CurrentUser.clear();
      Toast.success('已退出登录');
      window.location.href = '/';
    });
  }

  // 导航搜索
  const searchInput = document.getElementById('nav-search-input');
  if (searchInput) {
    searchInput.addEventListener('keypress', e => {
      if (e.key === 'Enter' && searchInput.value.trim()) {
        window.location.href = `/search.html?q=${encodeURIComponent(searchInput.value.trim())}`;
      }
    });
  }

  // 激活当前链接
  const path = window.location.pathname;
  document.querySelectorAll('.navbar-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === path || (href === '/' && path === '/') ||
        (href.includes('.html') && path.includes(href.split('.html')[0]))) {
      a.classList.add('active');
    }
  });
}

// 加载通知数
async function loadNotificationCount() {
  if (!isLoggedIn()) return;
  const res = await api.get('/notifications/unread-count');
  if (res && res.data && res.data.count > 0) {
    const badge = document.getElementById('notif-badge');
    const dropdownBadge = document.getElementById('dropdown-notif-badge');
    if (badge) {
      badge.style.display = 'block';
      badge.textContent = res.data.count > 99 ? '99+' : res.data.count;
    }
    if (dropdownBadge) {
      dropdownBadge.style.display = 'block';
      dropdownBadge.textContent = res.data.count > 99 ? '99+' : res.data.count;
    }
  }
}

// 渲染帖子卡片
function renderPostCard(post) {
  const badges = [];
  if (post.is_pinned) badges.push('<span class="badge badge-pin"><animated-lucide-pin size="14"></animated-lucide-pin> 置顶</span>');
  if (post.is_featured) badges.push('<span class="badge badge-feature"><animated-lucide-star size="14"></animated-lucide-star> 精华</span>');

  const tags = (post.tags || []).map(t =>
    `<a href="/search.html?tag=${t.slug}" class="tag">${t.name}</a>`
  ).join('');

  return `
    <article class="post-card ${post.is_pinned ? 'pinned' : ''}" data-id="${post.id}">
      <div class="post-card-header">
        ${badges.length ? `<div class="post-card-badges">${badges.join('')}</div>` : ''}
        <a href="/post.html?id=${post.id}" class="post-card-title">${escapeHtml(post.title)}</a>
      </div>
      ${tags ? `<div class="post-card-tags">${tags}</div>` : ''}
      <div class="post-card-meta">
        <div class="post-card-author">
          <img src="${getAvatarUrl(post)}" alt="${post.username}" onerror="this.outerHTML='${defaultAvatar(post.username, 20)}'">
          <a href="/profile.html?id=${post.user_id}">${post.username}</a>
        </div>
        <span>${timeAgo(post.created_at)}</span>
        ${post.category_name ? `<a href="/category.html?id=${post.category_id}" class="badge badge-category">${post.category_name}</a>` : ''}
        <span><i class="icon-eye"></i> ${formatNumber(post.view_count)}</span>
        <span><i class="icon-message-circle"></i> ${formatNumber(post.comment_count)}</span>
      </div>
      <div class="post-card-actions">
        <button class="action-btn like-btn ${post.is_liked ? 'active' : ''}" data-id="${post.id}">
          <animated-lucide-thumbs-up size="16"></animated-lucide-thumbs-up>
          <span>${formatNumber(post.like_count)}</span>
        </button>
        <button class="action-btn favorite-btn ${post.is_favorited ? 'active' : ''}" data-id="${post.id}">
          <animated-lucide-bookmark size="16"></animated-lucide-bookmark>
          <span>${formatNumber(post.favorite_count)}</span>
        </button>
        <a href="/post.html?id=${post.id}#comments" class="action-btn">
          <animated-lucide-message-circle size="16"></animated-lucide-message-circle>
          <span>评论</span>
        </a>
        <a href="/post.html?id=${post.id}" class="action-btn">
          <animated-lucide-share-2 size="16"></animated-lucide-share-2>
          <span>分享</span>
        </a>
      </div>
    </article>
  `;
}

// 渲染帖子列表
function renderPostList(posts, containerId = 'post-list') {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!posts || posts.length === 0) {
    container.innerHTML = emptyState('icon-file-text', '暂无帖子', '还没有人发布帖子，快来发表第一篇吧！');
    if (window.replaceIcons) window.replaceIcons();
    return;
  }

  container.innerHTML = posts.map(renderPostCard).join('');
  if (window.replaceIcons) window.replaceIcons();
  initPostActions();
}

// 初始化帖子操作（点赞、收藏）
function initPostActions() {
  document.querySelectorAll('.like-btn').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.preventDefault();
      if (!isLoggedIn()) { Toast.info('请先登录'); window.location.href = '/login.html'; return; }

      const id = btn.dataset.id;
      const isActive = btn.classList.contains('active');
      const countEl = btn.querySelector('span');
      const currentCount = parseInt(countEl.textContent) || 0;

      if (isActive) {
        btn.classList.remove('active');
        countEl.textContent = Math.max(0, currentCount - 1);
        await api.delete(`/posts/${id}/like`);
      } else {
        btn.classList.add('active');
        countEl.textContent = currentCount + 1;
        const res = await api.post(`/posts/${id}/like`);
        if (!res || res.code !== 200) btn.classList.remove('active');
        countEl.textContent = currentCount;
      }
    });
  });

  document.querySelectorAll('.favorite-btn').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.preventDefault();
      if (!isLoggedIn()) { Toast.info('请先登录'); window.location.href = '/login.html'; return; }

      const id = btn.dataset.id;
      const isActive = btn.classList.contains('active');
      const countEl = btn.querySelector('span');
      const currentCount = parseInt(countEl.textContent) || 0;

      if (isActive) {
        btn.classList.remove('active');
        countEl.textContent = Math.max(0, currentCount - 1);
        await api.delete(`/posts/${id}/favorite`);
      } else {
        btn.classList.add('active');
        countEl.textContent = currentCount + 1;
        const res = await api.post(`/posts/${id}/favorite`);
        if (!res || res.code !== 200) btn.classList.remove('active');
        countEl.textContent = currentCount;
      }
    });
  });
}

// 加载帖子列表
async function loadPosts(options = {}) {
  const {
    page = 1,
    sort = 'latest',
    category_id = null,
    tag = null,
    search = null,
    container = 'post-list',
    showPagination = true
  } = options;

  const params = new URLSearchParams();
  params.set('page', page);
  params.set('sort', sort);
  if (category_id) params.set('category_id', category_id);
  if (tag) params.set('tag', tag);
  if (search) params.set('search', search);

  const res = await api.get(`/posts?${params}`);
  if (!res || res.code !== 200) return;

  const { items, total, total_pages } = res.data;

  renderPostList(items, container);

  if (showPagination && total_pages > 1) {
    const pagContainer = document.getElementById('pagination');
    if (pagContainer) {
      pagContainer.innerHTML = pagination(page, total_pages);
      window.loadPage = (p) => {
        window.scrollTo(0, 0);
        loadPosts({ ...options, page: p });
      };
    }
  }

  return res.data;
}

// 渲染评论
function renderComment(comment, postId) {
  const replies = (comment.replies || []).map(r => renderComment(r, postId)).join('');
  const user = getUser();
  const canDelete = user && (user.id === comment.user_id || user.role === 'admin' || user.role === 'moderator');

  return `
    <div class="comment" id="comment-${comment.id}">
      <a href="/profile.html?id=${comment.user_id}">
        <img src="${getAvatarUrl(comment)}" alt="${comment.username}" class="avatar avatar-sm" onerror="this.outerHTML='${defaultAvatar(comment.username, 32)}'">
      </a>
      <div class="comment-body">
        <div class="comment-header">
          <a href="/profile.html?id=${comment.user_id}" class="comment-author">${comment.username}</a>
          <span class="comment-time">${timeAgo(comment.created_at)}</span>
          ${comment.updated_at !== comment.created_at ? '<span class="comment-time">(已编辑)</span>' : ''}
        </div>
        <div class="comment-content">${renderMarkdown(comment.content)}</div>
        <div class="comment-actions">
          <button class="action-btn comment-like-btn ${comment.is_liked ? 'active' : ''}" data-id="${comment.id}">
            <i class="icon-thumbs-up"></i>
            <span>${formatNumber(comment.like_count)}</span>
          </button>
          <button class="action-btn comment-reply-btn" data-post="${postId}" data-comment="${comment.id}">
            <i class="icon-reply"></i>
            <span>回复</span>
          </button>
          ${canDelete ? `
            <button class="action-btn comment-delete-btn" data-id="${comment.id}">
              <i class="icon-trash-2"></i>
            </button>
          ` : ''}
        </div>
        ${replies ? `<div class="comment-replies">${replies}</div>` : ''}
      </div>
    </div>
  `;
}

// 渲染评论列表
function renderCommentList(comments, postId) {
  const container = document.getElementById('comment-list');
  if (!container) return;

  if (!comments || comments.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="icon-message-circle"></i><h3>暂无评论</h3><p>来说点什么吧</p></div>';
    if (window.replaceIcons) window.replaceIcons();
    return;
  }

  container.innerHTML = comments.map(c => renderComment(c, postId)).join('');
  if (window.replaceIcons) window.replaceIcons();
  initCommentActions(postId);
}

// 初始化评论操作
function initCommentActions(postId) {
  document.querySelectorAll('.comment-like-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!isLoggedIn()) { Toast.info('请先登录'); return; }
      const id = btn.dataset.id;
      const isActive = btn.classList.contains('active');
      const span = btn.querySelector('span');
      const count = parseInt(span.textContent) || 0;

      if (isActive) {
        btn.classList.remove('active');
        span.textContent = Math.max(0, count - 1);
        await api.delete(`/comments/${id}/like`);
      } else {
        btn.classList.add('active');
        span.textContent = count + 1;
        await api.post(`/comments/${id}/like`);
      }
    });
  });

  document.querySelectorAll('.comment-reply-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!isLoggedIn()) { Toast.info('请先登录'); return; }
      const commentId = btn.dataset.comment;
      const replyInput = document.getElementById('comment-input');
      if (replyInput) {
        replyInput.dataset.replyTo = commentId;
        replyInput.placeholder = '回复评论...';
        replyInput.focus();
        window.scrollTo({ top: replyInput.offsetTop - 100, behavior: 'smooth' });
      }
    });
  });

  document.querySelectorAll('.comment-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('确定删除这条评论？')) return;
      const id = btn.dataset.id;
      const res = await api.delete(`/comments/${id}`);
      if (res && res.code === 200) {
        Toast.success('已删除');
        btn.closest('.comment').remove();
      }
    });
  });
}

// 提交评论
async function submitComment(postId) {
  const input = document.getElementById('comment-input');
  if (!input || !input.value.trim()) {
    Toast.error('请输入评论内容');
    return;
  }

  const data = {
    post_id: parseInt(postId),
    content: input.value.trim()
  };

  const replyTo = input.dataset.replyTo;
  if (replyTo) {
    data.parent_id = parseInt(replyTo);
  }

  const res = await api.post('/comments', data);
  if (res && res.code === 200) {
    Toast.success('评论成功');
    input.value = '';
    delete input.dataset.replyTo;
    input.placeholder = '发表评论...';
    // 刷新评论
    const res2 = await api.get(`/posts/${postId}/comments`);
    if (res2) renderCommentList(res2.data, postId);
  }
}

// 渲染侧边栏分类
async function renderSidebarCategories() {
  const container = document.getElementById('sidebar-categories');
  if (!container) return;

  const res = await api.get('/categories');
  if (!res || !res.data) return;

  const iconMap = {
    'message-circle': '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
    'code': '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>',
    'help-circle': '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    'share-2': '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>',
    'megaphone': '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 11 18-5v12L3 14v-3z"></path><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"></path></svg>',
    'folder': '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>'
  };

  container.innerHTML = res.data.map(c => {
    const icon = iconMap[c.icon] || iconMap['folder'];
    return `
    <li>
      <a href="/category.html?id=${c.id}">
        <span class="cat-name">${icon} ${c.name}</span>
        <span class="count">${c.post_count}</span>
      </a>
    </li>
  `;
  }).join('');
}

// 渲染热门标签
async function renderSidebarTags() {
  const container = document.getElementById('sidebar-tags');
  if (!container) return;

  const res = await api.get('/tags/popular?limit=10');
  if (!res || !res.data) return;

  if (res.data.length === 0) {
    container.innerHTML = '<div class="text-muted text-sm">暂无标签</div>';
    return;
  }

  container.innerHTML = `<div class="tag-cloud">${res.data.map(t =>
    `<a href="/search.html?tag=${t.slug}" class="tag">${t.name}</a>`
  ).join('')}</div>`;
}

// 全局函数
window.initNavbar = initNavbar;
window.loadPosts = loadPosts;
window.renderPostCard = renderPostCard;
window.renderCommentList = renderCommentList;
window.submitComment = submitComment;
window.renderSidebarCategories = renderSidebarCategories;
window.renderSidebarTags = renderSidebarTags;