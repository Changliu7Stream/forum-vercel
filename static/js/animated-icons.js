/**
 * 动画图标加载器
 * 自动检测 DOM 中的 <animated-lucide-xxx> Web Component 标签，
 * 并按需从 CDN 加载对应的模块（零 npm 依赖）。
 * 
 * 基于 @animated-color-icons/lucide-wc（ISC 许可，gorkem-bwl/animated-icons）
 * CSS-only 悬停动画，语义化动画：铃铛摇铃、爱心跳动、齿轮旋转、盾牌填充等
 */

(function() {
  var CDN = 'https://cdn.jsdelivr.net/npm/@animated-color-icons/lucide-wc/';
  var loaded = {};

  /**
   * kebab-case 转 PascalCase（message-circle -> MessageCircle）
   */
  function toPascalCase(name) {
    return name
      .split('-')
      .map(function(part) { return part.charAt(0).toUpperCase() + part.slice(1); })
      .join('');
  }

  /**
   * 从 <animated-lucide-xxx> 标签名提取图标名
   * <animated-lucide-message-circle> -> message-circle
   */
  function extractIconName(tagName) {
    return tagName.replace(/^animated-lucide-/, '');
  }

  /**
   * 动态加载一个图标模块
   */
  function loadIcon(name) {
    if (loaded[name]) return;
    loaded[name] = true;
    var script = document.createElement('script');
    script.type = 'module';
    script.src = CDN + toPascalCase(name) + '.js';
    script.onerror = function() {
      loaded[name] = false; // 失败允许重试
    };
    document.head.appendChild(script);
  }

  /**
   * 扫描 DOM 中所有 <animated-lucide-*> 标签并加载模块
   */
  function scanAndLoad() {
    var tags = document.querySelectorAll('[class*="animated-lucide-"], [id*="animated-lucide-"]');
    // 更准确：遍历所有元素，匹配标签名以 animated-lucide- 开头
    var all = document.querySelectorAll('*');
    Array.prototype.forEach.call(all, function(el) {
      var name = el.tagName.toLowerCase();
      if (name.indexOf('animated-lucide-') === 0) {
        loadIcon(extractIconName(name));
      }
    });
  }

  /**
   * 手动加载某个图标
   */
  function load(name) {
    loadIcon(name);
  }

  // DOM 就绪后自动扫描
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scanAndLoad);
  } else {
    scanAndLoad();
  }

  // 监听后续动态插入的动画图标（MutationObserver）
  if (window.MutationObserver) {
    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        Array.prototype.forEach.call(mutation.addedNodes, function(node) {
          if (node.nodeType !== 1) return;
          var name = node.tagName.toLowerCase();
          if (name.indexOf('animated-lucide-') === 0) {
            loadIcon(extractIconName(name));
          }
          // 也检查子元素
          var children = node.querySelectorAll ? node.querySelectorAll('*') : [];
          Array.prototype.forEach.call(children, function(child) {
            var cname = child.tagName.toLowerCase();
            if (cname.indexOf('animated-lucide-') === 0) {
              loadIcon(extractIconName(cname));
            }
          });
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.AnimatedIcons = {
    load: load,
    scan: scanAndLoad,
    toPascalCase: toPascalCase
  };
})();