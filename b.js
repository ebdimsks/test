let currentSheetName = "";
    let autoRefreshInterval = null;
    let isSubmitting = false;
    let isRefreshing = false;
    let myHashedId = "";
    let lastThreadCreateTime = 0;
    
    function getUserSeed() {
      let seed = localStorage.getItem('gas_bbs_seed');
      if (!seed) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        seed = '';
        for (let i = 0; i < 32; i++) {
          seed += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        localStorage.setItem('gas_bbs_seed', seed);
      }
      return seed;
    }
    
    const userSeed = getUserSeed(); 

    // 【追加】ランダムな文字列を生成する関数（ダミーIP用）
    function generateRandomString(length = 16) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return "RNDIP_" + result;
    }

window.onload = async () => {
  // アプリ起動と同時に管理者用パネルを追加
  startApp();
  injectAdminPanel(); 
};

// 【追加】画面右下に管理者用の連投ツールUIを追加する関数
function injectAdminPanel() {
  const panel = document.createElement('div');
  panel.style.cssText = "position:fixed; bottom:15px; right:15px; background:rgba(0,0,0,0.85); color:#fff; padding:15px; border-radius:8px; z-index:9999; font-family:sans-serif; font-size:14px; box-shadow: 0 4px 10px rgba(0,0,0,0.5);";
  panel.innerHTML = `
    <div style="font-weight:bold; margin-bottom:10px; color:#f39c12; border-bottom:1px solid #555; padding-bottom:5px;">🛠️ 管理者ツール (制限解除済)</div>
    <button onclick="adminAutoThread()" style="width:100%; margin-bottom:8px; padding:5px; cursor:pointer; background:#3498db; color:white; border:none; border-radius:4px;">連続スレ立て</button>
    <button onclick="adminAutoPost()" style="width:100%; margin-bottom:8px; padding:5px; cursor:pointer; background:#e74c3c; color:white; border:none; border-radius:4px;">連続投稿 (スレ)</button>
    <button onclick="adminAutoChat()" style="width:100%; padding:5px; cursor:pointer; background:#2ecc71; color:white; border:none; border-radius:4px;">連続投稿 (チャット)</button>
  `;
  document.body.appendChild(panel);
}

// 【追加】連続スレ立て機能
function adminAutoThread() {
  const count = parseInt(prompt("連続作成するスレッド数を入力してください:", "5"));
  if (!count || isNaN(count)) return;
  const baseTitle = prompt("スレッドの基本タイトルを入力:", "【テスト】管理者スレッド");
  if (!baseTitle) return;

  let c = 0;
  const interval = setInterval(() => {
    if (c >= count) {
      clearInterval(interval);
      alert(count + "件のスレッドを作成しました。");
      loadThreads();
      return;
    }
    const randomIp = generateRandomString();
    google.script.run.createThread(baseTitle + " " + (c+1), false, randomIp);
    c++;
  }, 300); // 0.3秒間隔で高速送信
}

// 【追加】連続投稿（スレッド）機能
function adminAutoPost() {
  if (!currentSheetName) return alert("スレッドを開いてから実行してください。");
  const count = parseInt(prompt("連続投稿する回数を入力してください:", "10"));
  if (!count || isNaN(count)) return;
  const text = prompt("投稿内容を入力してください:", "テスト連投");
  if (!text) return;

  let c = 0;
  const interval = setInterval(() => {
    if (c >= count) {
      clearInterval(interval);
      alert(count + "件の投稿を完了しました。");
      refreshCurrentThread(true);
      return;
    }
    const randomIp = generateRandomString();
    google.script.run.addPost(currentSheetName, "管理者", text + " [" + (c+1) + "/" + count + "]", randomIp, true);
    c++;
  }, 300);
}

// 【追加】連続投稿（チャット）機能
function adminAutoChat() {
  const count = parseInt(prompt("チャットに連続送信する回数を入力してください:", "10"));
  if (!count || isNaN(count)) return;
  const text = prompt("チャット内容を入力してください:", "チャットテスト連投");
  if (!text) return;

  let c = 0;
  const interval = setInterval(() => {
    if (c >= count) {
      clearInterval(interval);
      alert(count + "件のチャット送信を完了しました。");
      refreshChat();
      return;
    }
    const randomIp = generateRandomString();
    google.script.run.addChatMessage("管理者", text + " [" + (c+1) + "]", randomIp, true);
    c++;
  }, 300);
}

