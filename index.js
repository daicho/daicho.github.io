// ゲーム状態管理
const GameState = {
    numParticipants: 8,
    numWinners: 3,
    participants: [], // 現在表示されている参加者名
    allParticipants: {}, // すべての入力内容を保持 { index: name }
    frameSelections: {}, // { frameNumber: participantName }
    winners: [], // 勝者枠番号の配列
    payouts: {} // { frameNumber: payoutRatio }
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
    // LocalStorageから復元
    try {
        const savedData = localStorage.getItem('gameData');
        if (savedData) {
            const data = JSON.parse(savedData);
            GameState.numParticipants = data.numParticipants;
            GameState.numWinners = data.numWinners;
            GameState.participants = data.participants || [];
            
            // 保存された参加者をallParticipantsに復元
            GameState.allParticipants = {};
            GameState.participants.forEach((name, index) => {
                if (name) {
                    GameState.allParticipants[index] = name;
                }
            });

            document.getElementById('numParticipants').value = GameState.numParticipants;
            document.getElementById('numWinners').value = GameState.numWinners;
        }
    } catch (e) {
        console.error('LocalStorage読み込みエラー:', e);
    }

    updateParticipantInputs();

    // イベントリスナー
    document.getElementById('numParticipants').addEventListener('input', (e) => {
        // 入力欄から現在の値を取得してGameStateに保存
        saveCurrentParticipantInputs();
        
        GameState.numParticipants = Math.max(1, parseInt(e.target.value) || 1);
        document.getElementById('numWinners').max = GameState.numParticipants;
        if (GameState.numWinners > GameState.numParticipants) {
            GameState.numWinners = GameState.numParticipants;
            document.getElementById('numWinners').value = GameState.numWinners;
        }
        updateParticipantInputs();
    });

    document.getElementById('numWinners').addEventListener('input', (e) => {
        const max = GameState.numParticipants;
        GameState.numWinners = Math.max(1, Math.min(max, parseInt(e.target.value) || 1));
        e.target.value = GameState.numWinners;
    });

    document.getElementById('startGameBtn').addEventListener('click', () => {
        // 最新の入力内容を保存
        saveCurrentParticipantInputs();
        
        // LocalStorageに保存
        try {
            const data = {
                numParticipants: GameState.numParticipants,
                numWinners: GameState.numWinners,
                participants: GameState.participants
            };
            localStorage.setItem('gameData', JSON.stringify(data));
        } catch (e) {
            console.error('LocalStorage保存エラー:', e);
        }

        GameState.frameSelections = {};
        initSelectionScreen();
        showScreen('selectionScreen');
    });
}

// 現在の入力欄の値をGameStateに保存
function saveCurrentParticipantInputs() {
    const inputs = document.querySelectorAll('#participantNames input');
    inputs.forEach((input, index) => {
        const value = input.value.trim();
        if (value) {
            GameState.allParticipants[index] = value;
        } else {
            delete GameState.allParticipants[index];
        }
        GameState.participants[index] = value;
    });
}

