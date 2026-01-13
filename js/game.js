/**
 * 细胞主理人 - 游戏核心引擎
 */

class Game {
    constructor() {
        // 玩家数据
        this.player = {
            name: '牛马研究员',
            level: 1,
            exp: 0,
            gold: CONFIG.GAME.INITIAL_GOLD,
            gems: CONFIG.GAME.INITIAL_GEMS,
            totalCellsCultured: 0,
            consecutiveNonContaminated: 0,
            achievements: []
        };

        // 工作台等级
        this.workbenchLevel = 1;

        // 游戏系统
        this.incubator = new Incubator();
        this.inventory = new Inventory();
        this.shop = new Shop();
        this.taskManager = new TaskManager();

        // 当前选中的细胞/槽位
        this.selectedSlot = null;
        this.selectedCell = null;

        // 活动效果
        this.activeEffects = [];

        // 游戏状态
        this.isRunning = false;
        this.lastUpdate = Date.now();
        this.gameLoop = null;

        // 事件回调
        this.onUpdate = null;
        this.onNotify = null;
        this.onCellReady = null;
        this.onCellContaminated = null;
        this.onTaskCompleted = null;
        this.onLevelUp = null;
        this.onAchievement = null;
    }

    /**
     * 初始化游戏
     */
    init() {
        // 给玩家一些初始物品
        this.inventory.addItem('dmem', 5);
        this.inventory.addItem('fbs', 5);
        this.inventory.addItem('pbs', 10);
        this.inventory.addItem('trypsin', 5);

        // 接取初始任务
        this.taskManager.acceptRandomTask(this.player.level);
    }

    /**
     * 开始游戏循环
     */
    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.lastUpdate = Date.now();

        this.gameLoop = setInterval(() => {
            this.update();
        }, CONFIG.GAME.TICK_INTERVAL);