function getBrowserId() {
  let id = localStorage.getItem("online_user_id");
  if (!id) {
    id = "U_" + crypto.randomUUID();
    localStorage.setItem("online_user_id", id);
  }
  return id;
}

function getOnlineSessionId() {
  let id = sessionStorage.getItem("online_session_id");
  if (!id) {
    id = "S_" + crypto.randomUUID();
    sessionStorage.setItem("online_session_id", id);
  }
  return id;
}

function checkBanAndStart(ip) {
  startApp(); // BAN判定完全スキップ
}

function renderBlockPage(id) {
  // 使用しません
}

function startApp() {
  const browserId = getBrowserId();
  google.script.run
    .withSuccessHandler(mode => {
      if (mode !== "ok") applyMaintenanceUI(); 
    })
    .getMaintenanceStatus();
  loadThreads();
  updateOnlineCount(browserId);
  setInterval(() => updateOnlineCount(browserId), 30000);
}

function loadThreads() {
  const container = document.getElementById('thread-container');
  container.innerHTML = "スレッドを読み込み中...";

  google.script.run
    .withSuccessHandler(threads => {
      if (!threads || threads.length === 0) {
        container.innerHTML = "スレッドがまだありません。";
        return;
      }

      container.innerHTML = threads.map(t => {
        const title = String(t[0] ?? "");
        const updateTime = String(t[1] ?? "");
        const sheetName = String(t[2] ?? "");
        const resCount = Number(t[3] ?? 0);
        const isSpecial = !!t[4];

        const titleColor = isSpecial ? "#ff0000" : "#0000ff";
        const label = isSpecial ? "<span style='color:red; font-size:0.7em; border:1px solid red; padding:0 2px; margin-right:4px; vertical-align:middle;'>制限なし</span>" : "";

        return `
          <div class="thread-list-item" onclick='confirmAndOpen(${JSON.stringify(sheetName)}, ${JSON.stringify(title)}, ${isSpecial})'>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                ${label}<span style="font-weight: bold; color: ${titleColor};">${escapeHtml(title)}</span> 
                <span style="color: #cc0000; font-weight: bold; margin-left: 5px;">(${resCount})</span>
              </div>
              <div style="font-size: 0.75em; color: #888; text-align: right; line-height: 1.2;">
                ID: <span style="color: #444;">${escapeHtml(sheetName)}</span><br>
                [${escapeHtml(updateTime)}]
              </div>
            </div>
          </div>
        `;
      }).join('');
    })
    .withFailureHandler(err => {
      container.innerHTML = "エラー: " + escapeHtml(err.message || String(err));
    })
    .getThreadList();
}

let isSpecialThread = false;

function confirmAndOpen(sheetName, title, isSpecial) {
  isSpecialThread = isSpecial;
  openThread(sheetName, title);
}

function makeThread() {
  const input = document.getElementById('new-thread-title');
  const check = document.getElementById('special-thread-check');

  const title = removeZalgo(input.value).trim();
  const isSpecial = check ? check.checked : false;

  if (!title) return alert("スレッド名を入力してください。");

  // スレ立て時もランダムIPを送信
  const currentRandomIp = generateRandomString();

  google.script.run
    .withSuccessHandler(() => {
      loadThreads();
      input.value = "";
      if (check) check.checked = false;
      alert("スレッドを作成しました。");
    })
    .withFailureHandler(err => {
      alert("失敗: " + err.message);
    })
    .createThread(title, isSpecial, currentRandomIp);
}

function openThread(sheetName, title) {
  currentSheetName = sheetName;

  document.getElementById('view-list').classList.add('hidden');
  document.getElementById('view-thread').classList.remove('hidden');
  document.getElementById('current-thread-title').innerText = removeZalgo(title);
  document.getElementById('post-container').innerHTML = "読み込み中...";

  const postContentArea = document.getElementById('post-content');
  const submitBtn = document.getElementById('submit-btn');

  postContentArea.value = "";
  postContentArea.disabled = false;
  postContentArea.placeholder = "内容を入力してください";
  
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerText = "書き込む";
  }

  refreshCurrentThread();

  if (autoRefreshInterval) clearInterval(autoRefreshInterval);
  autoRefreshInterval = setInterval(refreshCurrentThread, 10000);
}

