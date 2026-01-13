/**
 * 细胞主理人 - 主入口文件 V2.0
 */

// 全局游戏实例
let game = null;
let player = null;
let npc = null;
let incubator = null;
let taskManager = null;  // 任务管理器
let eventManager = null;  // 意外事件管理器

// 当前状态
let currentScreen = 'login';
let selectedRole = null;
let fateDialogueIndex = 0;
let fateDialogues = [];
let selectedWorkbenchCell = null;  // 当前在超净台上的细胞
let harvestedCells = [];  // 收获的细胞（待交付）

// 背景音乐
let bgmAudio = null;
let bgmAutoplayBound = false;
let bgmMode = 'audio'; // 'audio' | 'webaudio'
let bgmCtx = null;
let bgmGain = null;
let bgmOsc = null;
let bgmTimer = null;
let bgmIsPlaying = false;

// 教程
const TUTORIAL_STORAGE_KEY = 'cellMaster_tutorial_seen_v1';
let tutorialStepIndex = 0;
const tutorialSteps = [
    {
        title: '培养入门',
        content: '在培养箱空槽点击“+”，选择细胞卡，确保背包里有对应培养基和血清。'
    },
    {
        title: '耗材与品质',
        content: '耗材不足无法开始培养；品质越高收益越高，污染会让品质迅速下降。'
    },
    {
        title: '任务交付',
        content: '办公区领取任务，收获细胞会进入储藏室，在任务界面选择符合品质的细胞交付。'
    },
    {
        title: '防污染与加速',
        content: '可在超净台使用防污染道具或加速类道具；时间倍率可在顶部切换 1x/2x/5x。'
    }
];

// 实时更新间隔ID
let uiUpdateIntervalId = null;

// 商店状态
let currentShopCategory = 'medium';
let highlightShopItem = null;

/**
 * 计算黄金珠掉落加成
 */
function getGoldenBoost() {
    if (player && player.assignedMode === 'poor') {
        return 1.2;
    }
    return 1;
}

function applyGoldenBoostToIncubatorCells() {
    if (!incubator || !incubator.slots) return;
    const targetBoost = getGoldenBoost();
    incubator.slots.forEach(slot => {
        if (slot.cell) {
            const currentBoost = slot.cell.goldenBoost || 1;
            if (currentBoost < targetBoost) {
                const factor = targetBoost / currentBoost;
                slot.cell.goldenBoost = targetBoost;
                const baseChance = slot.cell.goldenChance || CONFIG.CELL.GOLDEN_PEARL_CHANCE;
                slot.cell.goldenChance = baseChance * factor;
            }
        }
    });
}

function ensureGoldenStockGifted() {
    if (!harvestedCells.some(c => c.typeId === 'golden_stock')) {
        harvestedCells.push({
            typeId: 'golden_stock',
            name: '黄金株',
            icon: '🌟',
            quality: 100,
            harvestedAt: Date.now()
        });
        showNotification('赠送1株黄金株，可替代任意细胞交付或出售', 'success');
    }
}

/**
 * 切换界面
 */
function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });

    const targetScreen = document.getElementById(`${screenId}-screen`);
    if (targetScreen) {
        targetScreen.classList.add('active');
        currentScreen = screenId;
    }
}

/**
 * 显示通知
 */
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    container.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function initBGM() {
    const audioEl = document.getElementById('bgm-audio');
    const toggleBtn = document.getElementById('btn-music');
    if (!toggleBtn) return;

    bgmAudio = audioEl || null;

    const markPlaying = () => {
        toggleBtn.classList.remove('muted');
        toggleBtn.setAttribute('aria-pressed', 'true');
        bgmIsPlaying = true;
    };

    const markMuted = () => {
        toggleBtn.classList.add('muted');
        toggleBtn.setAttribute('aria-pressed', 'false');
        bgmIsPlaying = false;
    };

    const startWebAudio = async () => {
        bgmMode = 'webaudio';
        if (!bgmCtx) {
            bgmCtx = new (window.AudioContext || window.webkitAudioContext)();
            bgmGain = bgmCtx.createGain();
            bgmGain.gain.value = 0.08;
            bgmGain.connect(bgmCtx.destination);
        }
        if (bgmCtx.state === 'suspended') await bgmCtx.resume().catch(() => {});

        if (bgmOsc) {
            try { bgmOsc.stop(); } catch (e) {}
            bgmOsc.disconnect();
        }

        const notes = [261.63, 311.13, 392.00, 349.23, 311.13, 261.63]; // 简单休闲循环
        let idx = 0;

        bgmOsc = bgmCtx.createOscillator();
        bgmOsc.type = 'sine';
        bgmOsc.frequency.value = notes[0];
        bgmOsc.connect(bgmGain);
        bgmOsc.start();

        if (bgmTimer) clearInterval(bgmTimer);
        bgmTimer = setInterval(() => {
            if (!bgmCtx || bgmCtx.state === 'closed') return;
            const note = notes[idx % notes.length];
            bgmOsc.frequency.setTargetAtTime(note, bgmCtx.currentTime, 0.02);
            idx++;
        }, 900);

        markPlaying();
    };

    const stopWebAudio = () => {
        if (bgmTimer) {
            clearInterval(bgmTimer);
            bgmTimer = null;
        }
        if (bgmOsc) {
            try { bgmOsc.stop(); } catch (e) {}
            bgmOsc.disconnect();
            bgmOsc = null;
        }
        if (bgmCtx && bgmCtx.state !== 'closed') {
            bgmCtx.suspend().catch(() => {});
        }
        markMuted();
    };

    const tryPlayAudio = () => {
        if (!bgmAudio) return Promise.reject();
        bgmMode = 'audio';
        bgmAudio.loop = true;
        bgmAudio.volume = 0.4;
        bgmAudio.autoplay = true;
        bgmAudio.muted = false;

        return bgmAudio.play().then(() => {
            markPlaying();
        }).catch(() => {
            if (!bgmAutoplayBound) {
                bgmAutoplayBound = true;
                const resume = () => {
                    if (bgmMode === 'audio' && bgmAudio) {
                        bgmAudio.play().then(() => markPlaying()).catch(() => {});
                    } else {
                        startWebAudio();
                    }
                };
                ['pointerdown', 'touchstart', 'keydown'].forEach(evt => {
                    document.addEventListener(evt, resume, { once: true });
                });
            }
            markMuted();
            return Promise.reject();
        });
    };

    const startBGM = () => {
        if (bgmMode === 'audio' && bgmAudio) {
            return tryPlayAudio().catch(() => startWebAudio());
        }
        return startWebAudio();
    };

    const stopBGM = () => {
        if (bgmMode === 'audio' && bgmAudio) {
            bgmAudio.pause();
            bgmAudio.muted = true;
            markMuted();
        } else {
            stopWebAudio();
        }
    };

    if (bgmAudio) {
        bgmAudio.addEventListener('error', () => {
            startWebAudio();
        });
    } else {
        bgmMode = 'webaudio';
    }

    toggleBtn.addEventListener('click', () => {
        if (!bgmIsPlaying) {
            startBGM();
        } else {
            stopBGM();
        }
    });

    startBGM();
}

/**
 * 显示模态框
 */
function showModal(title, content, buttons = []) {
    const overlay = document.getElementById('modal-overlay');
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');
    const footerEl = document.getElementById('modal-footer');

    titleEl.textContent = title;
    bodyEl.innerHTML = content;

    footerEl.innerHTML = '';
    buttons.forEach(btn => {
        const button = document.createElement('button');
        button.className = btn.class || 'btn-primary';
        button.textContent = btn.text;
        button.onclick = () => {
            let shouldClose = btn.closeOnClick !== false;
            if (btn.onClick) {
                const result = btn.onClick();
                if (result === false) shouldClose = false;
            }
            if (shouldClose) {
                hideModal();
            }
        };
        footerEl.appendChild(button);
    });

    overlay.classList.remove('hidden');
}

/**
 * 隐藏模态框
 */
function hideModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
}

function maybeStartTutorial(options = {}) {
    const { force = false, compact = false } = options || {};
    if (!force) {
        try {
            if (localStorage.getItem(TUTORIAL_STORAGE_KEY)) return;
        } catch (e) {
            // ignore storage errors
        }
    }
    tutorialStepIndex = 0;
    if (compact) {
        showTutorialSummary();
    } else {
        showTutorialStep({ force, compact: false });
    }
}

function showTutorialStep({ force = false } = {}) {
    const step = tutorialSteps[tutorialStepIndex];
    if (!step) return;

    const progress = `${tutorialStepIndex + 1}/${tutorialSteps.length}`;
    const content = `
        <div class="tutorial-step">
            <h4>${step.title}</h4>
            <p>${step.content}</p>
            <p class="tutorial-progress">${progress}</p>
        </div>
    `;

    const isLast = tutorialStepIndex >= tutorialSteps.length - 1;
    showModal('新手教程', content, [
        {
            text: isLast ? '完成' : '下一步',
            class: 'btn-primary',
            closeOnClick: false,
            onClick: () => {
                tutorialStepIndex++;
                if (tutorialStepIndex >= tutorialSteps.length) {
                    completeTutorial({ force });
                } else {
                    showTutorialStep({ force });
                }
                return false;
            }
        },
        {
            text: '跳过',
            class: 'btn-secondary',
            onClick: () => completeTutorial({ force })
        }
    ]);
}

function showTutorialSummary() {
    const summary = `
        <div class="tutorial-summary">
            <p><u>培养：</u> 在培养箱选卡并准备培养基/血清，品质越高收益越高。</p>
            <p><u>任务：</u> 办公区领取任务，收获细胞存入储藏室后在任务界面交付。</p>
            <p><u>防污染：</u> 在超净台用防污染或加速道具，避免品质下滑。</p>
            <p><u>时间与资源：</u> 顶部可切换 1x/2x/5x，金币和经验在状态栏显示。</p>
        </div>
    `;
    showModal('新手教程要点', summary, [
        { text: '知道了', class: 'btn-primary' }
    ]);
}

