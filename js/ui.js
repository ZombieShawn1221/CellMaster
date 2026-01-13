/**
 * 细胞主理人 - UI渲染系统
 */

class UI {
    constructor(game) {
        this.game = game;
        this.currentPanel = 'lab';

        // 缓存DOM元素
        this.elements = {
            // 状态栏
            playerName: document.getElementById('player-name'),
            playerLevel: document.getElementById('player-level'),
            gold: document.getElementById('gold'),
            gems: document.getElementById('gems'),
            exp: document.getElementById('exp'),

            // 主区域
            incubatorSlots: document.getElementById('incubator-slots'),
            workbenchLevel: document.getElementById('workbench-level'),
            workbenchEfficiency: document.getElementById('workbench-efficiency'),
            currentOperation: document.getElementById('current-operation'),
            taskList: document.getElementById('task-list'),

            // 按钮
            btnPassage: document.getElementById('btn-passage'),
            btnHarvest: document.getElementById('btn-harvest'),
            btnFeed: document.getElementById('btn-feed'),
            btnNewTask: document.getElementById('btn-new-task'),

            // 面板
            shopPanel: document.getElementById('shop-panel'),
            shopItems: document.getElementById('shop-items'),
            inventoryPanel: document.getElementById('inventory-panel'),
            inventoryItems: document.getElementById('inventory-items'),
            upgradePanel: document.getElementById('upgrade-panel'),
            upgradeList: document.getElementById('upgrade-list'),

            // 模态框和通知
            modalContainer: document.getElementById('modal-container'),
            modalContent: document.getElementById('modal-content'),
            notification: document.getElementById('notification'),
            notificationText: document.getElementById('notification-text')
        };

        this.setupEventListeners();
    }