function refreshCurrentThread(ignoreLimit = false) {
  if (!currentSheetName) return;
  document.getElementById('status-msg').innerText = "更新中...";

  google.script.run
    .withSuccessHandler(data => {
      if (data && typeof data === "object") {
        myHashedId = data.yourId || myHashedId;
        renderPosts(data);
      } else if (Array.isArray(data)) {
        renderPosts({ posts: data });
      }
      document.getElementById('status-msg').innerText = "10秒ごとに自動更新中";
    })
    .withFailureHandler(err => {
      document.getElementById('status-msg').innerText = "更新エラー";
    })
    .getPosts(currentSheetName, userSeed, true); 
}

function hasAgreed() {
  return true; // 規約同意をスキップ
}

function toggleLoading(isLoading) {
  const submitBtn = document.getElementById('submit-btn');
  submitBtn.innerText = isLoading ? "送信中..." : "書き込む";
}

async function sendPost() {
  const isAdmin = true;

  const nameInput = document.getElementById('user-name');
  const contentArea = document.getElementById('post-content');

  let rawName = (nameInput.value || "").trim() || "管理者";
  let content = removeZalgo(contentArea.value || "");
  const trimmedContent = content.trim();

  if (!trimmedContent) {
    return alert("本文を入力してください。");
  }

  toggleLoading(true);
  
  // 送信のたびにランダムなIP文字列を生成して送る
  const currentRandomIp = generateRandomString();

  google.script.run
    .withSuccessHandler(data => {
      if (data && typeof data === "object") {
        myHashedId = data.yourId || myHashedId;
        renderPosts(data);
      } else if (Array.isArray(data)) {
        renderPosts({ posts: data });
      }
      contentArea.value = "";
      toggleLoading(false);
      refreshCurrentThread(true);
    })
    .withFailureHandler(err => {
      alert("送信エラー: " + (err.message || String(err)));
      toggleLoading(false);
    })
    .addPost(currentSheetName, rawName, content, currentRandomIp, isAdmin);
}

function agreeTerms() {
  localStorage.setItem('agreed_to_terms', 'true');
  const modal = document.getElementById('terms-modal');
  if (modal) modal.style.display = 'none';
  sendPost();
}

function renderPosts(data) {
  const container = document.getElementById('post-container');
  const postContentArea = document.getElementById('post-content');
  const submitBtn = document.getElementById('submit-btn');

  const payload = Array.isArray(data) ? { posts: data } : (data || {});
  const posts = payload.posts || [];
  const masterId = payload.masterId || null;

  if (!posts || posts.length === 0) {
    container.innerHTML = "まだ書き込みがありません。";
    return;
  }

  // 管理者は1000レスを超えても書き込める
  postContentArea.disabled = false;
  postContentArea.placeholder = "管理者として書き込み可能";
  if (submitBtn) submitBtn.disabled = false;

  const rendered = posts.slice().reverse().map((p, i) => {
    const resNum = posts.length - i;
    const currentId = String(p.userId || p.uid || "不明");
    const rawName = String(p.name || "名無しさん");

    const isStealth = rawName.includes(" [S]");

    let nameColor = "#008000";
    if (masterId && currentId === masterId) nameColor = "#0000ff";
    if (currentId.includes('★')) nameColor = "#ff1493";
    else if (currentId.includes('+admin')) nameColor = "#ff8c00";
    else if (currentId.includes('+MOD')) nameColor = "#800080"; 

    const cleanName = rawName.replace(" [S]", "");
    const stealthWarning = isStealth ? ` <span style="color:red; font-size:0.8em;">[連投判定(Stealth)]</span>` : "";

    const displayBody = renderPostContent(p.content || "");

    return `
      <div class="post-item" id="res-${resNum}">
        <div class="post-header">
          <span class="post-num" style="color:#777;">${resNum}</span> ：
          <b style="color:${nameColor}; font-weight:bold;">${escapeHtml(removeZalgo(cleanName))}</b> 
          <span style="color:#666; font-size:0.9em; font-weight:normal;"> ID:${escapeHtml(currentId)}</span> 
          <span style="color:#888; font-size:0.8em; font-weight:normal;"> ：${escapeHtml(p.date || "")}</span>
          ${stealthWarning}
          <span style="cursor:pointer; color:#888; margin-left:10px;" onclick="addAnchor(${resNum})">[返信]</span>
        </div>
        <div class="post-body">${displayBody}</div>
      </div>`;
  }).filter(Boolean).join('');

  container.innerHTML = rendered || "表示できる投稿がありません。";
  document.getElementById('status-msg').innerText = "自動更新中";
}

