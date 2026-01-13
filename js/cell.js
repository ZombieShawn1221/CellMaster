/**
 * 细胞主理人 - 细胞类 V2.0
 * 包含完整的品质系统
 */

class Cell {
    constructor(typeId, slotIndex, goldenBoost = 1) {
        const cellData = CELL_TYPES[typeId];
        if (!cellData) {
            throw new Error(`Unknown cell type: ${typeId}`);
        }

        this.id = Utils.generateId('cell_');
        this.typeId = typeId;
        this.name = cellData.name;
        this.icon = cellData.icon;
        this.slotIndex = slotIndex;
        this.tier = cellData.tier;

        // ========== 品质系统 ==========
        // 基础品质：50-70随机，受血清影响
        this.baseQuality = 50 + Math.floor(Math.random() * 21);
        this.quality = this.baseQuality;
        this.qualityModifiers = [];  // 品质修正记录

        // 品质漂移速度（过密惩罚）
        this.qualityDrift = cellData.qualityDrift || 0.5;
        this.overgrowTime = 0;  // 过度生长时间
        this.overgrown = false;

        // ========== 生长系统 ==========
        this.growthProgress = 0;
        this.baseGrowthTime = cellData.baseGrowthTime;

        // 生长速率包含随机波动
        const variance = CONFIG.CELL.GROWTH_VARIANCE;
        const randomFactor = 1 + (Math.random() * 2 - 1) * variance;
        this.growthRate = Math.max(0.7, randomFactor);
        this.totalGrowthTime = this.baseGrowthTime / this.growthRate;

        // ========== 状态 ==========
        this.status = 'growing';  // growing, ready, contaminated, overgrown
        this.isContaminated = false;
        this.hasProtection = false;
        this.hasAntibiotics = false;  // 是否使用了双抗
        this.qcPassed = false;  // 是否通过质控
        this.immuneContamination = false;  // 完全免疫污染

        // ========== 效果系统 ==========
        this.effects = [];
        this.valueMultiplier = 1;
        this.goldenBoost = goldenBoost;
        this.goldenChance = CONFIG.CELL.GOLDEN_PEARL_CHANCE * this.goldenBoost;
        this.contaminationMultiplier = 1;
        this.isGoldenStock = false;

        // ========== 培养信息 ==========
        this.contaminationBase = cellData.contaminationBase || 0.015;
        this.baseValue = cellData.baseValue;
        this.expReward = cellData.expReward;

        // ========== 传代信息 ==========
        this.generation = 1;  // 代数
        this.parentId = null;  // 父细胞ID

        // ========== 时间记录 ==========
        this.startTime = Date.now();
        this.readyTime = null;
    }

    /**
     * 应用血清/添加剂的品质加成
     */
    applyQualityBonus(bonus, source) {
        this.quality += bonus;
        this.qualityModifiers.push({ source, bonus });
        // 品质上限100
        this.quality = Math.min(100, Math.max(0, this.quality));
    }

    /**
     * 更新细胞状态（每tick调用）
     * @param {number} deltaTime 时间增量（毫秒）
     * @param {number} contaminationRate 模式污染率倍数
     */
    update(deltaTime, contaminationRate = 1) {
        const deltaSeconds = deltaTime / 1000;

        // 已污染的细胞不再更新
        if (this.status === 'contaminated') return;

        // ========== 生长中 ==========
        if (this.status === 'growing') {
            // 污染检测（未保护或未免疫时）
            if (!this.hasProtection && !this.immuneContamination) {
                const contaminationChance = this.contaminationBase * contaminationRate * this.contaminationMultiplier * deltaSeconds;
                if (Math.random() < contaminationChance) {
                    this.contaminate();
                    return;
                }
            }

            // 计算生长速度
            let speedMultiplier = 1;
            this.effects.forEach(effect => {
                if (effect.type === 'speed') {
                    speedMultiplier *= effect.value;
                }
            });

            // 增加生长进度
            const growthPerSecond = 100 / this.totalGrowthTime;
            this.growthProgress += growthPerSecond * speedMultiplier * deltaSeconds;

            // 检查是否完成
            if (this.growthProgress >= 100) {
                this.growthProgress = 100;
                this.status = 'ready';
                this.readyTime = Date.now();
            }
        }

        // ========== 培养完成但未收获（过度生长检测） ==========
        if (this.status === 'ready') {
            this.overgrowTime += deltaSeconds;

            // 每10秒降低品质（根据qualityDrift）
            if (this.overgrowTime > 10) {
                const qualityLoss = this.qualityDrift * (this.overgrowTime / 10);
                this.quality = Math.max(0, this.baseQuality - qualityLoss);

                // 严重过度生长
                if (this.overgrowTime > 60) {
                    this.overgrown = true;
                    // 过度生长有额外污染风险
                    if (!this.immuneContamination && Math.random() < 0.01 * deltaSeconds) {
                        this.contaminate();
                    }
                }
            }
        }
    }