    /**
     * 设置事件监听
     */
    setupEventListeners() {
        // 底部导航
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const panel = btn.dataset.panel;
                this.switchPanel(panel);
            });
        });

        // 新任务按钮
        this.elements.btnNewTask.addEventListener('click', () => {
            this.showNewTaskModal();
        });

        // 操作按钮
        this.elements.btnHarvest.addEventListener('click', () => {
            if (this.game.selectedSlot !== null) {
                this.handleHarvest(this.game.selectedSlot);
            }
        });

        this.elements.btnPassage.addEventListener('click', () => {
            if (this.game.selectedSlot !== null) {
                this.showPassageModal(this.game.selectedSlot);
            }
        });

        // 商店分类标签
        document.querySelectorAll('.shop-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.renderShopItems(tab.dataset.category);
            });
        });

        // 模态框关闭
        this.elements.modalContainer.addEventListener('click', (e) => {
            if (e.target === this.elements.modalContainer) {
                this.hideModal();
            }
        });
    }

    /**
     * 切换面板
     */
    switchPanel(panelName) {
        // 更新导航按钮状态
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.panel === panelName);
        });

        // 隐藏所有面板
        document.querySelectorAll('.panel').forEach(panel => {
            panel.classList.add('hidden');
        });

        // 显示目标面板
        this.currentPanel = panelName;

        switch (panelName) {
            case 'lab':
                // 实验室是默认视图，不需要显示面板
                break;
            case 'shop':
                this.elements.shopPanel.classList.remove('hidden');
                this.renderShopItems('medium');
                break;
            case 'inventory':
                this.elements.inventoryPanel.classList.remove('hidden');
                this.renderInventory();
                break;
            case 'upgrade':
                this.elements.upgradePanel.classList.remove('hidden');
                this.renderUpgrades();
                break;
            case 'achievements':
                this.showAchievementsModal();
                break;
        }
    }

    /**
     * 更新所有UI
     */
    update() {
        this.updateStatusBar();
        this.renderIncubatorSlots();
        this.updateWorkbench();
        this.renderTasks();
    }

    /**
     * 更新状态栏
     */
    updateStatusBar() {
        const player = this.game.player;
        const expNeeded = this.game.getExpForNextLevel();

        this.elements.playerName.textContent = player.name;
        this.elements.playerLevel.textContent = `Lv.${player.level}`;
        this.elements.gold.textContent = this.formatNumber(player.gold);
        this.elements.gems.textContent = player.gems;
        this.elements.exp.textContent = `${player.exp}/${expNeeded}`;
    }

    /**
     * 渲染培养箱槽位
     */
    renderIncubatorSlots() {
        this.elements.incubatorSlots.innerHTML = '';

        this.game.incubator.slots.forEach((slot, index) => {
            const slotEl = document.createElement('div');
            slotEl.className = 'incubator-slot';
            slotEl.dataset.index = index;

            if (slot.isLocked) {
                slotEl.classList.add('locked');
                slotEl.innerHTML = `<span class="lock-icon">🔒</span><span class="unlock-cost">${this.formatNumber(this.game.incubator.getNextSlotCost())}💰</span>`;
                slotEl.addEventListener('click', () => this.handleUnlockSlot());
            } else if (slot.cell) {
                const cell = slot.cell;
                slotEl.classList.add('occupied');

                if (cell.isContaminated) {
                    slotEl.classList.add('contaminated');
                }

                if (cell.status === 'ready') {
                    slotEl.classList.add('ready');
                }

                slotEl.innerHTML = `
                    <span class="cell-icon">${cell.icon}</span>
                    <span class="slot-cell-name">${cell.name}</span>
                    <div class="slot-progress">
                        <div class="slot-progress-bar" style="width: ${cell.growthProgress}%"></div>
                    </div>
                    <span class="slot-status">${cell.getStatusText()}</span>
                    ${cell.status === 'growing' ? `<span class="time-remaining">${this.formatTime(cell.getRemainingTime())}</span>` : ''}
                `;

                slotEl.addEventListener('click', () => this.selectSlot(index));
            } else {
                slotEl.innerHTML = `
                    <span class="empty-icon">➕</span>
                    <span class="empty-text">开始培养</span>
                `;
                slotEl.addEventListener('click', () => this.showCellSelectModal(index));
            }

            this.elements.incubatorSlots.appendChild(slotEl);
        });
    }

    /**
     * 更新工作台信息
     */
    updateWorkbench() {
        const level = this.game.workbenchLevel;
        const info = CONFIG.WORKBENCH.LEVELS[level];

        this.elements.workbenchLevel.textContent = level;
        this.elements.workbenchEfficiency.textContent = `${Math.floor(info.efficiency * 100)}%`;

        // 更新选中细胞信息
        if (this.game.selectedSlot !== null) {
            const slot = this.game.incubator.getSlotInfo(this.game.selectedSlot);
            if (slot && slot.cell) {
                this.renderSelectedCell(slot.cell);
            } else {
                this.clearSelectedCell();
            }
        } else {
            this.clearSelectedCell();
        }
    }

    /**
     * 渲染选中的细胞
     */
    renderSelectedCell(cell) {
        this.elements.currentOperation.innerHTML = `
            <div class="selected-cell">
                <span class="cell-icon">${cell.icon}</span>
                <h3>${cell.name}</h3>
                <p>状态: ${cell.getStatusText()}</p>
                ${cell.status === 'growing' ? `<p>剩余时间: ${this.formatTime(cell.getRemainingTime())}</p>` : ''}
                <p>预计价值: ${cell.baseValue * cell.valueMultiplier} 💰</p>
            </div>
        `;

        // 更新按钮状态
        this.elements.btnHarvest.disabled = cell.status !== 'ready';
        this.elements.btnPassage.disabled = cell.status !== 'ready';
        this.elements.btnFeed.disabled = cell.status !== 'growing';

        // 污染细胞特殊处理
        if (cell.isContaminated) {
            this.elements.currentOperation.innerHTML += `
                <div class="contamination-warning">
                    <p>⚠️ 细胞已污染</p>
                    <button class="btn-emergency" onclick="ui.handleEmergencySave(${cell.slotIndex})">🚑 紧急救援</button>
                    <button class="btn-discard" onclick="ui.handleDiscard(${cell.slotIndex})">🗑️ 丢弃</button>
                </div>
            `;
            this.elements.btnHarvest.disabled = true;
            this.elements.btnPassage.disabled = true;
        }
    }

    /**
     * 清除选中状态
     */
    clearSelectedCell() {
        this.elements.currentOperation.innerHTML = '<p>选择细胞进行操作</p>';
        this.elements.btnHarvest.disabled = true;
        this.elements.btnPassage.disabled = true;
        this.elements.btnFeed.disabled = true;
    }

    /**
     * 选择槽位
     */
    selectSlot(index) {
        this.game.selectedSlot = index;
        this.update();
    }

    /**
     * 渲染任务列表
     */
    renderTasks() {
        this.elements.taskList.innerHTML = '';

        this.game.taskManager.activeTasks.forEach(task => {
            const taskEl = document.createElement('div');
            taskEl.className = 'task-card';

            if (task.urgent) taskEl.classList.add('urgent');
            if (task.status === 'completed') taskEl.classList.add('completed');

            const progressPercent = task.getProgressPercent();

            taskEl.innerHTML = `
                <div class="task-header">
                    <span class="task-title">${task.urgent ? '🔥 ' : ''}${task.name}</span>
                    <span class="task-reward">+${task.reward.gold}💰</span>
                </div>
                <p class="task-requirements">${task.getProgressText()}</p>
                ${task.timeLimit ? `<p class="task-time">⏱️ ${task.getRemainingTimeText()}</p>` : ''}
                <div class="task-progress">
                    <div class="task-progress-bar">
                        <div class="task-progress-fill" style="width: ${progressPercent}%"></div>
                    </div>
                </div>
            `;

            if (task.status === 'completed') {
                taskEl.innerHTML += `
                    <button class="claim-reward-btn" onclick="ui.claimTaskReward('${task.id}')">领取奖励</button>
                `;
            }

            this.elements.taskList.appendChild(taskEl);
        });

        if (this.game.taskManager.activeTasks.length === 0) {
            this.elements.taskList.innerHTML = '<p class="no-tasks">暂无任务，点击下方接取新任务</p>';
        }
    }

    /**
     * 渲染商店物品
     */
    renderShopItems(category) {
        const items = this.game.shop.getItemsByCategory(category, this.game.player.level);

        this.elements.shopItems.innerHTML = '';

        items.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'shop-item';
            itemEl.innerHTML = `
                <span class="item-icon">${item.icon}</span>
                <div class="item-name">${item.name}</div>
                <div class="item-desc">${item.description}</div>
                <div class="item-price">${item.price} 💰</div>
                <div class="item-stock">库存: ${this.game.inventory.getItemCount(item.id)}</div>
            `;

            itemEl.addEventListener('click', () => this.showBuyModal(item));
            this.elements.shopItems.appendChild(itemEl);
        });
    }

    /**
     * 渲染背包
     */
    renderInventory() {
        const categorized = this.game.inventory.getItemsByCategory();

        this.elements.inventoryItems.innerHTML = '';

        // 显示各类物品
        const categoryNames = {
            medium: '培养基',
            serum: '血清',
            reagent: '试剂',
            tools: '道具',
            cells: '已收获细胞',
            special: '特殊物品'
        };

        for (const [category, items] of Object.entries(categorized)) {
            if (items.length === 0) continue;

            const categoryEl = document.createElement('div');
            categoryEl.className = 'inventory-category';
            categoryEl.innerHTML = `<h3>${categoryNames[category]}</h3>`;

            const itemsContainer = document.createElement('div');
            itemsContainer.className = 'inventory-items-grid';

            items.forEach(item => {
                const itemEl = document.createElement('div');
                itemEl.className = 'inventory-item';
                itemEl.innerHTML = `
                    <span class="item-icon">${item.icon}</span>
                    <span class="item-count">${item.quantity}</span>
                `;
                itemEl.title = `${item.name}\n${item.description || ''}`;

                if (category === 'special' && item.id === 'golden_pearl') {
                    itemEl.classList.add('golden-glow');
                    itemEl.addEventListener('click', () => this.showSellGoldenPearlModal());
                }

                itemsContainer.appendChild(itemEl);
            });

            categoryEl.appendChild(itemsContainer);
            this.elements.inventoryItems.appendChild(categoryEl);
        }

        if (this.elements.inventoryItems.children.length === 0) {
            this.elements.inventoryItems.innerHTML = '<p class="empty-inventory">背包是空的</p>';
        }
    }

    /**
     * 渲染升级选项
     */
    renderUpgrades() {
        this.elements.upgradeList.innerHTML = '';

        // 工作台升级
        const workbenchUpgrade = document.createElement('div');
        workbenchUpgrade.className = 'upgrade-item';

        const currentWB = CONFIG.WORKBENCH.LEVELS[this.game.workbenchLevel];
        const nextWBCost = CONFIG.WORKBENCH.UPGRADE_COSTS[this.game.workbenchLevel];
        const canUpgradeWB = this.game.workbenchLevel < 5 && this.game.player.gold >= nextWBCost;

        workbenchUpgrade.innerHTML = `
            <div class="upgrade-info">
                <h3>🔬 超净工作台</h3>
                <p>当前: ${currentWB.name} (效率 ${Math.floor(currentWB.efficiency * 100)}%)</p>
                <p class="upgrade-level">等级: ${this.game.workbenchLevel}/5</p>
            </div>
            ${this.game.workbenchLevel < 5 ?
                `<button class="upgrade-btn" ${canUpgradeWB ? '' : 'disabled'}>
                    升级 ${this.formatNumber(nextWBCost)}💰
                </button>` :
                '<span class="max-level">已满级</span>'
            }
        `;

        if (canUpgradeWB) {
            workbenchUpgrade.querySelector('.upgrade-btn').addEventListener('click', () => {
                this.game.upgradeWorkbench();
                this.renderUpgrades();
                this.update();
            });
        }

        this.elements.upgradeList.appendChild(workbenchUpgrade);

        // 培养槽解锁
        const slotUpgrade = document.createElement('div');
        slotUpgrade.className = 'upgrade-item';

        const stats = this.game.incubator.getStats();
        const nextSlotCost = this.game.incubator.getNextSlotCost();
        const canUnlock = nextSlotCost !== null && this.game.player.gold >= nextSlotCost;

        slotUpgrade.innerHTML = `
            <div class="upgrade-info">
                <h3>🧫 培养槽位</h3>
                <p>扩展CO2培养箱的培养槽数量</p>
                <p class="upgrade-level">已解锁: ${this.game.incubator.unlockedSlots}/${this.game.incubator.maxSlots}</p>
            </div>
            ${nextSlotCost !== null ?
                `<button class="upgrade-btn" ${canUnlock ? '' : 'disabled'}>
                    解锁 ${this.formatNumber(nextSlotCost)}💰
                </button>` :
                '<span class="max-level">已满</span>'
            }
        `;

        if (canUnlock) {
            slotUpgrade.querySelector('.upgrade-btn').addEventListener('click', () => {
                this.game.unlockSlot();
                this.renderUpgrades();
                this.update();
            });
        }

        this.elements.upgradeList.appendChild(slotUpgrade);
    }

    /**
     * 显示细胞选择模态框
     */
    showCellSelectModal(slotIndex) {
        const availableCells = Object.values(CELL_TYPES).filter(
            cell => cell.unlockLevel <= this.game.player.level
        );

        let html = `
            <div class="modal-header">
                <h2>选择要培养的细胞</h2>
                <button class="modal-close" onclick="ui.hideModal()">&times;</button>
            </div>
            <div class="cell-select-grid">
        `;

        availableCells.forEach(cell => {
            const requirements = this.game.shop.checkCellRequirements(cell.id, this.game.inventory);
            const canCulture = requirements.canCulture;

            html += `
                <div class="cell-option ${canCulture ? '' : 'disabled'}"
                     ${canCulture ? `onclick="ui.startCulture('${cell.id}', ${slotIndex})"` : ''}>
                    <span class="cell-icon">${cell.icon}</span>
                    <h3>${cell.name}</h3>
                    <p>${cell.description}</p>
                    <p class="cell-time">培养时间: ~${cell.baseGrowthTime}秒</p>
                    <p class="cell-value">价值: ${cell.baseValue}💰</p>
                    ${!canCulture ? `<p class="missing">缺少: ${requirements.missing.join(', ')}</p>` : ''}
                </div>
            `;
        });

        html += '</div>';

        this.elements.modalContent.innerHTML = html;
        this.showModal();
    }

    /**
     * 开始培养
     */
    startCulture(cellTypeId, slotIndex) {
        const result = this.game.startCulture(cellTypeId, slotIndex);

        if (result.success) {
            this.hideModal();
            this.update();
        } else {
            this.showNotification(result.message, 'error');
        }
    }

    /**
     * 显示购买模态框
     */
    showBuyModal(item) {
        this.elements.modalContent.innerHTML = `
            <div class="modal-header">
                <h2>购买 ${item.name}</h2>
                <button class="modal-close" onclick="ui.hideModal()">&times;</button>
            </div>
            <div class="buy-modal-content">
                <span class="item-icon-large">${item.icon}</span>
                <p>${item.description}</p>
                <p class="item-price-large">单价: ${item.price} 💰</p>
                <div class="quantity-selector">
                    <button onclick="ui.updateBuyQuantity(-1)">-</button>
                    <input type="number" id="buy-quantity" value="1" min="1" max="99">
                    <button onclick="ui.updateBuyQuantity(1)">+</button>
                </div>
                <p class="total-price">总价: <span id="total-price">${item.price}</span> 💰</p>
                <button class="buy-confirm-btn" onclick="ui.confirmBuy('${item.id}')">确认购买</button>
            </div>
        `;

        this.currentBuyItem = item;
        this.showModal();
    }

    /**
     * 更新购买数量
     */
    updateBuyQuantity(delta) {
        const input = document.getElementById('buy-quantity');
        let qty = parseInt(input.value) + delta;
        qty = Math.max(1, Math.min(99, qty));
        input.value = qty;

        const totalEl = document.getElementById('total-price');
        totalEl.textContent = this.currentBuyItem.price * qty;
    }

    /**
     * 确认购买
     */
    confirmBuy(itemId) {
        const quantity = parseInt(document.getElementById('buy-quantity').value);
        const result = this.game.buyItem(itemId, quantity);

        if (result.success) {
            this.hideModal();
            this.update();
            this.renderShopItems(this.game.shop.currentCategory);
        } else {
            this.showNotification(result.message, 'error');
        }
    }

    /**
     * 显示新任务模态框
     */
    showNewTaskModal() {
        const available = this.game.taskManager.getAvailableTaskTemplates(this.game.player.level);

        let html = `
            <div class="modal-header">
                <h2>接取新任务</h2>
                <button class="modal-close" onclick="ui.hideModal()">&times;</button>
            </div>
            <div class="task-select-list">
        `;

        available.forEach(template => {
            const reqText = template.requirements.map(r =>
                `${CELL_TYPES[r.cellType].name} x${r.count}`
            ).join(', ');

            html += `
                <div class="task-option ${template.urgent ? 'urgent' : ''}"
                     onclick="ui.acceptTask('${template.id}')">
                    <div class="task-option-header">
                        <span class="task-name">${template.urgent ? '🔥 ' : ''}${template.name}</span>
                        <span class="task-reward">+${template.reward.gold}💰 +${template.reward.exp}XP</span>
                    </div>
                    <p class="task-desc">${template.description}</p>
                    <p class="task-req">需要: ${reqText}</p>
                    ${template.timeLimit ? `<p class="task-limit">⏱️ 限时: ${Math.floor(template.timeLimit / 60)}分钟</p>` : ''}
                </div>
            `;
        });

        html += `
            </div>
            <button class="random-task-btn" onclick="ui.acceptRandomTask()">🎲 随机任务</button>
        `;

        this.elements.modalContent.innerHTML = html;
        this.showModal();
    }

    /**
     * 接取任务
     */
    acceptTask(templateId) {
        const result = this.game.taskManager.acceptTask(templateId, this.game.player.level);

        if (result.success) {
            this.hideModal();
            this.update();
            this.showNotification(result.message, 'success');
        } else {
            this.showNotification(result.message, 'error');
        }
    }

    /**
     * 随机接取任务
     */
    acceptRandomTask() {
        const result = this.game.taskManager.acceptRandomTask(this.game.player.level);

        if (result.success) {
            this.hideModal();
            this.update();
            this.showNotification(result.message, 'success');
        } else {
            this.showNotification(result.message, 'error');
        }
    }

    /**
     * 领取任务奖励
     */
    claimTaskReward(taskId) {
        const result = this.game.taskManager.claimTaskReward(taskId);

        if (result.success) {
            this.game.player.gold += result.gold;
            this.game.addExp(result.exp);
            this.game.player.gems += result.gems;

            this.showNotification(
                `任务完成！获得 ${result.gold}💰 ${result.exp}XP ${result.gems > 0 ? result.gems + '💎' : ''}`,
                'success'
            );
            this.update();
        }
    }

    /**
     * 处理收获
     */
    handleHarvest(slotIndex) {
        const result = this.game.harvestCell(slotIndex);

        if (result.success) {
            let message = `收获成功！获得 ${result.value}💰 ${result.exp}XP`;
            if (result.goldenPearl) {
                message += ' 🔮 黄金珠！';
            }
            this.showNotification(message, 'success');
            this.game.selectedSlot = null;
            this.update();
        } else {
            this.showNotification(result.message, 'error');
        }
    }

    /**
     * 处理紧急救援
     */
    handleEmergencySave(slotIndex) {
        const result = this.game.emergencySaveCell(slotIndex);

        if (result.success) {
            this.showNotification(result.message, 'success');
            this.game.selectedSlot = null;
            this.update();
        } else {
            this.showNotification(result.message, 'error');
        }
    }

    /**
     * 处理丢弃
     */
    handleDiscard(slotIndex) {
        const result = this.game.discardCell(slotIndex);

        if (result.success) {
            this.showNotification(result.message, 'warning');
            this.game.selectedSlot = null;
            this.update();
        }
    }

    /**
     * 处理解锁槽位
     */
    handleUnlockSlot() {
        const result = this.game.unlockSlot();

        if (result.success) {
            this.showNotification(result.message, 'success');
            this.update();
        } else {
            this.showNotification(result.message, 'error');
        }
    }

    /**
     * 显示成就模态框
     */
    showAchievementsModal() {
        let html = `
            <div class="modal-header">
                <h2>🏆 成就</h2>
                <button class="modal-close" onclick="ui.hideModal()">&times;</button>
            </div>
            <div class="achievements-list">
        `;

        Object.values(CONFIG.ACHIEVEMENTS).forEach(achievement => {
            const unlocked = this.game.player.achievements.includes(achievement.id);
            html += `
                <div class="achievement-item ${unlocked ? 'unlocked' : 'locked'}">
                    <span class="achievement-icon">${unlocked ? '🏆' : '🔒'}</span>
                    <div class="achievement-info">
                        <h3>${achievement.name}</h3>
                        <p>${achievement.desc}</p>
                        <p class="achievement-reward">奖励: ${achievement.reward}💰</p>
                    </div>
                </div>
            `;
        });

        html += '</div>';

        this.elements.modalContent.innerHTML = html;
        this.showModal();
    }

    /**
     * 显示出售黄金珠模态框
     */
    showSellGoldenPearlModal() {
        const count = this.game.inventory.goldenPearls;

        this.elements.modalContent.innerHTML = `
            <div class="modal-header">
                <h2>🔮 出售黄金珠</h2>
                <button class="modal-close" onclick="ui.hideModal()">&times;</button>
            </div>
            <div class="sell-modal-content">
                <p>你有 ${count} 颗黄金珠</p>
                <p>每颗价值: ${CONFIG.CELL.GOLDEN_PEARL_VALUE}💰</p>
                <button class="sell-btn" onclick="ui.sellGoldenPearls(${count})">
                    全部出售 (+${count * CONFIG.CELL.GOLDEN_PEARL_VALUE}💰)
                </button>
            </div>
        `;

        this.showModal();
    }

    /**
     * 出售黄金珠
     */
    sellGoldenPearls(count) {
        const result = this.game.sellGoldenPearls(count);

        if (result.success) {
            this.hideModal();
            this.update();
            this.showNotification(`出售成功！获得 ${result.value}💰`, 'success');
        }
    }

    /**
     * 显示模态框
     */
    showModal() {
        this.elements.modalContainer.classList.remove('hidden');
    }

    /**
     * 隐藏模态框
     */
    hideModal() {
        this.elements.modalContainer.classList.add('hidden');
    }

    /**
     * 显示通知
     */
    showNotification(message, type = 'info') {
        this.elements.notification.className = type;
        this.elements.notificationText.textContent = message;
        this.elements.notification.classList.remove('hidden');

        setTimeout(() => {
            this.elements.notification.classList.add('hidden');
        }, 3000);
    }

    /**
     * 格式化数字
     */
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    /**
     * 格式化时间
     */
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    }
}