function renderPostContent(rawText) {
  let text = escapeHtml(removeZalgo(String(rawText || "")));
  const images = [];
  text = text.replace(/\[img:(https?:\/\/[\w\.\/-]+\.(?:png|jpg|jpeg|gif|webp)):(0|1)\]/gi, (match, url, blurBit) => {
    const idx = images.length;
    images.push(buildImageHtml(url, blurBit === '1'));
    return `__IMG_PLACEHOLDER_${idx}__`;
  });
  text = parseAnchor(text);
  images.forEach((html, idx) => {
    text = text.replace(`__IMG_PLACEHOLDER_${idx}__`, html);
  });
  return text;
}

function buildImageHtml(url, isBlur) {
  const safeUrl = escapeHtml(url);
  const blurClass = isBlur ? 'img-blur' : '';
  return `
    <br>
    <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">
      <img src="${safeUrl}" class="posted-img ${blurClass}" style="max-width:300px; cursor:pointer;" onclick="if(this.classList.contains('img-blur')){ event.preventDefault(); this.classList.remove('img-blur'); }">
    </a>
  `;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function parseAnchor(text) {
  let processed = text.replace(/&gt;&gt;(\d+)/g, (match, p1) => {
    return `<span style="color: #dd0000; cursor: pointer;" onclick="scrollToRes(${p1})">>>${p1}</span>`;
  });
  const urlRegex = /(https?:\/\/[\w\/:%#\$&\?\(\)~\.=\+\-;]+)(?=\s|$|<)/g;
  processed = processed.replace(urlRegex, (url) => {
    let cleanUrl = url;
    let suffix = "";
    const m = url.match(/^(.*)(%[^0-9a-fA-F].*|%[0-9a-fA-F]?$|%)$/);
    if (m) {
      cleanUrl = m[1];
      suffix = url.substring(m[1].length);
    }
    if (!cleanUrl || cleanUrl.length < 8) return url;
    return `<a href="#" class="safe-link" data-url="${escapeHtml(cleanUrl)}">${escapeHtml(cleanUrl)}</a>${escapeHtml(suffix)}`;
  });
  return processed;
}

function removeZalgo(s) {
  if (!s) return "";
  return String(s).normalize('NFD').replace(/[\u0300-\u036f\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f\u0483-\u0489\u0591-\u05bd\u0610-\u061a\u064b-\u065f\u0816-\u082d\u0900-\u0903\u093a-\u094f\u200b-\u200f\u2028-\u202e\ufeff]/g, "").normalize('NFC');
}

function scrollToRes(num) {
  const target = document.getElementById('res-' + num);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.style.backgroundColor = '#ffffcc';
    setTimeout(() => { target.style.backgroundColor = 'transparent'; }, 2000);
  }
}

function updateOnlineCount() {
  const userSeed = getOnlineSessionId();
  google.script.run
    .withSuccessHandler(count => {
      const el = document.getElementById('online-count');
      if (el) el.innerText = count;
    })
    .getOnlineUserCount(userSeed);
}

function safeRedirect(url) {
  try {
    const parsed = new URL(url, window.location.href);
    if (!/^https?:$/.test(parsed.protocol)) return alert("安全なURLではないため開けません。");
    window.open(parsed.href, "_blank", "noopener,noreferrer");
  } catch (e) {
    alert("無効なURLです。");
  }
}

function toggleGuideline() {
  const modal = document.getElementById('guideline-modal');
  if (modal) modal.classList.toggle('hidden');
}

function addAnchor(num) {
  const contentArea = document.getElementById('post-content');
  if (contentArea) {
    const currentText = contentArea.value;
    if (currentText && !currentText.endsWith('\n')) {
      contentArea.value += '\n>>' + num + '\n';
    } else {
      contentArea.value += '>>' + num + '\n';
    }
    contentArea.focus();
  }
}

function showStatus() {
  document.getElementById('view-list').classList.add('hidden');
  document.getElementById('view-thread').classList.add('hidden');
  document.getElementById('view-status').classList.remove('hidden');

  google.script.run
    .withSuccessHandler(mode => {
      const statusItems = document.querySelectorAll('#view-status .status-card > div');
      statusItems.forEach(item => {
        const indicator = item.querySelector('.status-indicator');
        const labelText = item.querySelector('strong');
        if (indicator && labelText) {
          const category = labelText.innerText.split('：')[0]; 
          if (category.includes("暇つぶしゲーム")) return;
          let className = mode === "maint" ? "status-indicator status-maint" : (mode === "stop" ? "status-indicator status-offline" : "status-indicator status-online");
          let statusTag = mode === "maint" ? "メンテナンス中" : (mode === "stop" ? "サービス停止中" : "正常稼働中");
          item.innerHTML = `<span class="${className}"></span> <strong>${category}：</strong> ${statusTag}`;
        }
      });
      const timeEl = document.getElementById('last-check-time');
      if (timeEl) timeEl.innerText = new Date().toLocaleString();
    })
    .getMaintenanceStatus();
}

function showList() {
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);
  if (gamePollingInterval) clearInterval(gamePollingInterval);
  if (chatPollingInterval) clearInterval(chatPollingInterval); 

  document.getElementById('view-list').classList.remove('hidden');
  document.getElementById('view-thread').classList.add('hidden');
  document.getElementById('view-status').classList.add('hidden');
  document.getElementById('view-game').classList.add('hidden');
  document.getElementById('view-chat').classList.add('hidden');

  loadThreads();
}

function toggleMaintSchedule() {
  const scheduleArea = document.getElementById('maint-schedule');
  if (scheduleArea) {
    scheduleArea.classList.toggle('hidden');
    event.target.innerText = scheduleArea.classList.contains('hidden') ? "メンテナンス予定を確認" : "予定を閉じる";
  }
}

function applyMaintenanceUI() {
  // 管理者用は無視
}

let gamePollingInterval = null;

function toggleGame() {
  document.getElementById('view-list').classList.add('hidden');
  document.getElementById('view-thread').classList.add('hidden');
  document.getElementById('view-status').classList.add('hidden');
  document.getElementById('view-game').classList.remove('hidden');
  initBoard();
  startGamePolling();
}

function initBoard() {
  const board = document.getElementById('ttt-board');
  board.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.className = 'ttt-cell';
    cell.id = 'ttt-' + i;
    cell.onclick = () => handleMove(i);
    board.appendChild(cell);
  }
}