    /**
     * 细胞被污染
     */
    contaminate() {
        this.isContaminated = true;
        this.status = 'contaminated';
        this.quality = 0;
    }

    /**
     * 应用道具效果
     */
    applyEffect(effect) {
        this.effects.push(effect);

        switch (effect.type) {
            case 'anti_contamination':
                this.hasProtection = true;
                break;
            case 'antibiotics':
                this.hasAntibiotics = true;
                this.hasProtection = true;
                // 双抗会略微降低品质（洁癖订单扣分）
                this.applyQualityBonus(-3, '双抗');
                break;
            case 'anti_contam_basic':
                this.applyQualityBonus(effect.quality ?? -3, '防污染(初级)');
                this.contaminationMultiplier *= effect.contaminationMultiplier || 1;
                break;
            case 'anti_contam_mid':
                this.applyQualityBonus(effect.quality ?? -2, '防污染(中级)');
                this.contaminationMultiplier *= effect.contaminationMultiplier || 0.6;
                break;
            case 'anti_contam_high':
                this.applyQualityBonus(effect.quality ?? 0, '防污染(高级)');
                this.hasProtection = true;
                this.immuneContamination = true;
                break;
            case 'golden_chance':
                this.goldenChance = effect.value * (this.goldenBoost || 1);
                break;
            case 'value_multiplier':
                this.valueMultiplier *= effect.value;
                break;
            case 'quality_bonus':
                this.applyQualityBonus(effect.value, effect.source || '添加剂');
                break;
            case 'speed':
                // 速度效果在update中处理
                break;
        }
    }

    /**
     * 进行质控检测
     */
    performQC() {
        // 90%几率通过
        const passed = Math.random() < 0.9;
        if (passed) {
            this.qcPassed = true;
            this.applyQualityBonus(6, '质控通过');
            return { success: true, message: '质控通过！品质+6' };
        } else {
            // 质控失败意味着发现了隐藏污染
            this.contaminate();
            return { success: false, message: '质控失败！发现隐性污染' };
        }
    }

    /**
     * 收获细胞
     */
    harvest() {
        if (this.status === 'contaminated') {
            return {
                success: false,
                message: '细胞已污染，无法收获',
                value: 0,
                exp: 0,
                goldenPearl: false
            };
        }

        if (this.status !== 'ready') {
            return {
                success: false,
                message: '细胞尚未培养完成',
                value: 0,
                exp: 0,
                goldenPearl: false
            };
        }

        // 计算最终价值（品质影响收益）
        const qualityMultiplier = 0.5 + (this.quality / 100) * 0.7;  // 品质0=50%收益，品质100=120%收益
        const finalValue = Math.floor(this.baseValue * this.valueMultiplier * qualityMultiplier);
        const finalExp = Math.floor(this.expReward * this.valueMultiplier);

        // 检查黄金珠
        const gotGoldenPearl = Math.random() < this.goldenChance;

        return {
            success: true,
            message: `成功收获 ${this.name}！`,
            value: finalValue,
            exp: finalExp,
            quality: Math.floor(this.quality),
            goldenPearl: gotGoldenPearl,
            goldenValue: gotGoldenPearl ? CONFIG.CELL.GOLDEN_PEARL_VALUE : 0
        };
    }

    /**
     * 紧急救援（污染细胞）
     */
    emergencySave() {
        if (!this.isContaminated) {
            return { success: false, message: '细胞未被污染，无需救援' };
        }

        const savedValue = Math.floor(this.baseValue * 0.5);
        const savedExp = Math.floor(this.expReward * 0.3);

        return {
            success: true,
            message: '紧急救援成功，挽回部分收益',
            value: savedValue,
            exp: savedExp
        };
    }

