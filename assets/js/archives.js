(function () {
  'use strict';

  var dataEl = document.getElementById('archives-data');
  var postsEl = document.getElementById('archive-posts');
  var labelEl = document.getElementById('archive-current-label');
  var countEl = document.getElementById('archive-current-count');
  var navEl = document.getElementById('archive-nav');
  if (!dataEl || !postsEl || !labelEl || !countEl || !navEl) return;

  var months;
  try {
    months = JSON.parse(dataEl.textContent);
  } catch (e) {
    months = null;
  }
  /* 兼容模板转义异常时被包成一层的字符串 */
  if (typeof months === 'string') {
    try {
      months = JSON.parse(months);
    } catch (e) {
      months = null;
    }
  }
  if (!months || !months.length || !months.forEach) return;

  var byKey = {};
  months.forEach(function (m) {
    byKey[m.k] = m;
  });

  var renderedKey = null;

  function render(key) {
    if (key === renderedKey) return;
    var month = byKey[key];
    if (!month) return;

    labelEl.textContent = month.l;
    countEl.textContent = '  ' + month.n;

    var frag = document.createDocumentFragment();
    month.p.forEach(function (p) {
      var entry = document.createElement('div');
      entry.className = 'archive-entry';

      var title = document.createElement('h3');
      title.className = 'archive-entry-title';
      title.textContent = p.t;

      var meta = document.createElement('div');
      meta.className = 'archive-meta';
      meta.textContent = p.m;

      var link = document.createElement('a');
      link.className = 'entry-link';
      link.setAttribute('aria-label', 'post link to ' + p.t);
      link.href = p.u;

      entry.appendChild(title);
      entry.appendChild(meta);
      entry.appendChild(link);
      frag.appendChild(entry);
    });
    postsEl.replaceChildren(frag);
    renderedKey = key;

    var items = navEl.querySelectorAll('.archive-month-item');
    items.forEach(function (item) {
      var active = item.getAttribute('data-month') === key;
      item.classList.toggle('active', active);
      if (active) {
        item.setAttribute('aria-current', 'true');
        /* 确保当前月份所在的年份处于展开状态 */
        var group = item.closest('details');
        if (group && !group.open) group.open = true;
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.removeAttribute('aria-current');
      }
    });
  }

  function currentKey() {
    var hash;
    try {
      hash = decodeURIComponent(window.location.hash.slice(1));
    } catch (e) {
      return null;
    }
    return Object.prototype.hasOwnProperty.call(byKey, hash) ? hash : null;
  }

  function renderCurrent() {
    render(currentKey() || months[0].k);
  }

  /* 点击月份时直接渲染（年份的展开/收起由 details 原生处理） */
  navEl.addEventListener('click', function (e) {
    var target = e.target.closest('a.archive-month-item');
    if (!target) return;
    var key = target.getAttribute('data-month');
    if (byKey[key]) render(key);
  });

  window.addEventListener('hashchange', renderCurrent);
  renderCurrent();
})();