function startGamePolling() {
  if (gamePollingInterval) clearInterval(gamePollingInterval);
  updateGameStatus();
  gamePollingInterval = setInterval(updateGameStatus, 2000); 
}

function updateGameStatus() {
  google.script.run.withSuccessHandler(state => {
    const info = document.getElementById('game-info');
    if (state.lastWinner === "相手の切断によりリセットされました") return google.script.run.resetGame();
    const pIndex = state.players.indexOf(userSeed);
    if (pIndex !== -1) {
      const myMark = pIndex === 0 ? 'O' : 'X';
      info.innerHTML = state.players.length < 2 ? `<b style="color:orange;">待機中... (${myMark})</b>` : `対戦中：<b>${myMark}</b> ${state.turn === myMark ? '<b style="color:red;">[あなたの番]</b>' : '[相手の番]'}`;
    } else {
      info.innerHTML = `順番待ち：<b>${state.waiting.indexOf(userSeed) + 1}番目</b>`;
    }
    state.board.forEach((mark, i) => {
      const el = document.getElementById('ttt-' + i);
      el.innerText = mark || '';
      el.className = 'ttt-cell ' + (mark || '');
      if (mark === 'O' && state.historyO[0] === i && state.historyO.length === 3) el.classList.add('old-O');
      if (mark === 'X' && state.historyX[0] === i && state.historyX.length === 3) el.classList.add('old-X');
    });
    if (state.lastWinner) {
      alert(state.lastWinner === (state.players[0] === userSeed ? 'O' : 'X') ? "勝利！" : "敗北...");
      google.script.run.resetGame();
    }
  }).getGameState(userSeed);
}