        console.log('游戏开始运行');
    }

    /**
     * 暂停游戏
     */
    pause() {
        this.isRunning = false;
        if (this.gameLoop) {
            clearInterval(this.gameLoop);
            this.gameLoop = null;
        }
    }

    /**
     * 游戏主循环
     */
    update() {
        const now = Date.now();
        const deltaTime = now - this.lastUpdate;
        this.lastUpdate = now;

        // 更新培养箱
        const workbenchEfficiency = CONFIG.WORKBENCH.LEVELS[this.workbenchLevel].efficiency;
        const cellEvents = this.incubator.update(deltaTime, workbenchEfficiency);

        // 处理细胞事件
        cellEvents.forEach(event => {
            if (event.type === 'ready') {
                this.notify(`${event.cell.name} 培养完成！`, 'success');
                if (this.onCellReady) this.onCellReady(event);
            } else if (event.type === 'contaminated') {
                this.notify(`${event.cell.name} 被污染了！`, 'error');
                this.player.consecutiveNonContaminated = 0;
                if (this.onCellContaminated) this.onCellContaminated(event);
            }
        });

        // 更新任务
        const expiredTasks = this.taskManager.update(deltaTime);
        expiredTasks.forEach(task => {
            this.notify(`任务 "${task.name}" 已过期！`, 'warning');
        });

        // 更新活动效果
        this.updateActiveEffects(deltaTime);

        // 随机事件检查
        this.checkRandomEvents();

        // 触发更新回调
        if (this.onUpdate) this.onUpdate();
    }

    /**
     * 开始培养细胞
     */
    startCulture(cellTypeId, slotIndex = -1, useItems = []) {
        // 检查细胞类型是否解锁
        const cellData = CELL_TYPES[cellTypeId];
        if (!cellData) {
            return { success: false, message: '未知细胞类型' };
        }

        if (cellData.unlockLevel > this.player.level) {
            return { success: false, message: `需要等级${cellData.unlockLevel}解锁` };
        }

        // 检查培养材料
        const requirements = this.shop.checkCellRequirements(cellTypeId, this.inventory);
        if (!requirements.canCulture) {
            return {
                success: false,
                message: `缺少材料: ${requirements.missing.join(', ')}`
            };
        }

        // 检查槽位
        if (this.incubator.getAvailableSlotCount() === 0) {
            return { success: false, message: '没有空闲培养槽位' };
        }

        // 消耗材料
        if (!this.inventory.consumeCellMaterials(cellTypeId)) {
            return { success: false, message: '材料消耗失败' };
        }

        // 创建细胞
        const cell = new Cell(cellTypeId, slotIndex);

        // 应用道具效果
        useItems.forEach(itemId => {
            const result = this.inventory.useItem(itemId);
            if (result.success && result.effect) {
                cell.applyEffect(result.effect);
            }
        });

        // 放入培养箱
        const placeResult = this.incubator.placeCell(cell, slotIndex);

        if (placeResult.success) {
            this.notify(`开始培养 ${cell.name}`, 'success');
        }

        return placeResult;
    }

    /**
     * 收获细胞
     */
    harvestCell(slotIndex) {
        const slot = this.incubator.getSlotInfo(slotIndex);

        if (!slot || !slot.cell) {
            return { success: false, message: '槽位为空' };
        }

        const cell = slot.cell;
        const result = cell.harvest();

        if (!result.success) {
            return result;
        }

        // 移除细胞
        this.incubator.removeCell(slotIndex);

        // 添加收益
        this.player.gold += result.value;
        this.addExp(result.exp);

        // 添加到已收获列表
        this.inventory.addHarvestedCell(cell.typeId);

        // 统计
        this.player.totalCellsCultured++;
        this.player.consecutiveNonContaminated++;

        // 检查黄金珠
        if (result.goldenPearl) {
            this.inventory.addGoldenPearl();
            this.player.gold += result.goldenValue;
            this.notify('获得了黄金珠！', 'success');
            this.checkAchievement('golden_first');
        }

        // 检查成就
        this.checkAchievement('first_cell');
        if (this.player.totalCellsCultured >= 10) {
            this.checkAchievement('cell_10');
        }
        if (this.player.totalCellsCultured >= 100) {
            this.checkAchievement('cell_100');
        }
        if (this.player.consecutiveNonContaminated >= 10) {
            this.checkAchievement('no_cont_10');
        }

        // 自动检查任务
        this.autoSubmitToTask(cell.typeId);

        return {
            ...result,
            newGold: this.player.gold
        };
    }

    /**
     * 紧急救援污染细胞
     */
    emergencySaveCell(slotIndex) {
        const slot = this.incubator.getSlotInfo(slotIndex);

        if (!slot || !slot.cell) {
            return { success: false, message: '槽位为空' };
        }

        // 检查是否有紧急救援包
        if (!this.inventory.hasItem('emergency_save')) {
            return { success: false, message: '没有紧急救援包' };
        }

        const cell = slot.cell;
        const result = cell.emergencySave();

        if (!result.success) {
            return result;
        }

        // 消耗道具
        this.inventory.removeItem('emergency_save', 1);

        // 移除细胞
        this.incubator.removeCell(slotIndex);

        // 添加收益
        this.player.gold += result.value;
        this.addExp(result.exp);

        return {
            ...result,
            newGold: this.player.gold
        };
    }

    /**
     * 丢弃污染细胞
     */
    discardCell(slotIndex) {
        const slot = this.incubator.getSlotInfo(slotIndex);

        if (!slot || !slot.cell) {
            return { success: false, message: '槽位为空' };
        }

        const cell = slot.cell;
        this.incubator.removeCell(slotIndex);

        return {
            success: true,
            message: `已丢弃 ${cell.name}`
        };
    }

    /**
     * 自动提交细胞到任务
     */
    autoSubmitToTask(cellTypeId) {
        const tasks = this.taskManager.findTasksForCell(cellTypeId);

        if (tasks.length > 0) {
            // 优先提交给紧急任务
            const urgentTask = tasks.find(t => t.urgent);
            const targetTask = urgentTask || tasks[0];

            if (this.inventory.removeHarvestedCell(cellTypeId)) {
                const result = this.taskManager.submitCellToTask(targetTask.id, cellTypeId);

                if (result.completed) {
                    const reward = this.taskManager.claimTaskReward(targetTask.id);
                    if (reward.success) {
                        this.player.gold += reward.gold;
                        this.addExp(reward.exp);
                        this.player.gems += reward.gems;
                        this.notify(`任务完成！获得 ${reward.gold} 金币`, 'success');
                        if (this.onTaskCompleted) this.onTaskCompleted(targetTask);
                    }
                }
            }
        }
    }

    /**
     * 购买商品
     */
    buyItem(itemId, quantity = 1) {
        const result = this.shop.buyItem(
            itemId,
            quantity,
            this.player.gold,
            this.player.level,
            this.inventory
        );

        if (result.success) {
            this.player.gold -= result.cost;
            this.notify(result.message, 'success');
        }

        return result;
    }

    /**
     * 升级工作台
     */
    upgradeWorkbench() {
        if (this.workbenchLevel >= 5) {
            return { success: false, message: '已达到最高等级' };
        }

        const cost = CONFIG.WORKBENCH.UPGRADE_COSTS[this.workbenchLevel];

        if (this.player.gold < cost) {
            return { success: false, message: `金币不足，需要${cost}` };
        }

        this.player.gold -= cost;
        this.workbenchLevel++;

        const newLevel = CONFIG.WORKBENCH.LEVELS[this.workbenchLevel];
        this.notify(`工作台升级至 ${newLevel.name}！`, 'success');

        return {
            success: true,
            message: `升级成功`,
            newLevel: this.workbenchLevel,
            efficiency: newLevel.efficiency
        };
    }

    /**
     * 解锁培养槽
     */
    unlockSlot() {
        const result = this.incubator.unlockSlot(this.player.gold);

        if (result.success) {
            this.player.gold -= result.cost;
            this.notify(result.message, 'success');
        }

        return result;
    }

    /**
     * 增加经验值
     */
    addExp(amount) {
        this.player.exp += amount;
        this.checkLevelUp();
    }

    /**
     * 检查升级
     */
    checkLevelUp() {
        while (this.player.level < CONFIG.EXP.MAX_LEVEL) {
            const expNeeded = this.getExpForNextLevel();

            if (this.player.exp >= expNeeded) {
                this.player.exp -= expNeeded;
                this.player.level++;
                this.notify(`恭喜升级到 Lv.${this.player.level}！`, 'success');

                if (this.onLevelUp) this.onLevelUp(this.player.level);
            } else {
                break;
            }
        }
    }

    /**
     * 获取升级所需经验
     */
    getExpForNextLevel() {
        return Math.floor(
            CONFIG.EXP.BASE_TO_LEVEL *
            Math.pow(CONFIG.EXP.LEVEL_MULTIPLIER, this.player.level - 1)
        );
    }

    /**
     * 检查成就
     */
    checkAchievement(achievementId) {
        if (this.player.achievements.includes(achievementId)) {
            return;
        }

        const achievement = CONFIG.ACHIEVEMENTS[achievementId.toUpperCase()];
        if (!achievement) return;

        this.player.achievements.push(achievementId);
        this.player.gold += achievement.reward;
        this.notify(`成就解锁: ${achievement.name}！奖励${achievement.reward}金币`, 'success');

        if (this.onAchievement) this.onAchievement(achievement);
    }

    /**
     * 检查随机事件
     */
    checkRandomEvents() {
        RANDOM_EVENTS.forEach(event => {
            if (Math.random() < event.chance) {
                this.triggerRandomEvent(event);
            }
        });
    }

    /**
     * 触发随机事件
     */
    triggerRandomEvent(event) {
        this.notify(`【随机事件】${event.name}: ${event.description}`, 'warning');

        switch (event.effect.type) {
            case 'pause_growth':
                this.incubator.pause(event.effect.duration);
                break;
            case 'contamination_boost':
                this.incubator.setContaminationMultiplier(
                    event.effect.value,
                    event.effect.duration
                );
                break;
            case 'golden_boost':
            case 'reward_boost':
                this.activeEffects.push({
                    type: event.effect.type,
                    value: event.effect.value,
                    remainingTime: event.effect.duration * 1000
                });
                break;
        }
    }

    /**
     * 更新活动效果
     */
    updateActiveEffects(deltaTime) {
        this.activeEffects = this.activeEffects.filter(effect => {
            effect.remainingTime -= deltaTime;
            return effect.remainingTime > 0;
        });
    }

    /**
     * 发送通知
     */
    notify(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        if (this.onNotify) {
            this.onNotify(message, type);
        }
    }

    /**
     * 出售黄金珠
     */
    sellGoldenPearls(count = 1) {
        const result = this.inventory.sellGoldenPearls(count);
        if (result.success) {
            this.player.gold += result.value;
            this.notify(`${result.message}，获得${result.value}金币`, 'success');
        }
        return result;
    }

    /**
     * 保存游戏
     */
    save() {
        const saveData = {
            version: '1.0.0',
            timestamp: Date.now(),
            player: { ...this.player },
            workbenchLevel: this.workbenchLevel,
            incubator: this.incubator.serialize(),
            inventory: this.inventory.serialize(),
            taskManager: this.taskManager.serialize()
        };

        localStorage.setItem('cellMaster_save', JSON.stringify(saveData));
        console.log('游戏已保存');
        return true;
    }

    /**
     * 加载游戏
     */
    load() {
        const saveStr = localStorage.getItem('cellMaster_save');
        if (!saveStr) {
            return false;
        }

        try {
            const saveData = JSON.parse(saveStr);

            this.player = saveData.player;
            this.workbenchLevel = saveData.workbenchLevel;
            this.incubator = Incubator.deserialize(saveData.incubator);
            this.inventory = Inventory.deserialize(saveData.inventory);
            this.taskManager = TaskManager.deserialize(saveData.taskManager);

            console.log('游戏已加载');
            return true;
        } catch (e) {
            console.error('加载存档失败:', e);
            return false;
        }
    }

    /**
     * 重置游戏
     */
    reset() {
        localStorage.removeItem('cellMaster_save');
        location.reload();
    }

    /**
     * 获取游戏状态摘要
     */
    getStatusSummary() {
        return {
            player: this.player,
            workbench: {
                level: this.workbenchLevel,
                ...CONFIG.WORKBENCH.LEVELS[this.workbenchLevel]
            },
            incubator: this.incubator.getStats(),
            activeTasks: this.taskManager.activeTasks.length,
            expProgress: {
                current: this.player.exp,
                needed: this.getExpForNextLevel(),
                percent: (this.player.exp / this.getExpForNextLevel()) * 100
            }
        };
    }
}