function showGameDocs() {
    const doc = `
        <div class="tutorial-summary">
            <p>欢迎来到《细胞主理人》。你将扮演一名运营细胞实验室的主理人，从选品、培养到交付全程把控。进入游戏后先在培养箱选择细胞卡，确认背包里具备对应培养基、血清和消耗品，再启动培养流程。品质越高、代数越低的细胞收益越好，污染会让品质迅速下降。</p>
            <p>耗材管理决定节奏。耗材不足会阻塞培养，可以在商店购买培养基、血清、防污染剂和加速道具。实验台的时间倍率可在顶部 1x/2x/5x 切换，倍率越高越快消耗时间，也更容易错过污染风险提示，注意平衡效率与安全。</p>
            <p>任务系统是主要收入来源。前往办公区领取委托，右侧可查看要求的细胞类型与品质。培养完成后，收获的细胞会进入储藏室，满足品质的细胞可在任务界面交付获得金币和经验。缺钱时可以直接在储藏室出售多余细胞，或依靠赠送的“黄金株”完成紧急订单。</p>
            <p>防污染是成败关键。超净台可以使用基础或高级防污染剂降低污染概率，也可以用加速道具缩短培养时间。培养过程中留意状态栏的污染/事件提示，必要时及时使用耗材或调整倍率。保持良好品质能显著提升收益，并解锁更高价任务。</p>
            <p>事件与成长会持续发生。事件栏会出现增益或减益，请根据情况调整策略；黄金模式下特定细胞会有额外加成。玩家等级提升会解锁新耗材、新任务和更好的收益倍率。角色破产时可以重组或返回主菜单重新开始，所有关键操作都会自动存档。</p>
            <p>操作小贴士：记得在设置中随时重看本说明；在培养箱为空时优先补充耗材；任务难度过高时可先完成低阶委托累积资金；超净台的道具可叠加使用提升稳定性；注意背包容量，及时清理低品质细胞避免占位。祝你在实验室稳健扩张，成为最懂细胞经济的主理人。</p>
        </div>
    `;
    showModal('完整游戏说明', doc, [
        { text: '关闭', class: 'btn-primary' }
    ]);
}

function completeTutorial({ force = false } = {}) {
    if (player) {
        player.addItem('anti_contam_high');
        showNotification('已赠送1个高级防污染剂', 'success');
    }

    if (!force) {
        try {
            localStorage.setItem(TUTORIAL_STORAGE_KEY, '1');
        } catch (e) {
            // ignore storage errors
        }
    }
    hideModal();
}

/**
 * 初始化登录界面事件
 */
function initLoginScreen() {
    // Tab切换
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;

            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(`${tab}-tab`).classList.add('active');
        });
    });

    // 游客登录
    document.getElementById('btn-guest-login').addEventListener('click', () => {
        player = new Player();
        player.uid = Utils.generateId('guest_');
        player.username = '牛马研究员';
        player.isGuest = true;

        // 检查是否有存档
        if (Storage.hasSave()) {
            showModal('发现存档', '检测到之前的游戏存档，是否继续？', [
                {
                    text: '继续游戏',
                    class: 'btn-primary',
                    onClick: () => {
                        loadAndStartGame();
                    }
                },
                {
                    text: '新游戏',
                    class: 'btn-secondary',
                    onClick: () => {
                        Storage.deleteSave();
                        switchScreen('role-select');
                    }
                }
            ]);
        } else {
            switchScreen('role-select');
        }
    });

    // 微信登录（暂未实现）
    document.getElementById('btn-wechat-login').addEventListener('click', () => {
        showNotification('微信登录功能开发中...', 'warning');
    });

    // 账号登录（暂未实现）
    document.getElementById('btn-login').addEventListener('click', () => {
        showNotification('账号系统开发中，请使用游客模式', 'warning');
    });

    // 注册（暂未实现）
    document.getElementById('btn-register').addEventListener('click', () => {
        showNotification('注册功能开发中，请使用游客模式', 'warning');
    });
}

/**
 * 初始化角色选择界面
 */
function initRoleSelectScreen() {
    // 角色卡片选择
    document.querySelectorAll('.role-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.role-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedRole = card.dataset.role;
        });
    });

    // 确认选择
    document.getElementById('btn-confirm-role').addEventListener('click', () => {
        if (!selectedRole) {
            showNotification('请先选择一个实验室', 'warning');
            return;
        }

        player.chosenMode = selectedRole;

        // 随机分配实际模式（核心机制：选择无效，随机分配）
        const modes = Object.keys(CONFIG.GAME_MODES);
        player.assignedMode = Utils.randomChoice(modes);

        // 准备命运揭晓台词
        prepareFateDialogues();

        switchScreen('fate');
        showNextFateDialogue();
    });
}

/**
 * 准备命运揭晓台词
 */
function prepareFateDialogues() {
    const chosen = CONFIG.GAME_MODES[player.chosenMode];
    const assigned = CONFIG.GAME_MODES[player.assignedMode];
    const dialogues = CONFIG.FATE_DIALOGUES;

    fateDialogues = [];
    fateDialogueIndex = 0;

    // 开场白
    dialogues.intro.forEach(text => {
        fateDialogues.push({ text, class: '' });
    });

    // 你的选择
    fateDialogues.push({
        text: dialogues.chosen.replace('{chosen}', chosen.name),
        class: 'highlight'
    });

    // 转折
    fateDialogues.push({ text: dialogues.but, class: 'warning' });

    // 实际分配
    fateDialogues.push({
        text: dialogues.assigned.replace('{assigned}', assigned.name),
        class: 'highlight'
    });

    // 根据情况添加反应台词
    if (player.chosenMode === player.assignedMode) {
        dialogues.reactions.same.forEach(text => {
            fateDialogues.push({ text, class: '' });
        });
    } else {
        // 判断是更好还是更差
        const chosenIndex = Object.keys(CONFIG.GAME_MODES).indexOf(player.chosenMode);
        const assignedIndex = Object.keys(CONFIG.GAME_MODES).indexOf(player.assignedMode);

        if (assignedIndex > chosenIndex) {
            // 分配到更差的
            dialogues.reactions.worse.forEach(text => {
                fateDialogues.push({ text, class: 'warning' });
            });
        } else {
            dialogues.reactions.different.forEach(text => {
                fateDialogues.push({ text, class: '' });
            });
        }
    }

    // 结束语
    fateDialogues.push({ text: dialogues.final, class: '' });
}

/**
 * 显示下一条命运台词
 */
function showNextFateDialogue() {
    const container = document.getElementById('fate-dialogues');
    const nextBtn = document.getElementById('btn-fate-next');
    const acceptBtn = document.getElementById('btn-accept-fate');

    if (fateDialogueIndex < fateDialogues.length) {
        const dialogue = fateDialogues[fateDialogueIndex];

        const p = document.createElement('p');
        p.className = `fate-dialogue ${dialogue.class}`;
        p.textContent = dialogue.text;
        container.appendChild(p);

        fateDialogueIndex++;

        // 如果是最后一条
        if (fateDialogueIndex >= fateDialogues.length) {
            nextBtn.classList.add('hidden');
            acceptBtn.classList.remove('hidden');
        }
    }
}

/**
 * 初始化命运揭晓界面
 */
function initFateScreen() {
    document.getElementById('btn-fate-next').addEventListener('click', () => {
        showNextFateDialogue();
    });

    document.getElementById('btn-accept-fate').addEventListener('click', () => {
        // 初始化玩家数据
        player.init(player.assignedMode);

        // 开始游戏
        startGame();
    });
}

/**
 * 开始游戏
 */
function startGame() {
    // 创建NPC
    npc = new NPC();

    // 创建培养箱（根据模式配置）
    const modeConfig = player.getModeConfig();
    incubator = new Incubator(modeConfig.initialSlots);
    incubator.setModeContaminationRate(modeConfig.contaminationRate);

    // 创建任务管理器
    taskManager = new TaskManager();
    taskManager.init(player.level);

    // 创建事件管理器
    eventManager = new EventManager();
    eventManager.init();

    applyGoldenBoostToIncubatorCells();
    ensureGoldenStockGifted();

    // 初始化游戏界面
    initLabScreen();

    // 切换到游戏界面
    switchScreen('lab');

    // 更新UI
    updateGameUI();

    // 启动游戏循环
    startGameLoop();

    // 启动UI实时更新（用于进度条和倒计时）
    startUIUpdateLoop();

    // 保存游戏
    saveGame();

    showNotification(`欢迎来到${modeConfig.name}！`, 'success');
    maybeStartTutorial({ force: true });
}

/**
 * 加载并开始游戏
 */
function loadAndStartGame() {
    const saveData = Storage.loadGame();
    if (saveData) {
        player = Player.deserialize(saveData.player);

        // 创建NPC
        npc = new NPC();

        // 恢复培养箱
        if (saveData.incubator) {
            incubator = Incubator.deserialize(saveData.incubator);
        } else {
            // 兼容旧存档
            const modeConfig = player.getModeConfig();
            incubator = new Incubator(modeConfig.initialSlots);
            incubator.setModeContaminationRate(modeConfig.contaminationRate);
        }

        // 恢复任务管理器
        if (saveData.taskManager) {
            taskManager = TaskManager.deserialize(saveData.taskManager);
        } else {
            taskManager = new TaskManager();
            taskManager.init(player.level);
        }

        // 恢复事件管理器
        if (saveData.eventManager) {
            eventManager = EventManager.deserialize(saveData.eventManager);
        } else {
            eventManager = new EventManager();
            eventManager.init();
        }

        applyGoldenBoostToIncubatorCells();

        // 恢复待交付细胞
        harvestedCells = saveData.harvestedCells || [];
        ensureGoldenStockGifted();

        // 初始化游戏界面
        initLabScreen();

        // 切换到游戏界面
        switchScreen('lab');

        // 更新UI
        updateGameUI();

        // 启动游戏循环
        startGameLoop();

        // 启动UI实时更新
        startUIUpdateLoop();

        showNotification('存档加载成功！', 'success');
        maybeStartTutorial();
    }
}