// 添加额外的CSS样式
const additionalStyles = `
    .cell-select-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 15px;
        max-height: 400px;
        overflow-y: auto;
    }

    .cell-option {
        background: rgba(0,0,0,0.3);
        border-radius: 10px;
        padding: 15px;
        cursor: pointer;
        transition: all 0.3s;
        border: 2px solid transparent;
    }

    .cell-option:hover:not(.disabled) {
        border-color: var(--primary-color);
        transform: translateY(-3px);
    }

    .cell-option.disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .cell-option .cell-icon {
        font-size: 36px;
    }

    .cell-option h3 {
        margin: 10px 0 5px;
    }

    .cell-option p {
        font-size: 12px;
        color: var(--text-secondary);
    }

    .cell-option .missing {
        color: var(--danger-color);
    }

    .task-select-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-height: 400px;
        overflow-y: auto;
    }

    .task-option {
        background: rgba(0,0,0,0.3);
        border-radius: 10px;
        padding: 15px;
        cursor: pointer;
        transition: all 0.3s;
        border-left: 4px solid var(--primary-color);
    }

    .task-option:hover {
        background: rgba(255,255,255,0.1);
    }

    .task-option.urgent {
        border-left-color: var(--danger-color);
    }

    .task-option-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 10px;
    }

    .random-task-btn {
        width: 100%;
        margin-top: 15px;
        padding: 15px;
        background: var(--primary-color);
        border: none;
        border-radius: 10px;
        color: white;
        cursor: pointer;
        font-size: 16px;
    }

    .buy-modal-content {
        text-align: center;
    }

    .item-icon-large {
        font-size: 64px;
        display: block;
        margin-bottom: 15px;
    }

    .quantity-selector {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 10px;
        margin: 15px 0;
    }

    .quantity-selector button {
        width: 40px;
        height: 40px;
        border: none;
        background: var(--primary-color);
        color: white;
        border-radius: 5px;
        cursor: pointer;
        font-size: 20px;
    }

    .quantity-selector input {
        width: 60px;
        height: 40px;
        text-align: center;
        border: 1px solid var(--primary-color);
        border-radius: 5px;
        background: transparent;
        color: white;
        font-size: 18px;
    }

    .buy-confirm-btn {
        width: 100%;
        padding: 15px;
        background: var(--success-color);
        border: none;
        border-radius: 10px;
        color: white;
        cursor: pointer;
        font-size: 16px;
        margin-top: 15px;
    }

    .contamination-warning {
        margin-top: 15px;
        padding: 15px;
        background: rgba(245, 108, 108, 0.2);
        border-radius: 10px;
    }

    .btn-emergency, .btn-discard {
        padding: 10px 20px;
        margin: 5px;
        border: none;
        border-radius: 5px;
        cursor: pointer;
    }

    .btn-emergency {
        background: var(--warning-color);
        color: white;
    }

    .btn-discard {
        background: var(--danger-color);
        color: white;
    }

    .achievements-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .achievement-item {
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 15px;
        background: rgba(0,0,0,0.3);
        border-radius: 10px;
    }

    .achievement-item.locked {
        opacity: 0.5;
    }

    .achievement-item.unlocked {
        border: 2px solid var(--gold-color);
    }

    .achievement-icon {
        font-size: 32px;
    }

    .claim-reward-btn {
        margin-top: 10px;
        padding: 8px 15px;
        background: var(--success-color);
        border: none;
        border-radius: 5px;
        color: white;
        cursor: pointer;
    }

    .inventory-category h3 {
        margin: 15px 0 10px;
        color: var(--primary-color);
    }

    .inventory-items-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
        gap: 10px;
    }

    .incubator-slot.ready {
        border-color: var(--gold-color);
        animation: ready-pulse 1s infinite;
    }

    @keyframes ready-pulse {
        0%, 100% { box-shadow: 0 0 5px var(--gold-color); }
        50% { box-shadow: 0 0 15px var(--gold-color); }
    }

    .time-remaining {
        font-size: 10px;
        color: var(--text-secondary);
    }

    .empty-icon {
        font-size: 32px;
        opacity: 0.5;
    }

    .empty-text {
        font-size: 12px;
        color: var(--text-secondary);
    }

    .unlock-cost {
        font-size: 10px;
        color: var(--gold-color);
    }
`;

// 注入额外样式
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);