// 参加者名入力欄の更新
function updateParticipantInputs() {
    const tbody = document.getElementById('participantNames');
    
    // 入力欄の数が変わる場合のみ再生成
    const currentInputCount = tbody.querySelectorAll('tr').length;
    if (currentInputCount === GameState.numParticipants) {
        // 入力欄の数が同じ場合は何もしない（入力内容を保持）
        return;
    }
    
    tbody.innerHTML = '';
    GameState.participants = [];

    for (let i = 0; i < GameState.numParticipants; i++) {
        const tr = document.createElement('tr');

        const tdNumber = document.createElement('td');
        tdNumber.textContent = i + 1;
        tdNumber.className = 'number-cell';

        const tdName = document.createElement('td');
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = `参加者${i + 1}の名前`;
        // allParticipantsから入力内容を復元
        input.value = GameState.allParticipants[i] || '';
        input.dataset.index = i;

        input.addEventListener('input', (e) => {
            const index = parseInt(e.target.dataset.index);
            const value = e.target.value.trim();
            GameState.participants[index] = value;
            
            // allParticipantsにも保存
            if (value) {
                GameState.allParticipants[index] = value;
            } else {
                delete GameState.allParticipants[index];
            }
            
            checkAllParticipantsEntered();
        });

        tdName.appendChild(input);
        tr.appendChild(tdNumber);
        tr.appendChild(tdName);
        tbody.appendChild(tr);

        GameState.participants[i] = GameState.allParticipants[i] || '';
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

    // 配当比率の決定（合計が1になるように分配）
    // Stars and Bars Methodを使用
    GameState.payouts = {};
    const numParticipants = GameState.numParticipants; // 分母は参加者数
    const numWinners = GameState.numWinners; // 勝者枠数

    // Stars and Bars Method:
    // 0～Nの範囲でM-1個の区切り位置をランダムに選ぶ（重複あり）
    const dividers = [0, numParticipants]; // 両端を追加

    for (let i = 0; i < numWinners - 1; i++) {
        dividers.push(Math.floor(Math.random() * (numParticipants + 1)));
    }

    // ソート
    dividers.sort((a, b) => a - b);

    // 差分を取って配当の分子を求める
    const numerators = [];
    for (let i = 1; i < dividers.length; i++) {
        numerators.push(dividers[i] - dividers[i - 1]);
    }

    // 各勝者枠に配当比率を割り当て
    GameState.winners.forEach((frame, index) => {
        GameState.payouts[frame] = numerators[index] / numParticipants;
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
        div.textContent = `${frame}`;
        winnersContent.appendChild(div);
    });

    // 配当比率の表示
    const payoutsContent = document.getElementById('payoutsContent');
    payoutsContent.innerHTML = '';
    GameState.winners.forEach(frame => {
        const div = document.createElement('div');
        div.className = 'payout-item';
        const ratio = GameState.payouts[frame];
        if (ratio === 0) {
            div.textContent = '0';
        } else {
            const numParticipants = GameState.numParticipants;
            const numerator = Math.round(ratio * numParticipants);
            div.textContent = `${numerator}/${numParticipants}`;
        }
        payoutsContent.appendChild(div);
    });

    // スクラッチカードの初期化
    requestAnimationFrame(() => {
        initScratchCard('canvasWinners');
        initScratchCard('canvasPayouts');
    });

    // 既存のボタンを複製して置き換えることでイベントリスナーをクリア
    const oldBtn = document.getElementById('backToTitleBtn');
    const newBtn = oldBtn.cloneNode(true);
    oldBtn.parentNode.replaceChild(newBtn, oldBtn);
    
    newBtn.addEventListener('click', () => {
        if (confirm('タイトル画面に戻りますか?')) {
            showScreen('titleScreen');
        }
    });
}

// スクラッチカードの初期化
function initScratchCard(canvasId) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');

    // キャンバスサイズを親要素に合わせる
    const parent = canvas.parentElement;
    canvas.width = parent.offsetWidth;
    canvas.height = parent.offsetHeight;

    // スクラッチ層の描画（少しざらついた質感を追加）
    ctx.fillStyle = '#2a2a3e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ノイズを追加してリアルな質感に
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const noise = Math.random() * 15 - 7.5;
        data[i] += noise;     // R
        data[i + 1] += noise; // G
        data[i + 2] += noise; // B
    }
    ctx.putImageData(imageData, 0, 0);

    let isScratching = false;
    let lastX = null;
    let lastY = null;
    const brushSize = 15; // ブラシサイズ

    // 削りカスのパーティクル配列
    const particles = [];
    let particleAnimationId = null;

    // 削る処理（段階的に削れる）
    const scratch = (x, y) => {
        ctx.globalCompositeOperation = 'destination-out';
        // 一度で完全に削れないように透明度を下げる
        ctx.globalAlpha = 0.10; // この値を小さくするほど何度もこする必要がある

        // 前回の位置がある場合は線で繋ぐ
        if (lastX !== null && lastY !== null) {
            const distance = Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2);
            const steps = Math.max(1, Math.floor(distance / 3)); // 細かく補間

            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const px = lastX + (x - lastX) * t;
                const py = lastY + (y - lastY) * t;

                // ランダムな揺らぎを追加してリアルな削り跡に
                const wobble = Math.random() * 3 - 1.5;
                ctx.beginPath();
                ctx.arc(px + wobble, py + wobble, brushSize + Math.random() * 3, 0, Math.PI * 2);
                ctx.fill();

                // 削りカスのパーティクル生成（削りながら都度発生）
                if (Math.random() < 0.08) {
                    particles.push({
                        x: px,
                        y: py,
                        vx: (Math.random() - 0.5) * 3,
                        vy: Math.random() * 1.5 + 0.5,
                        size: Math.random() * 3 + 1,
                        alpha: 0.8,
                        rotation: Math.random() * Math.PI * 2,
                        rotationSpeed: (Math.random() - 0.5) * 0.2
                    });
                }
            }
        } else {
            // 初回は単純に円を描画
            ctx.beginPath();
            ctx.arc(x, y, brushSize, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1.0; // 透明度を戻す
        lastX = x;
        lastY = y;

        // パーティクルアニメーションを開始（まだ動いていなければ）
        if (particleAnimationId === null && particles.length > 0) {
            animateParticles();
        }
    };

    // 削りカスのアニメーション（削りながら都度実行）
    const animateParticles = () => {
        const overlay = canvas.parentElement.querySelector('.scratch-particles');
        if (!overlay) {
            particleAnimationId = null;
            return;
        }

        const overlayCtx = overlay.getContext('2d');
        overlayCtx.clearRect(0, 0, overlay.width, overlay.height);

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];

            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.02; // 重力
            p.vx *= 0.98; // 空気抵抗
            p.alpha -= 0.005;
            p.rotation += p.rotationSpeed;

            if (p.alpha <= 0 || p.y > canvas.height + 10) {
                particles.splice(i, 1);
                continue;
            }

            overlayCtx.save();
            overlayCtx.globalAlpha = p.alpha;
            overlayCtx.fillStyle = '#3a3a4e';
            overlayCtx.translate(p.x, p.y);
            overlayCtx.rotate(p.rotation);
            overlayCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            overlayCtx.restore();
        }

        if (particles.length > 0 || isScratching) {
            particleAnimationId = requestAnimationFrame(animateParticles);
        } else {
            particleAnimationId = null;
        }
    };

    // パーティクル用のキャンバスを追加
    const particleCanvas = document.createElement('canvas');
    particleCanvas.className = 'scratch-particles';
    particleCanvas.width = canvas.width;
    particleCanvas.height = canvas.height;
    particleCanvas.style.position = 'absolute';
    particleCanvas.style.top = '0';
    particleCanvas.style.left = '0';
    particleCanvas.style.width = '100%';
    particleCanvas.style.height = '100%';
    particleCanvas.style.pointerEvents = 'none';
    particleCanvas.style.zIndex = '3';
    canvas.parentElement.appendChild(particleCanvas);

    // マウスイベント
    canvas.addEventListener('mousedown', (e) => {
        isScratching = true;
        const rect = canvas.getBoundingClientRect();
        lastX = e.clientX - rect.left;
        lastY = e.clientY - rect.top;
        scratch(lastX, lastY);
    });

    canvas.addEventListener('mouseup', () => {
        isScratching = false;
        lastX = null;
        lastY = null;
    });

    canvas.addEventListener('mouseleave', () => {
        isScratching = false;
        lastX = null;
        lastY = null;
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
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        lastX = touch.clientX - rect.left;
        lastY = touch.clientY - rect.top;
        scratch(lastX, lastY);
    });

    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        isScratching = false;
        lastX = null;
        lastY = null;
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

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    initTitleScreen();
});
