/**
 * Strata settings UI. No framework, network dependency, or global CSS reset.
 *
 * await mountStrataSettings(container, {
 *   request: (method, params) => Promise<plain JSON>,
 *   cwd?: string, pickDirectory?: () => Promise<string | undefined>,
 *   theme?: 'light' | 'dark' | 'auto',
 * });
 * Returns { refresh, destroy }. The host must load settings.css separately.
 */

const ICONS = {
  layers: ['M12 3 2 8l10 5 10-5-10-5Z', 'm2 12 10 5 10-5', 'm2 16 10 5 10-5'],
  grid: ['M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z'],
  folder: ['M3 7V5a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z'],
  transfer: ['M4 7h15l-4-4M20 17H5l4 4', 'M19 7l-4 4M5 17l4-4'],
  spark: ['m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z'],
  search: ['M21 21l-5-5', 'M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z'],
  plus: ['M12 5v14M5 12h14'],
  arrow: ['M5 12h14m-5-5 5 5-5 5'],
  down: ['M12 3v12m-5-5 5 5 5-5', 'M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4'],
  up: ['M12 16V4m-5 5 5-5 5 5', 'M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4'],
  check: ['m5 12 4 4L19 6'],
  close: ['m6 6 12 12M18 6 6 18'],
  refresh: ['M20 7v5h-5', 'M4 17v-5h5', 'M6.1 7a7 7 0 0 1 11.6-1L20 9', 'M4 15l2.3 3a7 7 0 0 0 11.6-1'],
  shield: ['M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7l-9-4Z', 'm8 12 3 3 5-6'],
  clock: ['M12 8v5l3 2', 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z'],
  file: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z', 'M14 2v6h6M8 13h8M8 17h6'],
  chevron: ['m9 5 7 7-7 7'],
  info: ['M12 11v6M12 7h.01', 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z'],
  globe: ['M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z', 'M2 12h20M12 2a19 19 0 0 1 0 20 19 19 0 0 1 0-20Z'],
  book: ['M4 3h13a3 3 0 0 1 3 3v15H6a3 3 0 0 1-3-3V4a1 1 0 0 1 1-1Z', 'M3 17a3 3 0 0 1 3-3h14M8 7h7'],
};

const KIND_LABELS = {
  observation: '观察记录', claim: '事实主张', decision: '决定', task: '待办',
  idea: '想法', outcome: '验证结果', rule_draft: '经验草稿',
};

function node(tag, attrs = {}, ...children) {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (name === 'className') element.className = value;
    else if (name === 'text') element.textContent = String(value);
    else if (name.startsWith('on') && typeof value === 'function') element.addEventListener(name.slice(2).toLowerCase(), value);
    else if (name === 'checked' || name === 'disabled' || name === 'required' || name === 'hidden') element[name] = Boolean(value);
    else element.setAttribute(name, value === true ? '' : String(value));
  }
  for (const child of children.flat(Infinity)) {
    if (child !== null && child !== undefined && child !== false) element.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return element;
}

function icon(name, className = '') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [key, value] of Object.entries({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.65', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', class: `strata-icon ${className}` })) svg.setAttribute(key, value);
  for (const d of ICONS[name] || ICONS.file) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}

function button(label, { style = 'secondary', symbol, ...attrs } = {}) {
  return node('button', { type: 'button', className: `strata-button strata-button--${style}`, ...attrs }, symbol && icon(symbol), node('span', { text: label }));
}

function field(label, input, hint) {
  return node('label', { className: 'strata-field' }, node('span', { className: 'strata-label', text: label }), input, hint && node('span', { className: 'strata-hint', text: hint }));
}

function input(attrs = {}) { return node('input', { className: 'strata-input', ...attrs }); }
function badge(text, tone = 'muted') { return node('span', { className: `strata-badge strata-badge--${tone}`, text }); }
function note(text, tone = 'info') { return node('div', { className: `strata-note strata-note--${tone}` }, icon(tone === 'success' ? 'check' : 'info'), node('span', { text })); }
function number(value) { return Number.isFinite(Number(value)) ? new Intl.NumberFormat('zh-CN').format(Number(value)) : '—'; }
function date(value) {
  const d = new Date(value);
  if (d.getTime() === 0) return '来源时间未知';
  return Number.isFinite(d.getTime()) ? new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d) : '时间未记录';
}
function listOf(value, key = 'records') { return Array.isArray(value) ? value : Array.isArray(value?.[key]) ? value[key] : Array.isArray(value?.items) ? value.items : []; }
function errorMessage(error) { return error?.message || String(error || '操作失败，请重试。'); }
function textOf(value) { return typeof value === 'string' ? value : value?.message || value?.reason || JSON.stringify(value); }

/** HTTP transport for the standalone workspace preview. */
export function createFetchTransport(endpoint = '/api/strata') {
  return async (method, params = {}) => {
    const token = document.querySelector('meta[name="strata-token"]')?.content;
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Strata-Token': token } : {}) }, body: JSON.stringify({ method, params }) });
    let body;
    try { body = await response.json(); } catch { throw new Error(`服务返回了无法读取的响应（${response.status}）。`); }
    if (!response.ok || body?.error) {
      const error = new Error(body?.error?.message || body?.message || `请求失败（${response.status}）`);
      error.code = body?.error?.code;
      throw error;
    }
    return body && Object.hasOwn(body, 'result') ? body.result : body;
  };
}

