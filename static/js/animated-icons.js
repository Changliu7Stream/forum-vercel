/**
 * 图标渲染脚本（本地化，不再依赖 CDN）
 *
 * 将 DOM 中的 <animated-lucide-xxx> 标签替换为内联 SVG。
 * 内联 SVG 数据由 icons.js 的 window.IconSVG 提供（零 CDN 依赖，稳定可靠）。
 * 保留 <animated-lucide-*> 标签名作为标记，方便后续如需恢复动画图标。
 */
(function() {

  /**
   * 把单个 <animated-lucide-xxx> 标签替换为内联 SVG
   */
  function replaceTag(el) {
    var tagName = el.tagName.toLowerCase();
    if (tagName.indexOf('animated-lucide-') !== 0) return;

    var name = tagName.replace(/^animated-lucide-/, '');
    var size = el.getAttribute('size');
    var cls = el.getAttribute('class');

    if (!window.IconSVG) return;
    var svg = window.IconSVG.create(name, size ? size + 'px' : null);
    if (!svg) return;

    // 保留 class（如 icon-moon/icon-sun 用于主题切换）
    if (cls) svg.setAttribute('class', cls);

    if (el.parentNode) el.parentNode.replaceChild(svg, el);
  }

  /**
   * 扫描并替换所有 <animated-lucide-*> 标签
   * 先收集再替换，避免 replaceChild 修改 DOM 导致漏扫
   */
  function scanAndReplace() {
    var all = document.querySelectorAll('*');
    var tags = [];
    for (var i = 0; i < all.length; i++) {
      if (all[i].tagName.toLowerCase().indexOf('animated-lucide-') === 0) {
        tags.push(all[i]);
      }
    }
    for (var j = 0; j < tags.length; j++) {
      replaceTag(tags[j]);
    }
  }

  /**
   * 处理某个节点及其子树中的 <animated-lucide-*> 标签
   */
  function replaceInNode(node) {
    if (node.nodeType === 1) {
      var children = node.querySelectorAll ? node.querySelectorAll('*') : [];
      var inclSelf = node.tagName && node.tagName.toLowerCase().indexOf('animated-lucide-') === 0;
      if (inclSelf) replaceTag(node);
      for (var i = 0; i < children.length; i++) {
        if (children[i].tagName && children[i].tagName.toLowerCase().indexOf('animated-lucide-') === 0) {
          replaceTag(children[i]);
        }
      }
    }
  }

  // DOM 就绪后扫描
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scanAndReplace);
  } else {
    scanAndReplace();
  }

  // 监听动态插入的节点（帖子列表、评论等都通过 JS 动态渲染）
  if (window.MutationObserver) {
    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        Array.prototype.forEach.call(mutation.addedNodes, function(node) {
          replaceInNode(node);
        });
      });
    });
    var startObserve = function() {
      if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
      }
    };
    if (document.body) {
      startObserve();
    } else {
      document.addEventListener('DOMContentLoaded', startObserve);
    }
  }

  window.AnimatedIcons = {
    scan: scanAndReplace,
    replace: replaceTag
  };
})();