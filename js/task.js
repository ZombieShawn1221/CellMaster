/**
 * 细胞主理人 - 任务系统 V2.0
 * 适配新的 TASK_TEMPLATES 对象格式
 */

class Task {
    constructor(templateId) {
        const template = TASK_TEMPLATES[templateId];
        if (!template) {
            throw new Error(`Unknown task template: ${templateId}`);
        }

        this.id = Utils.generateId('task_');
        this.templateId = templateId;
        this.name = template.name;
        this.cellType = template.cellType;  // 单细胞任务用
        this.taskType = template.taskType;
        this.tier = template.tier;
        this.modifiers = template.modifiers || [];
        this.constraints = template.constraints || [];
        this.description = template.description || '';

        // 复合任务支持
        this.isCombo = template.isCombo || false;
        if (this.isCombo) {
            // 复合任务：多种细胞需求
            this.requirements = template.requirements.map(req => ({
                cellType: req.cellType,
                unitsRequired: req.units,
                unitsDelivered: 0,
                qualityRequired: req.quality
            }));
            this.unitsRequired = 0;  // 复合任务不使用此字段
            this.unitsDelivered = 0;
            this.qualityRequired = 0;
        } else {
            // 普通任务
            this.requirements = null;
            this.unitsRequired = Utils.randomInt(template.unitsRange[0], template.unitsRange[1]);
            this.unitsDelivered = 0;
            this.qualityRequired = Utils.randomInt(template.qualityRange[0], template.qualityRange[1]);
        }

        // 计算deadline（秒）
        this.baseDeadline = Utils.randomInt(template.deadlineRange[0], template.deadlineRange[1]);
        this.deadline = this.baseDeadline;

        // 应用修饰词效果
        this.rewardMultiplier = 1;
        this.penaltyMultiplier = 1;
        this.applyModifiers();

        // 计算奖励
        this.baseReward = { ...template.baseReward };
        this.calculateFinalReward();

        // 状态
        this.status = 'available';  // available, active, completed, failed, expired
        this.acceptedAt = null;
        this.completedAt = null;
        this.remainingTime = this.deadline;

        // 链单支持
        this.chainCount = template.chainCount || 0;
        this.chainProgress = 0;
        this.chainBonus = template.chainBonus || null;

        // 解锁等级
        this.unlockLevel = template.unlockLevel;
    }

    /**
     * 应用修饰词效果
     */
    applyModifiers() {
        this.modifiers.forEach(modifierId => {
            const modifier = TASK_MODIFIERS[modifierId];
            if (!modifier) return;

            // 时限调整
            if (modifier.deadlineMultiplier) {
                this.deadline = Math.floor(this.deadline * modifier.deadlineMultiplier);
            }

            // 奖励调整
            if (modifier.rewardMultiplier) {
                this.rewardMultiplier *= modifier.rewardMultiplier;
            }

            // 惩罚调整
            if (modifier.penaltyMultiplier) {
                this.penaltyMultiplier *= modifier.penaltyMultiplier;
            }

            // 品质要求调整
            if (modifier.qualityBonus) {
                this.qualityRequired += modifier.qualityBonus;
            }

            // 约束添加
            if (modifier.constraints) {
                this.constraints = [...this.constraints, ...modifier.constraints];
            }
        });
    }

    /**
     * 计算最终奖励
     */
    calculateFinalReward() {
        this.finalReward = {
            gold: Math.floor(this.baseReward.gold * this.rewardMultiplier * this.unitsRequired),
            exp: Math.floor(this.baseReward.exp * this.rewardMultiplier * this.unitsRequired)
        };

        // 黄金珠几率
        if (this.baseReward.goldenChance) {
            this.finalReward.goldenChance = this.baseReward.goldenChance;
        }
    }

    /**
     * 接取任务
     */
    accept() {
        if (this.status !== 'available') {
            return { success: false, message: '任务无法接取' };
        }

        this.status = 'active';
        this.acceptedAt = Date.now();
        this.remainingTime = this.deadline;

        return { success: true, message: `接取任务: ${this.name}` };
    }