/**
 * 保存游戏
 */
function saveGame() {
    const saveData = {
        player: player.serialize(),
        incubator: incubator ? incubator.serialize() : null,
        taskManager: taskManager ? taskManager.serialize() : null,
        eventManager: eventManager ? eventManager.serialize() : null,
        harvestedCells: harvestedCells || [],
    };
    Storage.saveGame(saveData);
}

// 游戏循环ID
let gameLoopId = null;
let lastUpdateTime = Date.now();

/**
 * 启动游戏循环
 */
function startGameLoop() {
    if (gameLoopId) return;

    lastUpdateTime = Date.now();

    gameLoopId = setInterval(() => {
        const now = Date.now();
        const deltaTime = now - lastUpdateTime;
        lastUpdateTime = now;

        // 推进游戏时间
        player.advanceTime(deltaTime, player.gameTime.speed);

        // 获取事件效果
        const eventEffects = eventManager ? eventManager.getActiveEffects() : {
            goldenMultiplier: 1,
            contaminationMultiplier: 1,
            efficiencyMultiplier: 1,
            growthPaused: false
        };

        // 更新培养箱中的细胞
        if (incubator && !eventEffects.growthPaused) {
            // 应用事件效果到污染率
            const originalRate = incubator.modeContaminationRate;
            incubator.modeContaminationRate *= eventEffects.contaminationMultiplier;

            const events = incubator.update(deltaTime * player.gameTime.speed * eventEffects.efficiencyMultiplier);

            // 恢复原始污染率
            incubator.modeContaminationRate = originalRate;

            // 处理细胞事件
            events.forEach(event => {
                handleCellEvent(event, eventEffects);
            });

            // 更新培养箱计数显示
            updateIncubatorCount();
        }

        // 更新任务系统
        if (taskManager) {
            const taskEvents = taskManager.update(deltaTime * player.gameTime.speed, player.level);

            // 处理任务事件
            taskEvents.forEach(event => {
                handleTaskEvent(event);
            });
        }

        // 更新事件系统
        if (eventManager) {
            const modeConfig = player.getModeConfig();
            const randomEvents = eventManager.update(deltaTime * player.gameTime.speed, modeConfig.eventFrequency);

            // 处理随机事件
            randomEvents.forEach(event => {
                handleRandomEvent(event);
            });

            // 处理一次性效果
            const oneTimeEffects = eventManager.getOneTimeEffects();
            oneTimeEffects.forEach(effect => {
                applyOneTimeEffect(effect);
            });
        }

        // 更新UI
        updateGameUI();

        // 检查破产
        if (player.checkBankruptcy()) {
            triggerBankruptcy();
        }
    }, CONFIG.GAME.TICK_INTERVAL);

    // 自动保存
    setInterval(() => {
        saveGame();
    }, CONFIG.GAME.SAVE_INTERVAL);
}

/**
 * 启动UI实时更新循环（用于进度条和倒计时）
 */
function startUIUpdateLoop() {
    if (uiUpdateIntervalId) return;

    uiUpdateIntervalId = setInterval(() => {
        // 如果培养箱面板打开，实时更新进度条
        const incubatorPanel = document.getElementById('panel-incubator');
        if (incubatorPanel && !incubatorPanel.classList.contains('hidden')) {
            updateIncubatorProgressBars();
        }

        // 如果任务面板打开，实时更新任务倒计时
        const tasksPanel = document.getElementById('panel-tasks');
        if (tasksPanel && !tasksPanel.classList.contains('hidden')) {
            updateTaskTimers();
        }
    }, 100);  // 每100毫秒更新一次UI
}

/**
 * 更新培养箱进度条（实时）
 */
function updateIncubatorProgressBars() {
    if (!incubator) return;

    document.querySelectorAll('.cell-slot').forEach((slot, index) => {
        const slotData = incubator.getSlotInfo(index);
        if (slotData && slotData.cell && slotData.cell.status === 'growing') {
            const progressBar = slot.querySelector('.progress-bar');
            const statusEl = slot.querySelector('.cell-status');

            if (progressBar) {
                progressBar.style.width = `${slotData.cell.growthProgress}%`;
            }
            if (statusEl) {
                const remaining = slotData.cell.getRemainingTime();
                statusEl.textContent = `生长中 ${Math.floor(slotData.cell.growthProgress)}% (${Utils.formatTime(remaining)})`;
            }
        }
    });
}

/**
 * 更新任务倒计时（实时）
 */
function updateTaskTimers() {
    if (!taskManager) return;

    document.querySelectorAll('.task-card.active .task-timer').forEach((timerEl, index) => {
        if (index < taskManager.activeTasks.length) {
            const task = taskManager.activeTasks[index];
            timerEl.textContent = task.getRemainingTimeText();

            // 时间紧迫时变红
            if (task.remainingTime < 60) {
                timerEl.style.color = '#F56C6C';
            }
        }
    });
}

/**
 * 处理随机事件
 */
function handleRandomEvent(event) {
    switch (event.type) {
        case 'event_triggered':
            const activeEvent = event.event;
            const icon = EventManager.getEventIcon(activeEvent.eventId);
            const color = EventManager.getEventColor(activeEvent.type);

            showNotification(`${icon} ${activeEvent.name}: ${activeEvent.description}`,
                activeEvent.type === 'positive' ? 'success' :
                activeEvent.type === 'negative' ? 'error' : 'warning');

            // 更新事件显示栏
            updateEventsBar();
            break;

        case 'event_expired':
            showNotification(`事件「${event.event.name}」已结束`, 'info');
            updateEventsBar();
            break;
    }
}

/**
 * 应用一次性事件效果
 */
function applyOneTimeEffect(effect) {
    switch (effect.type) {
        case 'gold':
            player.addGold(effect.value);
            showNotification(`${effect.eventName}: 获得 ${effect.value}💰`, 'success');
            break;

        case 'quality_drop':
            // 随机选择一个细胞降低品质
            if (incubator) {
                const cells = incubator.getAllCells().filter(c => c.status !== 'contaminated');
                if (cells.length > 0) {
                    const cell = Utils.randomChoice(cells);
                    cell.quality = Math.max(0, cell.quality + effect.value);
                    showNotification(`${effect.eventName}: ${cell.name} 品质下降`, 'warning');
                }
            }
            break;

        case 'lose_item':
            effect.items.forEach(itemId => {
                if (player.hasItem(itemId)) {
                    player.removeItem(itemId);
                }
            });
            showNotification(`${effect.eventName}: 丢失了一些物品`, 'warning');
            break;

        case 'rare_item':
            // 赠送随机稀有道具
            const rareItems = ['anti_contam_high', 'speed_boost'];
            const item = Utils.randomChoice(rareItems);
            player.addItem(item);
            const itemData = SHOP_ITEMS.tools[item];
            showNotification(`${effect.eventName}: 获得 ${itemData ? itemData.name : item}`, 'success');
            break;

        case 'mutation':
            // 随机突变
            if (incubator) {
                const cells = incubator.getAllCells().filter(c => c.status !== 'contaminated');
                if (cells.length > 0) {
                    const cell = Utils.randomChoice(cells);
                    const change = Utils.randomInt(effect.range[0], effect.range[1]);
                    cell.quality = Utils.clamp(cell.quality + change, 0, 100);
                    if (change > 0) {
                        showNotification(`${effect.eventName}: ${cell.name} 品质+${change}！`, 'success');
                    } else {
                        showNotification(`${effect.eventName}: ${cell.name} 品质${change}`, 'warning');
                    }
                }
            }
            break;
    }
}

/**
 * 更新事件显示栏
 */
function updateEventsBar() {
    const bar = document.getElementById('active-events-bar');
    if (!bar || !eventManager) return;

    bar.innerHTML = '';

    eventManager.activeEvents.forEach(event => {
        const icon = EventManager.getEventIcon(event.eventId);
        const remaining = Math.ceil(event.remainingTime);

        // 转换为游戏时间显示
        const gameMinutes = Math.floor(remaining / 60);
        const gameSeconds = remaining % 60;
        const timeText = gameMinutes > 0 ? `${gameMinutes}:${gameSeconds.toString().padStart(2, '0')}` : `${gameSeconds}秒`;

        const badge = document.createElement('div');
        badge.className = `event-badge ${event.type}`;
        badge.innerHTML = `
            <span class="event-icon">${icon}</span>
            <span class="event-name">${event.name}</span>
            <span class="event-timer">${timeText}</span>
        `;

        badge.addEventListener('click', () => {
            showNotification(event.description, 'info');
        });

        bar.appendChild(badge);
    });
}

/**
 * 处理细胞事件
 */
function handleCellEvent(event, eventEffects = {}) {
    switch (event.type) {
        case 'ready':
            showNotification(`${event.cell.name} 培养完成！`, 'success');
            if (npc) npc.react('cellReady');

            // 应用黄金珠倍率
            if (eventEffects.goldenMultiplier && eventEffects.goldenMultiplier > 1) {
                event.cell.goldenChance *= eventEffects.goldenMultiplier;
            }
            break;
        case 'contaminated':
            showNotification(`${event.cell.name} 被污染了！`, 'error');
            if (npc) npc.react('contamination');
            player.stats.totalCellsContaminated++;
            player.stats.consecutiveNonContaminated = 0;
            break;
    }
}

/**
 * 处理任务事件
 */
function handleTaskEvent(event) {
    switch (event.type) {
        case 'task_expired':
            showNotification(`任务「${event.task.name}」已过期！`, 'error');
            // 应用惩罚
            if (event.penalty) {
                player.spendGold(Math.min(player.gold, event.penalty.gold));
                showNotification(`损失 ${event.penalty.gold}💰`, 'error');
            }
            if (npc) npc.react('taskFailed');
            break;
        case 'tasks_refreshed':
            // 静默刷新，不显示通知
            break;
    }
}