    /**
     * 传代产生子细胞
     * @param {number} newSlotIndex 新槽位
     * @param {boolean} useAccutase 是否使用高级消化酶
     */
    passage(newSlotIndex, useAccutase = false) {
        const childCell = new Cell(this.typeId, newSlotIndex, this.goldenBoost || 1);

        // 子细胞继承父细胞的品质（有损耗）
        let qualityLoss = 5 + Math.floor(Math.random() * 6);  // 损失1-5点品质
        if (useAccutase) {
            qualityLoss = Math.max(0, qualityLoss - 3);  // Accutase减少品质损失
            childCell.applyQualityBonus(3, 'Accutase');
        }

        childCell.baseQuality = Math.max(30, this.quality - qualityLoss);
        childCell.quality = childCell.baseQuality;
        childCell.generation = this.generation + 1;
        childCell.parentId = this.id;

        // 子细胞从0%开始生长
        childCell.growthProgress = 0;
        childCell.status = 'growing';

        return childCell;
    }

    /**
     * 获取品质等级描述
     */
    getQualityGrade() {
        if (this.quality >= 90) return { grade: 'S', color: '#FFD700', text: '完美' };
        if (this.quality >= 80) return { grade: 'A', color: '#67C23A', text: '优秀' };
        if (this.quality >= 70) return { grade: 'B', color: '#409EFF', text: '良好' };
        if (this.quality >= 60) return { grade: 'C', color: '#E6A23C', text: '合格' };
        if (this.quality >= 50) return { grade: 'D', color: '#F56C6C', text: '勉强' };
        return { grade: 'F', color: '#909399', text: '较差' };
    }

    /**
     * 获取状态描述
     */
    getStatusText() {
        switch (this.status) {
            case 'growing':
                return `生长中 ${Math.floor(this.growthProgress)}%`;
            case 'ready':
                if (this.overgrown) return '过度生长!';
                return '可收获';
            case 'contaminated':
                return '已污染';
            default:
                return '未知';
        }
    }

    /**
     * 获取剩余时间（秒）
     */
    getRemainingTime() {
        if (this.status !== 'growing') return 0;
        const remaining = (100 - this.growthProgress) / (100 / this.totalGrowthTime);
        return Math.max(0, Math.ceil(remaining));
    }

    /**
     * 序列化
     */
    serialize() {
        return {
            id: this.id,
            typeId: this.typeId,
            slotIndex: this.slotIndex,
            tier: this.tier,
            baseQuality: this.baseQuality,
            quality: this.quality,
            qualityModifiers: this.qualityModifiers,
            qualityDrift: this.qualityDrift,
            overgrowTime: this.overgrowTime,
            overgrown: this.overgrown,
            growthProgress: this.growthProgress,
            growthRate: this.growthRate,
            totalGrowthTime: this.totalGrowthTime,
            status: this.status,
            isContaminated: this.isContaminated,
            hasProtection: this.hasProtection,
            hasAntibiotics: this.hasAntibiotics,
            qcPassed: this.qcPassed,
            effects: this.effects,
            valueMultiplier: this.valueMultiplier,
            goldenChance: this.goldenChance,
            goldenBoost: this.goldenBoost,
            contaminationMultiplier: this.contaminationMultiplier,
            immuneContamination: this.immuneContamination,
            generation: this.generation,
            parentId: this.parentId,
            startTime: this.startTime,
            readyTime: this.readyTime
        };
    }

    /**
     * 反序列化
     */
    static deserialize(data) {
        const cell = Object.create(Cell.prototype);
        Object.assign(cell, data);

        // 恢复细胞类型数据
        const cellData = CELL_TYPES[data.typeId];
        if (cellData) {
            cell.name = cellData.name;
            cell.icon = cellData.icon;
            cell.baseValue = cellData.baseValue;
            cell.expReward = cellData.expReward;
            cell.contaminationBase = cellData.contaminationBase || 0.015;
        }

        cell.goldenBoost = cell.goldenBoost || 1;
        cell.contaminationMultiplier = cell.contaminationMultiplier || 1;
        cell.immuneContamination = !!cell.immuneContamination;

        return cell;
    }
}