/** Mount an isolated settings panel. Never interprets record text as HTML. */
export async function mountStrataSettings(container, options = {}) {
  if (!container?.append) throw new TypeError('container must be a DOM element');
  if (typeof options.request !== 'function') throw new TypeError('request(method, params) is required');
  const state = { page: 'memory', settings: {}, status: {}, records: [], recordTotal: 0, recordViewId: null, loading: true, query: '', kind: '', error: null, preview: null, importFile: null, importBundle: null, importMode: 'merge', importScope: null, importGeneration: 0, destroyed: false, listGeneration: 0 };
  let fileGeneration = 0;
  const host = node('div', { className: 'strata-settings-host' });
  const root = node('section', { className: 'strata-app', 'data-strata-theme': options.theme || 'auto', 'aria-label': 'Strata 记忆设置' });
  const notifications = node('div', { className: 'strata-notifications', 'aria-live': 'polite', 'aria-atomic': 'true' });
  const main = node('main', { className: 'strata-main', tabindex: '-1' });
  const connection = node('div', { className: 'strata-connection' }, node('span', { className: 'strata-status-dot' }), node('span', { text: '正在连接记忆库' }));
  const navButtons = new Map();
  const navItems = [['memory', '记忆总览', 'layers'], ['scope', '使用范围', 'folder'], ['transfer', '迁移与导入', 'transfer'], ['insights', '灵感设置', 'spark']];
  const sidebar = node('aside', { className: 'strata-sidebar' },
    node('div', { className: 'strata-brand' }, node('div', { className: 'strata-brand-mark' }, icon('layers')), node('div', {}, node('strong', { text: 'STRATA' }), node('span', { text: '记忆地层' }))),
    node('div', { className: 'strata-nav-label', text: '你的记忆空间' }),
    node('nav', { className: 'strata-navigation', 'aria-label': '记忆设置导航' }, navItems.map(([id, label, symbol]) => {
      const item = node('button', { type: 'button', className: 'strata-nav-item', onclick: () => navigate(id) }, icon(symbol), node('span', { text: label }), icon('chevron', 'strata-nav-arrow'));
      navButtons.set(id, item);
      return item;
    })),
    node('div', { className: 'strata-sidebar-foot' }, node('div', { className: 'strata-side-illustration', 'aria-hidden': 'true' }, node('i'), node('i'), node('i')),
      node('strong', { text: '记住来路，连接新知。' }), node('p', { text: '浅层保留线索，深层留下依据。' }), connection),
  );
  root.append(sidebar, main, notifications);
  host.append(root); container.append(host);
  let toastTimer;
  let searchTimer;
  const dialogs = new Set();

  const paramsWithContext = (params = {}) => ({ ...params, ...(options.cwd ? { cwd: options.cwd } : {}), ...(options.sessionId ? { sessionId: options.sessionId } : {}) });
  async function request(method, params = {}) {
    if (state.destroyed) throw new Error('设置页已关闭。');
    return options.request(method, paramsWithContext(params));
  }

  function toast(message, tone = 'success') {
    if (state.destroyed) return;
    clearTimeout(toastTimer);
    notifications.replaceChildren(node('div', { className: `strata-toast strata-toast--${tone}` }, icon(tone === 'success' ? 'check' : 'info'), node('span', { text: message })));
    toastTimer = setTimeout(() => notifications.replaceChildren(), tone === 'error' ? 9000 : 4500);
  }

  async function busy(btn, label, action) {
    if (btn.disabled) return;
    const previous = [...btn.childNodes];
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    btn.replaceChildren(node('span', { className: 'strata-spinner', 'aria-hidden': 'true' }), node('span', { text: label }));
    try { return await action(); }
    catch (error) { toast(errorMessage(error), 'error'); throw error; }
    finally { btn.disabled = false; btn.removeAttribute('aria-busy'); btn.replaceChildren(...previous); }
  }

  function run(btn, label, action) { void busy(btn, label, action).catch(() => {}); }

  function scope() { return state.settings.scope || state.status.scope || { mode: 'dsh' }; }
  function scopeLabel(value = scope()) { return value.mode === 'folder' ? `${value.path || '需要重新绑定文件夹'}${value.includeSubfolders === false ? '（仅此目录）' : '（含子目录）'}` : '整个 DSH'; }
  function header(eyebrow, title, description, action) {
    return node('header', { className: 'strata-page-header' }, node('div', {}, node('div', { className: 'strata-eyebrow', text: eyebrow }), node('h1', { text: title }), node('p', { text: description })), action);
  }
  function pageFoot(text) { return node('div', { className: 'strata-page-foot' }, icon('shield'), node('span', { text })); }
  function panel(title, description, content, action) {
    return node('section', { className: 'strata-panel' }, node('div', { className: 'strata-panel-heading' }, node('div', {}, node('h2', { text: title }), description && node('p', { text: description })), action), content);
  }

  function navigate(page) {
    state.page = page;
    render();
    if (page === 'memory') void loadRecords();
  }

  async function refresh() {
    const [statusResult, settingsResult] = await Promise.allSettled([request('status'), request('settings.get')]);
    if (state.destroyed) return;
    if (statusResult.status === 'fulfilled') state.status = statusResult.value || {};
    if (settingsResult.status === 'fulfilled') state.settings = settingsResult.value?.settings || settingsResult.value || {};
    state.error = settingsResult.status === 'rejected' ? errorMessage(settingsResult.reason) : statusResult.status === 'rejected' ? errorMessage(statusResult.reason) : null;
    state.loading = false;
    connection.classList.toggle('strata-connection--error', Boolean(state.error));
    connection.lastChild.textContent = state.error ? '连接暂时不可用' : '本地记忆库已连接';
    render();
    if (state.page === 'memory' && !state.error) await loadRecords();
  }

  async function loadRecords(append = false) {
    clearTimeout(searchTimer);
    if (append && (state.recordQuery !== state.query || state.recordKind !== state.kind)) append = false;
    const generation = ++state.listGeneration;
    const query = state.query;
    const kind = state.kind;
    const list = main.querySelector('[data-record-list]');
    if (list) { list.setAttribute('aria-busy', 'true'); const more = list.querySelector('.strata-list-footer button'); if (more) more.disabled = true; }
    try {
      const result = await request('records.list', { query: state.query || undefined, kinds: state.kind ? [state.kind] : undefined, offset: append ? state.records.length : 0, limit: 50, viewId: append ? state.recordViewId : undefined });
      if (state.destroyed || generation !== state.listGeneration) return;
      state.records = append ? [...state.records, ...listOf(result)] : listOf(result);
      state.recordTotal = result.total ?? state.records.length;
      state.recordViewId = result.viewId || null;
      state.recordQuery = query; state.recordKind = kind;
      const target = main.querySelector('[data-record-list]');
      if (target) { target.removeAttribute('aria-busy'); renderRecords(target); }
    } catch (error) {
      if (state.destroyed || generation !== state.listGeneration) return;
      const target = main.querySelector('[data-record-list]');
      if (target) { target.removeAttribute('aria-busy'); target.replaceChildren(note(errorMessage(error), 'error')); }
    }
  }

  function render() {
    if (state.destroyed) return;
    for (const [id, item] of navButtons) { item.classList.toggle('is-active', id === state.page); if (id === state.page) item.setAttribute('aria-current', 'page'); else item.removeAttribute('aria-current'); }
    main.replaceChildren();
    if (state.loading) { main.append(node('div', { className: 'strata-loading', role: 'status' }, node('span', { className: 'strata-spinner' }), node('p', { text: '正在读取你的记忆空间…' }))); return; }
    if (state.error) {
      const retry = button('重新连接', { style: 'primary', symbol: 'refresh' });
      retry.addEventListener('click', () => run(retry, '正在连接', refresh));
      main.append(header('CONNECTION', '暂时无法连接记忆库', '请确认 Strata 服务已启动，然后重试。'), note(state.error, 'error'), retry);
      return;
    }
    ({ memory: renderMemory, scope: renderScope, transfer: renderTransfer, insights: renderInsights })[state.page]();
  }

  function renderMemory() {
    const add = button('记下一条', { style: 'primary', symbol: 'plus', onclick: () => showNewRecord() });
    main.append(header('MEMORY WORKSPACE', '让每段经验，都有迹可循。', '把决定、经历与想法留在这里，需要的时候，再找到它们。', add));
    const stats = state.status.counts || {};
    main.append(node('div', { className: 'strata-stats' },
      stat('已保存记忆', state.status.recordCount ?? stats.records ?? 0, 'layers', '一段段经验，逐渐沉淀'),
      stat('版本记录', state.status.revisionCount ?? stats.revisions ?? 0, 'clock', '保留变化，也保留来路'),
      stat('证据引用', state.status.evidenceCount ?? stats.evidence ?? 0, 'shield', '回忆有来源，判断有依据'),
    ));
    const scopeShortcut = button('管理范围', { style: 'ghost', symbol: 'arrow', onclick: () => navigate('scope') });
    main.append(node('div', { className: 'strata-scope-banner' }, node('div', { className: 'strata-scope-symbol' }, icon(scope().mode === 'folder' ? 'folder' : 'globe')), node('div', { className: 'strata-scope-copy' }, node('strong', { text: '当前使用范围' }), node('span', { text: scopeLabel() })), scopeShortcut));
    const search = input({ type: 'search', placeholder: '搜索记忆中的标题、内容或关键词', value: state.query, 'aria-label': '搜索记忆' });
    search.addEventListener('input', () => { state.query = search.value; clearTimeout(searchTimer); searchTimer = setTimeout(() => void loadRecords(), 220); });
    const kind = node('select', { className: 'strata-input strata-kind-select', 'aria-label': '筛选记忆类型', onchange: () => { state.kind = kind.value; void loadRecords(); } }, node('option', { value: '', text: '事实与记录' }), Object.entries(KIND_LABELS).map(([value, label]) => node('option', { value, text: label })));
    kind.value = state.kind;
    const reload = button('刷新', { style: 'ghost', symbol: 'refresh' });
    reload.addEventListener('click', () => run(reload, '正在刷新', refresh));
    const list = node('div', { className: 'strata-record-list', 'data-record-list': '', 'aria-live': 'polite' });
    renderRecords(list);
    main.append(panel('记忆档案', '想法与经验草稿可通过类型筛选单独查看。', node('div', {}, node('div', { className: 'strata-toolbar' }, node('div', { className: 'strata-search' }, icon('search'), search), kind), list), reload));
    main.append(pageFoot('数据保存在你的记忆库中。修改会保留版本；想法不会自动成为已验证事实。'));
  }

  function stat(label, value, symbol, description) {
    return node('div', { className: 'strata-stat' }, node('div', { className: 'strata-stat-top' }, node('span', { text: label }), icon(symbol)), node('strong', { className: 'strata-stat-value', text: number(value) }), node('span', { className: 'strata-stat-note', text: description }));
  }

  function renderRecords(target) {
    target.replaceChildren();
    if (!state.records.length) {
      target.append(node('div', { className: 'strata-empty' }, node('div', { className: 'strata-empty-symbol' }, icon(state.query ? 'search' : 'book')), node('h3', { text: state.query || state.kind ? '还没有找到匹配的记忆' : '你的记忆，正从这里开始' }), node('p', { text: state.query || state.kind ? '换一个关键词或类型试试。' : '记下一次决定，或导入已有的记忆档案。' }), !state.query && !state.kind && button('导入已有记忆', { style: 'secondary', symbol: 'up', onclick: () => navigate('transfer') })));
      return;
    }
    for (const record of state.records) {
      const title = record.title || '未命名记忆';
      const row = node('button', { type: 'button', className: 'strata-record', onclick: () => showRecord(record), 'aria-label': `查看记忆：${title}` },
        node('div', { className: `strata-record-symbol ${record.kind === 'idea' ? 'is-idea' : ''}` }, icon(record.kind === 'idea' ? 'spark' : record.kind === 'task' ? 'check' : 'file')),
        node('div', { className: 'strata-record-copy' }, node('div', { className: 'strata-record-title' }, node('strong', { text: title }), badge(KIND_LABELS[record.kind] || record.kind || '记忆', record.kind === 'idea' ? 'warm' : 'muted')),
          node('p', { text: record.text || record.gist || '' }), node('div', { className: 'strata-record-meta' }, node('span', { text: date(record.updatedAt || record.createdAt) }), Array.isArray(record.tags) && record.tags.slice(0, 3).map(tag => node('span', { text: `# ${tag}` })))), icon('chevron'));
      target.append(row);
    }
    if (state.recordTotal > state.records.length) {
      const more = button('加载更多记忆', { symbol: 'down' });
      more.addEventListener('click', () => run(more, '正在读取', () => loadRecords(true)));
      target.append(node('div', { className: 'strata-list-footer' }, node('span', { text: `已显示 ${number(state.records.length)} / ${number(state.recordTotal)} 条` }), more));
    }
  }

  function openDialog(title, description, content, actions = []) {
    const close = button('关闭', { style: 'icon', symbol: 'close', 'aria-label': '关闭对话框' });
    const id = `strata-dialog-${Math.random().toString(36).slice(2)}`;
    const dialog = node('dialog', { className: 'strata-dialog', 'aria-labelledby': id }, node('div', { className: 'strata-dialog-head' }, node('div', {}, node('h2', { id, text: title }), description && node('p', { text: description })), close), node('div', { className: 'strata-dialog-body' }, content), actions.length > 0 && node('div', { className: 'strata-dialog-actions' }, actions));
    root.append(dialog); dialogs.add(dialog);
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => { dialogs.delete(dialog); dialog.remove(); });
    dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
    dialog.showModal();
    return dialog;
  }

  function showRecord(record) {
    const provenance = Array.isArray(record.provenance) ? record.provenance : [];
    const viewId = state.recordViewId;
    const evidenceArea = node('div', { className: 'strata-evidence-area' });
    if (provenance.length) {
      const source = node('select', { className: 'strata-input', 'aria-label': '选择原文来源' }, provenance.map((ref, index) => node('option', { value: ref.evidenceId, text: `来源 ${index + 1}${ref.sourceId ? ` · ${ref.sourceId}` : ''}` })));
      const read = button('查看原文', { symbol: 'book' });
      const more = button('继续读取原文', { symbol: 'down', hidden: true });
      const output = node('div', { className: 'strata-evidence-output', 'aria-live': 'polite' });
      let evidenceText = '';
      let nextCursor = null;
      let generation = 0;
      source.addEventListener('change', () => { generation += 1; evidenceText = ''; nextCursor = null; more.hidden = true; output.replaceChildren(); });
      async function readSource(append) {
        const current = ++generation;
        try {
          const result = await request('records.deep', { entryId: record.id, revision: record.revision, evidenceId: source.value, cursor: append ? nextCursor : 0, maxChars: 8000, viewId });
          if (state.destroyed || generation !== current || !evidenceArea.isConnected) return;
          evidenceText = (append ? evidenceText : '') + (result.text || '');
          nextCursor = result.nextCursor ?? null;
          output.replaceChildren(node('div', { className: 'strata-evidence-meta', text: `来源：${result.sourceId || '未记录'} · 已读取 ${number(evidenceText.length)} / ${number(result.totalChars ?? evidenceText.length)} 字符` }), node('pre', { className: 'strata-evidence-text', text: evidenceText || '原文为空。' }));
          more.hidden = nextCursor === null;
        } catch (error) { if (generation === current) { output.replaceChildren(note(errorMessage(error), 'error')); more.hidden = true; } throw error; }
      }
      read.addEventListener('click', () => run(read, '正在读取', () => readSource(false)));
      more.addEventListener('click', () => run(more, '正在读取', () => readSource(true)));
      evidenceArea.append(node('h3', { text: '原文与证据' }), node('div', { className: 'strata-evidence-controls' }, source, read), output, more);
    } else evidenceArea.append(note('此记忆未附原文证据。上方内容是已保存的记忆正文，不是原始会话。'));
    openDialog(record.title || '记忆详情', `${KIND_LABELS[record.kind] || record.kind || '记忆'} · ${date(record.updatedAt || record.createdAt)}`,
      node('div', {}, node('div', { className: 'strata-record-detail', text: record.text || record.gist || '这条记忆没有正文。' }),
        node('dl', { className: 'strata-detail-meta' }, node('dt', { text: '记录 ID' }), node('dd', { text: record.id || '—' }), node('dt', { text: '来源类型' }), node('dd', { text: record.sourceKind || '未记录' }), node('dt', { text: '认知状态' }), node('dd', { text: record.epistemicStatus || 'unverified' }), node('dt', { text: '证据引用' }), node('dd', { text: `${provenance.length} 项` })),
        record.kind === 'idea' && note('这是一条想法，保存它不代表它已经过验证。'), evidenceArea));
  }

  function showNewRecord(initialKind = 'observation') {
    const title = input({ name: 'title', required: true, maxlength: '160', placeholder: '给这段记忆起一个清楚的标题' });
    const kind = node('select', { name: 'kind', className: 'strata-input' }, Object.entries(KIND_LABELS).map(([value, label]) => node('option', { value, text: label })));
    kind.value = initialKind;
    const text = node('textarea', { name: 'text', className: 'strata-input strata-textarea', required: true, rows: '7', maxlength: '100000', placeholder: '发生了什么、你做了什么决定，或有什么值得记住的想法…' });
    const tags = input({ name: 'tags', placeholder: '用逗号分隔，例如：架构, 工作偏好' });
    const form = node('form', { className: 'strata-form' }, field('标题', title), node('div', { className: 'strata-form-grid' }, field('记忆类型', kind), field('标签（可选）', tags)), field('内容', text), note('新记录会保留来源与版本。未经验证的内容不会被标记为已验证。'));
    const cancel = button('取消');
    const save = button('保存记忆', { style: 'primary', symbol: 'check' });
    const dialog = openDialog('记下一条', '让重要的经历有一个可以回来的地方。', form, [cancel, save]);
    cancel.addEventListener('click', () => dialog.close());
    const submit = () => {
      title.setCustomValidity(title.value.trim() ? '' : '请输入标题。');
      text.setCustomValidity(text.value.trim() ? '' : '请输入记忆内容。');
      if (!form.reportValidity()) return;
      run(save, '正在保存', async () => {
        await request('records.remember', { record: { title: title.value.trim(), kind: kind.value, text: text.value.trim(), tags: tags.value.split(/[,，]/).map(s => s.trim()).filter(Boolean) } });
        dialog.close(); toast('记忆已保存。'); await refresh();
      });
    };
    form.addEventListener('submit', event => { event.preventDefault(); submit(); });
    save.addEventListener('click', submit);
  }

  function renderScope() {
    main.append(header('SESSION ACCESS', '让记忆出现在合适的地方。', '选择这份记忆空间在哪些 DSH 会话中可用。'));
    const current = scope();
    const mode = current.mode === 'folder' ? 'folder' : 'dsh';
    const radioAll = input({ type: 'radio', name: 'strata-scope-mode', value: 'dsh', checked: mode === 'dsh' });
    const radioFolder = input({ type: 'radio', name: 'strata-scope-mode', value: 'folder', checked: mode === 'folder' });
    const choiceAll = node('label', { className: `strata-choice ${mode === 'dsh' ? 'is-selected' : ''}` }, radioAll, node('span', { className: 'strata-choice-symbol' }, icon('globe')), node('strong', { text: '整个 DSH' }), node('p', { text: '在接入同一记忆库的各个会话中使用，适合通用偏好与经验。' }), node('span', { className: 'strata-choice-check' }, icon('check')));
    const choiceFolder = node('label', { className: `strata-choice ${mode === 'folder' ? 'is-selected' : ''}` }, radioFolder, node('span', { className: 'strata-choice-symbol' }, icon('folder')), node('strong', { text: '指定文件夹' }), node('p', { text: '只在所选工作目录的会话中使用，让项目记忆各归其位。' }), node('span', { className: 'strata-choice-check' }, icon('check')));
    const path = input({ type: 'text', name: 'path', value: current.path || options.cwd || '', placeholder: '例如 D:\\codec\\my-project', spellcheck: 'false', autocomplete: 'off' });
    const include = input({ type: 'checkbox', checked: current.includeSubfolders !== false });
    const pathActions = [];
    if (typeof options.pickDirectory === 'function') pathActions.push(button('选择文件夹', { symbol: 'folder', onclick: async event => run(event.currentTarget, '正在选择', async () => { const selected = await options.pickDirectory(); if (selected) path.value = selected; }) }));
    if (options.cwd) pathActions.push(button('使用当前目录', { style: 'ghost', onclick: () => { path.value = options.cwd; } }));
    const folderFields = node('div', { className: 'strata-folder-fields', hidden: mode !== 'folder' }, field('允许的文件夹', node('div', { className: 'strata-input-actions' }, path, pathActions)), node('label', { className: 'strata-check-row' }, include, node('span', { text: '包含这个文件夹的子目录' })));
    const updateChoice = () => { const folder = radioFolder.checked; folderFields.hidden = !folder; choiceAll.classList.toggle('is-selected', !folder); choiceFolder.classList.toggle('is-selected', folder); path.required = folder; };
    radioAll.addEventListener('change', updateChoice); radioFolder.addEventListener('change', updateChoice); updateChoice();
    const save = button('保存使用范围', { style: 'primary', symbol: 'check' });
    const form = node('form', { className: 'strata-form' }, node('fieldset', { className: 'strata-scope-options' }, node('legend', { className: 'strata-sr-only', text: '选择会话使用范围' }), choiceAll, choiceFolder), folderFields,
      node('div', { className: 'strata-setting-summary' }, icon('info'), node('p', { text: '范围变更会影响后续会话访问；已有记忆的独立范围限制仍会保留。离开允许目录后，会话无法读取本库，管理界面仍可管理记录。' })), node('div', { className: 'strata-form-actions' }, save));
    form.addEventListener('submit', event => event.preventDefault());
    save.addEventListener('click', () => {
      if (!form.reportValidity()) return;
      run(save, '正在保存', async () => {
        const nextScope = radioFolder.checked ? { mode: 'folder', path: path.value.trim(), includeSubfolders: include.checked } : { mode: 'dsh' };
        await request('settings.update', { patch: { scope: nextScope } });
        state.preview = null; state.importScope = null; state.importGeneration += 1;
        toast('使用范围已更新。'); await refresh();
      });
    });
    main.append(panel('会话使用范围', '你可以随时调整，变更会保存为新的策略版本。', form));
    if (options.cwd) main.append(node('div', { className: 'strata-current-context' }, icon('folder'), node('div', {}, node('span', { text: '当前会话目录' }), node('code', { text: options.cwd }))));
    main.append(pageFoot('同一库的多个会话共享范围设置。已有记忆不会因为调整范围而被删除。'));
  }

  function renderTransfer() {
    main.append(header('PORTABLE MEMORY', '把记忆带走，也把来路带上。', '导出一份可携带的记忆包，或将已有档案导入当前空间。'));
    const exportMode = node('select', { className: 'strata-input', 'aria-label': '导出内容' }, node('option', { value: 'complete', text: '完整记忆包 · 包含可用证据' }), node('option', { value: 'reference', text: '轻量记忆包 · 仅保留证据引用' }));
    const exportButton = button('导出记忆包', { style: 'primary', symbol: 'down' });
    exportButton.addEventListener('click', () => run(exportButton, '正在生成', async () => {
      const response = await request('transfer.export', { mode: exportMode.value });
      const bundle = response?.bundle || response;
      const filename = response?.filename || `strata-memory-${new Date().toISOString().slice(0, 10)}.json`;
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = node('a', { href: url, download: filename });
      root.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
      toast('记忆包已生成，下载已开始。');
    }));
    const contents = node('div', { className: 'strata-export-contents' },
      principle('file', '记忆与版本', '保留内容、类型、标签与修改历史。'),
      principle('shield', '证据与来源', '完整包携带可用原文，轻量包保留引用。'),
      principle('folder', '使用范围与身份', '导入时绑定本地文件夹，重复内容可识别。'));
    const exportCard = node('section', { className: 'strata-transfer-card' }, node('div', { className: 'strata-transfer-symbol' }, icon('down')), node('div', { className: 'strata-eyebrow', text: 'EXPORT' }), node('h2', { text: '导出你的记忆' }), node('p', { text: '将记录与来源一起打包，便于备份或迁移到另一个环境。' }), field('选择导出内容', exportMode), contents, exportButton, node('div', { className: 'strata-transfer-note' }, icon('shield'), node('span', { text: '仅导出当前有权访问的内容' })));
    const fileInput = input({ type: 'file', accept: '.json,.md,.markdown,.txt,application/json,text/markdown,text/plain', className: 'strata-file-input', 'aria-label': '选择记忆文件' });
    const fileLabel = node('strong', { text: state.importFile?.name || '选择文件，或拖放到这里' });
    const fileDescription = node('span', { text: state.importFile ? `${number(Math.ceil(state.importFile.size / 1024))} KB · 文件已读取，等待校验` : 'Strata JSON ≤ 12 MiB · Markdown / TXT ≤ 512 KiB' });
    const dropzone = node('label', { className: `strata-dropzone ${state.importFile ? 'has-file' : ''}` }, fileInput, icon(state.importFile ? 'file' : 'up'), fileLabel, fileDescription);
    let previewActive = false;
    const bundleScope = bundle => bundle && typeof bundle === 'object' ? bundle.sourceScope || bundle.scope || bundle.manifest?.scope || bundle.settings?.scope : null;
    const targetMode = node('select', { className: 'strata-input', 'aria-label': '导入后使用范围' }, node('option', { value: 'dsh', text: '整个 DSH' }), node('option', { value: 'folder', text: '绑定到指定文件夹' }));
    const targetPath = input({ type: 'text', placeholder: '例如 D:\\codec\\my-project', 'aria-label': '导入记忆绑定的文件夹', spellcheck: 'false', autocomplete: 'off' });
    const targetInclude = input({ type: 'checkbox' });
    const useCwd = options.cwd && button('使用当前目录', { style: 'ghost', onclick: () => { targetPath.value = options.cwd; updateTargetScope(); } });
    const targetFolderFields = node('div', { className: 'strata-import-folder' }, node('div', { className: 'strata-input-actions' }, targetPath, useCwd), node('label', { className: 'strata-check-row' }, targetInclude, node('span', { text: '包含子目录' })));
    const scopeHint = node('div', { className: 'strata-import-scope-hint' });
    function invalidatePreview() { state.importGeneration += 1; state.preview = null; renderPreview(); }
    function syncTargetScope() {
      const target = state.importScope || scope();
      targetMode.value = target.mode === 'folder' ? 'folder' : 'dsh';
      targetPath.value = target.path || options.cwd || '';
      targetInclude.checked = target.includeSubfolders !== false;
      targetFolderFields.hidden = targetMode.value !== 'folder';
      const source = bundleScope(state.importBundle);
      scopeHint.replaceChildren(...(source?.mode === 'folder' ? [note('来源记忆仅允许在文件夹内使用。请明确绑定到此设备的文件夹，再重新校验；不会自动改成全 DSH 共享。', 'warning')] : []));
    }
    function updateTargetScope() {
      state.importScope = targetMode.value === 'folder' ? { mode: 'folder', path: targetPath.value.trim(), includeSubfolders: targetInclude.checked } : { mode: 'dsh' };
      targetFolderFields.hidden = targetMode.value !== 'folder';
      invalidatePreview();
    }
    targetMode.addEventListener('change', updateTargetScope);
    targetPath.addEventListener('input', updateTargetScope);
    targetInclude.addEventListener('change', updateTargetScope);
    syncTargetScope();
    const chooseFile = async file => {
      if (!file) return;
      invalidatePreview();
      const generation = ++fileGeneration;
      state.importFile = null; state.importBundle = null; previewButton.disabled = true;
      fileLabel.textContent = '正在读取文件…'; fileDescription.textContent = file.name; dropzone.classList.remove('has-file');
      const isJson = /\.json$/i.test(file.name) || file.type === 'application/json';
      const limit = isJson ? 12 * 1024 * 1024 : 512 * 1024;
      if (file.size > limit) { fileLabel.textContent = '文件超过大小限制'; fileDescription.textContent = isJson ? 'JSON 记忆包最多 12 MiB。' : 'Markdown / TXT 文件最多 512 KiB。'; toast('文件超过大小限制，请先拆分后导入。', 'error'); return; }
      try {
        const raw = await file.text();
        if (state.destroyed || generation !== fileGeneration) return;
        state.importBundle = isJson ? JSON.parse(raw) : raw;
        state.importFile = { name: file.name, size: file.size };
        const source = bundleScope(state.importBundle);
        state.importScope = source?.mode === 'folder' && scope().mode === 'dsh' ? { mode: 'folder', path: options.cwd || '', includeSubfolders: source.includeSubfolders !== false } : { ...scope() };
        syncTargetScope();
        fileLabel.textContent = file.name; fileDescription.textContent = `${number(Math.ceil(file.size / 1024))} KB · 文件已读取，等待校验`;
        dropzone.classList.add('has-file'); previewButton.disabled = previewActive;
      } catch (error) { if (state.destroyed || generation !== fileGeneration) return; state.importFile = null; state.importBundle = null; previewButton.disabled = true; fileLabel.textContent = '文件读取失败，请重新选择'; fileDescription.textContent = errorMessage(error); toast('文件格式无法读取，请检查 JSON 内容或选择文本文件。', 'error'); }
    };
    fileInput.addEventListener('change', () => void chooseFile(fileInput.files?.[0]));
    dropzone.addEventListener('dragover', event => { event.preventDefault(); dropzone.classList.add('is-dragging'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('is-dragging'));
    dropzone.addEventListener('drop', event => { event.preventDefault(); dropzone.classList.remove('is-dragging'); void chooseFile(event.dataTransfer?.files?.[0]); });
    const importMode = node('select', { className: 'strata-input', 'aria-label': '导入方式' }, node('option', { value: 'merge', text: '合并到当前空间 · 相同记录不重复' }), node('option', { value: 'fork', text: '作为新副本导入 · 保留独立身份' }));
    importMode.value = state.importMode;
    importMode.addEventListener('change', () => { state.importMode = importMode.value; invalidatePreview(); });
    const previewButton = button('校验并预览', { style: 'secondary', symbol: 'arrow', disabled: !state.importFile });
    previewButton.addEventListener('click', () => {
      if (previewButton.disabled) return;
      previewActive = true;
      void busy(previewButton, '正在校验', async () => {
      state.preview = null; renderPreview();
      if (!state.importFile) throw new Error('请先选择可读取的记忆文件。');
      const targetScope = state.importScope || { ...scope() };
      if (targetScope.mode === 'folder' && !targetScope.path?.trim()) { targetPath.focus(); throw new Error('请填写导入记忆绑定的文件夹。'); }
      const generation = state.importGeneration;
      const preview = await request('transfer.preview', { bundle: state.importBundle, mode: state.importMode, filename: state.importFile.name, targetScope });
      if (state.destroyed || generation !== state.importGeneration) return;
      if (!preview?.previewId && preview?.canImport !== false) throw new Error('服务未返回有效的导入预览，请重新校验。');
      preview.targetScope ||= targetScope;
      state.preview = preview; renderPreview();
      main.querySelector('[data-transfer-preview]')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }).catch(() => {}).finally(() => { previewActive = false; previewButton.disabled = !state.importFile; });
    });
    const importCard = node('section', { className: 'strata-transfer-card strata-transfer-card--import' }, node('div', { className: 'strata-transfer-symbol' }, icon('up')), node('div', { className: 'strata-eyebrow', text: 'IMPORT' }), node('h2', { text: '接回已有的记忆' }), node('p', { text: '先检查内容与变更，再由你确认写入。选择文件不会直接导入。' }), dropzone, field('导入方式', importMode), field('导入后使用范围', targetMode), targetFolderFields, scopeHint, previewButton);
    main.append(node('div', { className: 'strata-transfer-grid' }, exportCard, importCard));
    const previewArea = node('div', { 'data-transfer-preview': '', className: 'strata-preview-area', 'aria-live': 'polite' });
    main.append(previewArea); renderPreview();
    main.append(pageFoot('导入保留来源信息。冲突不会被静默覆盖；文件夹范围会在预览中提示绑定情况。'));

    function renderPreview() {
      const area = main.querySelector('[data-transfer-preview]');
      if (!area) return;
      area.replaceChildren();
      const preview = state.preview;
      if (!preview) return;
      const counts = preview.counts || preview.summary || {};
      const warnings = listOf(preview.warnings, 'warnings');
      const conflicts = listOf(preview.conflicts, 'conflicts');
      const total = counts.records ?? counts.total ?? preview.recordCount ?? 0;
      const confirm = button('确认导入', { style: 'primary', symbol: 'check', disabled: preview.canImport === false || !preview.previewId || preview.requiresScopeBinding === true });
      const cancel = button('取消预览', { style: 'ghost', onclick: () => { state.preview = null; renderPreview(); } });
      const content = node('div', {}, node('div', { className: 'strata-preview-stats' }, miniStat('待检查记录', total), miniStat('新增', counts.added ?? counts.new ?? '—'), miniStat('更新', counts.updated ?? '—'), miniStat('跳过重复', counts.skipped ?? '—'), miniStat('冲突', counts.conflicts ?? conflicts.length)),
        warnings.length > 0 && node('div', { className: 'strata-preview-messages' }, warnings.map(w => note(textOf(w), 'warning'))),
        conflicts.length > 0 && node('div', { className: 'strata-conflicts' }, node('h3', { text: '需要留意的冲突' }), node('ul', {}, conflicts.slice(0, 10).map(c => node('li', { text: textOf(c) }))), conflicts.length > 10 && node('p', { text: `另有 ${conflicts.length - 10} 项冲突。` })),
        node('div', { className: 'strata-preview-scopes' }, node('div', {}, node('span', { text: '来源使用范围' }), node('strong', { text: scopeLabel(preview.sourceScope || preview.scope || bundleScope(state.importBundle) || scope()) })), icon('arrow'), node('div', {}, node('span', { text: '导入后使用范围' }), node('strong', { text: scopeLabel(preview.targetScope || state.importScope || scope()) }))),
        preview.requiresScopeBinding && note('此文件需要重新绑定文件夹。请修改上方“导入后使用范围”，然后重新校验。', 'warning'),
        node('div', { className: 'strata-preview-footer' }, node('span', { text: `导入方式：${state.importMode === 'fork' ? '独立副本' : '合并'} · ${state.importFile?.name || '迁移文件'}` }), node('div', { className: 'strata-button-group' }, cancel, confirm)));
      confirm.addEventListener('click', () => run(confirm, '正在导入', async () => {
        const result = await request('transfer.import', { previewId: preview.previewId });
        state.preview = null; state.importBundle = null; state.importFile = null; state.importScope = null; state.importGeneration += 1;
        const counts = result?.counts;
        toast(counts ? `导入完成：新增 ${number(counts.added || 0)} 条，更新 ${number(counts.updated || 0)} 条，跳过 ${number(counts.skipped || 0)} 条。` : '记忆已导入。');
        await refresh();
      }));
      area.append(panel('导入预览', '检查下列变更后，再确认写入当前记忆库。', content, badge('尚未写入', 'warm')));
    }
  }

  function miniStat(label, value) { return node('div', { className: 'strata-mini-stat' }, node('strong', { text: value === '—' ? '—' : number(value) }), node('span', { text: label })); }

  function renderInsights() {
    const settings = state.settings.proactive || {};
    const available = state.status.capabilities?.proactive === true;
    const enabled = input({ type: 'checkbox', checked: available && Boolean(settings.enabled), disabled: !available, role: 'switch', 'aria-label': '启用主动记忆' });
    const delivery = node('select', { className: 'strata-input', disabled: !available }, node('option', { value: 'inbox', text: '只放灵感盒 · 主动查看时再出现' }), node('option', { value: 'occasional', text: '偶尔提醒 · 在合适时机轻量出现' }));
    delivery.value = settings.delivery || 'inbox';
    const maxDay = input({ type: 'number', min: '0', max: '20', step: '1', value: settings.maxPerDay ?? 3, required: true, disabled: !available });
    const cooldown = input({ type: 'number', min: '1', max: '1440', step: '1', value: settings.cooldownMinutes ?? 30, required: true, disabled: !available });
    const save = button(available ? '保存灵感设置' : '自动关联尚未接入', { style: 'primary', symbol: available ? 'check' : 'clock', disabled: !available });
    main.append(header('A LITTLE SERENDIPITY', '让旧经验，偶尔照亮新问题。', '为有依据的联想留一点空间，也为专注留足边界。'));
    main.append(panel('手动灵感盒', '先把一闪而过的念头留下。它会作为“想法”保存，等待你的后续验证。', node('div', { className: 'strata-button-group' }, button('记下一个想法', { style: 'primary', symbol: 'plus', onclick: () => showNewRecord('idea') }), button('查看已保存的想法', { symbol: 'arrow', onclick: () => { state.query = ''; state.kind = 'idea'; navigate('memory'); } })), badge('已可使用', 'success')));
    if (!available) main.append(note('手动记录与查看想法已可用。会话采集、自动关联和偶尔提醒稍后接入，下面的自动设置暂不可启用。'));
    const controls = node('div', { className: 'strata-form' }, field('出现方式', delivery), node('div', { className: 'strata-form-grid' }, field('每天最多提醒', maxDay, '同一记忆库的所有会话共享额度。'), field('最短间隔（分钟）', cooldown, '没有合适线索时，保持安静。')), note('“值得试”会保存为想法。只有实际验证后的结果，才会成为有依据的经验。'), node('div', { className: 'strata-form-actions' }, save));
    const form = node('form', {}, node('div', { className: 'strata-toggle-row' }, node('div', {}, node('strong', { text: '主动记忆' }), node('p', { text: '从允许范围内的旧记录中寻找与当前任务有关的线索。' })), node('label', { className: 'strata-toggle' }, enabled, node('span', { 'aria-hidden': 'true' }))), controls);
    form.addEventListener('submit', event => event.preventDefault());
    save.addEventListener('click', () => {
      if (!form.reportValidity()) return;
      run(save, '正在保存', async () => { await request('settings.update', { patch: { proactive: { ...settings, enabled: enabled.checked, delivery: delivery.value, maxPerDay: Number(maxDay.value), cooldownMinutes: Number(cooldown.value) } } }); toast('灵感偏好已保存。'); await refresh(); });
    });
    main.append(panel('主动记忆偏好', available ? '提示有来源、有频率限制，也可以随时关闭。' : '预留自动能力设置，接入后开放。', form, !available && badge('尚未接入', 'muted')));
    main.append(node('div', { className: 'strata-principles' }, principle('shield', '遵循使用范围', '仅在允许范围内读取记忆与保存想法。'), principle('clock', '轻量，不催促', available ? '多会话共享额度，同一个想法不会反复出现。' : '自动提醒暂未开放，当前不会主动打断会话。'), principle('spark', '灵感先是想法', '收藏不等于事实，推断需要新的证据。')));
    main.append(pageFoot('主动记忆设置不会自动联网、创建定时任务或修改你的项目。'));
  }

  function principle(symbol, title, description) { return node('div', { className: 'strata-principle' }, icon(symbol), node('strong', { text: title }), node('p', { text: description })); }

  render();
  await refresh();
  function destroy() {
      state.destroyed = true;
      state.listGeneration += 1;
      state.importGeneration += 1;
      clearTimeout(toastTimer); clearTimeout(searchTimer);
      for (const dialog of dialogs) { dialog.close(); dialog.remove(); }
      dialogs.clear(); host.remove();
  }
  return { refresh, destroy, dispose: destroy };
}