function handleMove(index) {
  google.script.run.withSuccessHandler(res => {
    if (res.error) alert(res.error);
    updateGameStatus();
  }).makeMove(userSeed, index);
}

document.addEventListener("click", function(e) {
  const link = e.target.closest(".safe-link");
  if (!link) return;
  e.preventDefault(); 
  const url = link.getAttribute("data-url");
  if (url) safeRedirect(url);
});

function showrule() { /* スキップ */ }

let chatPollingInterval = null;

function toggleChat() {
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);
  if (gamePollingInterval) clearInterval(gamePollingInterval);
  
  document.getElementById('view-list').classList.add('hidden');
  document.getElementById('view-thread').classList.add('hidden');
  document.getElementById('view-status').classList.add('hidden');
  document.getElementById('view-game').classList.add('hidden');
  document.getElementById('view-chat').classList.remove('hidden');

  refreshChat();
  if (chatPollingInterval) clearInterval(chatPollingInterval);
  chatPollingInterval = setInterval(refreshChat, 3000);
}

function refreshChat() {
  document.getElementById('chat-status-msg').innerText = "更新中...";
  google.script.run
    .withSuccessHandler(data => {
      renderChatPosts(data);
      setTimeout(() => document.getElementById('chat-status-msg').innerText = "3秒ごとに自動更新中", 500); 
    })
    .withFailureHandler(err => {
      document.getElementById('chat-status-msg').innerText = "更新エラー";
    })
    .getChatMessages(userSeed);
}

async function sendChatMessage() {
  const isAdmin = true;
  const nameInput = document.getElementById('chat-user-name');
  const contentArea = document.getElementById('chat-post-content');

  let rawName = (nameInput.value || "").trim() || "管理者";
  let content = removeZalgo(contentArea.value || "").trim();

  if (!content) return alert("本文を入力してください。");

  const submitBtn = document.getElementById('chat-submit-btn');
  submitBtn.innerText = "送信中...";

  // チャットも都度ランダムIP
  const currentRandomIp = generateRandomString();

  google.script.run
    .withSuccessHandler(data => {
      renderChatPosts(data);
      contentArea.value = "";
      submitBtn.innerText = "チャットを送信";
    })
    .withFailureHandler(err => {
      alert("送信エラー: " + (err.message || String(err)));
      submitBtn.innerText = "チャットを送信";
    })
    .addChatMessage(rawName, content, currentRandomIp, isAdmin);
}

function renderChatPosts(data) {
  const container = document.getElementById('chat-post-container');
  const payload = Array.isArray(data) ? { posts: data } : (data || {});
  const posts = payload.posts || [];

  if (!posts || posts.length === 0) {
    container.innerHTML = "まだチャットがありません。";
    return;
  }

  const rendered = posts.slice().reverse().map((p, i) => {
    const currentId = String(p.userId || p.uid || "不明");
    const rawName = String(p.name || "名無しさん");
    
    let nameColor = "#008000";
    if (currentId.includes('★')) nameColor = "#ff1493";
    else if (currentId.includes('+MOD')) nameColor = "#ff8c00";
    else if (currentId.includes('+admin')) nameColor = "#800080";

    const cleanName = rawName.replace(" [S]", "");
    const displayBody = renderPostContent(p.content || "");

    return `
      <div class="post-item" style="padding-bottom:5px; margin-bottom:10px;">
        <div class="post-header" style="margin-bottom:2px;">
          <b style="color:${nameColor}; font-weight:bold;">${escapeHtml(removeZalgo(cleanName))}</b> 
          <span style="color:#666; font-size:0.8em; font-weight:normal;"> ID:${escapeHtml(currentId)}</span> 
          <span style="color:#888; font-size:0.75em; font-weight:normal;"> ：${escapeHtml(p.date || "")}</span>
        </div>
        <div class="post-body" style="font-size:0.95em; padding-left:10px;">${displayBody}</div>
      </div>`;
  }).filter(Boolean).join('');

  container.innerHTML = rendered;
}
