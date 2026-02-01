(function () {
  const ROW_HEIGHT = 22;
  const BUFFER = 30;
  const vscode = typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : null;

  let entries = [];
  let paused = false;
  let devices = [];
  let presets = [];
  let selectedIndices = new Set();
  let filterCondition = null;
  let searchQuery = '';

  const app = document.getElementById('app');
  if (!app) return;

  function post(msg) {
    if (vscode) vscode.postMessage(msg);
  }

  function renderToolbar() {
    const levels = ['V', 'D', 'I', 'W', 'E', 'F'];
    const levelChips = levels.map(l => {
      const checked = filterCondition?.levels?.includes(l);
      return `<span class="level-chip ${checked ? 'checked' : ''}" data-level="${l}" title="Level ${l}">${l}</span>`;
    }).join('');

    return `
      <div class="toolbar">
        <select id="deviceSelect" title="设备">
          <option value="">-- 选择设备 --</option>
          ${devices.filter(d => d.status === 'device').map(d => `<option value="${d.id}">${d.name || d.id}</option>`).join('')}
        </select>
        <button id="btnRefreshDevices" title="刷新设备">🔄</button>
        <div class="sep"></div>
        <input type="text" id="packageName" placeholder="包名 (可选)" title="输入包名仅显示该 App 日志" />
        <div class="sep"></div>
        <div class="level-chips">${levelChips}</div>
        <input type="text" id="tagInclude" placeholder="Tag 包含" />
        <input type="text" id="tagExclude" placeholder="Tag 排除" />
        <input type="text" id="textFilter" placeholder="文本包含" />
        <input type="text" id="regexFilter" placeholder="正则" title="对整行或 Message 匹配" />
        <div class="sep"></div>
        <select id="presetSelect" title="筛选预设">
          <option value="">-- 预设 --</option>
          ${presets.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
        </select>
        <button id="btnSavePreset" title="保存当前筛选为预设">保存预设</button>
        <button id="btnDeletePreset" title="删除当前选中的预设">删除预设</button>
        <div class="sep"></div>
        <button id="btnPause" class="${paused ? 'primary' : ''}">${paused ? '▶ Resume' : '⏸ Pause'}</button>
        <button id="btnClear">🧹 Clear</button>
        <button id="btnCopy" title="复制选中">📋 Copy</button>
        <button id="btnExport">💾 Export</button>
        <input type="text" id="searchInput" placeholder="🔍 搜索" />
      </div>
    `;
  }

  function renderStatus() {
    const count = entries.length;
    const err = document.getElementById('statusError');
    return `<div class="status" id="statusBar">${paused ? '⏸ 已暂停' : '▶ 运行中'} · 共 ${count} 条</div>`;
  }

  function renderLogArea() {
    return `
      <div class="log-wrap" id="logWrap" tabindex="0">
        <div class="log-inner" id="logInner"></div>
      </div>
    `;
  }

  function getVisibleRange(container) {
    const scrollTop = container.scrollTop;
    const height = container.clientHeight;
    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER);
    const end = Math.min(entries.length, Math.ceil((scrollTop + height) / ROW_HEIGHT) + BUFFER);
    return { start, end };
  }

  function renderVirtualList() {
    const wrap = document.getElementById('logWrap');
    const inner = document.getElementById('logInner');
    if (!wrap || !inner) return;

    const totalHeight = Math.max(entries.length * ROW_HEIGHT, wrap.clientHeight || 400);
    inner.style.height = totalHeight + 'px';

    if (entries.length === 0) {
      inner.innerHTML = '<div class="empty">暂无日志。请运行命令「LogLens: Start」并选择设备。</div>';
      return;
    }

    function paint() {
      const { start, end } = getVisibleRange(wrap);
      const fragment = document.createDocumentFragment();
      for (let i = start; i < end; i++) {
        const e = entries[i];
        if (!e) continue;
        const line = document.createElement('div');
        line.className = 'log-line' + (selectedIndices.has(e.index) ? ' selected' : '');
        line.dataset.index = String(i);
        line.dataset.entryIndex = String(e.index);
        line.dataset.level = e.level;
        line.dataset.pid = String(e.pid);
        line.dataset.tag = e.tag;

        const tagEsc = escapeHtml(e.tag);
        const msgEsc = escapeHtml(e.message);
        const timeEsc = escapeHtml(e.time);
        const highlightMsg = searchQuery ? highlight(msgEsc, searchQuery) : msgEsc;

        line.innerHTML = `
          <span class="time">${timeEsc}</span>
          <span class="pid">${e.pid}</span>
          <span class="tid">${e.tid}</span>
          <span class="level">${e.level}</span>
          <span class="tag" title="${tagEsc}">${tagEsc}</span>
          <span class="msg">${highlightMsg}</span>
        `;
        line.style.position = 'absolute';
        line.style.top = (i * ROW_HEIGHT) + 'px';
        line.style.left = '0';
        line.style.right = '0';
        line.style.height = (ROW_HEIGHT - 1) + 'px';
        fragment.appendChild(line);
      }
      inner.innerHTML = '';
      inner.appendChild(fragment);
    }

    paint();
    wrap.onscroll = () => paint();
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function highlight(text, q) {
    if (!q) return text;
    const re = new RegExp(escapeRe(q), 'gi');
    return text.replace(re, '<mark style="background:#ff0;color:#000">$&</mark>');
  }

  function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function fullRender() {
    app.innerHTML = renderToolbar() + renderLogArea() + renderStatus();
    bindToolbar();
    renderVirtualList();
  }

  function bindToolbar() {
    const deviceSelect = document.getElementById('deviceSelect');
    const packageName = document.getElementById('packageName');
    const tagInclude = document.getElementById('tagInclude');
    const tagExclude = document.getElementById('tagExclude');
    const textFilter = document.getElementById('textFilter');
    const regexFilter = document.getElementById('regexFilter');
    const presetSelect = document.getElementById('presetSelect');
    const searchInput = document.getElementById('searchInput');

    document.getElementById('btnRefreshDevices')?.addEventListener('click', () => post({ type: 'refreshDevices' }));
    document.getElementById('btnPause')?.addEventListener('click', () => post({ type: 'setPaused', paused: !paused }));
    document.getElementById('btnClear')?.addEventListener('click', () => post({ type: 'clear' }));
    document.getElementById('btnCopy')?.addEventListener('click', () => {
      post({ type: 'copy', indices: Array.from(selectedIndices) });
    });
    document.getElementById('btnExport')?.addEventListener('click', () => post({ type: 'export' }));

    deviceSelect?.addEventListener('change', () => {
      post({ type: 'selectDevice', deviceId: deviceSelect.value || null });
    });

    function applyFilter() {
      const levels = [];
      document.querySelectorAll('.level-chip.checked').forEach(el => {
        const l = el.getAttribute('data-level');
        if (l) levels.push(l);
      });
      filterCondition = {
        levels: levels.length ? levels : undefined,
        tagInclude: tagInclude?.value?.trim() || undefined,
        tagExclude: tagExclude?.value?.trim() || undefined,
        text: textFilter?.value?.trim() || undefined,
        regex: regexFilter?.value?.trim() || undefined,
      };
      post({ type: 'setFilter', condition: filterCondition });
    }

    regexFilter?.addEventListener('input', debounce(applyFilter, 300));

    packageName?.addEventListener('change', () => {
      post({ type: 'setPackage', packageName: packageName.value?.trim() || null });
    });
    tagInclude?.addEventListener('input', debounce(applyFilter, 300));
    tagExclude?.addEventListener('input', debounce(applyFilter, 300));
    textFilter?.addEventListener('input', debounce(applyFilter, 300));

    document.querySelectorAll('.level-chip').forEach(el => {
      el.addEventListener('click', () => {
        el.classList.toggle('checked');
        applyFilter();
      });
    });

    presetSelect?.addEventListener('change', () => {
      const id = presetSelect.value;
      if (id) post({ type: 'applyPreset', id });
    });

    document.getElementById('btnSavePreset')?.addEventListener('click', () => {
      const name = window.prompt('预设名称', '');
      if (!name) return;
      const levels = [];
      document.querySelectorAll('.level-chip.checked').forEach(e => { const l = e.getAttribute('data-level'); if (l) levels.push(l); });
      post({
        type: 'savePreset',
        preset: {
          id: 'preset-' + Date.now(),
          name,
          enabled: true,
          condition: {
            levels: levels.length ? levels : undefined,
            tagInclude: tagInclude?.value?.trim() || undefined,
            tagExclude: tagExclude?.value?.trim() || undefined,
            text: textFilter?.value?.trim() || undefined,
            regex: regexFilter?.value?.trim() || undefined,
          },
        },
      });
    });

    document.getElementById('btnDeletePreset')?.addEventListener('click', () => {
      const id = presetSelect?.value;
      if (!id) return;
      if (window.confirm('确定删除当前选中的预设？')) post({ type: 'deletePreset', id });
    });

    searchInput?.addEventListener('input', () => {
      searchQuery = searchInput.value.trim();
      renderVirtualList();
    });
  }

  function debounce(fn, ms) {
    let t;
    return function () {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, arguments), ms);
    };
  }

  const logWrap = document.getElementById('logWrap');
  if (logWrap) {
    logWrap.addEventListener('click', (e) => {
      if (e.target.closest('.tag')) {
        e.preventDefault();
        e.stopPropagation();
        const tag = (e.target.closest('.tag').textContent || '').trim();
        if (tag) {
          const input = document.getElementById('tagInclude');
          if (input) input.value = tag;
          post({ type: 'setFilterTag', tag });
        }
        return;
      }
      if (e.target.closest('.pid')) {
        e.preventDefault();
        e.stopPropagation();
        const pid = e.target.closest('.log-line')?.dataset?.pid;
        if (pid) post({ type: 'copyText', text: pid });
        return;
      }
      const line = e.target.closest('.log-line');
      if (!line) return;
      const entryIndex = parseInt(line.dataset.entryIndex, 10);
      const multi = e.ctrlKey || e.metaKey;
      if (multi) {
        if (selectedIndices.has(entryIndex)) selectedIndices.delete(entryIndex);
        else selectedIndices.add(entryIndex);
      } else {
        selectedIndices.clear();
        selectedIndices.add(entryIndex);
      }
      renderVirtualList();
    });
  }

  function updateStatus(err) {
    const bar = document.getElementById('statusBar');
    if (bar) {
      bar.textContent = err ? `错误: ${err}` : (paused ? '⏸ 已暂停' : '▶ 运行中') + ' · 共 ' + entries.length + ' 条';
      bar.className = 'status' + (err ? ' error' : '');
    }
  }

  if (vscode) {
    window.addEventListener('message', (event) => {
      const msg = event.data;
      switch (msg.type) {
        case 'log':
          if (msg.replace) {
            entries = msg.entries || [];
          } else if (msg.entries && msg.entries.length) {
            entries = entries.concat(msg.entries);
          }
          if (msg.replace || (msg.entries && msg.entries.length)) {
            const inner = document.getElementById('logInner');
            if (inner) inner.style.height = (entries.length * ROW_HEIGHT) + 'px';
            renderVirtualList();
          }
          break;
        case 'clear':
          entries = [];
          selectedIndices.clear();
          renderVirtualList();
          break;
        case 'paused':
          paused = msg.paused;
          document.querySelector('#btnPause')?.classList.toggle('primary', paused);
          if (document.querySelector('#btnPause')) document.querySelector('#btnPause').textContent = paused ? '▶ Resume' : '⏸ Pause';
          break;
        case 'devices':
          devices = msg.devices || [];
          fullRender();
          return;
        case 'error':
          updateStatus(msg.message);
          return;
        case 'filterPresets':
          presets = msg.presets || [];
          const sel = document.getElementById('presetSelect');
          if (sel) {
            const v = sel.value;
            sel.innerHTML = '<option value="">-- 预设 --</option>' + presets.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
            sel.value = v;
          }
          return;
        case 'requestCopy':
          post({ type: 'copy', indices: Array.from(selectedIndices) });
          break;
        default:
          break;
      }
      updateStatus(null);
    });
  }

  fullRender();
})();