    /**
     * 更新任务（每帧调用）
     * @param {number} deltaTime 时间增量（毫秒）
     */
    update(deltaTime) {
        if (this.status !== 'active') return { expired: false };

        // 减少剩余时间（转换为秒）
        this.remainingTime -= deltaTime / 1000;

        if (this.remainingTime <= 0) {
            this.status = 'expired';
            return { expired: true };
        }

        return { expired: false };
    }

    /**
     * 尝试交付细胞（单个细胞）
     * @param {Object} cell 要交付的细胞数据
     * @param {Object} playerInventory 玩家背包（用于检查约束）
     */
    tryDeliver(cell, playerInventory = {}) {
        if (this.status !== 'active') {
            return { success: false, message: '任务未激活' };
        }

        // 复合任务使用专门的交付方法
        if (this.isCombo) {
            return this.tryDeliverCombo(cell, playerInventory);
        }

        const isWildcard = cell.typeId === 'golden_stock';
        // 检查细胞类型
        if (!isWildcard && cell.typeId !== this.cellType) {
            return { success: false, message: '细胞类型不匹配' };
        }

        // 检查细胞品质
        const quality = isWildcard ? 100 : (cell.quality || 60);  // 默认品质
        if (quality < this.qualityRequired) {
            return { success: false, message: `品质不足 (${quality}/${this.qualityRequired})` };
        }

        // 检查约束条件
        const constraintCheck = this.checkConstraints(cell, playerInventory);
        if (!constraintCheck.pass) {
            return { success: false, message: constraintCheck.message };
        }

        // 交付成功
        this.unitsDelivered++;

        // 检查是否完成
        if (this.unitsDelivered >= this.unitsRequired) {
            // 链单处理
            if (this.chainCount > 0 && this.chainProgress < this.chainCount - 1) {
                this.chainProgress++;
                this.unitsDelivered = 0;
                this.remainingTime = this.deadline;  // 重置时间
                return {
                    success: true,
                    message: `链单进度: ${this.chainProgress}/${this.chainCount}`,
                    chainContinue: true
                };
            }

            this.status = 'completed';
            this.completedAt = Date.now();

            return {
                success: true,
                message: '任务完成！',
                completed: true,
                reward: this.getFinalReward()
            };
        }

        return {
            success: true,
            message: `交付成功 (${this.unitsDelivered}/${this.unitsRequired})`,
            completed: false
        };
    }

    /**
     * 复合任务交付（单个细胞）
     */
    tryDeliverCombo(cell, playerInventory = {}) {
        // 找到匹配的需求
        const isWildcard = cell.typeId === 'golden_stock';
        const req = this.requirements.find(r =>
            (isWildcard || r.cellType === cell.typeId) && r.unitsDelivered < r.unitsRequired
        );

        if (!req) {
            return { success: false, message: '该细胞类型不在任务需求中或已交付完成' };
        }

        // 检查品质
        const quality = isWildcard ? 100 : (cell.quality || 60);
        if (quality < req.qualityRequired) {
            return { success: false, message: `品质不足 (${quality}/${req.qualityRequired})` };
        }

        // 检查约束条件
        const constraintCheck = this.checkConstraints(cell, playerInventory);
        if (!constraintCheck.pass) {
            return { success: false, message: constraintCheck.message };
        }

        // 交付成功
        req.unitsDelivered++;

        // 检查是否所有需求都满足
        const allComplete = this.requirements.every(r => r.unitsDelivered >= r.unitsRequired);

        if (allComplete) {
            this.status = 'completed';
            this.completedAt = Date.now();

            return {
                success: true,
                message: '复合任务完成！',
                completed: true,
                reward: this.getFinalReward()
            };
        }

        const cellName = CELL_TYPES[cell.typeId]?.name || cell.typeId;
        return {
            success: true,
            message: `${cellName} 交付成功 (${req.unitsDelivered}/${req.unitsRequired})`,
            completed: false
        };
    }