/**
 * 更新培养箱计数显示
 */
function updateIncubatorCount() {
    const badge = document.getElementById('incubator-count');
    if (badge && incubator) {
        const stats = incubator.getStats();
        badge.textContent = stats.occupied;

        // 如果有可收获的细胞，添加提示样式
        if (stats.ready > 0) {
            badge.classList.add('has-ready');
        } else {
            badge.classList.remove('has-ready');
        }
    }
}

/**
 * 停止游戏循环
 */
function stopGameLoop() {
    if (gameLoopId) {
        clearInterval(gameLoopId);
        gameLoopId = null;
    }
}

/**
 * 初始化实验室界面
 */
function initLabScreen() {
    // 区域点击
    document.querySelectorAll('.lab-area').forEach(area => {
        area.addEventListener('click', () => {
            const areaName = area.dataset.area;
            openPanel(areaName);
        });
    });

    // 底部导航
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const panel = btn.dataset.panel;
            openPanel(panel);
        });
    });

    // 关闭面板按钮（X按钮和返回按钮都可以关闭）
    document.querySelectorAll('[data-close="panel"]').forEach(btn => {
        btn.addEventListener('click', () => {
            closeAllPanels();
        });
    });

    // 时间加速按钮
    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const speed = parseInt(btn.dataset.speed);
            player.gameTime.speed = speed;

            document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    const settingsBtn = document.getElementById('btn-settings');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            showModal('设置', '<p>选择操作</p>', [
                {
                    text: '查看完整游戏说明',
                    class: 'btn-primary',
                    closeOnClick: false,
                    onClick: () => showGameDocs()
                },
                { text: '关闭', class: 'btn-ghost' }
            ]);
        });
    }

    // 模态框关闭
    document.getElementById('modal-close').addEventListener('click', hideModal);
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'modal-overlay') {
            hideModal();
        }
    });
}

/**
 * 打开面板
 */
function openPanel(panelName) {
    closeAllPanels();

    // 区域名映射到面板名
    const panelMap = {
        'office': 'tasks'
    };
    const actualPanel = panelMap[panelName] || panelName;

    const panel = document.getElementById(`panel-${actualPanel}`);
    if (panel) {
        panel.classList.remove('hidden');
        renderPanelContent(actualPanel);
    }
}

function openShopForItem(itemId) {
    const categoryEntry = Object.entries(SHOP_ITEMS).find(([cat, items]) => items[itemId]);
    if (categoryEntry) {
        currentShopCategory = categoryEntry[0];
        highlightShopItem = itemId;
    } else {
        currentShopCategory = 'medium';
        highlightShopItem = null;
    }
    openPanel('shop');
}

/**
 * 关闭所有面板
 */
function closeAllPanels() {
    document.querySelectorAll('.sub-panel').forEach(panel => {
        panel.classList.add('hidden');
    });
}

/**
 * 渲染面板内容
 */
function renderPanelContent(panelName) {
    switch (panelName) {
        case 'incubator':
            renderIncubatorPanel();
            break;
        case 'workbench':
            renderWorkbenchPanel();
            break;
        case 'storage':
            renderStoragePanel();
            break;
        case 'tasks':
            renderTasksPanel();
            break;
        case 'shop':
            renderShopPanel(currentShopCategory, highlightShopItem);
            break;
        case 'friends':
            renderFriendsPanel();
            break;
    }
}

/**
 * 渲染培养箱面板
 */
function renderIncubatorPanel() {
    const grid = document.getElementById('incubator-grid');
    if (!incubator) return;

    grid.innerHTML = '';

    for (let i = 0; i < CONFIG.INCUBATOR.MAX_SLOTS; i++) {
        const slotData = incubator.getSlotInfo(i);
        const slot = document.createElement('div');
        slot.className = 'cell-slot';

        if (!slotData.isLocked) {
            // 已解锁的槽位
            if (slotData.cell) {
                // 有细胞
                const cell = slotData.cell;
                slot.classList.add(cell.status);

                let statusIcon = '';
                if (cell.status === 'ready') statusIcon = '✅';
                else if (cell.status === 'contaminated') statusIcon = '☠️';
                else if (cell.overgrown) statusIcon = '⚠️';

                // 品质显示
                const qualityGrade = cell.getQualityGrade();
                const qualityDisplay = cell.status === 'contaminated' ? '' :
                    `<span class="cell-quality" style="color:${qualityGrade.color}">品质:${Math.floor(cell.quality)} (${qualityGrade.grade})</span>`;

                slot.innerHTML = `
                    <span class="cell-icon">${cell.icon}</span>
                    <span class="cell-name">${cell.name}</span>
                    ${qualityDisplay}
                    <div class="cell-progress">
                        <div class="progress-bar" style="width: ${cell.growthProgress}%"></div>
                    </div>
                    <span class="cell-status">${statusIcon} ${cell.getStatusText()}</span>
                `;

                slot.addEventListener('click', () => {
                    showCellActionModal(i, cell);
                });
            } else {
                // 空槽位
                slot.innerHTML = `
                    <span class="slot-empty">+</span>
                    <span class="cell-status">空闲</span>
                `;
                slot.addEventListener('click', () => {
                    showCellSelectModal(i);
                });
            }
        } else {
            // 未解锁的槽位
            slot.classList.add('locked');
            const cost = CONFIG.INCUBATOR.SLOT_UNLOCK_COSTS[i] || '???';
            slot.innerHTML = `
                <span class="slot-empty">🔒</span>
                <span class="cell-status">${Utils.formatNumber(cost)}💰</span>
            `;
            slot.addEventListener('click', () => {
                unlockSlot(i);
            });
        }

        grid.appendChild(slot);
    }
}

/**
 * 显示细胞选择模态框
 */
function showCellSelectModal(slotIndex) {
    // 获取玩家可用的细胞类型
    const availableCells = Object.values(CELL_TYPES).filter(cell => {
        return cell.unlockLevel <= player.level && cell.cultivable !== false;
    });

    let content = '<div class="cell-select-grid">';

    availableCells.forEach(cellData => {
        // 检查是否有所需的培养基和血清
        const hasMedium = player.hasItem(cellData.requiredMedia);
        const hasSerum = player.hasItem(cellData.requiredSerum);
        const canStart = hasMedium && hasSerum;

        // 获取培养基和血清名称
        const mediumItem = SHOP_ITEMS.medium[cellData.requiredMedia];
        const serumItem = SHOP_ITEMS.serum[cellData.requiredSerum];

        content += `
            <div class="cell-select-item ${canStart ? '' : 'disabled'}" data-cell="${cellData.id}">
                <span class="cell-icon">${cellData.icon}</span>
                <span class="cell-name">${cellData.name}</span>
                <div class="cell-requirements">
                    <span class="${hasMedium ? 'has' : 'missing'}">${mediumItem?.name || cellData.requiredMedia}</span>
                    <span class="${hasSerum ? 'has' : 'missing'}">${serumItem?.name || cellData.requiredSerum}</span>
                </div>
                <span class="cell-time">⏱️ ${Utils.formatTime(cellData.baseGrowthTime)}</span>
            </div>
        `;
    });

    content += '</div>';

    if (availableCells.length === 0) {
        content = '<p class="empty-hint">没有可用的细胞类型，请提升等级解锁</p>';
    }

    showModal('选择要培养的细胞', content, [
        { text: '取消', class: 'btn-secondary' }
    ]);

    // 添加点击事件
    setTimeout(() => {
        document.querySelectorAll('.cell-select-item:not(.disabled)').forEach(item => {
            item.addEventListener('click', () => {
                const cellId = item.dataset.cell;
                startCellCultivation(cellId, slotIndex);
                hideModal();
            });
        });
    }, 100);
}

/**
 * 开始培养细胞
 */
function startCellCultivation(cellTypeId, slotIndex) {
    const cellData = CELL_TYPES[cellTypeId];

    // 消耗材料
    if (!player.removeItem(cellData.requiredMedia)) {
        showNotification('培养基不足！', 'error');
        return;
    }
    if (!player.removeItem(cellData.requiredSerum)) {
        // 退还培养基
        player.addItem(cellData.requiredMedia);
        showNotification('血清不足！', 'error');
        return;
    }

    // 创建细胞并放入培养箱
    const cell = new Cell(cellTypeId, slotIndex, getGoldenBoost());
    const result = incubator.placeCell(cell, slotIndex);

    if (result.success) {
        player.stats.totalCellsCultured++;
        showNotification(`开始培养 ${cellData.name}`, 'success');
        renderIncubatorPanel();
        saveGame();
    } else {
        // 退还材料
        player.addItem(cellData.requiredMedium);
        player.addItem(cellData.requiredSerum);
        showNotification(result.message, 'error');
    }
}

/**
 * 显示细胞操作模态框
 */
