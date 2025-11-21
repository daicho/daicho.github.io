// ゲーム状態管理
const GameState = {
    numParticipants: 8,
    numWinners: 3,
    participants: [],
    frameSelections: {}, // { frameNumber: participantName }
    winners: [], // 勝者枠番号の配列
    payouts: {} // { frameNumber: payoutRatio }
};

// Cookie管理
const CookieManager = {
    save() {
        const data = {
            numParticipants: GameState.numParticipants,
            numWinners: GameState.numWinners,
            participants: GameState.participants
        };
        document.cookie = `gameData=${encodeURIComponent(JSON.stringify(data))}; max-age=${60 * 60 * 24 * 365}; path=/`;
    },
    
    load() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'gameData') {
                try {
                    const data = JSON.parse(decodeURIComponent(value));
                    return data;
                } catch (e) {
                    console.error('Cookie解析エラー:', e);
                }
            }
        }
        return null;
    }
};

// 画面切り替え
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// タイトル画面の初期化
function initTitleScreen() {
    const savedData = CookieManager.load();
    if (savedData) {
        GameState.numParticipants = savedData.numParticipants;
        GameState.numWinners = savedData.numWinners;
        GameState.participants = savedData.participants || [];
        
        document.getElementById('numParticipants').value = GameState.numParticipants;
        document.getElementById('numWinners').value = GameState.numWinners;
    }
    
    updateParticipantInputs();
    
    // イベントリスナー
    document.getElementById('numParticipants').addEventListener('input', (e) => {
        GameState.numParticipants = Math.max(1, parseInt(e.target.value) || 1);
        document.getElementById('numWinners').max = GameState.numParticipants;
        if (GameState.numWinners > GameState.numParticipants) {
            GameState.numWinners = GameState.numParticipants;
            document.getElementById('numWinners').value = GameState.numWinners;
        }
        updateParticipantInputs();
        CookieManager.save();
    });
    
    document.getElementById('numWinners').addEventListener('input', (e) => {
        const max = GameState.numParticipants;
        GameState.numWinners = Math.max(1, Math.min(max, parseInt(e.target.value) || 1));
        e.target.value = GameState.numWinners;
        CookieManager.save();
    });
    
    document.getElementById('startGameBtn').addEventListener('click', () => {
        GameState.frameSelections = {};
        initSelectionScreen();
        showScreen('selectionScreen');
    });
}

// 参加者名入力欄の更新
function updateParticipantInputs() {
    const container = document.getElementById('participantNames');
    container.innerHTML = '';
    
    const currentParticipants = [...GameState.participants];
    GameState.participants = [];
    
    for (let i = 0; i < GameState.numParticipants; i++) {
        const div = document.createElement('div');
        div.className = 'participant-input';
        
        const label = document.createElement('label');
        label.textContent = `参加者 ${i + 1}`;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = `参加者${i + 1}の名前`;
        input.value = currentParticipants[i] || '';
        input.dataset.index = i;
        
        input.addEventListener('input', (e) => {
            GameState.participants[e.target.dataset.index] = e.target.value.trim();
            checkAllParticipantsEntered();
            CookieManager.save();
        });
        
        div.appendChild(label);
        div.appendChild(input);
        container.appendChild(div);
        
        GameState.participants[i] = currentParticipants[i] || '';
    }
    
    checkAllParticipantsEntered();
}

// 全参加者名が入力されているかチェック
function checkAllParticipantsEntered() {
    const allEntered = GameState.participants.every(name => name.length > 0);
    document.getElementById('startGameBtn').disabled = !allEntered;
}

// 枠選択画面の初期化
function initSelectionScreen() {
    const tbody = document.querySelector('#selectionTable tbody');
    tbody.innerHTML = '';
    
    for (let i = 1; i <= GameState.numParticipants; i++) {
        const tr = document.createElement('tr');
        
        const tdFrame = document.createElement('td');
        tdFrame.className = 'frame-number';
        tdFrame.textContent = i;
        
        const tdSelect = document.createElement('td');
        const select = document.createElement('select');
        select.dataset.frame = i;
        
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '選択してください';
        select.appendChild(defaultOption);
        
        GameState.participants.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            select.appendChild(option);
        });
        
        select.addEventListener('change', (e) => {
            const frame = parseInt(e.target.dataset.frame);
            const selectedName = e.target.value;
            
            if (selectedName) {
                GameState.frameSelections[frame] = selectedName;
            } else {
                delete GameState.frameSelections[frame];
            }
            
            updateSelectionOptions();
            checkAllFramesSelected();
        });
        
        tdSelect.appendChild(select);
        tr.appendChild(tdFrame);
        tr.appendChild(tdSelect);
        tbody.appendChild(tr);
    }
    
    checkAllFramesSelected();
    
    document.getElementById('startRaceBtn').addEventListener('click', () => {
        determineRaceResults();
        initResultScreen();
        showScreen('resultScreen');
    }, { once: true });
}

// 選択肢の更新 (選択済み参加者を除外)
function updateSelectionOptions() {
    const selectedNames = new Set(Object.values(GameState.frameSelections));
    const selects = document.querySelectorAll('#selectionTable select');
    
    selects.forEach(select => {
        const currentValue = select.value;
        const frame = parseInt(select.dataset.frame);
        
        Array.from(select.options).forEach(option => {
            if (option.value === '') return;
            
            if (selectedNames.has(option.value) && option.value !== currentValue) {
                option.disabled = true;
                option.style.display = 'none';
            } else {
                option.disabled = false;
                option.style.display = '';
            }
        });
    });
}

