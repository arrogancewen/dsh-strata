window.__ModuleLoader__.load({id:'dsh-strata',factory:function(require){
var module={exports:{}};var exports=module.exports;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// client/host-entry.mjs
var host_entry_exports = {};
__export(host_entry_exports, {
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(host_entry_exports);
var import_react = require("react");

// client/settings.mjs
var ICONS = {
  layers: ["M12 3 2 8l10 5 10-5-10-5Z", "m2 12 10 5 10-5", "m2 16 10 5 10-5"],
  grid: ["M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"],
  folder: ["M3 7V5a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"],
  transfer: ["M4 7h15l-4-4M20 17H5l4 4", "M19 7l-4 4M5 17l4-4"],
  spark: ["m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z"],
  search: ["M21 21l-5-5", "M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"],
  plus: ["M12 5v14M5 12h14"],
  arrow: ["M5 12h14m-5-5 5 5-5 5"],
  down: ["M12 3v12m-5-5 5 5 5-5", "M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"],
  up: ["M12 16V4m-5 5 5-5 5 5", "M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"],
  check: ["m5 12 4 4L19 6"],
  close: ["m6 6 12 12M18 6 6 18"],
  refresh: ["M20 7v5h-5", "M4 17v-5h5", "M6.1 7a7 7 0 0 1 11.6-1L20 9", "M4 15l2.3 3a7 7 0 0 0 11.6-1"],
  shield: ["M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7l-9-4Z", "m8 12 3 3 5-6"],
  clock: ["M12 8v5l3 2", "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z"],
  file: ["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z", "M14 2v6h6M8 13h8M8 17h6"],
  chevron: ["m9 5 7 7-7 7"],
  info: ["M12 11v6M12 7h.01", "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z"],
  globe: ["M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z", "M2 12h20M12 2a19 19 0 0 1 0 20 19 19 0 0 1 0-20Z"],
  book: ["M4 3h13a3 3 0 0 1 3 3v15H6a3 3 0 0 1-3-3V4a1 1 0 0 1 1-1Z", "M3 17a3 3 0 0 1 3-3h14M8 7h7"]
};
var KIND_LABELS = {
  observation: "\u89C2\u5BDF\u8BB0\u5F55",
  claim: "\u4E8B\u5B9E\u4E3B\u5F20",
  decision: "\u51B3\u5B9A",
  task: "\u5F85\u529E",
  idea: "\u60F3\u6CD5",
  outcome: "\u9A8C\u8BC1\u7ED3\u679C",
  rule_draft: "\u7ECF\u9A8C\u8349\u7A3F"
};
function node(tag, attrs = {}, ...children) {
  const element = document.createElement(tag);
  for (const [name2, value] of Object.entries(attrs)) {
    if (value === void 0 || value === null || value === false) continue;
    if (name2 === "className") element.className = value;
    else if (name2 === "text") element.textContent = String(value);
    else if (name2.startsWith("on") && typeof value === "function") element.addEventListener(name2.slice(2).toLowerCase(), value);
    else if (name2 === "checked" || name2 === "disabled" || name2 === "required" || name2 === "hidden") element[name2] = Boolean(value);
    else element.setAttribute(name2, value === true ? "" : String(value));
  }
  for (const child of children.flat(Infinity)) {
    if (child !== null && child !== void 0 && child !== false) element.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return element;
}
function icon(name2, className = "") {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  for (const [key, value] of Object.entries({ viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "1.65", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true", class: `strata-icon ${className}` })) svg.setAttribute(key, value);
  for (const d of ICONS[name2] || ICONS.file) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    svg.append(path);
  }
  return svg;
}
function button(label, { style = "secondary", symbol, ...attrs } = {}) {
  return node("button", { type: "button", className: `strata-button strata-button--${style}`, ...attrs }, symbol && icon(symbol), node("span", { text: label }));
}
function field(label, input2, hint) {
  return node("label", { className: "strata-field" }, node("span", { className: "strata-label", text: label }), input2, hint && node("span", { className: "strata-hint", text: hint }));
}
function input(attrs = {}) {
  return node("input", { className: "strata-input", ...attrs });
}
function badge(text, tone = "muted") {
  return node("span", { className: `strata-badge strata-badge--${tone}`, text });
}
function note(text, tone = "info") {
  return node("div", { className: `strata-note strata-note--${tone}` }, icon(tone === "success" ? "check" : "info"), node("span", { text }));
}
function number(value) {
  return Number.isFinite(Number(value)) ? new Intl.NumberFormat("zh-CN").format(Number(value)) : "\u2014";
}
function date(value) {
  const d = new Date(value);
  if (d.getTime() === 0) return "\u6765\u6E90\u65F6\u95F4\u672A\u77E5";
  return Number.isFinite(d.getTime()) ? new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(d) : "\u65F6\u95F4\u672A\u8BB0\u5F55";
}
function listOf(value, key = "records") {
  return Array.isArray(value) ? value : Array.isArray(value?.[key]) ? value[key] : Array.isArray(value?.items) ? value.items : [];
}
function errorMessage(error) {
  return error?.message || String(error || "\u64CD\u4F5C\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5\u3002");
}
function textOf(value) {
  return typeof value === "string" ? value : value?.message || value?.reason || JSON.stringify(value);
}
async function mountStrataSettings(container, options = {}) {
  if (!container?.append) throw new TypeError("container must be a DOM element");
  if (typeof options.request !== "function") throw new TypeError("request(method, params) is required");
  const state = { page: "memory", settings: {}, status: {}, records: [], recordTotal: 0, recordViewId: null, loading: true, query: "", kind: "", error: null, preview: null, importFile: null, importBundle: null, importMode: "merge", importScope: null, importGeneration: 0, destroyed: false, listGeneration: 0 };
  let fileGeneration = 0;
  const host = node("div", { className: "strata-settings-host" });
  const root = node("section", { className: "strata-app", "data-strata-theme": options.theme || "auto", "aria-label": "Strata \u8BB0\u5FC6\u8BBE\u7F6E" });
  const notifications = node("div", { className: "strata-notifications", "aria-live": "polite", "aria-atomic": "true" });
  const main = node("main", { className: "strata-main", tabindex: "-1" });
  const connection = node("div", { className: "strata-connection" }, node("span", { className: "strata-status-dot" }), node("span", { text: "\u6B63\u5728\u8FDE\u63A5\u8BB0\u5FC6\u5E93" }));
  const navButtons = /* @__PURE__ */ new Map();
  const navItems = [["memory", "\u8BB0\u5FC6\u603B\u89C8", "layers"], ["scope", "\u4F7F\u7528\u8303\u56F4", "folder"], ["transfer", "\u8FC1\u79FB\u4E0E\u5BFC\u5165", "transfer"], ["insights", "\u8BB0\u5FC6\u5199\u5165", "spark"]];
  const sidebar = node(
    "aside",
    { className: "strata-sidebar" },
    node("div", { className: "strata-brand" }, node("div", { className: "strata-brand-mark" }, icon("layers")), node("div", {}, node("strong", { text: "STRATA" }), node("span", { text: "\u8BB0\u5FC6\u5730\u5C42" }))),
    node("div", { className: "strata-nav-label", text: "\u4F60\u7684\u8BB0\u5FC6\u7A7A\u95F4" }),
    node("nav", { className: "strata-navigation", "aria-label": "\u8BB0\u5FC6\u8BBE\u7F6E\u5BFC\u822A" }, navItems.map(([id, label, symbol]) => {
      const item = node("button", { type: "button", className: "strata-nav-item", onclick: () => navigate(id) }, icon(symbol), node("span", { text: label }), icon("chevron", "strata-nav-arrow"));
      navButtons.set(id, item);
      return item;
    })),
    node(
      "div",
      { className: "strata-sidebar-foot" },
      node("div", { className: "strata-side-illustration", "aria-hidden": "true" }, node("i"), node("i"), node("i")),
      node("strong", { text: "\u8BB0\u4F4F\u6765\u8DEF\uFF0C\u8FDE\u63A5\u65B0\u77E5\u3002" }),
      node("p", { text: "\u6D45\u5C42\u4FDD\u7559\u7EBF\u7D22\uFF0C\u6DF1\u5C42\u7559\u4E0B\u4F9D\u636E\u3002" }),
      connection
    )
  );
  root.append(sidebar, main, notifications);
  host.append(root);
  container.append(host);
  let toastTimer;
  let searchTimer;
  const dialogs = /* @__PURE__ */ new Set();
  const paramsWithContext = (params = {}) => ({ ...params, ...options.cwd ? { cwd: options.cwd } : {}, ...options.sessionId ? { sessionId: options.sessionId } : {} });
  async function request(method, params = {}) {
    if (state.destroyed) throw new Error("\u8BBE\u7F6E\u9875\u5DF2\u5173\u95ED\u3002");
    return options.request(method, paramsWithContext(params));
  }
  function toast(message, tone = "success") {
    if (state.destroyed) return;
    clearTimeout(toastTimer);
    notifications.replaceChildren(node("div", { className: `strata-toast strata-toast--${tone}` }, icon(tone === "success" ? "check" : "info"), node("span", { text: message })));
    toastTimer = setTimeout(() => notifications.replaceChildren(), tone === "error" ? 9e3 : 4500);
  }
  async function busy(btn, label, action) {
    if (btn.disabled) return;
    const previous = [...btn.childNodes];
    btn.disabled = true;
    btn.setAttribute("aria-busy", "true");
    btn.replaceChildren(node("span", { className: "strata-spinner", "aria-hidden": "true" }), node("span", { text: label }));
    try {
      return await action();
    } catch (error) {
      toast(errorMessage(error), "error");
      throw error;
    } finally {
      btn.disabled = false;
      btn.removeAttribute("aria-busy");
      btn.replaceChildren(...previous);
    }
  }
  function run(btn, label, action) {
    void busy(btn, label, action).catch(() => {
    });
  }
  function scope() {
    return state.settings.scope || state.status.scope || { mode: "dsh" };
  }
  function scopeLabel(value = scope()) {
    return value.mode === "folder" ? `${value.path || "\u9700\u8981\u91CD\u65B0\u7ED1\u5B9A\u6587\u4EF6\u5939"}${value.includeSubfolders === false ? "\uFF08\u4EC5\u6B64\u76EE\u5F55\uFF09" : "\uFF08\u542B\u5B50\u76EE\u5F55\uFF09"}` : "\u6574\u4E2A DSH";
  }
  function header(eyebrow, title, description, action) {
    return node("header", { className: "strata-page-header" }, node("div", {}, node("div", { className: "strata-eyebrow", text: eyebrow }), node("h1", { text: title }), node("p", { text: description })), action);
  }
  function pageFoot(text) {
    return node("div", { className: "strata-page-foot" }, icon("shield"), node("span", { text }));
  }
  function panel(title, description, content, action) {
    return node("section", { className: "strata-panel" }, node("div", { className: "strata-panel-heading" }, node("div", {}, node("h2", { text: title }), description && node("p", { text: description })), action), content);
  }
  function navigate(page) {
    state.page = page;
    render();
    if (page === "memory") void loadRecords();
  }
  async function refresh() {
    const [statusResult, settingsResult] = await Promise.allSettled([request("status"), request("settings.get")]);
    if (state.destroyed) return;
    if (statusResult.status === "fulfilled") state.status = statusResult.value || {};
    if (settingsResult.status === "fulfilled") state.settings = settingsResult.value?.settings || settingsResult.value || {};
    state.error = settingsResult.status === "rejected" ? errorMessage(settingsResult.reason) : statusResult.status === "rejected" ? errorMessage(statusResult.reason) : null;
    state.loading = false;
    connection.classList.toggle("strata-connection--error", Boolean(state.error));
    connection.lastChild.textContent = state.error ? "\u8FDE\u63A5\u6682\u65F6\u4E0D\u53EF\u7528" : "\u672C\u5730\u8BB0\u5FC6\u5E93\u5DF2\u8FDE\u63A5";
    render();
    if (state.page === "memory" && !state.error) await loadRecords();
  }
  async function loadRecords(append = false) {
    clearTimeout(searchTimer);
    if (append && (state.recordQuery !== state.query || state.recordKind !== state.kind)) append = false;
    const generation = ++state.listGeneration;
    const query = state.query;
    const kind = state.kind;
    const list = main.querySelector("[data-record-list]");
    if (list) {
      list.setAttribute("aria-busy", "true");
      const more = list.querySelector(".strata-list-footer button");
      if (more) more.disabled = true;
    }
    try {
      const result = await request("records.list", { query: state.query || void 0, kinds: state.kind ? [state.kind] : void 0, offset: append ? state.records.length : 0, limit: 50, viewId: append ? state.recordViewId : void 0 });
      if (state.destroyed || generation !== state.listGeneration) return;
      state.records = append ? [...state.records, ...listOf(result)] : listOf(result);
      state.recordTotal = result.total ?? state.records.length;
      state.recordViewId = result.viewId || null;
      state.recordQuery = query;
      state.recordKind = kind;
      const target = main.querySelector("[data-record-list]");
      if (target) {
        target.removeAttribute("aria-busy");
        renderRecords(target);
      }
    } catch (error) {
      if (state.destroyed || generation !== state.listGeneration) return;
      const target = main.querySelector("[data-record-list]");
      if (target) {
        target.removeAttribute("aria-busy");
        target.replaceChildren(note(errorMessage(error), "error"));
      }
    }
  }
  function render() {
    if (state.destroyed) return;
    for (const [id, item] of navButtons) {
      item.classList.toggle("is-active", id === state.page);
      if (id === state.page) item.setAttribute("aria-current", "page");
      else item.removeAttribute("aria-current");
    }
    main.replaceChildren();
    if (state.loading) {
      main.append(node("div", { className: "strata-loading", role: "status" }, node("span", { className: "strata-spinner" }), node("p", { text: "\u6B63\u5728\u8BFB\u53D6\u4F60\u7684\u8BB0\u5FC6\u7A7A\u95F4\u2026" })));
      return;
    }
    if (state.error) {
      const retry = button("\u91CD\u65B0\u8FDE\u63A5", { style: "primary", symbol: "refresh" });
      retry.addEventListener("click", () => run(retry, "\u6B63\u5728\u8FDE\u63A5", refresh));
      main.append(header("CONNECTION", "\u6682\u65F6\u65E0\u6CD5\u8FDE\u63A5\u8BB0\u5FC6\u5E93", "\u8BF7\u786E\u8BA4 Strata \u670D\u52A1\u5DF2\u542F\u52A8\uFF0C\u7136\u540E\u91CD\u8BD5\u3002"), note(state.error, "error"), retry);
      return;
    }
    ({ memory: renderMemory, scope: renderScope, transfer: renderTransfer, insights: renderInsights })[state.page]();
  }
  function renderMemory() {
    const add = button("\u8BB0\u4E0B\u4E00\u6761", { style: "primary", symbol: "plus", onclick: () => showNewRecord() });
    main.append(header("MEMORY WORKSPACE", "\u8BA9\u6BCF\u6BB5\u7ECF\u9A8C\uFF0C\u90FD\u6709\u8FF9\u53EF\u5FAA\u3002", "\u628A\u51B3\u5B9A\u3001\u7ECF\u5386\u4E0E\u60F3\u6CD5\u7559\u5728\u8FD9\u91CC\uFF0C\u9700\u8981\u7684\u65F6\u5019\uFF0C\u518D\u627E\u5230\u5B83\u4EEC\u3002", add));
    const stats = state.status.counts || {};
    main.append(node(
      "div",
      { className: "strata-stats" },
      stat("\u5DF2\u4FDD\u5B58\u8BB0\u5FC6", state.status.recordCount ?? stats.records ?? 0, "layers", "\u4E00\u6BB5\u6BB5\u7ECF\u9A8C\uFF0C\u9010\u6E10\u6C89\u6DC0"),
      stat("\u7248\u672C\u8BB0\u5F55", state.status.revisionCount ?? stats.revisions ?? 0, "clock", "\u4FDD\u7559\u53D8\u5316\uFF0C\u4E5F\u4FDD\u7559\u6765\u8DEF"),
      stat("\u8BC1\u636E\u5F15\u7528", state.status.evidenceCount ?? stats.evidence ?? 0, "shield", "\u56DE\u5FC6\u6709\u6765\u6E90\uFF0C\u5224\u65AD\u6709\u4F9D\u636E")
    ));
    const scopeShortcut = button("\u7BA1\u7406\u8303\u56F4", { style: "ghost", symbol: "arrow", onclick: () => navigate("scope") });
    main.append(node("div", { className: "strata-scope-banner" }, node("div", { className: "strata-scope-symbol" }, icon(scope().mode === "folder" ? "folder" : "globe")), node("div", { className: "strata-scope-copy" }, node("strong", { text: "\u5F53\u524D\u4F7F\u7528\u8303\u56F4" }), node("span", { text: scopeLabel() })), scopeShortcut));
    const search = input({ type: "search", placeholder: "\u641C\u7D22\u8BB0\u5FC6\u4E2D\u7684\u6807\u9898\u3001\u5185\u5BB9\u6216\u5173\u952E\u8BCD", value: state.query, "aria-label": "\u641C\u7D22\u8BB0\u5FC6" });
    search.addEventListener("input", () => {
      state.query = search.value;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => void loadRecords(), 220);
    });
    const kind = node("select", { className: "strata-input strata-kind-select", "aria-label": "\u7B5B\u9009\u8BB0\u5FC6\u7C7B\u578B", onchange: () => {
      state.kind = kind.value;
      void loadRecords();
    } }, node("option", { value: "", text: "\u4E8B\u5B9E\u4E0E\u8BB0\u5F55" }), Object.entries(KIND_LABELS).map(([value, label]) => node("option", { value, text: label })));
    kind.value = state.kind;
    const reload = button("\u5237\u65B0", { style: "ghost", symbol: "refresh" });
    reload.addEventListener("click", () => run(reload, "\u6B63\u5728\u5237\u65B0", refresh));
    const list = node("div", { className: "strata-record-list", "data-record-list": "", "aria-live": "polite" });
    renderRecords(list);
    main.append(panel("\u8BB0\u5FC6\u6863\u6848", "\u60F3\u6CD5\u4E0E\u7ECF\u9A8C\u8349\u7A3F\u53EF\u901A\u8FC7\u7C7B\u578B\u7B5B\u9009\u5355\u72EC\u67E5\u770B\u3002", node("div", {}, node("div", { className: "strata-toolbar" }, node("div", { className: "strata-search" }, icon("search"), search), kind), list), reload));
    main.append(pageFoot("\u6570\u636E\u4FDD\u5B58\u5728\u4F60\u7684\u8BB0\u5FC6\u5E93\u4E2D\u3002\u4FEE\u6539\u4F1A\u4FDD\u7559\u7248\u672C\uFF1B\u60F3\u6CD5\u4E0D\u4F1A\u81EA\u52A8\u6210\u4E3A\u5DF2\u9A8C\u8BC1\u4E8B\u5B9E\u3002"));
  }
  function stat(label, value, symbol, description) {
    return node("div", { className: "strata-stat" }, node("div", { className: "strata-stat-top" }, node("span", { text: label }), icon(symbol)), node("strong", { className: "strata-stat-value", text: number(value) }), node("span", { className: "strata-stat-note", text: description }));
  }
  function renderRecords(target) {
    target.replaceChildren();
    if (!state.records.length) {
      target.append(node("div", { className: "strata-empty" }, node("div", { className: "strata-empty-symbol" }, icon(state.query ? "search" : "book")), node("h3", { text: state.query || state.kind ? "\u8FD8\u6CA1\u6709\u627E\u5230\u5339\u914D\u7684\u8BB0\u5FC6" : "\u4F60\u7684\u8BB0\u5FC6\uFF0C\u6B63\u4ECE\u8FD9\u91CC\u5F00\u59CB" }), node("p", { text: state.query || state.kind ? "\u6362\u4E00\u4E2A\u5173\u952E\u8BCD\u6216\u7C7B\u578B\u8BD5\u8BD5\u3002" : "\u8BB0\u4E0B\u4E00\u6B21\u51B3\u5B9A\uFF0C\u6216\u5BFC\u5165\u5DF2\u6709\u7684\u8BB0\u5FC6\u6863\u6848\u3002" }), !state.query && !state.kind && button("\u5BFC\u5165\u5DF2\u6709\u8BB0\u5FC6", { style: "secondary", symbol: "up", onclick: () => navigate("transfer") })));
      return;
    }
    for (const record of state.records) {
      const title = record.title || "\u672A\u547D\u540D\u8BB0\u5FC6";
      const row = node(
        "button",
        { type: "button", className: "strata-record", onclick: () => showRecord(record), "aria-label": `\u67E5\u770B\u8BB0\u5FC6\uFF1A${title}` },
        node("div", { className: `strata-record-symbol ${record.kind === "idea" ? "is-idea" : ""}` }, icon(record.kind === "idea" ? "spark" : record.kind === "task" ? "check" : "file")),
        node(
          "div",
          { className: "strata-record-copy" },
          node("div", { className: "strata-record-title" }, node("strong", { text: title }), badge(KIND_LABELS[record.kind] || record.kind || "\u8BB0\u5FC6", record.kind === "idea" ? "warm" : "muted")),
          node("p", { text: record.text || record.gist || "" }),
          node("div", { className: "strata-record-meta" }, node("span", { text: date(record.updatedAt || record.createdAt) }), Array.isArray(record.tags) && record.tags.slice(0, 3).map((tag) => node("span", { text: `# ${tag}` })))
        ),
        icon("chevron")
      );
      target.append(row);
    }
    if (state.recordTotal > state.records.length) {
      const more = button("\u52A0\u8F7D\u66F4\u591A\u8BB0\u5FC6", { symbol: "down" });
      more.addEventListener("click", () => run(more, "\u6B63\u5728\u8BFB\u53D6", () => loadRecords(true)));
      target.append(node("div", { className: "strata-list-footer" }, node("span", { text: `\u5DF2\u663E\u793A ${number(state.records.length)} / ${number(state.recordTotal)} \u6761` }), more));
    }
  }
  function openDialog(title, description, content, actions = []) {
    const close = button("\u5173\u95ED", { style: "icon", symbol: "close", "aria-label": "\u5173\u95ED\u5BF9\u8BDD\u6846" });
    const id = `strata-dialog-${Math.random().toString(36).slice(2)}`;
    const dialog = node("dialog", { className: "strata-dialog", "aria-labelledby": id }, node("div", { className: "strata-dialog-head" }, node("div", {}, node("h2", { id, text: title }), description && node("p", { text: description })), close), node("div", { className: "strata-dialog-body" }, content), actions.length > 0 && node("div", { className: "strata-dialog-actions" }, actions));
    root.append(dialog);
    dialogs.add(dialog);
    close.addEventListener("click", () => dialog.close());
    dialog.addEventListener("close", () => {
      dialogs.delete(dialog);
      dialog.remove();
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        const rect = dialog.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
      }
    });
    dialog.showModal();
    return dialog;
  }
  function showRecord(record) {
    const provenance = Array.isArray(record.provenance) ? record.provenance : [];
    const viewId = state.recordViewId;
    const evidenceArea = node("div", { className: "strata-evidence-area" });
    if (provenance.length) {
      const source = node("select", { className: "strata-input", "aria-label": "\u9009\u62E9\u539F\u6587\u6765\u6E90" }, provenance.map((ref, index) => node("option", { value: ref.evidenceId, text: `\u6765\u6E90 ${index + 1}${ref.sourceId ? ` \xB7 ${ref.sourceId}` : ""}` })));
      const read = button("\u67E5\u770B\u539F\u6587", { symbol: "book" });
      const more = button("\u7EE7\u7EED\u8BFB\u53D6\u539F\u6587", { symbol: "down", hidden: true });
      const output = node("div", { className: "strata-evidence-output", "aria-live": "polite" });
      let evidenceText = "";
      let nextCursor = null;
      let generation = 0;
      source.addEventListener("change", () => {
        generation += 1;
        evidenceText = "";
        nextCursor = null;
        more.hidden = true;
        output.replaceChildren();
      });
      async function readSource(append) {
        const current = ++generation;
        try {
          const result = await request("records.deep", { entryId: record.id, revision: record.revision, evidenceId: source.value, cursor: append ? nextCursor : 0, maxChars: 8e3, viewId });
          if (state.destroyed || generation !== current || !evidenceArea.isConnected) return;
          evidenceText = (append ? evidenceText : "") + (result.text || "");
          nextCursor = result.nextCursor ?? null;
          output.replaceChildren(node("div", { className: "strata-evidence-meta", text: `\u6765\u6E90\uFF1A${result.sourceId || "\u672A\u8BB0\u5F55"} \xB7 \u5DF2\u8BFB\u53D6 ${number(evidenceText.length)} / ${number(result.totalChars ?? evidenceText.length)} \u5B57\u7B26` }), node("pre", { className: "strata-evidence-text", text: evidenceText || "\u539F\u6587\u4E3A\u7A7A\u3002" }));
          more.hidden = nextCursor === null;
        } catch (error) {
          if (generation === current) {
            output.replaceChildren(note(errorMessage(error), "error"));
            more.hidden = true;
          }
          throw error;
        }
      }
      read.addEventListener("click", () => run(read, "\u6B63\u5728\u8BFB\u53D6", () => readSource(false)));
      more.addEventListener("click", () => run(more, "\u6B63\u5728\u8BFB\u53D6", () => readSource(true)));
      evidenceArea.append(node("h3", { text: "\u539F\u6587\u4E0E\u8BC1\u636E" }), node("div", { className: "strata-evidence-controls" }, source, read), output, more);
    } else evidenceArea.append(note("\u6B64\u8BB0\u5FC6\u672A\u9644\u539F\u6587\u8BC1\u636E\u3002\u4E0A\u65B9\u5185\u5BB9\u662F\u5DF2\u4FDD\u5B58\u7684\u8BB0\u5FC6\u6B63\u6587\uFF0C\u4E0D\u662F\u539F\u59CB\u4F1A\u8BDD\u3002"));
    openDialog(
      record.title || "\u8BB0\u5FC6\u8BE6\u60C5",
      `${KIND_LABELS[record.kind] || record.kind || "\u8BB0\u5FC6"} \xB7 ${date(record.updatedAt || record.createdAt)}`,
      node(
        "div",
        {},
        node("div", { className: "strata-record-detail", text: record.text || record.gist || "\u8FD9\u6761\u8BB0\u5FC6\u6CA1\u6709\u6B63\u6587\u3002" }),
        node("dl", { className: "strata-detail-meta" }, node("dt", { text: "\u8BB0\u5F55 ID" }), node("dd", { text: record.id || "\u2014" }), node("dt", { text: "\u6765\u6E90\u7C7B\u578B" }), node("dd", { text: record.sourceKind || "\u672A\u8BB0\u5F55" }), node("dt", { text: "\u8BA4\u77E5\u72B6\u6001" }), node("dd", { text: record.epistemicStatus || "unverified" }), node("dt", { text: "\u8BC1\u636E\u5F15\u7528" }), node("dd", { text: `${provenance.length} \u9879` })),
        record.kind === "idea" && note("\u8FD9\u662F\u4E00\u6761\u60F3\u6CD5\uFF0C\u4FDD\u5B58\u5B83\u4E0D\u4EE3\u8868\u5B83\u5DF2\u7ECF\u8FC7\u9A8C\u8BC1\u3002"),
        evidenceArea
      )
    );
  }
  function showNewRecord(initialKind = "observation") {
    const title = input({ name: "title", required: true, maxlength: "160", placeholder: "\u7ED9\u8FD9\u6BB5\u8BB0\u5FC6\u8D77\u4E00\u4E2A\u6E05\u695A\u7684\u6807\u9898" });
    const kind = node("select", { name: "kind", className: "strata-input" }, Object.entries(KIND_LABELS).map(([value, label]) => node("option", { value, text: label })));
    kind.value = initialKind;
    const text = node("textarea", { name: "text", className: "strata-input strata-textarea", required: true, rows: "7", maxlength: "100000", placeholder: "\u53D1\u751F\u4E86\u4EC0\u4E48\u3001\u4F60\u505A\u4E86\u4EC0\u4E48\u51B3\u5B9A\uFF0C\u6216\u6709\u4EC0\u4E48\u503C\u5F97\u8BB0\u4F4F\u7684\u60F3\u6CD5\u2026" });
    const tags = input({ name: "tags", placeholder: "\u7528\u9017\u53F7\u5206\u9694\uFF0C\u4F8B\u5982\uFF1A\u67B6\u6784, \u5DE5\u4F5C\u504F\u597D" });
    const form = node("form", { className: "strata-form" }, field("\u6807\u9898", title), node("div", { className: "strata-form-grid" }, field("\u8BB0\u5FC6\u7C7B\u578B", kind), field("\u6807\u7B7E\uFF08\u53EF\u9009\uFF09", tags)), field("\u5185\u5BB9", text), note("\u65B0\u8BB0\u5F55\u4F1A\u4FDD\u7559\u6765\u6E90\u4E0E\u7248\u672C\u3002\u672A\u7ECF\u9A8C\u8BC1\u7684\u5185\u5BB9\u4E0D\u4F1A\u88AB\u6807\u8BB0\u4E3A\u5DF2\u9A8C\u8BC1\u3002"));
    const cancel = button("\u53D6\u6D88");
    const save = button("\u4FDD\u5B58\u8BB0\u5FC6", { style: "primary", symbol: "check" });
    const dialog = openDialog("\u8BB0\u4E0B\u4E00\u6761", "\u8BA9\u91CD\u8981\u7684\u7ECF\u5386\u6709\u4E00\u4E2A\u53EF\u4EE5\u56DE\u6765\u7684\u5730\u65B9\u3002", form, [cancel, save]);
    cancel.addEventListener("click", () => dialog.close());
    const submit = () => {
      title.setCustomValidity(title.value.trim() ? "" : "\u8BF7\u8F93\u5165\u6807\u9898\u3002");
      text.setCustomValidity(text.value.trim() ? "" : "\u8BF7\u8F93\u5165\u8BB0\u5FC6\u5185\u5BB9\u3002");
      if (!form.reportValidity()) return;
      run(save, "\u6B63\u5728\u4FDD\u5B58", async () => {
        await request("records.remember", { record: { title: title.value.trim(), kind: kind.value, text: text.value.trim(), tags: tags.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean) } });
        dialog.close();
        toast("\u8BB0\u5FC6\u5DF2\u4FDD\u5B58\u3002");
        await refresh();
      });
    };
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      submit();
    });
    save.addEventListener("click", submit);
  }
  function renderScope() {
    main.append(header("SESSION ACCESS", "\u8BA9\u8BB0\u5FC6\u51FA\u73B0\u5728\u5408\u9002\u7684\u5730\u65B9\u3002", "\u9009\u62E9\u8FD9\u4EFD\u8BB0\u5FC6\u7A7A\u95F4\u5728\u54EA\u4E9B DSH \u4F1A\u8BDD\u4E2D\u53EF\u7528\u3002"));
    const current = scope();
    const mode = current.mode === "folder" ? "folder" : "dsh";
    const radioAll = input({ type: "radio", name: "strata-scope-mode", value: "dsh", checked: mode === "dsh" });
    const radioFolder = input({ type: "radio", name: "strata-scope-mode", value: "folder", checked: mode === "folder" });
    const choiceAll = node("label", { className: `strata-choice ${mode === "dsh" ? "is-selected" : ""}` }, radioAll, node("span", { className: "strata-choice-symbol" }, icon("globe")), node("strong", { text: "\u6574\u4E2A DSH" }), node("p", { text: "\u5728\u63A5\u5165\u540C\u4E00\u8BB0\u5FC6\u5E93\u7684\u5404\u4E2A\u4F1A\u8BDD\u4E2D\u4F7F\u7528\uFF0C\u9002\u5408\u901A\u7528\u504F\u597D\u4E0E\u7ECF\u9A8C\u3002" }), node("span", { className: "strata-choice-check" }, icon("check")));
    const choiceFolder = node("label", { className: `strata-choice ${mode === "folder" ? "is-selected" : ""}` }, radioFolder, node("span", { className: "strata-choice-symbol" }, icon("folder")), node("strong", { text: "\u6307\u5B9A\u6587\u4EF6\u5939" }), node("p", { text: "\u53EA\u5728\u6240\u9009\u5DE5\u4F5C\u76EE\u5F55\u7684\u4F1A\u8BDD\u4E2D\u4F7F\u7528\uFF0C\u8BA9\u9879\u76EE\u8BB0\u5FC6\u5404\u5F52\u5176\u4F4D\u3002" }), node("span", { className: "strata-choice-check" }, icon("check")));
    const path = input({ type: "text", name: "path", value: current.path || options.cwd || "", placeholder: "\u4F8B\u5982 D:\\codec\\my-project", spellcheck: "false", autocomplete: "off" });
    const include = input({ type: "checkbox", checked: current.includeSubfolders !== false });
    const pathActions = [];
    if (typeof options.pickDirectory === "function") pathActions.push(button("\u9009\u62E9\u6587\u4EF6\u5939", { symbol: "folder", onclick: async (event) => run(event.currentTarget, "\u6B63\u5728\u9009\u62E9", async () => {
      const selected = await options.pickDirectory();
      if (selected) path.value = selected;
    }) }));
    if (options.cwd) pathActions.push(button("\u4F7F\u7528\u5F53\u524D\u76EE\u5F55", { style: "ghost", onclick: () => {
      path.value = options.cwd;
    } }));
    const folderFields = node("div", { className: "strata-folder-fields", hidden: mode !== "folder" }, field("\u5141\u8BB8\u7684\u6587\u4EF6\u5939", node("div", { className: "strata-input-actions" }, path, pathActions)), node("label", { className: "strata-check-row" }, include, node("span", { text: "\u5305\u542B\u8FD9\u4E2A\u6587\u4EF6\u5939\u7684\u5B50\u76EE\u5F55" })));
    const updateChoice = () => {
      const folder = radioFolder.checked;
      folderFields.hidden = !folder;
      choiceAll.classList.toggle("is-selected", !folder);
      choiceFolder.classList.toggle("is-selected", folder);
      path.required = folder;
    };
    radioAll.addEventListener("change", updateChoice);
    radioFolder.addEventListener("change", updateChoice);
    updateChoice();
    const save = button("\u4FDD\u5B58\u4F7F\u7528\u8303\u56F4", { style: "primary", symbol: "check" });
    const form = node(
      "form",
      { className: "strata-form" },
      node("fieldset", { className: "strata-scope-options" }, node("legend", { className: "strata-sr-only", text: "\u9009\u62E9\u4F1A\u8BDD\u4F7F\u7528\u8303\u56F4" }), choiceAll, choiceFolder),
      folderFields,
      node("div", { className: "strata-setting-summary" }, icon("info"), node("p", { text: "\u8303\u56F4\u53D8\u66F4\u4F1A\u5F71\u54CD\u540E\u7EED\u4F1A\u8BDD\u8BBF\u95EE\uFF1B\u5DF2\u6709\u8BB0\u5FC6\u7684\u72EC\u7ACB\u8303\u56F4\u9650\u5236\u4ECD\u4F1A\u4FDD\u7559\u3002\u79BB\u5F00\u5141\u8BB8\u76EE\u5F55\u540E\uFF0C\u4F1A\u8BDD\u65E0\u6CD5\u8BFB\u53D6\u672C\u5E93\uFF0C\u7BA1\u7406\u754C\u9762\u4ECD\u53EF\u7BA1\u7406\u8BB0\u5F55\u3002" })),
      node("div", { className: "strata-form-actions" }, save)
    );
    form.addEventListener("submit", (event) => event.preventDefault());
    save.addEventListener("click", () => {
      if (!form.reportValidity()) return;
      run(save, "\u6B63\u5728\u4FDD\u5B58", async () => {
        const nextScope = radioFolder.checked ? { mode: "folder", path: path.value.trim(), includeSubfolders: include.checked } : { mode: "dsh" };
        await request("settings.update", { patch: { scope: nextScope } });
        state.preview = null;
        state.importScope = null;
        state.importGeneration += 1;
        toast("\u4F7F\u7528\u8303\u56F4\u5DF2\u66F4\u65B0\u3002");
        await refresh();
      });
    });
    main.append(panel("\u4F1A\u8BDD\u4F7F\u7528\u8303\u56F4", "\u4F60\u53EF\u4EE5\u968F\u65F6\u8C03\u6574\uFF0C\u53D8\u66F4\u4F1A\u4FDD\u5B58\u4E3A\u65B0\u7684\u7B56\u7565\u7248\u672C\u3002", form));
    if (options.cwd) main.append(node("div", { className: "strata-current-context" }, icon("folder"), node("div", {}, node("span", { text: "\u5F53\u524D\u4F1A\u8BDD\u76EE\u5F55" }), node("code", { text: options.cwd }))));
    main.append(pageFoot("\u540C\u4E00\u5E93\u7684\u591A\u4E2A\u4F1A\u8BDD\u5171\u4EAB\u8303\u56F4\u8BBE\u7F6E\u3002\u5DF2\u6709\u8BB0\u5FC6\u4E0D\u4F1A\u56E0\u4E3A\u8C03\u6574\u8303\u56F4\u800C\u88AB\u5220\u9664\u3002"));
  }
  function renderTransfer() {
    main.append(header("PORTABLE MEMORY", "\u628A\u8BB0\u5FC6\u5E26\u8D70\uFF0C\u4E5F\u628A\u6765\u8DEF\u5E26\u4E0A\u3002", "\u5BFC\u51FA\u4E00\u4EFD\u53EF\u643A\u5E26\u7684\u8BB0\u5FC6\u5305\uFF0C\u6216\u5C06\u5DF2\u6709\u6863\u6848\u5BFC\u5165\u5F53\u524D\u7A7A\u95F4\u3002"));
    const exportMode = node("select", { className: "strata-input", "aria-label": "\u5BFC\u51FA\u5185\u5BB9" }, node("option", { value: "complete", text: "\u5B8C\u6574\u8BB0\u5FC6\u5305 \xB7 \u5305\u542B\u53EF\u7528\u8BC1\u636E" }), node("option", { value: "reference", text: "\u8F7B\u91CF\u8BB0\u5FC6\u5305 \xB7 \u4EC5\u4FDD\u7559\u8BC1\u636E\u5F15\u7528" }));
    const exportButton = button("\u5BFC\u51FA\u8BB0\u5FC6\u5305", { style: "primary", symbol: "down" });
    exportButton.addEventListener("click", () => run(exportButton, "\u6B63\u5728\u751F\u6210", async () => {
      const response = await request("transfer.export", { mode: exportMode.value });
      const bundle = response?.bundle || response;
      const filename = response?.filename || `strata-memory-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`;
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = node("a", { href: url, download: filename });
      root.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1e4);
      toast("\u8BB0\u5FC6\u5305\u5DF2\u751F\u6210\uFF0C\u4E0B\u8F7D\u5DF2\u5F00\u59CB\u3002");
    }));
    const contents = node(
      "div",
      { className: "strata-export-contents" },
      principle("file", "\u8BB0\u5FC6\u4E0E\u7248\u672C", "\u4FDD\u7559\u5185\u5BB9\u3001\u7C7B\u578B\u3001\u6807\u7B7E\u4E0E\u4FEE\u6539\u5386\u53F2\u3002"),
      principle("shield", "\u8BC1\u636E\u4E0E\u6765\u6E90", "\u5B8C\u6574\u5305\u643A\u5E26\u53EF\u7528\u539F\u6587\uFF0C\u8F7B\u91CF\u5305\u4FDD\u7559\u5F15\u7528\u3002"),
      principle("folder", "\u4F7F\u7528\u8303\u56F4\u4E0E\u8EAB\u4EFD", "\u5BFC\u5165\u65F6\u7ED1\u5B9A\u672C\u5730\u6587\u4EF6\u5939\uFF0C\u91CD\u590D\u5185\u5BB9\u53EF\u8BC6\u522B\u3002")
    );
    const exportCard = node("section", { className: "strata-transfer-card" }, node("div", { className: "strata-transfer-symbol" }, icon("down")), node("div", { className: "strata-eyebrow", text: "EXPORT" }), node("h2", { text: "\u5BFC\u51FA\u4F60\u7684\u8BB0\u5FC6" }), node("p", { text: "\u5C06\u8BB0\u5F55\u4E0E\u6765\u6E90\u4E00\u8D77\u6253\u5305\uFF0C\u4FBF\u4E8E\u5907\u4EFD\u6216\u8FC1\u79FB\u5230\u53E6\u4E00\u4E2A\u73AF\u5883\u3002" }), field("\u9009\u62E9\u5BFC\u51FA\u5185\u5BB9", exportMode), contents, exportButton, node("div", { className: "strata-transfer-note" }, icon("shield"), node("span", { text: "\u4EC5\u5BFC\u51FA\u5F53\u524D\u6709\u6743\u8BBF\u95EE\u7684\u5185\u5BB9" })));
    const fileInput = input({ type: "file", accept: ".json,.md,.markdown,.txt,application/json,text/markdown,text/plain", className: "strata-file-input", "aria-label": "\u9009\u62E9\u8BB0\u5FC6\u6587\u4EF6" });
    const fileLabel = node("strong", { text: state.importFile?.name || "\u9009\u62E9\u6587\u4EF6\uFF0C\u6216\u62D6\u653E\u5230\u8FD9\u91CC" });
    const fileDescription = node("span", { text: state.importFile ? `${number(Math.ceil(state.importFile.size / 1024))} KB \xB7 \u6587\u4EF6\u5DF2\u8BFB\u53D6\uFF0C\u7B49\u5F85\u6821\u9A8C` : "Strata JSON \u2264 12 MiB \xB7 Markdown / TXT \u2264 512 KiB" });
    const dropzone = node("label", { className: `strata-dropzone ${state.importFile ? "has-file" : ""}` }, fileInput, icon(state.importFile ? "file" : "up"), fileLabel, fileDescription);
    let previewActive = false;
    const bundleScope = (bundle) => bundle && typeof bundle === "object" ? bundle.sourceScope || bundle.scope || bundle.manifest?.scope || bundle.settings?.scope : null;
    const targetMode = node("select", { className: "strata-input", "aria-label": "\u5BFC\u5165\u540E\u4F7F\u7528\u8303\u56F4" }, node("option", { value: "dsh", text: "\u6574\u4E2A DSH" }), node("option", { value: "folder", text: "\u7ED1\u5B9A\u5230\u6307\u5B9A\u6587\u4EF6\u5939" }));
    const targetPath = input({ type: "text", placeholder: "\u4F8B\u5982 D:\\codec\\my-project", "aria-label": "\u5BFC\u5165\u8BB0\u5FC6\u7ED1\u5B9A\u7684\u6587\u4EF6\u5939", spellcheck: "false", autocomplete: "off" });
    const targetInclude = input({ type: "checkbox" });
    const useCwd = options.cwd && button("\u4F7F\u7528\u5F53\u524D\u76EE\u5F55", { style: "ghost", onclick: () => {
      targetPath.value = options.cwd;
      updateTargetScope();
    } });
    const targetFolderFields = node("div", { className: "strata-import-folder" }, node("div", { className: "strata-input-actions" }, targetPath, useCwd), node("label", { className: "strata-check-row" }, targetInclude, node("span", { text: "\u5305\u542B\u5B50\u76EE\u5F55" })));
    const scopeHint = node("div", { className: "strata-import-scope-hint" });
    function invalidatePreview() {
      state.importGeneration += 1;
      state.preview = null;
      renderPreview();
    }
    function syncTargetScope() {
      const target = state.importScope || scope();
      targetMode.value = target.mode === "folder" ? "folder" : "dsh";
      targetPath.value = target.path || options.cwd || "";
      targetInclude.checked = target.includeSubfolders !== false;
      targetFolderFields.hidden = targetMode.value !== "folder";
      const source = bundleScope(state.importBundle);
      scopeHint.replaceChildren(...source?.mode === "folder" ? [note("\u6765\u6E90\u8BB0\u5FC6\u4EC5\u5141\u8BB8\u5728\u6587\u4EF6\u5939\u5185\u4F7F\u7528\u3002\u8BF7\u660E\u786E\u7ED1\u5B9A\u5230\u6B64\u8BBE\u5907\u7684\u6587\u4EF6\u5939\uFF0C\u518D\u91CD\u65B0\u6821\u9A8C\uFF1B\u4E0D\u4F1A\u81EA\u52A8\u6539\u6210\u5168 DSH \u5171\u4EAB\u3002", "warning")] : []);
    }
    function updateTargetScope() {
      state.importScope = targetMode.value === "folder" ? { mode: "folder", path: targetPath.value.trim(), includeSubfolders: targetInclude.checked } : { mode: "dsh" };
      targetFolderFields.hidden = targetMode.value !== "folder";
      invalidatePreview();
    }
    targetMode.addEventListener("change", updateTargetScope);
    targetPath.addEventListener("input", updateTargetScope);
    targetInclude.addEventListener("change", updateTargetScope);
    syncTargetScope();
    const chooseFile = async (file) => {
      if (!file) return;
      invalidatePreview();
      const generation = ++fileGeneration;
      state.importFile = null;
      state.importBundle = null;
      previewButton.disabled = true;
      fileLabel.textContent = "\u6B63\u5728\u8BFB\u53D6\u6587\u4EF6\u2026";
      fileDescription.textContent = file.name;
      dropzone.classList.remove("has-file");
      const isJson = /\.json$/i.test(file.name) || file.type === "application/json";
      const limit = isJson ? 12 * 1024 * 1024 : 512 * 1024;
      if (file.size > limit) {
        fileLabel.textContent = "\u6587\u4EF6\u8D85\u8FC7\u5927\u5C0F\u9650\u5236";
        fileDescription.textContent = isJson ? "JSON \u8BB0\u5FC6\u5305\u6700\u591A 12 MiB\u3002" : "Markdown / TXT \u6587\u4EF6\u6700\u591A 512 KiB\u3002";
        toast("\u6587\u4EF6\u8D85\u8FC7\u5927\u5C0F\u9650\u5236\uFF0C\u8BF7\u5148\u62C6\u5206\u540E\u5BFC\u5165\u3002", "error");
        return;
      }
      try {
        const raw = await file.text();
        if (state.destroyed || generation !== fileGeneration) return;
        state.importBundle = isJson ? JSON.parse(raw) : raw;
        state.importFile = { name: file.name, size: file.size };
        const source = bundleScope(state.importBundle);
        state.importScope = source?.mode === "folder" && scope().mode === "dsh" ? { mode: "folder", path: options.cwd || "", includeSubfolders: source.includeSubfolders !== false } : { ...scope() };
        syncTargetScope();
        fileLabel.textContent = file.name;
        fileDescription.textContent = `${number(Math.ceil(file.size / 1024))} KB \xB7 \u6587\u4EF6\u5DF2\u8BFB\u53D6\uFF0C\u7B49\u5F85\u6821\u9A8C`;
        dropzone.classList.add("has-file");
        previewButton.disabled = previewActive;
      } catch (error) {
        if (state.destroyed || generation !== fileGeneration) return;
        state.importFile = null;
        state.importBundle = null;
        previewButton.disabled = true;
        fileLabel.textContent = "\u6587\u4EF6\u8BFB\u53D6\u5931\u8D25\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9";
        fileDescription.textContent = errorMessage(error);
        toast("\u6587\u4EF6\u683C\u5F0F\u65E0\u6CD5\u8BFB\u53D6\uFF0C\u8BF7\u68C0\u67E5 JSON \u5185\u5BB9\u6216\u9009\u62E9\u6587\u672C\u6587\u4EF6\u3002", "error");
      }
    };
    fileInput.addEventListener("change", () => void chooseFile(fileInput.files?.[0]));
    dropzone.addEventListener("dragover", (event) => {
      event.preventDefault();
      dropzone.classList.add("is-dragging");
    });
    dropzone.addEventListener("dragleave", () => dropzone.classList.remove("is-dragging"));
    dropzone.addEventListener("drop", (event) => {
      event.preventDefault();
      dropzone.classList.remove("is-dragging");
      void chooseFile(event.dataTransfer?.files?.[0]);
    });
    const importMode = node("select", { className: "strata-input", "aria-label": "\u5BFC\u5165\u65B9\u5F0F" }, node("option", { value: "merge", text: "\u5408\u5E76\u5230\u5F53\u524D\u7A7A\u95F4 \xB7 \u76F8\u540C\u8BB0\u5F55\u4E0D\u91CD\u590D" }), node("option", { value: "fork", text: "\u4F5C\u4E3A\u65B0\u526F\u672C\u5BFC\u5165 \xB7 \u4FDD\u7559\u72EC\u7ACB\u8EAB\u4EFD" }));
    importMode.value = state.importMode;
    importMode.addEventListener("change", () => {
      state.importMode = importMode.value;
      invalidatePreview();
    });
    const previewButton = button("\u6821\u9A8C\u5E76\u9884\u89C8", { style: "secondary", symbol: "arrow", disabled: !state.importFile });
    previewButton.addEventListener("click", () => {
      if (previewButton.disabled) return;
      previewActive = true;
      void busy(previewButton, "\u6B63\u5728\u6821\u9A8C", async () => {
        state.preview = null;
        renderPreview();
        if (!state.importFile) throw new Error("\u8BF7\u5148\u9009\u62E9\u53EF\u8BFB\u53D6\u7684\u8BB0\u5FC6\u6587\u4EF6\u3002");
        const targetScope = state.importScope || { ...scope() };
        if (targetScope.mode === "folder" && !targetScope.path?.trim()) {
          targetPath.focus();
          throw new Error("\u8BF7\u586B\u5199\u5BFC\u5165\u8BB0\u5FC6\u7ED1\u5B9A\u7684\u6587\u4EF6\u5939\u3002");
        }
        const generation = state.importGeneration;
        const preview = await request("transfer.preview", { bundle: state.importBundle, mode: state.importMode, filename: state.importFile.name, targetScope });
        if (state.destroyed || generation !== state.importGeneration) return;
        if (!preview?.previewId && preview?.canImport !== false) throw new Error("\u670D\u52A1\u672A\u8FD4\u56DE\u6709\u6548\u7684\u5BFC\u5165\u9884\u89C8\uFF0C\u8BF7\u91CD\u65B0\u6821\u9A8C\u3002");
        preview.targetScope ||= targetScope;
        state.preview = preview;
        renderPreview();
        main.querySelector("[data-transfer-preview]")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }).catch(() => {
      }).finally(() => {
        previewActive = false;
        previewButton.disabled = !state.importFile;
      });
    });
    const importCard = node("section", { className: "strata-transfer-card strata-transfer-card--import" }, node("div", { className: "strata-transfer-symbol" }, icon("up")), node("div", { className: "strata-eyebrow", text: "IMPORT" }), node("h2", { text: "\u63A5\u56DE\u5DF2\u6709\u7684\u8BB0\u5FC6" }), node("p", { text: "\u5148\u68C0\u67E5\u5185\u5BB9\u4E0E\u53D8\u66F4\uFF0C\u518D\u7531\u4F60\u786E\u8BA4\u5199\u5165\u3002\u9009\u62E9\u6587\u4EF6\u4E0D\u4F1A\u76F4\u63A5\u5BFC\u5165\u3002" }), dropzone, field("\u5BFC\u5165\u65B9\u5F0F", importMode), field("\u5BFC\u5165\u540E\u4F7F\u7528\u8303\u56F4", targetMode), targetFolderFields, scopeHint, previewButton);
    main.append(node("div", { className: "strata-transfer-grid" }, exportCard, importCard));
    const previewArea = node("div", { "data-transfer-preview": "", className: "strata-preview-area", "aria-live": "polite" });
    main.append(previewArea);
    renderPreview();
    main.append(pageFoot("\u5BFC\u5165\u4FDD\u7559\u6765\u6E90\u4FE1\u606F\u3002\u51B2\u7A81\u4E0D\u4F1A\u88AB\u9759\u9ED8\u8986\u76D6\uFF1B\u6587\u4EF6\u5939\u8303\u56F4\u4F1A\u5728\u9884\u89C8\u4E2D\u63D0\u793A\u7ED1\u5B9A\u60C5\u51B5\u3002"));
    function renderPreview() {
      const area = main.querySelector("[data-transfer-preview]");
      if (!area) return;
      area.replaceChildren();
      const preview = state.preview;
      if (!preview) return;
      const counts = preview.counts || preview.summary || {};
      const warnings = listOf(preview.warnings, "warnings");
      const conflicts = listOf(preview.conflicts, "conflicts");
      const total = counts.records ?? counts.total ?? preview.recordCount ?? 0;
      const confirm = button("\u786E\u8BA4\u5BFC\u5165", { style: "primary", symbol: "check", disabled: preview.canImport === false || !preview.previewId || preview.requiresScopeBinding === true });
      const cancel = button("\u53D6\u6D88\u9884\u89C8", { style: "ghost", onclick: () => {
        state.preview = null;
        renderPreview();
      } });
      const content = node(
        "div",
        {},
        node("div", { className: "strata-preview-stats" }, miniStat("\u5F85\u68C0\u67E5\u8BB0\u5F55", total), miniStat("\u65B0\u589E", counts.added ?? counts.new ?? "\u2014"), miniStat("\u66F4\u65B0", counts.updated ?? "\u2014"), miniStat("\u8DF3\u8FC7\u91CD\u590D", counts.skipped ?? "\u2014"), miniStat("\u51B2\u7A81", counts.conflicts ?? conflicts.length)),
        warnings.length > 0 && node("div", { className: "strata-preview-messages" }, warnings.map((w) => note(textOf(w), "warning"))),
        conflicts.length > 0 && node("div", { className: "strata-conflicts" }, node("h3", { text: "\u9700\u8981\u7559\u610F\u7684\u51B2\u7A81" }), node("ul", {}, conflicts.slice(0, 10).map((c) => node("li", { text: textOf(c) }))), conflicts.length > 10 && node("p", { text: `\u53E6\u6709 ${conflicts.length - 10} \u9879\u51B2\u7A81\u3002` })),
        node("div", { className: "strata-preview-scopes" }, node("div", {}, node("span", { text: "\u6765\u6E90\u4F7F\u7528\u8303\u56F4" }), node("strong", { text: scopeLabel(preview.sourceScope || preview.scope || bundleScope(state.importBundle) || scope()) })), icon("arrow"), node("div", {}, node("span", { text: "\u5BFC\u5165\u540E\u4F7F\u7528\u8303\u56F4" }), node("strong", { text: scopeLabel(preview.targetScope || state.importScope || scope()) }))),
        preview.requiresScopeBinding && note("\u6B64\u6587\u4EF6\u9700\u8981\u91CD\u65B0\u7ED1\u5B9A\u6587\u4EF6\u5939\u3002\u8BF7\u4FEE\u6539\u4E0A\u65B9\u201C\u5BFC\u5165\u540E\u4F7F\u7528\u8303\u56F4\u201D\uFF0C\u7136\u540E\u91CD\u65B0\u6821\u9A8C\u3002", "warning"),
        node("div", { className: "strata-preview-footer" }, node("span", { text: `\u5BFC\u5165\u65B9\u5F0F\uFF1A${state.importMode === "fork" ? "\u72EC\u7ACB\u526F\u672C" : "\u5408\u5E76"} \xB7 ${state.importFile?.name || "\u8FC1\u79FB\u6587\u4EF6"}` }), node("div", { className: "strata-button-group" }, cancel, confirm))
      );
      confirm.addEventListener("click", () => run(confirm, "\u6B63\u5728\u5BFC\u5165", async () => {
        const result = await request("transfer.import", { previewId: preview.previewId });
        state.preview = null;
        state.importBundle = null;
        state.importFile = null;
        state.importScope = null;
        state.importGeneration += 1;
        const counts2 = result?.counts;
        toast(counts2 ? `\u5BFC\u5165\u5B8C\u6210\uFF1A\u65B0\u589E ${number(counts2.added || 0)} \u6761\uFF0C\u66F4\u65B0 ${number(counts2.updated || 0)} \u6761\uFF0C\u8DF3\u8FC7 ${number(counts2.skipped || 0)} \u6761\u3002` : "\u8BB0\u5FC6\u5DF2\u5BFC\u5165\u3002");
        await refresh();
      }));
      area.append(panel("\u5BFC\u5165\u9884\u89C8", "\u68C0\u67E5\u4E0B\u5217\u53D8\u66F4\u540E\uFF0C\u518D\u786E\u8BA4\u5199\u5165\u5F53\u524D\u8BB0\u5FC6\u5E93\u3002", content, badge("\u5C1A\u672A\u5199\u5165", "warm")));
    }
  }
  function miniStat(label, value) {
    return node("div", { className: "strata-mini-stat" }, node("strong", { text: value === "\u2014" ? "\u2014" : number(value) }), node("span", { text: label }));
  }
  function renderInsights() {
    const settings = state.settings.proactive || {};
    const capture = state.settings.capture || { enabled: false, mode: "model", intervalHours: 4, contextThresholdPercent: 20, maxPerSession: 20 };
    const available = state.status.capabilities?.proactive === true;
    const captureAvailable = state.status.capabilities?.autoCapture === true;
    const manualEnabled = state.settings.manualMemoryEnabled !== false;
    main.append(header("MEMORY WRITES", "\u8BA9\u5B83\u8BB0\u5F97\uFF0C\u4E5F\u8BA9\u4F60\u8BF4\u4E86\u7B97\u3002", "\u624B\u52A8\u8BB0\u4F4F\u4E0E\u81EA\u52A8\u8BB0\u4F4F\u5404\u6709\u4E00\u4E2A\u5F00\u5173\uFF1B\u81EA\u52A8\u6A21\u5F0F\u53EF\u9009\u89E6\u53D1\u65B9\u5F0F\u3002"));
    const manualToggle = input({ type: "checkbox", checked: manualEnabled, role: "switch", "aria-label": "\u5141\u8BB8\u624B\u52A8\u8BB0\u4F4F" });
    const manualForm = node("form", {}, node(
      "div",
      { className: "strata-toggle-row" },
      node("div", {}, node("strong", { text: "\u624B\u52A8\u8BB0\u4F4F" }), node("p", { text: "\u4F60\u8BF4\u201C\u8BB0\u4F4F\u201D\u65F6\uFF0C\u6216\u5728\u754C\u9762\u4E0A\u70B9\u201C\u8BB0\u4E00\u6761\u201D\uFF0C\u624D\u4F1A\u5199\u5165\u8BB0\u5FC6\u3002" })),
      node("label", { className: "strata-toggle" }, manualToggle, node("span", { "aria-hidden": "true" }))
    ));
    manualForm.addEventListener("submit", (event) => event.preventDefault());
    manualToggle.addEventListener("change", () => {
      run(manualToggle, "\u6B63\u5728\u4FDD\u5B58", async () => {
        await request("settings.update", { patch: { manualMemoryEnabled: manualToggle.checked } });
        toast(manualToggle.checked ? "\u624B\u52A8\u8BB0\u4F4F\u5DF2\u5F00\u542F\u3002" : "\u624B\u52A8\u8BB0\u4F4F\u5DF2\u5173\u95ED\u3002");
        await refresh();
      });
    });
    main.append(panel("\u624B\u52A8\u8BB0\u4F4F", "\u5173\u95ED\u540E\uFF0C\u4F1A\u8BDD\u4E2D\u7684\u8BB0\u5FC6\u5DE5\u5177\u4F1A\u62D2\u7EDD\u5199\u5165\uFF1B\u8BBE\u7F6E\u754C\u9762\u4ECD\u53EF\u624B\u52A8\u6DFB\u52A0\u3002", manualForm));
    const autoToggle = input({ type: "checkbox", checked: captureAvailable && Boolean(capture.enabled), disabled: !captureAvailable, role: "switch", "aria-label": "\u542F\u7528\u81EA\u52A8\u8BB0\u4F4F" });
    const modeSelect = node(
      "select",
      { className: "strata-input", disabled: !captureAvailable },
      node("option", { value: "model", text: "\u7531\u6A21\u578B\u5224\u65AD \xB7 \u5B83\u89C9\u5F97\u503C\u5F97\u8BB0\u65F6\u624D\u8BB0" }),
      node("option", { value: "interval", text: "\u6309\u65F6\u95F4\u95F4\u9694 \xB7 \u6BCF\u9694 N \u5C0F\u65F6\uFF08\u6574\u70B9\uFF09\u56DE\u987E\u4E00\u6B21" }),
      node("option", { value: "context", text: "\u6309\u4E0A\u4E0B\u6587\u957F\u5EA6 \xB7 \u538B\u7F29\u524D\u62A2\u6551\u4E00\u6B21" })
    );
    modeSelect.value = capture.mode || "model";
    const hours = input({ type: "number", min: "1", max: "168", step: "1", value: capture.intervalHours ?? 4, disabled: !captureAvailable });
    const threshold = input({ type: "number", min: "1", max: "90", step: "1", value: capture.contextThresholdPercent ?? 20, disabled: !captureAvailable });
    const maxSession = input({ type: "number", min: "0", max: "200", step: "1", value: capture.maxPerSession ?? 20, disabled: !captureAvailable });
    const hoursField = field("\u95F4\u9694\u5C0F\u65F6\u6570", hours, "\u6309\u6574\u70B9\u5BF9\u9F50\uFF1A\u6BCF N \u5C0F\u65F6\u7684\u8FB9\u754C\u89E6\u53D1\u4E00\u6B21\u3002");
    const thresholdField = field("\u5269\u4F59\u4E0A\u4E0B\u6587\u9608\u503C\uFF08%\uFF09", threshold, "\u5269\u4F59\u4F4E\u4E8E\u8BE5\u6BD4\u4F8B\u65F6\u63D0\u793A\u4E00\u6B21\uFF0C\u907F\u514D\u538B\u7F29\u540E\u4E22\u5931\u3002");
    const modeHint = node("p", { className: "strata-hint", text: "" });
    function syncModeFields() {
      const mode = modeSelect.value;
      hoursField.hidden = mode !== "interval";
      thresholdField.hidden = mode !== "context";
      modeHint.textContent = mode === "model" ? "\u7531\u6A21\u578B\u81EA\u884C\u5224\u65AD\u672C\u8F6E\u662F\u5426\u503C\u5F97\u8BB0\uFF1B\u6BCF 30 \u5206\u949F\u6700\u591A\u63D0\u793A\u4E00\u6B21\u3002" : mode === "interval" ? "\u6BCF\u5230\u8BBE\u5B9A\u7684\u6574\u70B9\u8FB9\u754C\u63D0\u793A\u4E00\u6B21\uFF0C\u8BA9\u5B83\u5728\u7A7A\u6863\u56DE\u987E\u8981\u70B9\u3002" : "\u4E0A\u4E0B\u6587\u63A5\u8FD1\u538B\u7F29\u65F6\u63D0\u793A\u4E00\u6B21\uFF0C\u628A\u8FD8\u6CA1\u5199\u4E0B\u7684\u7ED3\u8BBA\u62A2\u6551\u4E0B\u6765\u3002";
    }
    syncModeFields();
    modeSelect.addEventListener("change", syncModeFields);
    const saveCapture = button("\u4FDD\u5B58\u81EA\u52A8\u8BB0\u4F4F\u8BBE\u7F6E", { style: "primary", symbol: "check", disabled: !captureAvailable });
    const autoForm = node(
      "form",
      {},
      node(
        "div",
        { className: "strata-toggle-row" },
        node("div", {}, node("strong", { text: "\u81EA\u52A8\u8BB0\u4F4F" }), node("p", { text: "\u65E0\u9700\u4F60\u5F00\u53E3\uFF0C\u6309\u9009\u5B9A\u65B9\u5F0F\u63D0\u9192\u5B83\u8BB0\u5F55\u3002" })),
        node("label", { className: "strata-toggle" }, autoToggle, node("span", { "aria-hidden": "true" }))
      ),
      node(
        "div",
        { className: "strata-form" },
        field("\u89E6\u53D1\u65B9\u5F0F", modeSelect),
        hoursField,
        thresholdField,
        field("\u6BCF\u4F1A\u8BDD\u6700\u591A\u5199\u5165", maxSession, "\u9632\u6B62\u5237\u5199\uFF1B\u8FBE\u5230\u4E0A\u9650\u540E\u672C\u6B21\u4F1A\u8BDD\u4E0D\u518D\u63D0\u793A\u3002"),
        modeHint,
        note("\u81EA\u52A8\u6A21\u5F0F\u53EA\u63D0\u793A\u201C\u53EF\u4EE5\u8BB0\u201D\uFF0C\u4E0D\u4F1A\u4EE3\u66FF\u5B83\u9759\u9ED8\u5199\u5165\uFF1B\u5173\u6389\u5F00\u5173\u5373\u6062\u590D\u4E3A\u53EA\u542C\u4F60\u7684\u6307\u4EE4\u3002"),
        node("div", { className: "strata-form-actions" }, saveCapture)
      )
    );
    autoForm.addEventListener("submit", (event) => event.preventDefault());
    saveCapture.addEventListener("click", () => {
      run(saveCapture, "\u6B63\u5728\u4FDD\u5B58", async () => {
        await request("settings.update", { patch: { capture: {
          enabled: autoToggle.checked,
          mode: modeSelect.value,
          intervalHours: Number(hours.value),
          contextThresholdPercent: Number(threshold.value),
          maxPerSession: Number(maxSession.value)
        } } });
        toast("\u81EA\u52A8\u8BB0\u4F4F\u8BBE\u7F6E\u5DF2\u4FDD\u5B58\u3002");
        await refresh();
      });
    });
    main.append(panel(
      "\u81EA\u52A8\u8BB0\u4F4F",
      captureAvailable ? "\u4E09\u79CD\u65B9\u5F0F\u53EA\u9009\u4E00\u79CD\uFF0C\u968F\u65F6\u53EF\u4EE5\u5173\u6389\u3002" : "\u5F53\u524D\u7248\u672C\u5C1A\u672A\u63D0\u4F9B\u81EA\u52A8\u8BB0\u4F4F\u3002",
      autoForm,
      captureAvailable ? autoToggle.checked ? badge("\u5DF2\u5F00\u542F", "success") : badge("\u5DF2\u5173\u95ED", "muted") : badge("\u4E0D\u53EF\u7528", "muted")
    ));
    const enabled = input({ type: "checkbox", checked: available && Boolean(settings.enabled), disabled: !available, role: "switch", "aria-label": "\u542F\u7528\u4E3B\u52A8\u8BB0\u5FC6" });
    const delivery = node("select", { className: "strata-input", disabled: !available }, node("option", { value: "inbox", text: "\u53EA\u653E\u7075\u611F\u76D2 \xB7 \u4E3B\u52A8\u67E5\u770B\u65F6\u518D\u51FA\u73B0" }), node("option", { value: "occasional", text: "\u5076\u5C14\u63D0\u9192 \xB7 \u5728\u5408\u9002\u65F6\u673A\u8F7B\u91CF\u51FA\u73B0" }));
    delivery.value = settings.delivery || "inbox";
    const maxDay = input({ type: "number", min: "0", max: "20", step: "1", value: settings.maxPerDay ?? 3, required: true, disabled: !available });
    const cooldown = input({ type: "number", min: "1", max: "1440", step: "1", value: settings.cooldownMinutes ?? 30, required: true, disabled: !available });
    const save = button(available ? "\u4FDD\u5B58\u7075\u611F\u8BBE\u7F6E" : "\u81EA\u52A8\u5173\u8054\u5C1A\u672A\u63A5\u5165", { style: "primary", symbol: available ? "check" : "clock", disabled: !available });
    main.append(panel("\u624B\u52A8\u7075\u611F\u76D2", "\u5148\u628A\u4E00\u95EA\u800C\u8FC7\u7684\u5FF5\u5934\u7559\u4E0B\u3002\u5B83\u4F1A\u4F5C\u4E3A\u201C\u60F3\u6CD5\u201D\u4FDD\u5B58\uFF0C\u7B49\u5F85\u4F60\u7684\u540E\u7EED\u9A8C\u8BC1\u3002", node("div", { className: "strata-button-group" }, button("\u8BB0\u4E0B\u4E00\u4E2A\u60F3\u6CD5", { style: "primary", symbol: "plus", onclick: () => showNewRecord("idea") }), button("\u67E5\u770B\u5DF2\u4FDD\u5B58\u7684\u60F3\u6CD5", { symbol: "arrow", onclick: () => {
      state.query = "";
      state.kind = "idea";
      navigate("memory");
    } })), badge("\u5DF2\u53EF\u4F7F\u7528", "success")));
    if (!available) main.append(note("\u624B\u52A8\u7075\u611F\u76D2\u5DF2\u53EF\u7528\u3002\u4E3B\u52A8\u5173\u8054\u4E0E\u5076\u5C14\u63D0\u9192\u7A0D\u540E\u63A5\u5165\uFF0C\u4E0B\u9762\u7684\u8BBE\u7F6E\u6682\u4E0D\u53EF\u542F\u7528\u3002"));
    const controls = node("div", { className: "strata-form" }, field("\u51FA\u73B0\u65B9\u5F0F", delivery), node("div", { className: "strata-form-grid" }, field("\u6BCF\u5929\u6700\u591A\u63D0\u9192", maxDay, "\u540C\u4E00\u8BB0\u5FC6\u5E93\u7684\u6240\u6709\u4F1A\u8BDD\u5171\u4EAB\u989D\u5EA6\u3002"), field("\u6700\u77ED\u95F4\u9694\uFF08\u5206\u949F\uFF09", cooldown, "\u6CA1\u6709\u5408\u9002\u7EBF\u7D22\u65F6\uFF0C\u4FDD\u6301\u5B89\u9759\u3002")), note("\u201C\u503C\u5F97\u8BD5\u201D\u4F1A\u4FDD\u5B58\u4E3A\u60F3\u6CD5\u3002\u53EA\u6709\u5B9E\u9645\u9A8C\u8BC1\u540E\u7684\u7ED3\u679C\uFF0C\u624D\u4F1A\u6210\u4E3A\u6709\u4F9D\u636E\u7684\u7ECF\u9A8C\u3002"), node("div", { className: "strata-form-actions" }, save));
    const form = node("form", {}, node("div", { className: "strata-toggle-row" }, node("div", {}, node("strong", { text: "\u4E3B\u52A8\u8BB0\u5FC6" }), node("p", { text: "\u4ECE\u5141\u8BB8\u8303\u56F4\u5185\u7684\u65E7\u8BB0\u5F55\u4E2D\u5BFB\u627E\u4E0E\u5F53\u524D\u4EFB\u52A1\u6709\u5173\u7684\u7EBF\u7D22\u3002" })), node("label", { className: "strata-toggle" }, enabled, node("span", { "aria-hidden": "true" }))), controls);
    form.addEventListener("submit", (event) => event.preventDefault());
    save.addEventListener("click", () => {
      if (!form.reportValidity()) return;
      run(save, "\u6B63\u5728\u4FDD\u5B58", async () => {
        await request("settings.update", { patch: { proactive: { ...settings, enabled: enabled.checked, delivery: delivery.value, maxPerDay: Number(maxDay.value), cooldownMinutes: Number(cooldown.value) } } });
        toast("\u7075\u611F\u504F\u597D\u5DF2\u4FDD\u5B58\u3002");
        await refresh();
      });
    });
    main.append(panel("\u4E3B\u52A8\u8BB0\u5FC6\u504F\u597D", available ? "\u63D0\u793A\u6709\u6765\u6E90\u3001\u6709\u9891\u7387\u9650\u5236\uFF0C\u4E5F\u53EF\u4EE5\u968F\u65F6\u5173\u95ED\u3002" : "\u9884\u7559\u81EA\u52A8\u80FD\u529B\u8BBE\u7F6E\uFF0C\u63A5\u5165\u540E\u5F00\u653E\u3002", form, !available && badge("\u5C1A\u672A\u63A5\u5165", "muted")));
    main.append(node("div", { className: "strata-principles" }, principle("shield", "\u9075\u5FAA\u4F7F\u7528\u8303\u56F4", "\u4EC5\u5728\u5141\u8BB8\u8303\u56F4\u5185\u8BFB\u53D6\u8BB0\u5FC6\u4E0E\u4FDD\u5B58\u60F3\u6CD5\u3002"), principle("check", "\u5199\u5165\u4E0D\u9759\u9ED8", "\u81EA\u52A8\u6A21\u5F0F\u53EA\u662F\u63D0\u793A\u53EF\u4EE5\u8BB0\uFF0C\u5199\u5165\u4ECD\u8D70\u540C\u4E00\u6761\u8BB0\u5F55\u8DEF\u5F84\u3002"), principle("spark", "\u7075\u611F\u5148\u662F\u60F3\u6CD5", "\u6536\u85CF\u4E0D\u7B49\u4E8E\u4E8B\u5B9E\uFF0C\u63A8\u65AD\u9700\u8981\u65B0\u7684\u8BC1\u636E\u3002")));
    main.append(pageFoot("\u4E3B\u52A8\u8BB0\u5FC6\u8BBE\u7F6E\u4E0D\u4F1A\u81EA\u52A8\u8054\u7F51\u3001\u521B\u5EFA\u5B9A\u65F6\u4EFB\u52A1\u6216\u4FEE\u6539\u4F60\u7684\u9879\u76EE\u3002"));
  }
  function principle(symbol, title, description) {
    return node("div", { className: "strata-principle" }, icon(symbol), node("strong", { text: title }), node("p", { text: description }));
  }
  render();
  await refresh();
  function destroy() {
    state.destroyed = true;
    state.listGeneration += 1;
    state.importGeneration += 1;
    clearTimeout(toastTimer);
    clearTimeout(searchTimer);
    for (const dialog of dialogs) {
      dialog.close();
      dialog.remove();
    }
    dialogs.clear();
    host.remove();
  }
  return { refresh, destroy, dispose: destroy };
}

// client/settings.css
var settings_default = `.strata-settings-host { container-name: strata; container-type: inline-size; width: 100%; min-width: 0; }

.strata-app {
  --st-bg: var(--dsw-alias-bg-base, #ffffff);
  --st-surface: var(--dsw-alias-settings-card-fill, var(--dsw-alias-bg-layer-1, #ffffff));
  --st-sidebar: var(--dsw-specific-sidebar-fill, #f9fafb);
  --st-subtle: var(--dsw-alias-bg-layer-2, #f4f4f5);
  --st-text: var(--dsw-alias-label-primary, #0f1115);
  --st-muted: var(--dsw-alias-label-secondary, #61666b);
  --st-line: var(--dsw-alias-border-l2, #0000001a);
  --st-accent: var(--dsw-alias-button-primary-fill, #0f1115);
  --st-accent-foreground: var(--dsw-alias-label-primary-foreground, #ffffff);
  --st-accent-strong: var(--dsw-alias-button-primary-hover, #303236);
  --st-accent-soft: var(--dsw-alias-button-primary-dimmed, #f4f4f5);
  --st-focus: var(--dsw-alias-state-business-primary, #4176e6);
  --st-warm: #92784c;
  --st-warm-soft: #f8f2e7;
  --st-error: #aa4942;
  --st-error-soft: #fbefed;
  --st-shadow: 0 8px 32px #00000006;
  color-scheme: light;
  display: grid;
  grid-template-columns: 224px minmax(0, 1fr);
  min-height: 780px;
  width: 100%;
  background: var(--st-bg);
  color: var(--st-text);
  font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  line-height: 1.55;
  isolation: isolate;
  position: relative;
  -webkit-font-smoothing: antialiased;
}

.strata-app[data-strata-theme="dark"],
:where(body[data-ds-dark-theme], .dark, [data-theme="dark"], [data-color-scheme="dark"]) .strata-app[data-strata-theme="auto"] {
  --st-bg: var(--dsw-alias-bg-base, #151517);
  --st-surface: var(--dsw-alias-settings-card-fill, var(--dsw-alias-bg-layer-1, #1b1b1c));
  --st-sidebar: var(--dsw-specific-sidebar-fill, #1b1b1c);
  --st-subtle: var(--dsw-alias-bg-layer-2, #262628);
  --st-text: var(--dsw-alias-label-primary, #f9fafb);
  --st-muted: var(--dsw-alias-label-secondary, #a7acb2);
  --st-line: var(--dsw-alias-border-l2, #ffffff1f);
  --st-accent: var(--dsw-alias-button-primary-fill, #f9fafb);
  --st-accent-foreground: var(--dsw-alias-label-primary-foreground, #0f1115);
  --st-accent-strong: var(--dsw-alias-button-primary-hover, #d9dde3);
  --st-accent-soft: var(--dsw-alias-button-primary-dimmed, #262628);
  --st-focus: var(--dsw-alias-state-business-primary, #7aaaff);
  --st-warm: #d4b882;
  --st-warm-soft: #3c3526;
  --st-error: #f0a29a;
  --st-error-soft: #3b2928;
  --st-shadow: 0 8px 32px #00000015;
  color-scheme: dark;
}

@media (prefers-color-scheme: dark) {
  .strata-app[data-strata-theme="auto"] {
    --st-bg: var(--dsw-alias-bg-base, #151517); --st-surface: var(--dsw-alias-settings-card-fill, var(--dsw-alias-bg-layer-1, #1b1b1c)); --st-sidebar: var(--dsw-specific-sidebar-fill, #1b1b1c); --st-subtle: var(--dsw-alias-bg-layer-2, #262628);
    --st-text: var(--dsw-alias-label-primary, #f9fafb); --st-muted: var(--dsw-alias-label-secondary, #a7acb2); --st-line: var(--dsw-alias-border-l2, #ffffff1f); --st-accent: var(--dsw-alias-button-primary-fill, #f9fafb);
    --st-accent-foreground: var(--dsw-alias-label-primary-foreground, #0f1115); --st-accent-strong: var(--dsw-alias-button-primary-hover, #d9dde3); --st-accent-soft: var(--dsw-alias-button-primary-dimmed, #262628); --st-focus: var(--dsw-alias-state-business-primary, #7aaaff); --st-warm: #d4b882; --st-warm-soft: #3c3526;
    --st-error: #f0a29a; --st-error-soft: #3b2928; --st-shadow: 0 8px 32px #00000015; color-scheme: dark;
  }
}

/* The installed panel follows DSH's selected theme, including when it differs
   from the operating-system preference used by the standalone preview. */
.strata-app[data-strata-theme="host"] { font-family: inherit; color-scheme: inherit; }
body[data-ds-dark-theme] .strata-app[data-strata-theme="host"] { --st-warm: #d4b882; --st-warm-soft: #3c3526; --st-error: #f0a29a; --st-error-soft: #3b2928; }

.strata-app *, .strata-app *::before, .strata-app *::after { box-sizing: border-box; }
.strata-app [hidden] { display: none !important; }
.strata-app button, .strata-app input, .strata-app textarea, .strata-app select { font: inherit; }
.strata-app button { cursor: pointer; }
.strata-app button:disabled { cursor: not-allowed; opacity: .55; }
.strata-app :where(button, input, textarea, select, a):focus-visible { outline: 3px solid color-mix(in srgb, var(--st-focus) 50%, transparent); outline-offset: 3px; }
.strata-app :where(h1, h2, h3, p) { margin: 0; }
.strata-app .strata-icon { width: 20px; height: 20px; flex: 0 0 auto; }
.strata-app .strata-sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }

.strata-sidebar { background: var(--st-sidebar); border-right: 1px solid var(--st-line); padding: 34px 20px 25px; display: flex; flex-direction: column; min-width: 0; }
.strata-brand { display: flex; gap: 11px; align-items: center; padding: 0 7px 43px; }
.strata-brand-mark { display: grid; place-items: center; width: 38px; height: 42px; border-radius: 11px; background: var(--st-text); color: var(--st-bg); transform: rotate(-3deg); }
.strata-brand-mark .strata-icon { width: 25px; height: 25px; }
.strata-brand strong { display: block; font-size: 19px; letter-spacing: 4px; line-height: 1.3; font-weight: 720; }
.strata-brand span { display: block; color: var(--st-muted); font-size: 10px; letter-spacing: 4px; margin-top: 4px; }
.strata-nav-label { padding: 0 15px 13px; font-size: 10px; color: var(--st-muted); letter-spacing: 1.3px; }
.strata-navigation { display: grid; gap: 7px; }
.strata-nav-item { border: 0; background: transparent; color: var(--st-muted); display: flex; gap: 11px; align-items: center; text-align: left; padding: 13px 13px; border-radius: 10px; font-size: 13px !important; transition: background .15s, color .15s; }
.strata-nav-item:hover { background: color-mix(in srgb, var(--st-surface) 55%, transparent); color: var(--st-text); }
.strata-nav-item.is-active { background: var(--st-surface); color: var(--st-accent); box-shadow: 0 2px 9px #00000005; font-weight: 650; }
.strata-nav-item .strata-icon { width: 18px; height: 18px; }
.strata-nav-arrow { margin-left: auto; width: 12px !important; opacity: 0; }
.strata-nav-item.is-active .strata-nav-arrow { opacity: .8; }
.strata-sidebar-foot { margin-top: auto; padding: 80px 10px 0; }
.strata-sidebar-foot > strong { display: block; font-size: 12px; font-weight: 600; margin-top: 18px; }
.strata-sidebar-foot > p { font-size: 11px; color: var(--st-muted); line-height: 1.8; margin-top: 6px; }
.strata-side-illustration { height: 41px; position: relative; width: 70px; }
.strata-side-illustration i { display: block; position: absolute; left: 0; width: 65px; height: 24px; border: 1px solid color-mix(in srgb, var(--st-accent) 25%, transparent); border-radius: 6px; transform: skewY(-9deg); background: var(--st-sidebar); }
.strata-side-illustration i:nth-child(1) { top: 18px; }
.strata-side-illustration i:nth-child(2) { top: 9px; }
.strata-side-illustration i:nth-child(3) { top: 0; background: var(--st-accent-soft); }
.strata-connection { display: flex; align-items: center; gap: 7px; border-top: 1px solid var(--st-line); padding-top: 20px; margin-top: 25px; font-size: 10px; color: var(--st-muted); }
.strata-status-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--st-accent); box-shadow: 0 0 0 3px var(--st-accent-soft); }
.strata-connection--error .strata-status-dot { background: var(--st-error); box-shadow: 0 0 0 3px var(--st-error-soft); }

.strata-main { padding: 43px clamp(24px, 4vw, 56px) 30px; min-width: 0; max-width: 1260px; width: 100%; margin-inline: auto; }
.strata-page-header { display: flex; justify-content: space-between; align-items: center; gap: 22px; margin-bottom: 31px; }
.strata-eyebrow { color: var(--st-accent); font-size: 10px; font-weight: 700; letter-spacing: 2.2px; margin-bottom: 11px; }
.strata-page-header h1 { font-size: clamp(23px, 2.4vw, 29px); letter-spacing: -.8px; font-weight: 650; line-height: 1.35; }
.strata-page-header p { margin-top: 11px; font-size: 12px; color: var(--st-muted); line-height: 1.8; }
.strata-page-header > .strata-button { flex-shrink: 0; }
.strata-button { border: 1px solid var(--st-line); border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 10px 15px; min-height: 40px; background: var(--st-surface); color: var(--st-text); font-size: 12px !important; font-weight: 600 !important; line-height: 1.35; white-space: nowrap; transition: background .15s, border-color .15s, transform .15s; }
.strata-button .strata-icon { width: 16px; height: 16px; }
.strata-button:hover:not(:disabled) { border-color: color-mix(in srgb, var(--st-accent) 45%, var(--st-line)); background: var(--st-subtle); }
.strata-button:active:not(:disabled) { transform: translateY(1px); }
.strata-button--primary { color: var(--st-accent-foreground); background: var(--st-accent); border-color: var(--st-accent); }
.strata-button--primary:hover:not(:disabled) { background: var(--st-accent-strong); border-color: var(--st-accent-strong); }
.strata-button--ghost { background: transparent; border-color: transparent; color: var(--st-accent); padding-inline: 9px; }
.strata-button--ghost:hover:not(:disabled) { background: var(--st-accent-soft); border-color: transparent; }
.strata-button--icon { padding: 9px; width: 36px; height: 36px; min-height: 36px; border-color: transparent; background: transparent; }
.strata-button--icon > span { display: none; }
.strata-button-group { display: flex; gap: 8px; align-items: center; }
.strata-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-bottom: 19px; }
.strata-stat { background: var(--st-surface); border: 1px solid var(--st-line); border-radius: 13px; padding: 22px 23px; box-shadow: var(--st-shadow); }
.strata-stat-top { display: flex; align-items: center; justify-content: space-between; gap: 9px; color: var(--st-muted); font-size: 12px; }
.strata-stat-top .strata-icon { width: 17px; height: 17px; color: var(--st-accent); opacity: .75; }
.strata-stat-value { display: block; font-size: 35px; font-weight: 600; line-height: 1.2; letter-spacing: -1.6px; font-variant-numeric: tabular-nums; margin-top: 12px; }
.strata-stat-note { font-size: 10px; color: var(--st-muted); display: block; margin-top: 9px; }
.strata-scope-banner { display: flex; align-items: center; gap: 14px; padding: 17px 20px; margin-bottom: 29px; background: var(--st-accent-soft); border: 1px solid color-mix(in srgb, var(--st-accent) 13%, transparent); border-radius: 11px; }
.strata-scope-symbol { width: 34px; height: 34px; display: grid; place-items: center; background: color-mix(in srgb, var(--st-surface) 65%, transparent); border-radius: 9px; color: var(--st-accent); }
.strata-scope-symbol .strata-icon { width: 18px; height: 18px; }
.strata-scope-copy { display: grid; gap: 2px; min-width: 0; flex: 1; }
.strata-scope-copy strong { color: var(--st-accent); font-size: 11px; font-weight: 600; }
.strata-scope-copy > span { font-size: 12px; overflow-wrap: anywhere; }
.strata-panel { background: var(--st-surface); border: 1px solid var(--st-line); border-radius: 13px; margin-bottom: 20px; box-shadow: var(--st-shadow); overflow: hidden; }
.strata-panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 22px 24px; }
.strata-panel-heading h2 { font-size: 15px; font-weight: 650; }
.strata-panel-heading p { font-size: 11px; color: var(--st-muted); margin-top: 5px; }
.strata-toolbar { display: flex; gap: 12px; padding: 0 24px 20px; }
.strata-input { width: 100%; min-width: 0; border: 1px solid var(--st-line); border-radius: 8px; background: var(--st-surface); color: var(--st-text); padding: 10px 12px; min-height: 41px; font-size: 12px !important; transition: border-color .15s, box-shadow .15s; }
.strata-input::placeholder { color: color-mix(in srgb, var(--st-muted) 75%, transparent); }
.strata-input:focus { border-color: var(--st-accent); box-shadow: 0 0 0 3px var(--st-accent-soft); }
.strata-search { flex: 1; position: relative; }
.strata-search > .strata-icon { position: absolute; width: 16px; height: 16px; left: 12px; top: 12px; color: var(--st-muted); }
.strata-search .strata-input { padding-left: 37px; background: var(--st-subtle); border-color: transparent; }
.strata-kind-select { flex: 0 0 145px; width: 145px; }
.strata-record-list { border-top: 1px solid var(--st-line); min-height: 160px; }
.strata-record-list[aria-busy="true"] { opacity: .6; transition: opacity .15s; }
.strata-record { width: 100%; display: flex; align-items: center; gap: 15px; padding: 19px 24px; border: 0; border-bottom: 1px solid var(--st-line); background: transparent; color: var(--st-text); text-align: left; }
.strata-record:last-child { border-bottom: 0; }
.strata-record:hover { background: var(--st-subtle); }
.strata-record-symbol { width: 36px; height: 42px; display: grid; place-items: center; background: var(--st-subtle); border: 1px solid var(--st-line); color: var(--st-muted); border-radius: 8px; flex-shrink: 0; }
.strata-record-symbol .strata-icon { width: 19px; height: 19px; }
.strata-record-symbol.is-idea { background: var(--st-warm-soft); color: var(--st-warm); border-color: transparent; }
.strata-record-copy { min-width: 0; flex: 1; }
.strata-record-title { display: flex; gap: 10px; align-items: center; }
.strata-record-title strong { font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.strata-record-copy > p { font-size: 11px; color: var(--st-muted); margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.strata-record-meta { display: flex; flex-wrap: wrap; gap: 12px; color: var(--st-muted); font-size: 10px; margin-top: 9px; }
.strata-record > .strata-icon { width: 14px; height: 14px; color: var(--st-muted); }
.strata-badge { display: inline-flex; align-items: center; border-radius: 5px; padding: 3px 7px; font-size: 9px; font-weight: 500; line-height: 1.4; white-space: nowrap; }
.strata-badge--muted { color: var(--st-muted); background: var(--st-subtle); }
.strata-badge--warm { color: var(--st-warm); background: var(--st-warm-soft); }
.strata-badge--success { color: var(--st-accent); background: var(--st-accent-soft); }
.strata-empty { display: flex; align-items: center; flex-direction: column; padding: 45px 20px 48px; text-align: center; }
.strata-empty-symbol { display: grid; place-items: center; width: 54px; height: 54px; border-radius: 17px; background: var(--st-subtle); color: var(--st-accent); margin-bottom: 17px; }
.strata-empty-symbol .strata-icon { width: 26px; height: 26px; }
.strata-empty h3 { font-size: 14px; font-weight: 600; }
.strata-empty p { color: var(--st-muted); font-size: 12px; margin: 7px 0 20px; }
.strata-page-foot { display: flex; gap: 7px; align-items: flex-start; color: var(--st-muted); font-size: 10px; margin: 22px 2px 0; }
.strata-page-foot .strata-icon { width: 13px; height: 13px; margin-top: 2px; }

.strata-form { padding: 2px 24px 24px; }
.strata-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.strata-field { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
.strata-label { font-size: 12px; font-weight: 600; }
.strata-hint { color: var(--st-muted); font-size: 10px; }
.strata-form-actions { display: flex; justify-content: flex-end; padding-top: 20px; margin-top: 12px; border-top: 1px solid var(--st-line); }
.strata-scope-options { border: 0; padding: 0; margin: 0 0 25px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.strata-choice { display: flex; flex-direction: column; position: relative; border: 1px solid var(--st-line); border-radius: 11px; padding: 22px; cursor: pointer; transition: background .15s, border-color .15s; }
.strata-choice > input { position: absolute; top: 20px; right: 20px; width: 18px; min-height: 0; height: 18px; accent-color: var(--st-accent); margin: 0; }
.strata-choice.is-selected { border-color: var(--st-accent); background: color-mix(in srgb, var(--st-accent-soft) 50%, var(--st-surface)); box-shadow: inset 0 0 0 1px var(--st-accent); }
.strata-choice-symbol { display: grid; place-items: center; width: 39px; height: 39px; border-radius: 11px; color: var(--st-accent); background: var(--st-subtle); margin-bottom: 18px; }
.strata-choice.is-selected .strata-choice-symbol { background: var(--st-accent-soft); }
.strata-choice strong { font-weight: 600; font-size: 14px; }
.strata-choice p { color: var(--st-muted); font-size: 11px; line-height: 1.8; margin-top: 7px; max-width: 270px; }
.strata-choice-check { display: none; }
.strata-folder-fields { padding: 21px; background: var(--st-subtle); border-radius: 10px; margin-bottom: 22px; }
.strata-folder-fields .strata-field { margin-bottom: 14px; }
.strata-input-actions { display: flex; gap: 8px; }
.strata-input-actions .strata-input { flex: 1; }
.strata-check-row { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.strata-check-row > input { width: 16px; height: 16px; min-height: 0; padding: 0; accent-color: var(--st-accent); margin: 0; }
.strata-setting-summary { display: flex; align-items: flex-start; gap: 10px; color: var(--st-muted); font-size: 11px; line-height: 1.85; }
.strata-setting-summary .strata-icon { width: 16px; height: 16px; margin-top: 2px; color: var(--st-accent); }
.strata-current-context { display: flex; gap: 12px; align-items: center; border: 1px dashed var(--st-line); border-radius: 10px; padding: 18px 22px; color: var(--st-muted); }
.strata-current-context > div { display: grid; gap: 5px; min-width: 0; }
.strata-current-context span { font-size: 10px; }
.strata-current-context code { font-size: 12px; color: var(--st-text); overflow-wrap: anywhere; }

.strata-transfer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.strata-transfer-card { background: var(--st-surface); border: 1px solid var(--st-line); border-radius: 14px; padding: 28px; display: flex; flex-direction: column; align-items: flex-start; box-shadow: var(--st-shadow); }
.strata-transfer-card--import { background: linear-gradient(150deg, var(--st-surface), color-mix(in srgb, var(--st-accent-soft) 25%, var(--st-surface))); }
.strata-transfer-symbol { width: 48px; height: 48px; border-radius: 14px; background: var(--st-accent-soft); color: var(--st-accent); display: grid; place-items: center; margin-bottom: 25px; }
.strata-transfer-symbol .strata-icon { width: 23px; height: 23px; }
.strata-transfer-card h2 { font-size: 20px; font-weight: 600; letter-spacing: -.5px; }
.strata-transfer-card > p { color: var(--st-muted); font-size: 12px; line-height: 1.9; margin: 10px 0 27px; }
.strata-transfer-card > .strata-field { width: 100%; }
.strata-transfer-card > .strata-button { width: 100%; }
.strata-transfer-card:first-child > .strata-field { margin-top: 14px; }
.strata-transfer-card:first-child > .strata-button { margin-top: auto; }
.strata-transfer-note { display: flex; align-items: center; justify-content: center; width: 100%; gap: 6px; margin-top: 16px; color: var(--st-muted); font-size: 10px; }
.strata-transfer-note .strata-icon { width: 13px; height: 13px; }
.strata-dropzone { border: 1.5px dashed color-mix(in srgb, var(--st-accent) 35%, var(--st-line)); display: flex; align-items: center; flex-direction: column; width: 100%; border-radius: 10px; padding: 21px 14px; position: relative; cursor: pointer; text-align: center; margin-bottom: 20px; background: color-mix(in srgb, var(--st-subtle) 65%, transparent); transition: background .15s, border-color .15s; }
.strata-dropzone:hover, .strata-dropzone.is-dragging { background: var(--st-accent-soft); border-color: var(--st-accent); }
.strata-dropzone:focus-within { outline: 3px solid color-mix(in srgb, var(--st-accent) 50%, transparent); outline-offset: 3px; }
.strata-dropzone > .strata-icon { color: var(--st-accent); margin-bottom: 12px; }
.strata-dropzone strong { font-size: 12px; font-weight: 600; overflow-wrap: anywhere; max-width: 100%; }
.strata-dropzone > span { font-size: 10px; color: var(--st-muted); margin-top: 5px; }
.strata-file-input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
.strata-preview-area { margin-top: 25px; }
.strata-preview-stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; padding: 0 24px 24px; }
.strata-mini-stat { padding: 16px; border-radius: 9px; background: var(--st-subtle); display: grid; gap: 6px; }
.strata-mini-stat strong { font-size: 24px; font-weight: 600; font-variant-numeric: tabular-nums; }
.strata-mini-stat span { color: var(--st-muted); font-size: 10px; }
.strata-preview-messages { padding: 0 24px; }
.strata-preview-footer { display: flex; align-items: center; justify-content: space-between; gap: 14px; border-top: 1px solid var(--st-line); padding: 20px 24px; }
.strata-preview-footer > span { color: var(--st-muted); font-size: 11px; overflow-wrap: anywhere; }
.strata-preview-area .strata-panel > div > .strata-note { margin-inline: 24px; }
.strata-conflicts { padding: 0 24px 18px; font-size: 11px; overflow-wrap: anywhere; }
.strata-conflicts h3 { font-size: 12px; margin-bottom: 8px; }
.strata-conflicts ul { padding-left: 18px; color: var(--st-muted); }
.strata-import-folder { display: grid; gap: 10px; }
.strata-import-scope-hint:empty { display: none; }
.strata-import-scope-hint .strata-note { margin: 0; }
.strata-preview-scopes { display: grid; grid-template-columns: minmax(0, 1fr) 20px minmax(0, 1fr); gap: 16px; align-items: center; padding: 4px 24px 24px; }
.strata-preview-scopes > div { min-width: 0; display: grid; gap: 6px; }
.strata-preview-scopes span { color: var(--st-muted); font-size: 10px; }
.strata-preview-scopes strong { font-size: 12px; font-weight: 500; overflow-wrap: anywhere; }
.strata-choice > input { padding: 0; }
.strata-app input:disabled, .strata-app select:disabled { opacity: .55; cursor: not-allowed; }
.strata-panel > .strata-button-group { padding: 0 24px 24px; flex-wrap: wrap; }
.strata-export-contents { display: grid; gap: 20px; padding: 22px 0 28px; }
.strata-export-contents .strata-principle { display: grid; grid-template-columns: 24px minmax(0, 1fr); column-gap: 12px; padding: 0; }
.strata-export-contents .strata-icon { grid-row: span 2; margin-top: 2px; }
.strata-export-contents .strata-principle p { margin-top: 3px; }
.strata-list-footer { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 16px 24px; }
.strata-list-footer > span { font-size: 11px; color: var(--st-muted); }
.strata-evidence-area { margin-top: 24px; }
.strata-evidence-area h3 { font-size: 13px; font-weight: 600; margin-bottom: 12px; }
.strata-evidence-controls { display: flex; gap: 10px; align-items: center; }
.strata-evidence-controls select { min-width: 0; flex: 1; }
.strata-evidence-meta { font-size: 10px; color: var(--st-muted); margin: 16px 0 10px; overflow-wrap: anywhere; }
.strata-evidence-text { white-space: pre-wrap; overflow-wrap: anywhere; max-height: 300px; overflow-y: auto; margin: 0 0 12px; border: 1px solid var(--st-line); background: var(--st-subtle); border-radius: 8px; padding: 14px; font-family: inherit; font-size: 12px; line-height: 1.9; }
.strata-evidence-output .strata-note { margin-top: 14px; }

.strata-note { display: flex; align-items: flex-start; gap: 9px; padding: 13px 15px; border-radius: 8px; background: var(--st-subtle); color: var(--st-muted); font-size: 11px; line-height: 1.8; margin-bottom: 18px; overflow-wrap: anywhere; }
.strata-note > .strata-icon { width: 15px; height: 15px; margin-top: 2px; flex-shrink: 0; }
.strata-note--warning { color: var(--st-warm); background: var(--st-warm-soft); }
.strata-note--error { color: var(--st-error); background: var(--st-error-soft); }
.strata-note--success { color: var(--st-accent); background: var(--st-accent-soft); }
.strata-toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 3px 24px 24px; margin-bottom: 25px; border-bottom: 1px solid var(--st-line); }
.strata-toggle-row strong { font-size: 13px; font-weight: 600; }
.strata-toggle-row p { color: var(--st-muted); font-size: 11px; margin-top: 5px; }
.strata-toggle { display: block; position: relative; width: 41px; height: 24px; flex-shrink: 0; cursor: pointer; }
.strata-toggle input { position: absolute; inset: 0; margin: 0; width: 100%; height: 100%; opacity: 0; z-index: 1; cursor: pointer; }
.strata-toggle > span { display: block; width: 100%; height: 100%; background: var(--st-line); border-radius: 20px; transition: background .15s; }
.strata-toggle > span::after { content: ''; display: block; position: absolute; width: 18px; height: 18px; border-radius: 50%; left: 3px; top: 3px; background: var(--st-surface); box-shadow: 0 1px 4px #0002; transition: transform .15s; }
.strata-toggle input:checked + span { background: var(--st-accent); }
.strata-toggle input:checked + span::after { transform: translateX(17px); }
.strata-toggle:focus-within { outline: 3px solid color-mix(in srgb, var(--st-accent) 50%, transparent); outline-offset: 3px; border-radius: 20px; }
.strata-principles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin-top: 26px; }
.strata-principle { padding: 4px 5px; }
.strata-principle .strata-icon { display: block; color: var(--st-accent); width: 18px; height: 18px; margin-bottom: 12px; }
.strata-principle strong { font-size: 12px; font-weight: 600; }
.strata-principle p { font-size: 11px; color: var(--st-muted); line-height: 1.9; margin-top: 6px; }

.strata-dialog { padding: 0; width: min(600px, calc(100vw - 36px)); border: 1px solid var(--st-line); border-radius: 15px; background: var(--st-surface); color: var(--st-text); box-shadow: 0 20px 100px #0003; max-height: min(90vh, 850px); overflow-y: auto; }
.strata-dialog::backdrop { background: #00000066; backdrop-filter: blur(4px); }
.strata-dialog-head { padding: 25px 27px 20px; display: flex; justify-content: space-between; gap: 15px; border-bottom: 1px solid var(--st-line); }
.strata-dialog-head h2 { font-size: 19px; font-weight: 650; }
.strata-dialog-head p { color: var(--st-muted); font-size: 11px; margin-top: 7px; }
.strata-dialog-body { padding: 24px 27px; }
.strata-dialog-body .strata-form { padding: 0; }
.strata-dialog-body .strata-note:last-child { margin-bottom: 0; }
.strata-dialog-actions { display: flex; justify-content: flex-end; gap: 9px; padding: 18px 27px; background: var(--st-subtle); border-top: 1px solid var(--st-line); }
.strata-textarea { resize: vertical; line-height: 1.9; min-height: 140px; }
.strata-record-detail { white-space: pre-wrap; overflow-wrap: anywhere; font-size: 13px; line-height: 1.95; max-height: 380px; overflow: auto; }
.strata-detail-meta { display: grid; grid-template-columns: 90px minmax(0, 1fr); font-size: 11px; border-top: 1px solid var(--st-line); padding-top: 18px; margin-top: 25px; gap: 10px; }
.strata-detail-meta dt { color: var(--st-muted); }
.strata-detail-meta dd { margin: 0; overflow-wrap: anywhere; }
.strata-notifications { position: fixed; right: 25px; bottom: 25px; z-index: 10010; max-width: min(450px, calc(100vw - 40px)); pointer-events: none; }
.strata-toast { display: flex; align-items: flex-start; gap: 9px; border: 1px solid var(--st-line); background: var(--st-surface); box-shadow: 0 8px 35px #0002; border-radius: 10px; color: var(--st-text); padding: 15px 18px; font-size: 12px; animation: strata-appear .18s ease-out; }
.strata-toast .strata-icon { color: var(--st-accent); width: 17px; height: 17px; margin-top: 1px; }
.strata-toast--error .strata-icon { color: var(--st-error); }
.strata-loading { min-height: 420px; display: flex; justify-content: center; align-items: center; flex-direction: column; gap: 18px; color: var(--st-muted); font-size: 12px; }
.strata-spinner { width: 16px; height: 16px; display: inline-block; border: 2px solid currentColor; border-right-color: transparent; opacity: .8; border-radius: 50%; animation: strata-spin .7s linear infinite; flex-shrink: 0; }
@keyframes strata-spin { to { transform: rotate(360deg); } }
@keyframes strata-appear { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

@container strata (max-width: 1050px) {
  .strata-app { grid-template-columns: 195px minmax(0, 1fr); }
  .strata-sidebar { padding-inline: 13px; }
  .strata-main { padding-inline: 25px; }
  .strata-transfer-card { padding: 23px; }
  .strata-page-header { align-items: flex-start; }
  .strata-stat { padding: 19px; }
  .strata-stat-note { font-size: 9px; }
}
@container strata (max-width: 800px) {
  .strata-app { grid-template-columns: 1fr; min-height: 720px; }
  .strata-sidebar { border-right: 0; border-bottom: 1px solid var(--st-line); padding: 18px 22px 0; }
  .strata-brand { padding: 0 0 18px; }
  .strata-brand-mark { width: 31px; height: 34px; border-radius: 8px; }
  .strata-brand-mark .strata-icon { width: 21px; height: 21px; }
  .strata-brand strong { font-size: 15px; letter-spacing: 3px; }
  .strata-brand span { font-size: 9px; letter-spacing: 2px; margin-top: 1px; }
  .strata-nav-label, .strata-sidebar-foot { display: none; }
  .strata-navigation { display: flex; gap: 7px; overflow-x: auto; padding-bottom: 12px; }
  .strata-nav-item { white-space: nowrap; gap: 8px; padding: 10px 13px; font-size: 12px !important; flex: 1; }
  .strata-nav-arrow { display: none; }
  .strata-main { padding: 29px 22px; }
  .strata-page-header h1 { font-size: 23px; }
  .strata-page-header p { max-width: 400px; }
  .strata-transfer-grid { gap: 15px; }
}
@container strata (max-width: 560px) {
  .strata-main { padding: 25px 16px; }
  .strata-sidebar { padding-inline: 16px; }
  .strata-nav-item { padding: 10px; font-size: 11px !important; justify-content: center; }
  .strata-nav-item .strata-icon { display: none; }
  .strata-page-header { flex-wrap: wrap; gap: 17px; margin-bottom: 23px; }
  .strata-page-header h1 { font-size: 22px; }
  .strata-page-header p { font-size: 11px; }
  .strata-stats { gap: 9px; }
  .strata-stat { padding: 15px 12px; border-radius: 10px; }
  .strata-stat-top { font-size: 10px; }
  .strata-stat-top .strata-icon { display: none; }
  .strata-stat-value { font-size: 28px; }
  .strata-stat-note { display: none; }
  .strata-scope-banner { padding: 13px; gap: 9px; margin-bottom: 23px; }
  .strata-scope-symbol { display: none; }
  .strata-scope-copy > span { font-size: 11px; }
  .strata-scope-banner .strata-button { font-size: 10px !important; }
  .strata-panel-heading { padding: 18px; }
  .strata-toolbar { padding: 0 18px 16px; flex-wrap: wrap; }
  .strata-search { flex-basis: 100%; }
  .strata-kind-select { width: 100%; flex-basis: 100%; }
  .strata-record { padding: 16px 18px; gap: 11px; }
  .strata-record-symbol { display: none; }
  .strata-record-title { gap: 6px; }
  .strata-form { padding-inline: 18px; }
  .strata-form-grid, .strata-scope-options, .strata-transfer-grid { grid-template-columns: 1fr; }
  .strata-scope-options { gap: 11px; }
  .strata-choice { padding: 18px; }
  .strata-choice-symbol { margin-bottom: 11px; }
  .strata-input-actions { flex-wrap: wrap; }
  .strata-input-actions .strata-input { flex-basis: 100%; }
  .strata-folder-fields { padding: 17px; }
  .strata-transfer-card { padding: 23px; }
  .strata-preview-stats { padding-inline: 18px; grid-template-columns: repeat(2, 1fr); }
  .strata-preview-footer { flex-direction: column; align-items: stretch; padding: 18px; }
  .strata-preview-footer .strata-button-group { justify-content: flex-end; }
  .strata-principles { grid-template-columns: 1fr; gap: 18px; }
  .strata-principle { display: grid; grid-template-columns: 22px 1fr; column-gap: 11px; padding: 0; }
  .strata-principle .strata-icon { grid-row: span 2; margin-top: 2px; }
  .strata-principle p { margin-top: 2px; }
  .strata-toggle-row { padding-inline: 18px; }
  .strata-dialog-head, .strata-dialog-body, .strata-dialog-actions { padding-inline: 20px; }
  .strata-dialog .strata-form-grid { gap: 0; }
  .strata-notifications { right: 16px; bottom: 16px; }
}
@media (prefers-reduced-motion: reduce) {
  .strata-app *, .strata-app *::before, .strata-app *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; scroll-behavior: auto !important; }
}
`;

// client/host-entry.mjs
var name = "dsh-strata";
var inject = ["slots", "connection"];
function apply(ctx) {
  const request = async (method, params = {}) => {
    const response = await ctx.connection.rpc.call("/strata", method, params);
    if (!response.ok) {
      const error = new Error(response.error?.message ?? "\u8BB0\u5FC6\u670D\u52A1\u8BF7\u6C42\u5931\u8D25\u3002");
      error.code = response.error?.code;
      throw error;
    }
    return response.value;
  };
  function StrataSection() {
    const container = (0, import_react.useRef)(null);
    (0, import_react.useEffect)(() => {
      const style = document.createElement("style");
      style.dataset.strataSettings = "true";
      style.textContent = settings_default;
      document.head.append(style);
      let disposed = false;
      let mounted;
      const disposeMounted = () => {
        if (typeof mounted === "function") mounted();
        else mounted?.destroy?.();
      };
      Promise.resolve(mountStrataSettings(container.current, { request, theme: "host" })).then((value) => {
        mounted = value;
        if (disposed) disposeMounted();
      }).catch((error) => {
        if (!disposed && container.current) container.current.textContent = error.message ?? "\u65E0\u6CD5\u8F7D\u5165\u8BB0\u5FC6\u8BBE\u7F6E\u3002";
      });
      return () => {
        disposed = true;
        disposeMounted();
        style.remove();
      };
    }, []);
    return (0, import_react.createElement)("div", { ref: container, style: { minWidth: 0, width: "100%" } });
  }
  ctx.slots.inject("settings.section", () => ctx.slots.register({
    name: "settings.section",
    id: "dsh-strata",
    order: 55,
    label: () => "\u8BB0\u5FC6\u5730\u5C42"
  }, StrataSection));
}

return module.exports;
}});