function showCellActionModal(slotIndex, cell) {
    let buttons = [];

    if (cell.status === 'ready') {
        buttons.push({
            text: '收获',
            class: 'btn-primary',
            onClick: () => harvestCell(slotIndex)
        });
        buttons.push({
            text: '移至超净台',
            class: 'btn-secondary',
            onClick: () => moveCellToWorkbench(slotIndex)
        });
    } else if (cell.status === 'contaminated') {
        buttons.push({
            text: '丢弃',
            class: 'btn-danger',
            onClick: () => discardCell(slotIndex)
        });
        if (player.hasItem('emergency_save')) {
            buttons.push({
                text: '紧急救援',
                class: 'btn-warning',
                onClick: () => emergencySaveCell(slotIndex)
            });
        }
    } else {
        buttons.push({
            text: '移至超净台',
            class: 'btn-secondary',
            onClick: () => moveCellToWorkbench(slotIndex)
        });
    }

    buttons.push({
        text: '取消',
        class: 'btn-ghost'
    });

    // 品质信息
    const qualityGrade = cell.getQualityGrade();
    const qualityInfo = cell.status === 'contaminated' ? '已污染' :
        `<span style="color:${qualityGrade.color}">${Math.floor(cell.quality)}分 (${qualityGrade.grade}级 - ${qualityGrade.text})</span>`;

    // 计算预计收益（根据品质）
    const qualityMultiplier = 0.5 + (cell.quality / 100) * 0.7;
    const estimatedValue = Math.floor(cell.baseValue * qualityMultiplier);

    const content = `
        <div class="cell-info">
            <div class="cell-icon-large">${cell.icon}</div>
            <h3>${cell.name}</h3>
            <p>状态: ${cell.getStatusText()}</p>
            <p>品质: ${qualityInfo}</p>
            <p>代数: 第${cell.generation}代</p>
            ${cell.status === 'growing' ? `<p>剩余时间: ${Utils.formatTime(cell.getRemainingTime())}</p>` : ''}
            ${cell.overgrown ? '<p style="color:#F56C6C">⚠️ 细胞过度生长，品质正在下降！</p>' : ''}
            <p>预计收益: ${estimatedValue}💰 / ${cell.expReward}⭐</p>
        </div>
    `;

    showModal('细胞操作', content, buttons);
}

/**
 * 收获细胞
 */
function harvestCell(slotIndex) {
    const slotData = incubator.getSlotInfo(slotIndex);
    if (!slotData || !slotData.cell) return;

    const cell = slotData.cell;
    const result = cell.harvest();

    if (result.success) {
        // 将细胞添加到待交付列表（而不是直接获得金币）
        const harvestedCell = {
            typeId: cell.typeId,
            name: cell.name,
            icon: cell.icon,
            quality: cell.quality || 60,
            hasAntibiotics: cell.hasAntibiotics || false,
            qcPassed: cell.qcPassed || false,
            overgrown: cell.overgrown || false,
            harvestedAt: Date.now()
        };
        harvestedCells.push(harvestedCell);

        // 检查黄金株
        if (result.goldenPearl) {
            harvestedCells.push({
                typeId: 'golden_stock',
                name: '黄金株',
                icon: '🌟',
                quality: 100,
                harvestedAt: Date.now()
            });
            showNotification('🌟 获得了黄金株！', 'success');
        }

        // 移除细胞
        incubator.removeCell(slotIndex);

        // 更新统计
        player.stats.consecutiveNonContaminated++;
        player.stats.totalCellsCultured++;

        showNotification(`${cell.name} 已收获！可在储藏室交付任务`, 'success');

        renderIncubatorPanel();
        updateGameUI();
        saveGame();
    } else {
        showNotification(result.message, 'error');
    }
}

/**
 * 丢弃细胞
 */
function discardCell(slotIndex) {
    incubator.removeCell(slotIndex);
    showNotification('细胞已丢弃', 'warning');
    renderIncubatorPanel();
    saveGame();
}

/**
 * 紧急救援细胞
 */
function emergencySaveCell(slotIndex) {
    if (!player.removeItem('emergency_save')) {
        showNotification('没有紧急救援包，前往商店购买', 'warning');
        openShopForItem('emergency_save');
        return;
    }

    const slotData = incubator.getSlotInfo(slotIndex);
    if (!slotData || !slotData.cell) return;

    const result = slotData.cell.emergencySave();

    if (result.success) {
        player.addGold(result.value);
        player.addExp(result.exp);
        incubator.removeCell(slotIndex);
        showNotification(`${result.message} +${result.value}💰`, 'success');
        renderIncubatorPanel();
        updateGameUI();
        saveGame();
    }
}

/**
 * 解锁培养槽位
 */
function unlockSlot(slotIndex) {
    const cost = CONFIG.INCUBATOR.SLOT_UNLOCK_COSTS[slotIndex];
    if (!cost) return;

    showModal('解锁槽位', `<p>解锁新的培养槽位需要 ${Utils.formatNumber(cost)} 💰</p>`, [
        {
            text: '确认解锁',
            class: 'btn-primary',
            onClick: () => {
                const result = incubator.unlockSlot(player.gold);
                if (result.success) {
                    player.spendGold(result.cost);
                    showNotification(result.message, 'success');
                    renderIncubatorPanel();
                    updateGameUI();
                    saveGame();
                } else {
                    showNotification(result.message, 'error');
                }
            }
        },
        { text: '取消', class: 'btn-secondary' }
    ]);
}

/**
 * 移动细胞到超净台
 */
function moveCellToWorkbench(slotIndex) {
    const slotData = incubator.getSlotInfo(slotIndex);
    if (!slotData || !slotData.cell) return;

    selectedWorkbenchCell = {
        cell: slotData.cell,
        slotIndex: slotIndex
    };

    closeAllPanels();
    openPanel('workbench');
}

/**
 * 渲染超净台面板
 */
function renderWorkbenchPanel() {
    const slot = document.getElementById('workbench-cell-slot');
    const passageBtn = document.getElementById('btn-action-passage');
    const drugBtn = document.getElementById('btn-action-drug');
    const harvestBtn = document.getElementById('btn-action-harvest');
    const freezeBtn = document.getElementById('btn-action-freeze');
    const discardBtn = document.getElementById('btn-action-discard');

    // 重置所有按钮
    [passageBtn, drugBtn, harvestBtn, freezeBtn, discardBtn].forEach(btn => {
        if (btn) {
            btn.disabled = true;
            btn.onclick = null;
        }
    });

    if (selectedWorkbenchCell && selectedWorkbenchCell.cell) {
        const cell = selectedWorkbenchCell.cell;

        slot.innerHTML = `
            <div class="workbench-cell">
                <span class="cell-icon-large">${cell.icon}</span>
                <span class="cell-name">${cell.name}</span>
                <span class="cell-status">${cell.getStatusText()}</span>
                <div class="cell-progress-large">
                    <div class="progress-bar" style="width: ${cell.growthProgress}%"></div>
                </div>
            </div>
        `;

        // 根据细胞状态启用不同操作
        if (cell.status === 'ready') {
            // 可收获
            harvestBtn.disabled = false;
            harvestBtn.onclick = () => {
                harvestCell(selectedWorkbenchCell.slotIndex);
                selectedWorkbenchCell = null;
                renderWorkbenchPanel();
            };

            // 可传代
            const maxRatio = Utils.getMaxPassageRatio(player.level);
            if (maxRatio >= 2) {
                passageBtn.disabled = false;
                passageBtn.onclick = () => showPassageModal();
            }

            // 可冻存
            if (freezeBtn) {
                freezeBtn.disabled = false;
                freezeBtn.onclick = () => {
                    freezeCell();
                    selectedWorkbenchCell = null;
                    renderWorkbenchPanel();
                };
            }
        }

        if (cell.status === 'growing') {
            // 可加药（防污染道具）
            if (!cell.immuneContamination && hasAntiProtectionItems()) {
                drugBtn.disabled = false;
                drugBtn.onclick = () => applyDrug();
            }
        }

        // 丢弃始终可用
        discardBtn.disabled = false;
        discardBtn.onclick = () => {
            discardCell(selectedWorkbenchCell.slotIndex);
            selectedWorkbenchCell = null;
            renderWorkbenchPanel();
        };

    } else {
        slot.innerHTML = '<p>从培养箱选择细胞移至此处进行操作</p>';
    }
}

/**
 * 显示传代选择模态框
 */
function showPassageModal() {
    const maxRatio = Utils.getMaxPassageRatio(player.level);
    const emptySlots = incubator.getEmptySlots().length;

    let content = '<div class="passage-options">';
    content += '<p>选择传代比例：</p>';

    for (let ratio = 2; ratio <= maxRatio; ratio++) {
        const successRate = CONFIG.PASSAGE.SUCCESS_RATE[ratio];
        const contaminationRisk = CONFIG.PASSAGE.CONTAMINATION_RISK[ratio];
        const slotsNeeded = ratio - 1;  // 需要额外槽位
        const canDo = emptySlots >= slotsNeeded;

        content += `
            <button class="passage-btn ${canDo ? '' : 'disabled'}" data-ratio="${ratio}" ${canDo ? '' : 'disabled'}>
                <span class="ratio">1 → ${ratio}</span>
                <span class="rate">成功率: ${(successRate * 100).toFixed(0)}%</span>
                <span class="risk">污染风险: ${(contaminationRisk * 100).toFixed(0)}%</span>
                ${!canDo ? `<span class="need-slots">需要${slotsNeeded}个空位</span>` : ''}
            </button>
        `;
    }

    content += '</div>';

    showModal('细胞传代', content, [
        { text: '取消', class: 'btn-secondary' }
    ]);

    // 添加点击事件
    setTimeout(() => {
        document.querySelectorAll('.passage-btn:not(.disabled)').forEach(btn => {
            btn.addEventListener('click', () => {
                const ratio = parseInt(btn.dataset.ratio);
                performPassage(ratio);
                hideModal();
            });
        });
    }, 100);
}

/**
 * 执行传代
 */