    /**
     * 检查是否可以用储藏室的细胞完成任务
     * @param {Array} harvestedCells 储藏室中的细胞列表
     * @returns {Object} { canComplete: boolean, matchingCells: Array }
     */
    checkCanComplete(harvestedCells) {
        if (this.status !== 'active') {
            return { canComplete: false, matchingCells: [] };
        }

        if (this.isCombo) {
            return this.checkCanCompleteCombo(harvestedCells);
        }

        // 普通任务：找到足够数量的符合条件细胞
        const matchingCells = harvestedCells.filter(cell =>
            (cell.typeId === this.cellType || cell.typeId === 'golden_stock') &&
            ((cell.typeId === 'golden_stock' ? 100 : (cell.quality || 60)) >= this.qualityRequired)
        );

        const neededCount = this.unitsRequired - this.unitsDelivered;
        return {
            canComplete: matchingCells.length >= neededCount,
            matchingCells: matchingCells.slice(0, neededCount),
            neededCount
        };
    }

    /**
     * 检查复合任务是否可以完成
     */
    checkCanCompleteCombo(harvestedCells) {
        const matchingCells = [];
        let canComplete = true;

        for (const req of this.requirements) {
            const needed = req.unitsRequired - req.unitsDelivered;
            if (needed <= 0) continue;

            const matching = harvestedCells.filter(cell =>
                (cell.typeId === req.cellType || cell.typeId === 'golden_stock') &&
                ((cell.typeId === 'golden_stock' ? 100 : (cell.quality || 60)) >= req.qualityRequired) &&
                !matchingCells.includes(cell)  // 避免重复使用
            );

            if (matching.length < needed) {
                canComplete = false;
            }

            matchingCells.push(...matching.slice(0, needed));
        }

        return { canComplete, matchingCells };
    }

    /**
     * 检查约束条件
     */
    checkConstraints(cell, playerInventory) {
        for (const constraint of this.constraints) {
            // 禁用双抗
            if (constraint === 'no_antibiotics') {
                if (cell.hasAntibiotics) {
                    return { pass: false, message: '洁癖甲方：不能使用双抗！' };
                }
            }

            // 必须质控
            if (constraint === 'require_myco_test') {
                if (!cell.qcPassed) {
                    return { pass: false, message: '需要通过支原体检测！' };
                }
            }

            // 按时收获
            if (constraint === 'harvest_on_time') {
                if (cell.overgrown) {
                    return { pass: false, message: '细胞过度生长！' };
                }
            }

            // 零污染
            if (constraint === 'zero_contamination') {
                if (cell.hadContaminationRisk) {
                    return { pass: false, message: '需要零污染记录！' };
                }
            }
        }

        return { pass: true };
    }

    /**
     * 获取最终奖励（包含链单奖励）
     */
    getFinalReward() {
        const reward = { ...this.finalReward };

        // 链单额外奖励
        if (this.chainBonus && this.chainProgress >= this.chainCount - 1) {
            if (this.chainBonus.items) {
                reward.items = this.chainBonus.items;
            }
        }

        return reward;
    }

    /**
     * 计算逾期惩罚
     */
    getPenalty() {
        return {
            gold: Math.floor(this.finalReward.gold * 0.5 * this.penaltyMultiplier),
            reputation: Math.floor(5 * this.penaltyMultiplier)
        };
    }

    /**
     * 获取修饰词文本
     */
    getModifiersText() {
        return this.modifiers.map(id => {
            const mod = TASK_MODIFIERS[id];
            return mod ? `${mod.icon}${mod.name}` : '';
        }).filter(t => t).join(' ');
    }

    /**
     * 获取约束描述
     */
    getConstraintsText() {
        const texts = [];
        this.constraints.forEach(c => {
            if (c === 'no_antibiotics') texts.push('禁用双抗');
            if (c === 'require_myco_test') texts.push('需质控');
            if (c === 'harvest_on_time') texts.push('按时收获');
            if (c === 'zero_contamination') texts.push('零污染');
            if (c.startsWith('require_')) {
                const itemId = c.replace('require_', '');
                texts.push(`需${itemId}`);
            }
        });
        return texts.join('、');
    }

