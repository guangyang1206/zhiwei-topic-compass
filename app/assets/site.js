/* ============================================================
   知微 ZhiWei — shared site behaviour
   - injects nav + footer (single source of truth)
   - language toggle (zh / en) via <html data-lang>
   - theme toggle (light / dark) via <html data-theme>
   - motion engine: scroll-reveal / countUp / bar draw-in / magnetic
   Motion serves data storytelling — never decoration for its own sake.
   ============================================================ */
(function () {
  var LANG_KEY = 'zw_lang', THEME_KEY = 'zw_theme';
  var root = document.documentElement;

  /* ---- restore preferences early ---- */
  var savedLang = localStorage.getItem(LANG_KEY) || 'zh';
  var savedTheme = localStorage.getItem(THEME_KEY) || 'light';
  root.setAttribute('data-lang', savedLang);
  root.setAttribute('data-theme', savedTheme);

  /* ---- 5-page streamlined nav ---- */
  var PAGES = [
    { href: 'index.html',     zh: '首页',   en: 'Home' },
    { href: 'product.html',   zh: '产品',   en: 'Product' },
    { href: 'dashboard.html', zh: '实时看板', en: 'Dashboard' },
    { href: 'docs.html',      zh: '文档',   en: 'Docs' },
    { href: 'blog.html',      zh: 'Blog',  en: 'Blog' }
  ];
  var GITHUB = 'https://github.com/guangyang1206/zhiwei-topic-compass';

  function current() {
    var p = location.pathname.split('/').pop();
    return (!p || p === '') ? 'index.html' : p;
  }
  function t(o) { return '<span data-lang-zh>' + o.zh + '</span><span data-lang-en>' + o.en + '</span>'; }

  /* ---- NAV ---- */
  function buildNav() {
    var host = document.getElementById('nav');
    if (!host) return;
    var cur = current();
    var links = PAGES.map(function (p) {
      var active = p.href === cur ? ' active' : '';
      return '<a class="nav-link' + active + '" href="' + p.href + '">' + t(p) + '</a>';
    }).join('');

    host.className = 'nav';
    host.innerHTML =
      '<div class="container nav-inner">' +
        '<a class="nav-brand" href="index.html">' +
          logoSVG() +
          '<span>知微<span data-lang-en> ZhiWei</span></span>' +
        '</a>' +
        '<nav class="nav-links" id="navLinks">' + links + '</nav>' +
        '<div class="nav-right">' +
          '<button class="icon-btn" id="langBtn" title="切换语言 / Language">' + (savedLang === 'zh' ? 'EN' : '中') + '</button>' +
          '<button class="icon-btn" id="themeBtn" title="切换主题 / Theme">' + themeIcon() + '</button>' +
          '<a class="icon-btn" href="' + GITHUB + '" target="_blank" rel="noopener" title="GitHub">' + ghIcon() + '</a>' +
          '<a class="btn btn-primary magnetic" href="dashboard.html" style="margin-left:4px" data-lang-zh>看板</a>' +
          '<a class="btn btn-primary magnetic" href="dashboard.html" style="margin-left:4px" data-lang-en>Dashboard</a>' +
          '<button class="icon-btn nav-toggle" id="navToggle" title="Menu">☰</button>' +
        '</div>' +
      '</div>';

    document.getElementById('langBtn').onclick = toggleLang;
    document.getElementById('themeBtn').onclick = toggleTheme;
    document.getElementById('navToggle').onclick = function () {
      document.getElementById('navLinks').classList.toggle('open');
    };
  }

  /* ---- FOOTER (关于 & 开源 收进页脚) ---- */
  function buildFooter() {
    var host = document.getElementById('footer');
    if (!host) return;
    host.className = 'footer';
    host.innerHTML =
      '<div class="container">' +
        '<div class="footer-grid">' +
          '<div>' +
            '<div class="nav-brand" style="margin-bottom:12px">' + logoSVG() + '<span>知微 ZhiWei</span></div>' +
            '<p class="subtle" style="font-size:14px;max-width:320px" data-lang-zh>数据驱动的选题命中与多平台发布分析。清楚知道边界，架构已预留。</p>' +
            '<p class="subtle" style="font-size:14px;max-width:320px" data-lang-en>Data-driven topic hit-rate & multi-platform publishing analytics. Honest about boundaries, architected to extend.</p>' +
          '</div>' +
          '<div><h5>' + t({zh:'产品',en:'Product'}) + '</h5>' +
            '<a href="product.html">' + t({zh:'能力概览',en:'Features'}) + '</a>' +
            '<a href="dashboard.html">' + t({zh:'实时看板',en:'Dashboard'}) + '</a>' +
            '<a href="product.html#lines">' + t({zh:'解决方案',en:'Solutions'}) + '</a>' +
          '</div>' +
          '<div><h5>' + t({zh:'资源',en:'Resources'}) + '</h5>' +
            '<a href="docs.html">' + t({zh:'文档',en:'Docs'}) + '</a>' +
            '<a href="blog.html">Blog</a>' +
            '<a href="docs.html#downloads">' + t({zh:'下载',en:'Downloads'}) + '</a>' +
          '</div>' +
          '<div><h5>' + t({zh:'开源 & 关于',en:'Open source & About'}) + '</h5>' +
            '<a href="' + GITHUB + '" target="_blank" rel="noopener">GitHub</a>' +
            '<a href="' + GITHUB + '/blob/main/LICENSE" target="_blank" rel="noopener">MIT License</a>' +
            '<a href="index.html#story">' + t({zh:'产品理念',en:'Philosophy'}) + '</a>' +
          '</div>' +
        '</div>' +
        '<div class="footer-bottom">' +
          '<span>© 2026 知微 ZhiWei · MIT License</span>' +
          '<span>' + t({zh:'部署于 EdgeOne Makers · 由 WorkBuddy 构建',en:'Deployed on EdgeOne Makers · Built with WorkBuddy'}) + '</span>' +
        '</div>' +
      '</div>';
  }

  /* ---- toggles ---- */
  function toggleLang() {
    savedLang = (root.getAttribute('data-lang') === 'zh') ? 'en' : 'zh';
    root.setAttribute('data-lang', savedLang);
    localStorage.setItem(LANG_KEY, savedLang);
    document.getElementById('langBtn').textContent = (savedLang === 'zh') ? 'EN' : '中';
  }
  function toggleTheme() {
    savedTheme = (root.getAttribute('data-theme') === 'dark') ? 'light' : 'dark';
    root.setAttribute('data-theme', savedTheme);
    localStorage.setItem(THEME_KEY, savedTheme);
    document.getElementById('themeBtn').innerHTML = themeIcon();
  }

  /* ---- inline SVG icons (no external deps) ---- */
  function logoSVG() {
    return '<svg class="nav-logo" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<circle cx="16" cy="16" r="14" stroke="var(--accent)" stroke-width="2"/>' +
      '<path d="M16 6 L20 16 L16 26 L12 16 Z" fill="var(--accent)"/>' +
      '<circle cx="16" cy="16" r="2.4" fill="var(--canvas)"/></svg>';
  }
  function themeIcon() {
    return (savedTheme === 'dark')
      ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/></svg>'
      : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>';
  }
  function ghIcon() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.17.08 1.78 1.2 1.78 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.08 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z"/></svg>';
  }

  /* ============================================================
     MOTION ENGINE — serves data storytelling
     ============================================================ */
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* count-up for [data-count] (supports decimals; keeps trailing unit span) */
  function countUp(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = '1';
    var target = parseFloat(el.getAttribute('data-count'));
    if (isNaN(target)) return;
    var decimals = (el.getAttribute('data-count').split('.')[1] || '').length;
    // ensure a leading text node exists (before any unit span)
    if (!el.firstChild || el.firstChild.nodeType !== 3) {
      el.insertBefore(document.createTextNode('0'), el.firstChild || null);
    }
    var textNode = el.childNodes[0];
    var dur = 1100, start = null;
    function frame(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      textNode.nodeValue = (target * eased).toFixed(decimals);
      if (p < 1) requestAnimationFrame(frame);
      else textNode.nodeValue = target.toFixed(decimals);
    }
    requestAnimationFrame(frame);
  }

  function initMotion() {
    var revealEls = [].slice.call(document.querySelectorAll('[data-reveal],[data-reveal-stagger]'));
    // set stagger index
    document.querySelectorAll('[data-reveal-stagger]').forEach(function (g) {
      [].slice.call(g.children).forEach(function (c, i) { c.style.setProperty('--i', i); });
    });

    if (reduce || !('IntersectionObserver' in window)) {
      revealEls.forEach(function (el) { el.classList.add('in'); });
      document.querySelectorAll('[data-count]').forEach(function (el) {
        var d = (el.getAttribute('data-count').split('.')[1] || '').length;
        if (!el.firstChild || el.firstChild.nodeType !== 3) el.insertBefore(document.createTextNode(''), el.firstChild || null);
        el.childNodes[0].nodeValue = parseFloat(el.getAttribute('data-count')).toFixed(d);
        el.dataset.counted = '1';
      });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        // count-up any figures inside
        e.target.querySelectorAll && e.target.querySelectorAll('[data-count]').forEach(countUp);
        if (e.target.hasAttribute('data-count')) countUp(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(function (el) { io.observe(el); });
    // standalone counters not wrapped in reveal
    document.querySelectorAll('[data-count]').forEach(function (el) {
      if (!el.closest('[data-reveal],[data-reveal-stagger]')) io.observe(el);
    });
  }

  /* magnetic buttons */
  function initMagnetic() {
    if (reduce) return;
    document.querySelectorAll('.magnetic').forEach(function (el) {
      el.addEventListener('mousemove', function (ev) {
        var r = el.getBoundingClientRect();
        var mx = ev.clientX - r.left - r.width / 2;
        var my = ev.clientY - r.top - r.height / 2;
        el.style.transform = 'translate(' + (mx * 0.18) + 'px,' + (my * 0.22) + 'px)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    });
  }

  /* ---- TOC scrollspy (仅文档页存在 .doc-toc 时生效) ---- */
  function initTOC() {
    var toc = document.querySelector('.doc-toc');
    if (!toc) return;
    var links = [].slice.call(toc.querySelectorAll('a[href^="#"]'));
    if (!links.length) return;
    var map = {};
    var targets = [];
    links.forEach(function (a) {
      var id = a.getAttribute('href').slice(1);
      var sec = document.getElementById(id);
      if (sec) { map[id] = a; targets.push(sec); }
    });
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          links.forEach(function (l) { l.classList.remove('active'); });
          var a = map[e.target.id];
          if (a) a.classList.add('active');
        }
      });
    }, { rootMargin: '-80px 0px -70% 0px', threshold: 0 });
    targets.forEach(function (s) { io.observe(s); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    buildNav();
    buildFooter();
    initMotion();
    initMagnetic();
    initTOC();
  });
})();