function performPassage(ratio) {
    if (!selectedWorkbenchCell) return;

    const cell = selectedWorkbenchCell.cell;
    const successRate = CONFIG.PASSAGE.SUCCESS_RATE[ratio];
    const contaminationRisk = CONFIG.PASSAGE.CONTAMINATION_RISK[ratio];

    // 检查细胞是否可传代（必须是ready状态）
    if (cell.status !== 'ready') {
        showNotification('只有培养完成的细胞才能传代！', 'error');
        return;
    }

    // 需要消耗PBS和胰蛋白酶
    if (!player.hasItem('pbs') || !player.hasItem('trypsin')) {
        showNotification('传代需要PBS和胰蛋白酶！', 'error');
        return;
    }

    // 检查是否有Accutase（高级消化酶）
    const useAccutase = player.hasItem('accutase');

    player.removeItem('pbs');
    player.removeItem('trypsin');
    if (useAccutase) {
        player.removeItem('accutase');
    }

    // 检查成功率
    if (Math.random() > successRate) {
        showNotification('传代失败！细胞状态不佳...', 'error');
        if (npc) npc.react('passage');
        return;
    }

    // 检查污染
    const contaminated = Math.random() < contaminationRisk;

    // 获取空闲槽位
    const emptySlots = incubator.getEmptySlots();
    const slotsNeeded = ratio - 1;

    // 使用Cell的passage方法创建子细胞
    const childCells = [];
    for (let i = 0; i < slotsNeeded && i < emptySlots.length; i++) {
        const childCell = cell.passage(emptySlots[i].index, useAccutase);

        // 如果传代导致污染
        if (contaminated) {
            childCell.contaminate();
        }

        childCells.push(childCell);
        incubator.placeCell(childCell, emptySlots[i].index);
        player.stats.totalCellsCultured++;
    }

    // 原细胞也重置：从0%开始重新生长，品质损耗
    cell.growthProgress = 0;
    cell.status = 'growing';
    cell.readyTime = null;
    cell.overgrowTime = 0;
    cell.overgrown = false;
    cell.generation++;

    // 原细胞品质损耗
    const qualityLoss = 5 + Math.floor(Math.random() * 6);
    cell.quality = Math.max(30, cell.quality - qualityLoss);
    cell.baseQuality = cell.quality;

    if (contaminated) {
        cell.contaminate();
        showNotification(`传代完成，但发生了污染！`, 'warning');
        if (npc) npc.react('contamination');
    } else {
        const avgQuality = childCells.length > 0 ?
            Math.floor(childCells.reduce((sum, c) => sum + c.quality, 0) / childCells.length) : 0;
        showNotification(`传代成功！1→${ratio}，子代平均品质:${avgQuality}`, 'success');
        if (npc) npc.react('passage');
    }

    selectedWorkbenchCell = null;
    renderWorkbenchPanel();
    renderIncubatorPanel();
    saveGame();
}

/**
 * 冻存细胞
 */
function freezeCell() {
    if (!selectedWorkbenchCell) return;

    const cell = selectedWorkbenchCell.cell;

    // 检查细胞状态
    if (cell.status !== 'ready') {
        showNotification('只有培养完成的细胞才能冻存！', 'error');
        return;
    }

    // 需要冻存液（简化：使用FBS）
    if (!player.hasItem('fbs')) {
        showNotification('冻存需要血清！', 'error');
        return;
    }

    player.removeItem('fbs');

    // 从培养箱移除
    incubator.removeCell(selectedWorkbenchCell.slotIndex);

    // 创建冻存记录（保存完整信息）
    const frozenCell = {
        typeId: cell.typeId,
        name: cell.name,
        icon: cell.icon,
        quality: Math.floor(cell.quality),
        generation: cell.generation,
        hasAntibiotics: cell.hasAntibiotics,
        qcPassed: cell.qcPassed,
        frozenAt: Date.now()
    };

    // 添加到冻存列表
    if (!player.frozenCells) {
        player.frozenCells = [];
    }
    player.frozenCells.push(frozenCell);

    const qualityGrade = cell.getQualityGrade();
    showNotification(`${cell.name} 已冻存 (品质:${Math.floor(cell.quality)}${qualityGrade.grade})`, 'success');

    selectedWorkbenchCell = null;
    renderWorkbenchPanel();
    renderIncubatorPanel();
    saveGame();
}

/**
 * 获取物品信息（按全品类）
 */
function getItemInfoById(itemId) {
    const allCategories = ['medium', 'serum', 'reagent', 'riskControl', 'addon', 'tools'];
    for (const category of allCategories) {
        if (SHOP_ITEMS[category] && SHOP_ITEMS[category][itemId]) {
            return SHOP_ITEMS[category][itemId];
        }
    }
    return null;
}

const ANTI_ITEM_IDS = ['pen_strep', 'anti_contam_basic', 'anti_contam_mid', 'anti_contam_high', 'speed_boost'];

function getAvailableAntiItems() {
    return ANTI_ITEM_IDS
        .map(id => ({ id, info: getItemInfoById(id) }))
        .filter(item => player.hasItem(item.id) && (item.info || item.id === 'pen_strep'));
}

function hasAntiProtectionItems() {
    return getAvailableAntiItems().length > 0;
}

/**
 * 给细胞加药（防污染）
 */
function applyDrug() {
    if (!selectedWorkbenchCell || !selectedWorkbenchCell.cell) return;

    const options = getAvailableAntiItems();
    if (options.length === 0) {
        showNotification('没有可用的防污染道具', 'error');
        return;
    }

    let content = '<div class="anti-item-list">';
    options.forEach(opt => {
        const info = opt.info || { name: '双抗', description: '降低污染风险', icon: '💊' };
        content += `
            <button class="btn-secondary anti-item-btn" data-item="${opt.id}">
                <span class="item-icon">${info.icon || '💊'}</span>
                <span class="item-name">${info.name}</span>
                <small class="item-desc">${info.description || ''}</small>
            </button>
        `;
    });
    content += '</div>';

    showModal('选择防污染道具', content, [
        { text: '取消', class: 'btn-secondary' }
    ]);

    setTimeout(() => {
        document.querySelectorAll('.anti-item-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const itemId = btn.dataset.item;
                useAntiItem(itemId);
                hideModal();
            });
        });
    }, 50);
}

function useAntiItem(itemId) {
    if (!selectedWorkbenchCell || !selectedWorkbenchCell.cell) return;
    const cell = selectedWorkbenchCell.cell;
    const itemInfo = getItemInfoById(itemId);

    if (!player.removeItem(itemId)) {
        showNotification('道具数量不足', 'error');
        return;
    }

    let effect = itemInfo?.effect;
    if (!effect && itemId === 'pen_strep') {
        effect = { type: 'antibiotics' };
    }

    if (effect) {
        cell.applyEffect(effect);
    }

    const itemName = itemInfo?.name || '防污染道具';
    showNotification(`已为 ${cell.name} 使用 ${itemName}`, 'success');
    renderWorkbenchPanel();
    saveGame();
}

/**
 * 渲染储藏室面板
 */
function renderStoragePanel() {
    const content = document.getElementById('storage-content');

    let html = '';

    // 待交付细胞区域
    html += '<div class="storage-section"><h4>待交付细胞 (' + harvestedCells.length + ')</h4>';

    if (harvestedCells.length > 0) {
        html += '<div class="harvested-cells-grid">';
        harvestedCells.forEach((cell, index) => {
            const cellData = CELL_TYPES[cell.typeId];
            html += `
                <div class="harvested-cell-item">
                    <span class="cell-icon">${cell.icon}</span>
                    <span class="cell-name">${cell.name}</span>
                    <span class="cell-quality">品质: ${cell.quality}</span>
                    <div class="cell-actions">
                        <button class="btn-small btn-sell" onclick="sellHarvestedCell(${index})">出售 ${cellData.baseValue}💰</button>
                        <button class="btn-small btn-discard" onclick="discardHarvestedCell(${index})">丢弃</button>
                    </div>
                </div>
            `;
        });
        html += '</div>';

        // 批量操作
        html += `
            <div class="batch-actions">
                <button class="btn-secondary" onclick="sellAllHarvestedCells()">全部出售</button>
            </div>
        `;
    } else {
        html += '<p class="empty-hint">没有待交付的细胞</p>';
    }
    html += '</div>';

    // 耗材区域
    html += '<div class="storage-section"><h4>耗材背包</h4>';
    html += '<div class="inventory-grid">';

    let hasItems = false;

    // 遍历所有类别查找物品
    const allCategories = ['medium', 'serum', 'reagent', 'riskControl', 'addon', 'tools'];

    for (const [itemId, count] of Object.entries(player.inventory)) {
        if (count <= 0) continue;

        let item = null;
        for (const category of allCategories) {
            if (SHOP_ITEMS[category] && SHOP_ITEMS[category][itemId]) {
                item = SHOP_ITEMS[category][itemId];
                break;
            }
        }

        if (item) {
            hasItems = true;
            html += `
                <div class="inventory-item">
                    <span class="item-icon">${item.icon}</span>
                    <span class="item-name">${item.name}</span>
                    <span class="item-count">x${count}</span>
                </div>
            `;
        }
    }

    html += '</div>';

    if (!hasItems) {
        html += '<p class="empty-hint">背包是空的</p>';
    }

    html += '</div>';

    // 冻存细胞区域
    html += '<div class="storage-section"><h4>冻存细胞 (' + (player.frozenCells?.length || 0) + ')</h4>';
    if (player.frozenCells && player.frozenCells.length > 0) {
        html += '<div class="frozen-cells-grid">';
        player.frozenCells.forEach((cell, index) => {
            const cellData = CELL_TYPES[cell.typeId];
            const quality = cell.quality || 60;
            // 根据品质确定颜色
            let qualityColor = '#909399';
            if (quality >= 90) qualityColor = '#FFD700';
            else if (quality >= 80) qualityColor = '#67C23A';
            else if (quality >= 70) qualityColor = '#409EFF';
            else if (quality >= 60) qualityColor = '#E6A23C';
            else if (quality >= 50) qualityColor = '#F56C6C';

            html += `
                <div class="frozen-cell-item">
                    <span class="cell-icon">${cell.icon || cellData?.icon || '❄️'}</span>
                    <span class="cell-name">${cell.name || cellData?.name || '未知'}</span>
                    <span class="cell-quality" style="color:${qualityColor}">品质:${quality}</span>
                    <span class="cell-generation">第${cell.generation || 1}代</span>
                    <button class="btn-small" onclick="thawCell(${index})">复苏</button>
                </div>
            `;
        });
        html += '</div>';
    } else {
        html += '<p class="empty-hint">没有冻存的细胞</p>';
    }
    html += '</div>';

    content.innerHTML = html;
}