// 全枠が選択されているかチェック
function checkAllFramesSelected() {
    const allSelected = Object.keys(GameState.frameSelections).length === GameState.numParticipants;
    document.getElementById('startRaceBtn').disabled = !allSelected;
}

// レース結果の決定
function determineRaceResults() {
    // 勝者枠をランダムに選択
    const frames = Array.from({ length: GameState.numParticipants }, (_, i) => i + 1);
    GameState.winners = [];
    
    for (let i = 0; i < GameState.numWinners; i++) {
        const randomIndex = Math.floor(Math.random() * frames.length);
        GameState.winners.push(frames[randomIndex]);
        frames.splice(randomIndex, 1);
    }
    
    GameState.winners.sort((a, b) => a - b);
    
    // 配当比率の決定
    GameState.payouts = {};
    const N = GameState.numWinners;
    const ratios = [];
    
    for (let i = 0; i <= N; i++) {
        ratios.push(i / N);
    }
    
    // Fisher-Yatesシャッフル
    for (let i = ratios.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ratios[i], ratios[j]] = [ratios[j], ratios[i]];
    }
    
    GameState.winners.forEach((frame, index) => {
        GameState.payouts[frame] = ratios[index];
    });
}

// 結果画面の初期化
function initResultScreen() {
    // 勝者枠番号の表示
    const winnersContent = document.getElementById('winnersContent');
    winnersContent.innerHTML = '';
    GameState.winners.forEach(frame => {
        const div = document.createElement('div');
        div.className = 'winner-item';
        div.textContent = `枠 ${frame}`;
        winnersContent.appendChild(div);
    });
    
    // 配当比率の表示
    const payoutsContent = document.getElementById('payoutsContent');
    payoutsContent.innerHTML = '';
    GameState.winners.forEach(frame => {
        const div = document.createElement('div');
        div.className = 'payout-item';
        const ratio = GameState.payouts[frame];
        div.textContent = ratio === 0 ? '0' : `${Math.round(ratio * 100)}%`;
        payoutsContent.appendChild(div);
    });
    
    // 結果サマリーの表示
    const resultSummary = document.getElementById('resultSummary');
    resultSummary.innerHTML = '<h3>結果一覧</h3>';
    
    for (let frame = 1; frame <= GameState.numParticipants; frame++) {
        const name = GameState.frameSelections[frame];
        const isWinner = GameState.winners.includes(frame);
        
        const div = document.createElement('div');
        div.className = `result-item ${isWinner ? 'winner' : ''}`;
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'name';
        nameSpan.textContent = name;
        
        const frameSpan = document.createElement('span');
        frameSpan.className = 'frame';
        frameSpan.textContent = `枠 ${frame}`;
        
        const payoutSpan = document.createElement('span');
        payoutSpan.className = 'payout';
        if (isWinner) {
            const ratio = GameState.payouts[frame];
            payoutSpan.textContent = ratio === 0 ? '0' : `${Math.round(ratio * 100)}%`;
        } else {
            payoutSpan.textContent = '-';
        }
        
        div.appendChild(nameSpan);
        div.appendChild(frameSpan);
        div.appendChild(payoutSpan);
        resultSummary.appendChild(div);
    }
    
    // スクラッチカードの初期化
    initScratchCard('canvasWinners');
    initScratchCard('canvasPayouts');
    
    document.getElementById('backToTitleBtn').addEventListener('click', () => {
        showScreen('titleScreen');
    }, { once: true });
}

// スクラッチカードの初期化
function initScratchCard(canvasId) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    
    // キャンバスサイズを親要素に合わせる
    const parent = canvas.parentElement;
    canvas.width = parent.offsetWidth;
    canvas.height = parent.offsetHeight;
    
    // スクラッチ層の描画
    ctx.fillStyle = '#2a2a3e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // テキスト追加
    ctx.fillStyle = '#606070';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('こすって削る', canvas.width / 2, canvas.height / 2);
    
    let isScratching = false;
    
    const scratch = (x, y) => {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fill();
        
        // 削った割合をチェック
        checkScratchProgress(canvas, ctx);
    };
    
    // マウスイベント
    canvas.addEventListener('mousedown', () => {
        isScratching = true;
    });
    
    canvas.addEventListener('mouseup', () => {
        isScratching = false;
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (isScratching) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            scratch(x, y);
        }
    });
    
    // タッチイベント
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        isScratching = true;
    });
    
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        isScratching = false;
    });
    
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (isScratching) {
            const rect = canvas.getBoundingClientRect();
            const touch = e.touches[0];
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            scratch(x, y);
        }
    });
}

// スクラッチ進捗チェック
function checkScratchProgress(canvas, ctx) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let transparentPixels = 0;
    
    for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] < 128) {
            transparentPixels++;
        }
    }
    
    const totalPixels = pixels.length / 4;
    const scratchedRatio = transparentPixels / totalPixels;
    
    // 50%以上削れたら全て削除
    if (scratchedRatio > 0.5) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    initTitleScreen();
});