    /**
     * 获取剩余时间文本
     */
    getRemainingTimeText() {
        const seconds = Math.max(0, Math.floor(this.remainingTime));
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;

        if (minutes > 0) {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
        return `${secs}秒`;
    }

    /**
     * 获取进度百分比
     */
    getProgressPercent() {
        if (this.isCombo) {
            // 复合任务计算总进度
            let totalRequired = 0;
            let totalDelivered = 0;
            for (const req of this.requirements) {
                totalRequired += req.unitsRequired;
                totalDelivered += req.unitsDelivered;
            }
            return totalRequired > 0 ? (totalDelivered / totalRequired) * 100 : 0;
        }
        return this.unitsRequired > 0 ? (this.unitsDelivered / this.unitsRequired) * 100 : 0;
    }

    /**
     * 获取需求描述（用于显示）
     */
    getRequirementsText() {
        if (!this.isCombo) {
            const cellName = CELL_TYPES[this.cellType]?.name || this.cellType;
            return `${cellName} ×${this.unitsRequired} (品质≥${this.qualityRequired})`;
        }

        // 复合任务
        return this.requirements.map(req => {
            const cellName = CELL_TYPES[req.cellType]?.name || req.cellType;
            return `${cellName} ×${req.unitsRequired} (品质≥${req.qualityRequired})`;
        }).join('\n');
    }

    /**
     * 获取交付进度文本
     */
    getDeliveryProgressText() {
        if (!this.isCombo) {
            return `${this.unitsDelivered}/${this.unitsRequired}`;
        }

        return this.requirements.map(req => {
            const cellName = CELL_TYPES[req.cellType]?.name || req.cellType;
            return `${cellName}: ${req.unitsDelivered}/${req.unitsRequired}`;
        }).join(' | ');
    }

    /**
     * 序列化
     */
    serialize() {
        return {
            id: this.id,
            templateId: this.templateId,
            name: this.name,
            cellType: this.cellType,
            taskType: this.taskType,
            tier: this.tier,
            modifiers: this.modifiers,
            constraints: this.constraints,
            unitsRequired: this.unitsRequired,
            unitsDelivered: this.unitsDelivered,
            qualityRequired: this.qualityRequired,
            deadline: this.deadline,
            remainingTime: this.remainingTime,
            finalReward: this.finalReward,
            status: this.status,
            acceptedAt: this.acceptedAt,
            completedAt: this.completedAt,
            chainCount: this.chainCount,
            chainProgress: this.chainProgress,
            chainBonus: this.chainBonus,
            rewardMultiplier: this.rewardMultiplier,
            penaltyMultiplier: this.penaltyMultiplier,
            unlockLevel: this.unlockLevel,
            isCombo: this.isCombo,
            requirements: this.requirements,
            description: this.description
        };
    }

    /**
     * 反序列化
     */
    static deserialize(data) {
        const task = Object.create(Task.prototype);
        Object.assign(task, data);
        return task;
    }
}

/**
 * 任务管理器
 */
class TaskManager {
    constructor() {
        this.availableTasks = [];  // 可接取任务池
        this.activeTasks = [];     // 当前进行中的任务
        this.completedTasks = [];  // 已完成任务记录
        this.maxActiveTasks = 3;   // 最大同时进行任务数
        this.maxAvailableTasks = 6;  // 任务池大小
        this.refreshCooldown = 0;  // 刷新冷却
        this.refreshInterval = 120000;  // 刷新间隔（2分钟）
    }

    /**
     * 初始化任务池
     */
    init(playerLevel) {
        this.generateTasks(playerLevel);
    }

    /**
     * 生成任务池
     */
    generateTasks(playerLevel) {
        // 保留部分旧任务
        const oldTasks = this.availableTasks.slice(0, 2);
        this.availableTasks = oldTasks;

        // 获取可用的任务模板
        const availableTemplates = Object.keys(TASK_TEMPLATES).filter(id => {
            const template = TASK_TEMPLATES[id];
            return template.unlockLevel <= playerLevel;
        });

        if (availableTemplates.length === 0) return;

        // 需要生成的任务数量
        const needCount = this.maxAvailableTasks - this.availableTasks.length;
        if (needCount <= 0) return;

        // 确保任务多样性（不同细胞类型）
        const usedCellTypes = new Set(this.availableTasks.map(t => t.cellType));
        const shuffled = Utils.shuffle([...availableTemplates]);

        for (const templateId of shuffled) {
            if (this.availableTasks.length >= this.maxAvailableTasks) break;

            const template = TASK_TEMPLATES[templateId];

            // 优先选择不同细胞类型的任务
            if (usedCellTypes.size < 4 && usedCellTypes.has(template.cellType)) {
                // 如果已经有这个细胞类型，50%概率跳过
                if (Math.random() < 0.5) continue;
            }

            // 避免重复模板
            if (this.availableTasks.some(t => t.templateId === templateId)) {
                continue;
            }

            const task = new Task(templateId);
            this.availableTasks.push(task);
            usedCellTypes.add(template.cellType);
        }
    }