/**
 * 出售收获的细胞
 */
function sellHarvestedCell(index) {
    const cell = harvestedCells[index];
    if (!cell) return;

    const cellData = CELL_TYPES[cell.typeId];
    const value = cellData.baseValue;

    player.addGold(value);
    harvestedCells.splice(index, 1);

    showNotification(`出售 ${cell.name} +${value}💰`, 'success');
    renderStoragePanel();
    updateGameUI();
    saveGame();
}

/**
 * 丢弃收获的细胞
 */
function discardHarvestedCell(index) {
    const cell = harvestedCells[index];
    if (!cell) return;

    harvestedCells.splice(index, 1);
    showNotification(`丢弃了 ${cell.name}`, 'warning');
    renderStoragePanel();
    saveGame();
}

/**
 * 全部出售收获的细胞
 */
function sellAllHarvestedCells() {
    if (harvestedCells.length === 0) return;

    let totalValue = 0;
    harvestedCells.forEach(cell => {
        const cellData = CELL_TYPES[cell.typeId];
        totalValue += cellData.baseValue;
    });

    player.addGold(totalValue);
    const count = harvestedCells.length;
    harvestedCells = [];

    showNotification(`出售了 ${count} 个细胞 +${totalValue}💰`, 'success');
    renderStoragePanel();
    updateGameUI();
    saveGame();
}

/**
 * 复苏冻存细胞
 */
function thawCell(index) {
    if (!player.frozenCells || !player.frozenCells[index]) return;

    const frozenCell = player.frozenCells[index];
    const emptySlots = incubator.getEmptySlots();

    if (emptySlots.length === 0) {
        showNotification('培养箱没有空位！', 'error');
        return;
    }

    // 创建新细胞并放入培养箱
    const cell = new Cell(frozenCell.typeId, emptySlots[0].index, getGoldenBoost());
    const loss = Utils.randomInt(1, 3);
    cell.baseQuality = Math.max(0, cell.baseQuality - loss);
    cell.quality = cell.baseQuality;
    cell.growthProgress = 30;  // 复苏后从30%开始

    const result = incubator.placeCell(cell, emptySlots[0].index);
    if (result.success) {
        player.frozenCells.splice(index, 1);
        showNotification(`${cell.name} 已复苏并放入培养箱`, 'success');
        renderStoragePanel();
        saveGame();
    } else {
        showNotification(result.message, 'error');
    }
}

/**
 * 渲染任务面板
 */
