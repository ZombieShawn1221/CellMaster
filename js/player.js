/**
 * 细胞主理人 - 玩家系统
 */

class Player {
    constructor() {
        this.uid = null;
        this.username = '游客';
        this.isGuest = true;

        // 游戏模式
        this.chosenMode = null;   // 玩家选择的
        this.assignedMode = null; // 实际分配的

        // 资源
        this.gold = 0;
        this.totalExp = 0;

        // 等级（根据经验自动计算）
        this.level = 1;

        // 物品背包
        this.inventory = {};

        // 冻存细胞
        this.frozenCells = [];

        // 已收获细胞（待交付）
        this.harvestedCells = [];

        // 黄金珠
        this.goldenPearls = 0;

        // 统计
        this.stats = {
            totalCellsCultured: 0,
            totalCellsContaminated: 0,
            totalTasksCompleted: 0,
            totalGoldEarned: 0,
            consecutiveNonContaminated: 0,
            daysPlayed: 0,
            startDate: null,
        };

        // 游戏内时间
        this.gameTime = {
            startDate: new Date('2024-01-01'),
            currentDate: new Date('2024-01-01'),
            speed: 1,
        };
    }

    /**
     * 初始化新玩家
     */
    init(mode) {
        const modeConfig = CONFIG.GAME_MODES[mode];
        if (!modeConfig) {
            console.error('未知游戏模式:', mode);
            return;
        }

        this.assignedMode = mode;
        this.gold = modeConfig.initialGold;
        this.level = 1;
        this.totalExp = 0;

        // 初始物品
        this.inventory = {
            'dmem': 3,
            'fbs': 3,
            'pbs': 5,
            'trypsin': 3,
        };

        this.stats.startDate = Date.now();
        this.gameTime.startDate = new Date('2024-01-01');
        this.gameTime.currentDate = new Date('2024-01-01');
    }

    /**
     * 添加经验
     */
    addExp(amount) {
        this.totalExp += amount;
        const newLevel = Utils.calculateLevel(this.totalExp);

        if (newLevel > this.level) {
            const oldLevel = this.level;
            this.level = newLevel;
            return { leveledUp: true, oldLevel, newLevel };
        }

        return { leveledUp: false };
    }

    /**
     * 获取当前等级进度
     */
    getLevelProgress() {
        const currentLevelExp = CONFIG.LEVELS[this.level - 1]?.exp || 0;
        const nextLevelExp = CONFIG.LEVELS[this.level]?.exp || Infinity;

        const expInCurrentLevel = this.totalExp - currentLevelExp;
        const expNeededForNext = nextLevelExp - currentLevelExp;

        return {
            current: expInCurrentLevel,
            needed: expNeededForNext,
            percent: (expInCurrentLevel / expNeededForNext) * 100
        };
    }

    /**
     * 添加金币
     */
    addGold(amount) {
        this.gold += amount;
        if (amount > 0) {
            this.stats.totalGoldEarned += amount;
        }
    }

    /**
     * 扣除金币
     */
    spendGold(amount) {
        if (this.gold < amount) {
            return false;
        }
        this.gold -= amount;
        return true;
    }

    /**
     * 检查是否破产
     */
    checkBankruptcy() {
        // 计算总资产
        const totalAssets = this.gold + (this.goldenPearls * CONFIG.CELL.GOLDEN_PEARL_VALUE);

        // 如果资产低于最低任务成本，且没有正在培养的细胞，则破产
        return totalAssets < CONFIG.BANKRUPTCY.MIN_TASK_COST;
    }

    /**
     * 添加物品
     */
    addItem(itemId, quantity = 1) {
        if (!this.inventory[itemId]) {
            this.inventory[itemId] = 0;
        }
        this.inventory[itemId] += quantity;
    }