    /**
     * 接取任务
     */
    acceptTask(taskId) {
        if (this.activeTasks.length >= this.maxActiveTasks) {
            return { success: false, message: `最多同时进行${this.maxActiveTasks}个任务` };
        }

        const taskIndex = this.availableTasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) {
            return { success: false, message: '任务不存在' };
        }

        const task = this.availableTasks[taskIndex];
        const result = task.accept();

        if (result.success) {
            this.availableTasks.splice(taskIndex, 1);
            this.activeTasks.push(task);
        }

        return result;
    }

    /**
     * 更新所有任务
     */
    update(deltaTime, playerLevel) {
        const events = [];

        // 更新进行中的任务
        for (let i = this.activeTasks.length - 1; i >= 0; i--) {
            const task = this.activeTasks[i];
            const result = task.update(deltaTime);

            if (result.expired) {
                events.push({
                    type: 'task_expired',
                    task: task,
                    penalty: task.getPenalty()
                });
                this.activeTasks.splice(i, 1);
            }
        }

        // 刷新任务池
        this.refreshCooldown -= deltaTime;
        if (this.refreshCooldown <= 0) {
            this.refreshCooldown = this.refreshInterval;
            if (this.availableTasks.length < this.maxAvailableTasks) {
                this.generateTasks(playerLevel);
                events.push({ type: 'tasks_refreshed' });
            }
        }

        return events;
    }

    /**
     * 尝试交付任务
     */
    tryDeliverToTask(taskId, cell, playerInventory) {
        const task = this.activeTasks.find(t => t.id === taskId);
        if (!task) {
            return { success: false, message: '任务不存在' };
        }

        const result = task.tryDeliver(cell, playerInventory);

        if (result.completed) {
            // 移除已完成任务
            const index = this.activeTasks.findIndex(t => t.id === taskId);
            if (index !== -1) {
                this.activeTasks.splice(index, 1);
                this.completedTasks.push(task);
            }
        }

        return result;
    }

    /**
     * 获取匹配指定细胞类型的任务
     */
    getMatchingTasks(cellTypeId) {
        return this.activeTasks.filter(t => t.cellType === cellTypeId && t.status === 'active');
    }

    /**
     * 放弃任务
     */
    abandonTask(taskId) {
        const taskIndex = this.activeTasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) {
            return { success: false, message: '任务不存在' };
        }

        const task = this.activeTasks[taskIndex];
        task.status = 'abandoned';
        this.activeTasks.splice(taskIndex, 1);

        return { success: true, message: `已放弃任务: ${task.name}` };
    }

    /**
     * 手动刷新任务池
     */
    forceRefresh(playerLevel, cost = 100) {
        this.availableTasks = [];
        this.generateTasks(playerLevel);
        return { success: true, cost: cost };
    }

    /**
     * 获取任务统计
     */
    getStats() {
        return {
            available: this.availableTasks.length,
            active: this.activeTasks.length,
            completed: this.completedTasks.length,
            maxActive: this.maxActiveTasks
        };
    }

    /**
     * 序列化
     */
    serialize() {
        return {
            availableTasks: this.availableTasks.map(t => t.serialize()),
            activeTasks: this.activeTasks.map(t => t.serialize()),
            completedTasks: this.completedTasks.slice(-20).map(t => t.serialize()),
            refreshCooldown: this.refreshCooldown
        };
    }

    /**
     * 反序列化
     */
    static deserialize(data) {
        const manager = new TaskManager();
        manager.availableTasks = (data.availableTasks || []).map(t => Task.deserialize(t));
        manager.activeTasks = (data.activeTasks || []).map(t => Task.deserialize(t));
        manager.completedTasks = (data.completedTasks || []).map(t => Task.deserialize(t));
        manager.refreshCooldown = data.refreshCooldown || 0;
        return manager;
    }
}
