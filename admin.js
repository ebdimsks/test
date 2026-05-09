(() => {
  "use strict";

  /* ============================================================
   * Utility
   * ============================================================ */
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];

  const el = (tag, attrs = {}, children = []) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null) continue;
      if (k in n) n[k] = v;
      else n.setAttribute(k, String(v));
    }
    (Array.isArray(children) ? children : [children]).forEach(c =>
      n.append(c instanceof Node ? c : document.createTextNode(String(c)))
    );
    return n;
  };

  const rand = n => Math.floor(Math.random() * n);
  const randIp = () => `${rand(256)}.${rand(256)}.${rand(256)}.${rand(256)}`;
  const randStr = l =>
    [...crypto.getRandomValues(new Uint8Array(l))]
      .map(c => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[c % 62])
      .join("");

  const trim1 = v => v.replace(/\s+/g, " ").trim();
  const trimBody = v => v.replace(/\r\n/g, "\n").trim();

  const requireInput = (v, label) => {
    const t = v.trim();
    if (!t) throw new Error(`${label}を入力してください。`);
    return t;
  };
  const enforceLen = (v, max, label) => {
    if (v.length > max) throw new Error(`${label}は${max}文字以内で入力してください。`);
    return v;
  };
  const validateThreadId = v => {
    const t = v.trim();
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(t))
      throw new Error("スレIDは英数字・アンダースコア・ハイフンのみです。");
    return t;
  };

  /* ============================================================
   * GAS Call
   * ============================================================ */
  const callServer = (method, ...args) =>
    new Promise((res, rej) => {
      const g = window.google?.script?.run;
      if (!g) return rej(new Error("google.script.run が利用できません。"));
      try {
        g.withSuccessHandler(res)
         .withFailureHandler(err => rej(err instanceof Error ? err : new Error(String(err))))
         [method](...args);
      } catch (e) {
        rej(e instanceof Error ? e : new Error(String(e)));
      }
    });

  /* ============================================================
   * Styles — **UI破綻完全修正版**
   * ============================================================ */
  const injectStyles = () => {
    if (document.getElementById("admin-panel-styles")) return;

    const s = document.createElement("style");
    s.id = "admin-panel-styles";

    s.textContent = `
      #admin-panel, #admin-panel * {
        box-sizing: border-box !important;
      }

      #admin-panel {
        --bg-base: rgba(22, 24, 32, 0.75);
        --bg-header: rgba(32, 34, 44, 0.88);
        --bg-card: rgba(255,255,255,0.06);
        --bg-input: rgba(0,0,0,0.22);
        --border: rgba(255,255,255,0.10);
        --border-focus: #6366f1;
        --text-main: #f3f4f6;
        --text-sub: #a1a1aa;

        position: fixed;
        right: 24px;
        bottom: 24px;
        width: 340px;
        background: var(--bg-base);
        backdrop-filter: blur(26px) saturate(180%);
        -webkit-backdrop-filter: blur(26px) saturate(180%);
        border-radius: 16px;
        border: 1px solid var(--border);
        color: var(--text-main);
        overflow: hidden;
        z-index: 2147483647;
        font-family: "Inter", system-ui, sans-serif;
        font-size: 14px;
        box-shadow:
          0 22px 50px rgba(0,0,0,0.55),
          inset 0 1px 0 rgba(255,255,255,0.06);
      }

      .adm-header {
        padding: 14px 18px;
        background: var(--bg-header);
        border-bottom: 1px solid var(--border);
        font-weight: 600;
        font-size: 15px;
        letter-spacing: .02em;
      }

      /* Tabs */
      .adm-tabs {
        display: grid;
        grid-template-columns: repeat(3,1fr);
        gap: 6px;
        padding: 8px 12px 0;
      }
      .adm-tab {
        border: none;
        padding: 10px 6px;
        border-radius: 10px;
        background: rgba(255,255,255,0.04);
        color: var(--text-sub);
        font-weight: 500;
        cursor: pointer;
        transition: all .2s;
      }
      .adm-tab:hover {
        background: rgba(255,255,255,0.07);
      }
      .adm-tab.is-active {
        background: rgba(255,255,255,0.12);
        color: var(--text-main);
        box-shadow: 0 3px 12px rgba(0,0,0,0.35);
      }

      /* Content */
      .adm-content {
        display: none;
        padding: 16px 16px 12px;
      }
      .adm-content.is-active {
        display: block;
      }

      /* Field */
      .adm-field { margin-bottom: 14px; }

      .adm-label {
        margin-bottom: 6px;
        display: block;
        color: var(--text-sub);
        font-size: 11px;
        font-weight: 500;
      }

      .adm-input,
      .adm-select,
      .adm-textarea {
        width: 100%;
        padding: 11px 12px;
        border-radius: 10px;
        border: 1px solid var(--border);
        background: var(--bg-input);
        color: var(--text-main);
        font-size: 13px;
        outline: none;
        transition: 0.2s;
      }

      .adm-input:focus,
      .adm-select:focus,
      .adm-textarea:focus {
        border-color: var(--border-focus);
        background: rgba(255,255,255,0.12);
        box-shadow: 0 0 0 2px rgba(99,102,241,0.25);
      }

      /* ▼ select の白飛び完全対策 */
      .adm-select option {
        background-color: rgba(20,20,26,0.95);
        color: #f3f4f6;
      }
      .adm-select option:hover,
      .adm-select option:checked {
        background-color: rgba(40,42,52,1) !important;
        color: #fff !important;
      }
      /* ▲ select 完全修正 */

      .adm-textarea {
        min-height: 85px;
        resize: vertical;
      }

      /* Buttons */
      .adm-btn {
        width: 100%;
        padding: 12px;
        border: none;
        border-radius: 12px;
        margin-top: 4px;
        color: #fff;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 6px 18px rgba(0,0,0,0.32);
        transition: 0.2s;
      }
      .adm-btn:hover { transform: translateY(-1px); }
      .adm-btn:active { transform: translateY(0); }

      .btn-create { background: linear-gradient(135deg,#10b981,#0d8e68); }
      .btn-post   { background: linear-gradient(135deg,#3b82f6,#2c66d8); }
      .btn-chat   { background: linear-gradient(135deg,#ec4899,#c73d86); }

      .adm-error {
        min-height: 20px;
        text-align: center;
        color: #f87171;
        font-size: 12px;
        padding-bottom: 10px;
      }
    `;

    document.head.appendChild(s);
  };

  /* ============================================================
   * UI Builder
   * ============================================================ */
  const UI = {
    label: (t, f) => el("label", { className: "adm-label", htmlFor: f, textContent: t }),
    field: c => el("div", { className: "adm-field" }, c),

    input: (id, ph, max) =>
      el("input", { id, className: "adm-input", placeholder: ph, maxLength: max }),

    textarea: (id, ph, max, rows) =>
      el("textarea", { id, className: "adm-textarea", placeholder: ph, maxLength: max, rows }),

    select: (id, opts) =>
      el("select", { id, className: "adm-select" },
        opts.map(([v, t]) => el("option", { value: v, textContent: t }))
      ),

    button: (label, cls, action) =>
      el("button", { className: `adm-btn ${cls}`, "data-action": action, textContent: label }),
  };

  const buildPanel = () =>
    el("section", { id: "admin-panel" }, [
      el("div", { className: "adm-header", textContent: "⚡ 6ch Admin Control" }),

      el("nav", { className: "adm-tabs", role: "tablist" }, [
        el("button", { className: "adm-tab is-active", "data-tab": "thread", role: "tab", "aria-selected": "true", textContent: "スレ作成" }),
        el("button", { className: "adm-tab", "data-tab": "post",   role: "tab", "aria-selected": "false", textContent: "スレ投稿" }),
        el("button", { className: "adm-tab", "data-tab": "chat",   role: "tab", "aria-selected": "false", textContent: "チャット" }),
      ]),

      el("section", { className: "adm-content is-active", "data-tab": "thread", role: "tabpanel" }, [
        UI.field([UI.label("スレタイトル","adm-thread-title"), UI.input("adm-thread-title","管理者スレ",120)]),
        UI.field([UI.label("制限設定","adm-thread-limit"), UI.select("adm-thread-limit",[["unlimited","制限なし"],["limited","制限あり"]])]),
        UI.button("スレ作成","btn-create","create-thread")
      ]),

      el("section", { className: "adm-content", "data-tab": "post", role: "tabpanel" }, [
        UI.field([UI.label("ユーザー名","adm-post-username"), UI.input("adm-post-username","未入力で名無し",40)]),
        UI.field([UI.label("スレID","adm-post-threadid"), UI.input("adm-post-threadid","例: thread_1234",64)]),
        UI.field([UI.label("本文","adm-post-body"), UI.textarea("adm-post-body","本文",1000,4)]),
        UI.button("投稿する","btn-post","send-post"),
      ]),

      el("section", { className: "adm-content", "data-tab": "chat", role: "tabpanel" }, [
        UI.field([UI.label("ユーザー名","adm-chat-username"), UI.input("adm-chat-username","未入力で名無し",40)]),
        UI.field([UI.label("チャット本文","adm-chat-body"), UI.textarea("adm-chat-body","チャット文",1000,3)]),
        UI.button("チャット送信","btn-chat","send-chat")
      ]),

      el("div", { className: "adm-error", "data-role": "error" })
    ]);

  /* ============================================================
   * Busy Controller
   * ============================================================ */
  const setBusy = (panel, busy, msg="") => {
    qs("[data-role='error']", panel).textContent = msg;
    panel.setAttribute("aria-busy", String(busy));
    qsa("button", panel).forEach(b => (b.disabled = busy));
  };

  const execute = async (panel, fn) => {
    setBusy(panel, true);
    try {
      await fn();
      setBusy(panel, false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setBusy(panel, false, msg);
      alert(msg);
    }
  };

  /* ============================================================
   * Actions
   * ============================================================ */
  const Actions = {
    "create-thread": async () => {
      const title = enforceLen(trim1(requireInput(qs("#adm-thread-title").value,"スレタイトル")),120,"スレタイトル");
      const isSpecial = qs("#adm-thread-limit").value === "unlimited";
      await callServer("createThread", title, isSpecial, randIp());
      qs("#adm-thread-title").value = "";
    },

    "send-post": async () => {
      const name = enforceLen(trim1(qs("#adm-post-username").value || "名無しさん"),40,"ユーザー名");
      const tid  = validateThreadId(requireInput(qs("#adm-post-threadid").value,"スレID"));
      const body = enforceLen(trimBody(requireInput(qs("#adm-post-body").value,"本文")),1000,"本文");
      await callServer("addPost", tid, name, body, randIp(), true);
      qs("#adm-post-body").value = "";
    },

    "send-chat": async () => {
      const name = enforceLen(trim1(qs("#adm-chat-username").value || "名無しさん"),40,"ユーザー名");
      const body = enforceLen(trimBody(requireInput(qs("#adm-chat-body").value,"本文")),1000,"本文");
      await callServer("addChatMessage", name, body, randIp(), true);
      qs("#adm-chat-body").value = "";
    },
  };

  /* ============================================================
   * Tab Switcher
   * ============================================================ */
  const bindTabSwitch = panel => {
    panel.addEventListener("click", e => {
      const tab = e.target.closest("[data-tab][role='tab']");
      if (!tab) return;

      const target = tab.dataset.tab;

      qsa("[data-tab][role='tab']", panel).forEach(btn => {
        const active = btn.dataset.tab === target;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-selected", active);
      });

      qsa(".adm-content", panel).forEach(sec =>
        sec.classList.toggle("is-active", sec.dataset.tab === target)
      );

      setBusy(panel, false);
    });
  };

  /* ============================================================
   * Button Bind
   * ============================================================ */
  const bindActions = panel => {
    panel.addEventListener("click", e => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      execute(panel, () => Actions[btn.dataset.action](panel));
    });
  };

  /* ============================================================
   * Storage Loop
   * ============================================================ */
  const startStorageLoop = () => {
    localStorage.setItem("access_denied", "false");
    localStorage.setItem("agreed_to_terms", "true");

    setInterval(() => {
      localStorage.setItem("gas_bbs_seed", randStr(16));
      localStorage.setItem("online_user_id", randStr(16));
      sessionStorage.setItem("online_session_id", randStr(16));
    }, 100);
  };

  /* ============================================================
   * Init
   * ============================================================ */
  const init = () => {
    qs("#admin-panel")?.remove();
    injectStyles();

    const panel = buildPanel();
    document.body.appendChild(panel);

    bindTabSwitch(panel);
    bindActions(panel);
    startStorageLoop();
  };

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init, { once: true })
    : init();
})();
