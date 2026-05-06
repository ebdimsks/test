// 1. まずIPランダム生成関数を定義
window.generateRandomString = function(length = 16) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return "RNDIP_" + result;
};

// 2. 既存の送信関数などを管理者仕様（isAdmin=true, ランダムIP）に書き換え
window.sendPost = async function() {
    const nameInput = document.getElementById('user-name');
    const contentArea = document.getElementById('post-content');
    let rawName = (nameInput.value || "").trim() || "管理者";
    let content = contentArea.value || "";
    if (!content.trim()) return alert("本文を入力してください。");

    const currentRandomIp = window.generateRandomString();
    google.script.run
        .withSuccessHandler(data => {
            renderPosts(data);
            contentArea.value = "";
            refreshCurrentThread(true);
        })
        .addPost(currentSheetName, rawName, content, currentRandomIp, true);
};

// 3. 連投用のロジックをグローバルに登録
window.adminAutoThread = function() {
    const count = parseInt(prompt("スレッド数:", "5"));
    const title = prompt("タイトル:", "管理者スレ");
    let c = 0;
    const itv = setInterval(() => {
        if (c >= count) return clearInterval(itv);
        google.script.run.createThread(title + " " + (++c), false, window.generateRandomString());
    }, 300);
};

window.adminAutoPost = function() {
    if (!window.currentSheetName) return alert("スレを開いてください");
    const count = parseInt(prompt("連投数:", "10"));
    const text = prompt("本文:", "テスト連投");
    let c = 0;
    const itv = setInterval(() => {
        if (c >= count) return clearInterval(itv);
        google.script.run.addPost(currentSheetName, "管理者", text + " " + (++c), window.generateRandomString(), true);
    }, 300);
};

window.adminAutoChat = function() {
    const count = parseInt(prompt("チャット連投数:", "10"));
    const text = prompt("本文:", "チャット連投");
    let c = 0;
    const itv = setInterval(() => {
        if (c >= count) return clearInterval(itv);
        google.script.run.addChatMessage("管理者", text + " " + (++c), window.generateRandomString(), true);
    }, 300);
};

// 4. 管理者パネルの注入
(function injectPanel() {
    const id = 'admin-tool-panel';
    if (document.getElementById(id)) document.getElementById(id).remove();
    const panel = document.createElement('div');
    panel.id = id;
    panel.style.cssText = "position:fixed; bottom:15px; right:15px; background:rgba(0,0,0,0.8); color:#fff; padding:10px; border-radius:8px; z-index:10000; font-size:12px;";
    panel.innerHTML = `
        <div style="font-weight:bold; color:orange; margin-bottom:5px;">🛠 管理者ツール</div>
        <button onclick="adminAutoThread()" style="display:block; width:100%; margin-bottom:5px;">連続スレ立て</button>
        <button onclick="adminAutoPost()" style="display:block; width:100%; margin-bottom:5px;">連続投稿(スレ)</button>
        <button onclick="adminAutoChat()" style="display:block; width:100%;">連続チャット</button>
    `;
    document.body.appendChild(panel);
    console.log("✅ 管理者ツールを注入しました。");
})();