    /**
     * 移除物品
     */
    removeItem(itemId, quantity = 1) {
        if (!this.inventory[itemId] || this.inventory[itemId] < quantity) {
            return false;
        }
        this.inventory[itemId] -= quantity;
        if (this.inventory[itemId] <= 0) {
            delete this.inventory[itemId];
        }
        return true;
    }

    /**
     * 检查物品数量
     */
    hasItem(itemId, quantity = 1) {
        return (this.inventory[itemId] || 0) >= quantity;
    }

    /**
     * 获取物品数量
     */
    getItemCount(itemId) {
        return this.inventory[itemId] || 0;
    }

    /**
     * 添加收获的细胞
     */
    addHarvestedCell(cellTypeId) {
        this.harvestedCells.push({
            cellTypeId,
            harvestTime: Date.now()
        });
    }

    /**
     * 移除收获的细胞
     */
    removeHarvestedCell(cellTypeId) {
        const index = this.harvestedCells.findIndex(c => c.cellTypeId === cellTypeId);
        if (index > -1) {
            this.harvestedCells.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * 获取收获的细胞数量
     */
    getHarvestedCellCount(cellTypeId) {
        return this.harvestedCells.filter(c => c.cellTypeId === cellTypeId).length;
    }

    /**
     * 添加黄金珠
     */
    addGoldenPearl(count = 1) {
        this.goldenPearls += count;
    }

    /**
     * 出售黄金珠
     */
    sellGoldenPearls(count = 1) {
        if (this.goldenPearls < count) {
            return { success: false };
        }
        this.goldenPearls -= count;
        const value = count * CONFIG.CELL.GOLDEN_PEARL_VALUE;
        this.addGold(value);
        return { success: true, value };
    }

    /**
     * 冻存细胞
     */
    freezeCell(cell) {
        this.frozenCells.push({
            cellTypeId: cell.typeId,
            frozenTime: Date.now()
        });
    }

    /**
     * 解冻细胞
     */
    thawCell(index) {
        if (index < 0 || index >= this.frozenCells.length) {
            return null;
        }
        return this.frozenCells.splice(index, 1)[0];
    }

    /**
     * 推进游戏时间
     */
    advanceTime(realMs, speedMultiplier = 1) {
        const gameMs = realMs * CONFIG.GAME.TIME_SCALE * speedMultiplier;
        this.gameTime.currentDate = new Date(
            this.gameTime.currentDate.getTime() + gameMs
        );

        // 计算已玩天数
        const daysDiff = Math.floor(
            (this.gameTime.currentDate - this.gameTime.startDate) / (1000 * 60 * 60 * 24)
        );
        this.stats.daysPlayed = daysDiff;
    }

    /**
     * 获取当前游戏日期字符串
     */
    getGameDateString() {
        return Utils.formatGameDate(this.gameTime.currentDate);
    }

    /**
     * 获取模式配置
     */
    getModeConfig() {
        return CONFIG.GAME_MODES[this.assignedMode];
    }

    /**
     * 序列化
     */
    serialize() {
        return {
            uid: this.uid,
            username: this.username,
            isGuest: this.isGuest,
            chosenMode: this.chosenMode,
            assignedMode: this.assignedMode,
            gold: this.gold,
            totalExp: this.totalExp,
            level: this.level,
            inventory: { ...this.inventory },
            frozenCells: [...this.frozenCells],
            harvestedCells: [...this.harvestedCells],
            goldenPearls: this.goldenPearls,
            stats: { ...this.stats },
            gameTime: {
                startDate: this.gameTime.startDate.toISOString(),
                currentDate: this.gameTime.currentDate.toISOString(),
                speed: this.gameTime.speed,
            }
        };
    }

    /**
     * 反序列化
     */
    static deserialize(data) {
        const player = new Player();
        Object.assign(player, data);
        player.gameTime.startDate = new Date(data.gameTime.startDate);
        player.gameTime.currentDate = new Date(data.gameTime.currentDate);
        return player;
    }
}