function renderTasksPanel() {
    const container = document.getElementById('task-list-container');
    if (!taskManager) {
        container.innerHTML = '<p class="empty-hint">任务系统加载中...</p>';
        return;
    }

    let html = '';

    // 进行中的任务
    if (taskManager.activeTasks.length > 0) {
        html += '<div class="task-section"><h4>进行中的任务</h4>';
        taskManager.activeTasks.forEach(task => {
            const modifiersText = task.getModifiersText();
            const constraintsText = task.getConstraintsText();

            // 计算可交付提示（仅用于按钮可用态）
            const deliverCheck = task.checkCanComplete(harvestedCells);
            const hasDeliverable = Array.isArray(deliverCheck.matchingCells) && deliverCheck.matchingCells.length > 0;

            // 根据是否是复合任务显示不同的需求
            let requirementHtml = '';
            if (task.isCombo) {
                // 复合任务：显示多种细胞需求
                requirementHtml = '<div class="task-combo-requirements">';
                task.requirements.forEach(req => {
                    const cellData = CELL_TYPES[req.cellType];
                    const isComplete = req.unitsDelivered >= req.unitsRequired;
                    requirementHtml += `
                        <div class="combo-req-item ${isComplete ? 'completed' : ''}">
                            <span class="cell-icon">${cellData?.icon || '🧫'}</span>
                            <span class="cell-name">${cellData?.name || req.cellType}</span>
                            <span class="req-progress">${req.unitsDelivered}/${req.unitsRequired}</span>
                            <span class="req-quality">(品质≥${req.qualityRequired})</span>
                        </div>
                    `;
                });
                requirementHtml += '</div>';
            } else {
                // 普通任务
                const cellData = CELL_TYPES[task.cellType];
                requirementHtml = `
                    <div class="task-info">
                        <span class="cell-icon">${cellData?.icon || '🧫'}</span>
                        <span class="cell-name">${cellData?.name || task.cellType}</span>
                        <span class="task-requirement">需要 ${task.unitsRequired} 个 (品质≥${task.qualityRequired})</span>
                    </div>
                `;
            }

            html += `
                <div class="task-card active ${task.isCombo ? 'combo' : ''}" data-task-id="${task.id}">
                    <div class="task-header">
                        <span class="task-tier ${task.tier}">${task.tier}</span>
                        ${task.isCombo ? '<span class="task-combo-badge">组合</span>' : ''}
                        <span class="task-name">${task.name}</span>
                        ${modifiersText ? `<span class="task-modifiers">${modifiersText}</span>` : ''}
                    </div>
                    ${requirementHtml}
                    <div class="task-progress">
                        <div class="progress-bar" style="width: ${task.getProgressPercent()}%"></div>
                        <span class="progress-text">${task.getDeliveryProgressText()}</span>
                    </div>
                    <div class="task-footer">
                        <span class="task-time task-timer">⏱️ ${task.getRemainingTimeText()}</span>
                        <span class="task-reward">🪙${task.finalReward.gold} ⭐${task.finalReward.exp}</span>
                    </div>
                    ${constraintsText ? `<div class="task-constraints">约束: ${constraintsText}</div>` : ''}
                    <div class="task-actions">
                        <button class="btn-deliver" ${hasDeliverable ? '' : 'disabled'} onclick="showDeliverModal('${task.id}')">选择交付</button>
                        <button class="btn-abandon" onclick="abandonTask('${task.id}')">放弃</button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
    }

    // 可接取的任务
    html += `<div class="task-section"><h4>可接取任务 (${taskManager.availableTasks.length})</h4>`;

    if (taskManager.availableTasks.length === 0) {
        html += '<p class="empty-hint">暂无可接取任务，等待刷新...</p>';
    } else {
        taskManager.availableTasks.forEach(task => {
            const modifiersText = task.getModifiersText();
            const isLocked = task.unlockLevel > player.level;

            // 根据是否是复合任务显示不同的需求
            let requirementHtml = '';
            if (task.isCombo) {
                requirementHtml = '<div class="task-combo-requirements preview">';
                task.requirements.forEach(req => {
                    const cellData = CELL_TYPES[req.cellType];
                    requirementHtml += `
                        <div class="combo-req-item">
                            <span class="cell-icon">${cellData?.icon || '🧫'}</span>
                            <span class="cell-name">${cellData?.name || req.cellType}</span>
                            <span class="req-count">×${req.unitsRequired}</span>
                            <span class="req-quality">(品质≥${req.qualityRequired})</span>
                        </div>
                    `;
                });
                requirementHtml += '</div>';
            } else {
                const cellData = CELL_TYPES[task.cellType];
                requirementHtml = `
                    <div class="task-info">
                        <span class="cell-icon">${cellData?.icon || '🧫'}</span>
                        <span class="cell-name">${cellData?.name || task.cellType}</span>
                        <span class="task-requirement">需要 ${task.unitsRequired} 个 (品质≥${task.qualityRequired})</span>
                    </div>
                `;
            }

            html += `
                <div class="task-card available ${isLocked ? 'locked' : ''} ${task.isCombo ? 'combo' : ''}" data-task-id="${task.id}">
                    <div class="task-header">
                        <span class="task-tier ${task.tier}">${task.tier}</span>
                        ${task.isCombo ? '<span class="task-combo-badge">组合</span>' : ''}
                        <span class="task-name">${task.name}</span>
                        ${modifiersText ? `<span class="task-modifiers">${modifiersText}</span>` : ''}
                    </div>
                    ${requirementHtml}
                    <div class="task-footer">
                        <span class="task-deadline">⏱️ ${Math.floor(task.deadline / 60)}分钟</span>
                        <span class="task-reward">🪙${task.finalReward.gold} ⭐${task.finalReward.exp}</span>
                    </div>
                    ${isLocked ?
                        `<div class="task-lock">🔒 需要等级 ${task.unlockLevel}</div>` :
                        `<button class="btn-accept" onclick="acceptTask('${task.id}')">接取</button>`
                    }
                </div>
            `;
        });
    }
    html += '</div>';

    // 任务统计
    const stats = taskManager.getStats();
    html += `
        <div class="task-stats">
            <span>进行中: ${stats.active}/${stats.maxActive}</span>
            <span>已完成: ${stats.completed}</span>
        </div>
    `;

    container.innerHTML = html;

    // 刷新任务按钮
    const getTaskBtn = document.getElementById('btn-get-task');
    if (getTaskBtn) {
        getTaskBtn.textContent = '刷新任务 (100💰)';
        getTaskBtn.onclick = () => {
            if (player.gold < 100) {
                showNotification('金币不足！', 'error');
                return;
            }
            player.spendGold(100);
            taskManager.forceRefresh(player.level);
            renderTasksPanel();
            showNotification('任务已刷新！', 'success');
        };
    }
}

/**
 * 接取任务
 */
function acceptTask(taskId) {
    const result = taskManager.acceptTask(taskId);
    if (result.success) {
        showNotification(result.message, 'success');
        renderTasksPanel();
        saveGame();
    } else {
        showNotification(result.message, 'error');
    }
}

/**
 * 放弃任务
 */
function abandonTask(taskId) {
    showModal('确认放弃', '放弃任务不会返还任何奖励，确定要放弃吗？', [
        {
            text: '确认放弃',
            class: 'btn-danger',
            onClick: () => {
                const result = taskManager.abandonTask(taskId);
                if (result.success) {
                    showNotification(result.message, 'warning');
                    renderTasksPanel();
                    saveGame();
                }
            }
        },
        { text: '取消', class: 'btn-secondary' }
    ]);
}

/**
 * 显示交付模态框
 */
function showDeliverModal(taskId) {
    const task = taskManager.activeTasks.find(t => t.id === taskId);
    if (!task) return;

    let content = `<div class="deliver-info"><p>任务: ${task.name}</p>`;

    if (task.isCombo) {
        // 复合任务：显示多种细胞需求
        content += '<div class="deliver-combo-requirements">';
        task.requirements.forEach(req => {
            const cellData = CELL_TYPES[req.cellType];
            const isComplete = req.unitsDelivered >= req.unitsRequired;
            content += `
                <div class="combo-req-row ${isComplete ? 'completed' : ''}">
                    <span class="cell-icon">${cellData?.icon || '🧫'}</span>
                    <span class="cell-name">${cellData?.name || req.cellType}</span>
                    <span class="req-progress">${req.unitsDelivered}/${req.unitsRequired}</span>
                    <span class="req-quality">(品质≥${req.qualityRequired})</span>
                    ${isComplete ? '<span class="check">✓</span>' : ''}
                </div>
            `;
        });
        content += '</div></div>';

        // 为每种需求显示可交付的细胞
        let hasAnyCell = false;
        content += '<div class="deliver-cells-by-type">';

        task.requirements.forEach(req => {
            if (req.unitsDelivered >= req.unitsRequired) return;  // 跳过已完成的需求

            const cellData = CELL_TYPES[req.cellType];
            const matchingCells = harvestedCells
                .map((c, idx) => ({ ...c, originalIndex: idx }))
                .filter(c => c.typeId === req.cellType || c.typeId === 'golden_stock');

            if (matchingCells.length > 0) {
                hasAnyCell = true;
                content += `<div class="deliver-type-section">
                    <h5>${cellData?.icon || '🧫'} ${cellData?.name || req.cellType}</h5>
                    <div class="deliver-cells">`;

                matchingCells.forEach(cell => {
                    const quality = cell.quality || 60;
                    const canDeliver = quality >= req.qualityRequired;
                    content += `
                        <div class="deliver-cell-item ${canDeliver ? '' : 'low-quality'}">
                            <span class="cell-quality">品质: ${quality}</span>
                            ${canDeliver ?
                                `<button class="btn-small" onclick="deliverCellToTask('${taskId}', ${cell.originalIndex})">交付</button>` :
                                '<span class="quality-warning">品质不足</span>'
                            }
                        </div>
                    `;
                });

                content += '</div></div>';
            }
        });

        content += '</div>';

        if (!hasAnyCell) {
            content += '<p class="empty-hint">没有可交付的细胞，请先收获细胞到储藏室</p>';
        }
    } else {
        // 普通任务
        const cellData = CELL_TYPES[task.cellType];
        content += `
            <p>需要: ${cellData?.icon || '🧫'} ${cellData?.name || task.cellType} (品质≥${task.qualityRequired})</p>
            <p>进度: ${task.unitsDelivered}/${task.unitsRequired}</p>
        </div>`;

        // 查找匹配的待交付细胞（记录原始索引）
            const matchingCells = harvestedCells
                .map((c, idx) => ({ ...c, originalIndex: idx }))
                .filter(c => c.typeId === task.cellType || c.typeId === 'golden_stock');


        if (matchingCells.length === 0) {
            content += '<p class="empty-hint">没有可交付的细胞，请先收获细胞到储藏室</p>';
        } else {
            content += '<div class="deliver-cells">';
            matchingCells.forEach(cell => {
                const quality = cell.quality || 60;
                const canDeliver = quality >= task.qualityRequired;
                content += `
                    <div class="deliver-cell-item ${canDeliver ? '' : 'low-quality'}">
                        <span class="cell-icon">${cellData?.icon || '🧫'}</span>
                        <span class="cell-quality">品质: ${quality}</span>
                        ${canDeliver ?
                            `<button class="btn-small" onclick="deliverCellToTask('${taskId}', ${cell.originalIndex})">交付</button>` :
                            '<span class="quality-warning">品质不足</span>'
                        }
                    </div>
                `;
            });
            content += '</div>';
        }
    }

    showModal('交付细胞', content, [
        { text: '关闭', class: 'btn-secondary' }
    ]);
}

/**
 * 将细胞交付到任务
 */
function deliverCellToTask(taskId, cellIndex) {
    const cell = harvestedCells[cellIndex];
    if (!cell) return;

    const result = taskManager.tryDeliverToTask(taskId, cell, player.inventory);

    if (result.success) {
        // 移除已交付的细胞
        harvestedCells.splice(cellIndex, 1);

        if (result.completed) {
            // 任务完成，发放奖励
            const reward = result.reward;
            player.addGold(reward.gold);
            const levelResult = player.addExp(reward.exp);

            showNotification(`任务完成！+${reward.gold}💰 +${reward.exp}⭐`, 'success');

            // 发放额外物品奖励
            if (reward.items) {
                for (const [itemId, count] of Object.entries(reward.items)) {
                    for (let i = 0; i < count; i++) {
                        player.addItem(itemId);
                    }
                }
                showNotification('获得额外物品奖励！', 'success');
            }

            if (npc) npc.react('taskComplete');

            // 检查升级
            if (levelResult.leveledUp) {
                showNotification(`🎉 升级了！${Utils.getLevelText(levelResult.newLevel)}`, 'success');
                if (npc) npc.react('levelUp');
            }

            hideModal();
        } else {
            showNotification(result.message, 'success');
            // 刷新交付模态框
            showDeliverModal(taskId);
        }

        renderTasksPanel();
        updateGameUI();
        saveGame();
    } else {
        showNotification(result.message, 'error');
    }
}


/**
 * 渲染商店面板
 */
function renderShopPanel(category = 'medium', highlightId = null) {
    currentShopCategory = category;
    highlightShopItem = highlightId;
    const grid = document.getElementById('shop-items-grid');
    grid.innerHTML = '';

    const categoryItems = SHOP_ITEMS[category] || {};

    for (const [itemId, item] of Object.entries(categoryItems)) {
        const div = document.createElement('div');
        div.className = 'shop-item';
        if (highlightId === itemId) {
            div.classList.add('highlight');
        }
        div.innerHTML = `
            <div class="item-icon">${item.icon}</div>
            <div class="item-name">${item.name}</div>
            <div class="item-price">${item.price}💰</div>
        `;
        div.addEventListener('click', () => {
            buyItem(itemId, item);
        });
        grid.appendChild(div);
    }

    // Tab切换
    document.querySelectorAll('.shop-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.shop === category);
        tab.addEventListener('click', () => {
            document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const nextCategory = tab.dataset.shop;
            renderShopPanel(nextCategory, null);
        });
    });
}

/**
 * 购买物品
 */
function buyItem(itemId, item) {
    if (player.gold < item.price) {
        showNotification('金币不足！', 'error');
        return;
    }

    player.spendGold(item.price);
    player.addItem(itemId);
    updateGameUI();
    showNotification(`购买成功: ${item.name}`, 'success');
}

/**
 * 渲染好友面板
 */
function renderFriendsPanel() {
    // 基础实现
}

/**
 * 更新游戏UI
 */
function updateGameUI() {
    if (!player) return;

    // 更新顶部状态栏
    document.getElementById('player-title').textContent = Utils.getLevelText(player.level);
    document.getElementById('display-name').textContent = player.username;
    document.getElementById('player-gold').textContent = Utils.formatNumber(player.gold);

    const progress = player.getLevelProgress();
    document.getElementById('player-exp').textContent = Utils.formatNumber(progress.current);
    document.getElementById('exp-needed').textContent = Utils.formatNumber(progress.needed);

    // 更新日期
    document.getElementById('game-date').textContent = player.getGameDateString();

    // 更新24小时制时间
    const gameTimeEl = document.getElementById('game-time');
    if (gameTimeEl && player.gameTime.currentDate) {
        const hours = player.gameTime.currentDate.getHours().toString().padStart(2, '0');
        const minutes = player.gameTime.currentDate.getMinutes().toString().padStart(2, '0');
        gameTimeEl.textContent = `${hours}:${minutes}`;
    }

    // 更新事件显示栏
    updateEventsBar();
}

/**
 * 触发破产
 */
function triggerBankruptcy() {
    stopGameLoop();

    if (npc) {
        npc.react('bankruptcy');
    }

    // 更新破产界面统计
    document.getElementById('survive-days').textContent = player.stats.daysPlayed;
    document.getElementById('max-level').textContent = Utils.getLevelText(player.level);
    document.getElementById('total-cells').textContent = player.stats.totalCellsCultured;

    switchScreen('bankruptcy');
}

/**
 * 初始化破产界面
 */
function initBankruptcyScreen() {
    document.getElementById('btn-restart').addEventListener('click', () => {
        Storage.deleteSave();
        location.reload();
    });

    document.getElementById('btn-reorganize').addEventListener('click', () => {
        // 保留等级，重置经费为穷困潦倒组
        player.gold = CONFIG.GAME_MODES.poor.initialGold;
        player.assignedMode = 'poor';
        player.inventory = { 'dmem': 2, 'fbs': 2, 'pbs': 3, 'trypsin': 2 };

        saveGame();
        startGameLoop();
        switchScreen('lab');
        updateGameUI();

        showNotification('破产重组成功，从头再来！', 'warning');
    });

    document.getElementById('btn-back-menu').addEventListener('click', () => {
        Storage.deleteSave();
        location.reload();
    });
}

/**
 * 页面加载完成后初始化
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('🧫 细胞主理人 V2.0 启动中...');

    // 初始化各界面
    initLoginScreen();
    initRoleSelectScreen();
    initFateScreen();
    initBankruptcyScreen();
    initBGM();

    console.log('🧫 细胞主理人 初始化完成！');
});
