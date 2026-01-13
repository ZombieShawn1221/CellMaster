/**
 * 细胞主理人 - 培养箱系统 V2.0
 */

class Incubator {
    constructor(initialSlots = 5) {
        this.slots = [];
        this.unlockedSlots = initialSlots;  // 根据游戏模式初始化
        this.maxSlots = CONFIG.INCUBATOR.MAX_SLOTS;

        // 初始化槽位
        for (let i = 0; i < this.maxSlots; i++) {
            this.slots.push({
                index: i,
                cell: null,
                isLocked: i >= this.unlockedSlots
            });
        }

        // 培养箱状态
        this.isPaused = false;          // 是否暂停（停电事件）
        this.contaminationMultiplier = 1; // 污染概率倍数
        this.modeContaminationRate = 1.0; // 模式污染倍率
    }

    /**
     * 获取空闲槽位
     */
    getEmptySlots() {
        return this.slots.filter(slot => !slot.isLocked && !slot.cell);
    }

    /**
     * 获取占用槽位
     */
    getOccupiedSlots() {
        return this.slots.filter(slot => slot.cell);
    }

    /**
     * 获取可用槽位数
     */
    getAvailableSlotCount() {
        return this.getEmptySlots().length;
    }

    /**
     * 放置细胞
     */
    placeCell(cell, slotIndex = -1) {
        // 如果没指定槽位，自动选择空闲槽位
        if (slotIndex === -1) {
            const emptySlots = this.getEmptySlots();
            if (emptySlots.length === 0) {
                return {
                    success: false,
                    message: '没有空闲的培养槽位'
                };
            }
            slotIndex = emptySlots[0].index;
        }

        const slot = this.slots[slotIndex];

        if (!slot) {
            return { success: false, message: '槽位不存在' };
        }

        if (slot.isLocked) {
            return { success: false, message: '槽位未解锁' };
        }

        if (slot.cell) {
            return { success: false, message: '槽位已被占用' };
        }

        cell.slotIndex = slotIndex;
        slot.cell = cell;

        return {
            success: true,
            message: `${cell.name} 已放入培养槽 ${slotIndex + 1}`,
            slotIndex: slotIndex
        };
    }

    /**
     * 移除细胞
     */
    removeCell(slotIndex) {
        const slot = this.slots[slotIndex];
        if (!slot || !slot.cell) {
            return { success: false, message: '槽位为空', cell: null };
        }

        const cell = slot.cell;
        slot.cell = null;

        return {
            success: true,
            message: `已移除 ${cell.name}`,
            cell: cell
        };
    }

    /**
     * 获取槽位信息
     */
    getSlotInfo(slotIndex) {
        return this.slots[slotIndex];
    }

    /**
     * 解锁新槽位
     */
    unlockSlot(playerGold) {
        if (this.unlockedSlots >= this.maxSlots) {
            return {
                success: false,
                message: '已解锁所有槽位'
            };
        }

        const cost = CONFIG.INCUBATOR.SLOT_UNLOCK_COSTS[this.unlockedSlots];

        if (playerGold < cost) {
            return {
                success: false,
                message: `金币不足，需要${cost}金币`,
                cost: cost
            };
        }

        this.slots[this.unlockedSlots].isLocked = false;
        this.unlockedSlots++;

        return {
            success: true,
            message: `解锁了新的培养槽位 (${this.unlockedSlots}/${this.maxSlots})`,
            cost: cost,
            newSlotIndex: this.unlockedSlots - 1
        };
    }

    /**
     * 获取下一个槽位解锁费用
     */
    getNextSlotCost() {
        if (this.unlockedSlots >= this.maxSlots) {
            return null;
        }
        return CONFIG.INCUBATOR.SLOT_UNLOCK_COSTS[this.unlockedSlots];
    }

    /**
     * 设置模式污染倍率
     */
    setModeContaminationRate(rate) {
        this.modeContaminationRate = rate;
    }

    /**
     * 更新所有细胞
     */
    update(deltaTime, workbenchEfficiency = 1) {
        if (this.isPaused) return [];

        const events = [];
        // 总污染倍数 = 模式倍率 × 临时事件倍率
        const totalContaminationMultiplier = this.modeContaminationRate * this.contaminationMultiplier;

        this.slots.forEach(slot => {
            if (slot.cell && slot.cell.status === 'growing') {
                const previousStatus = slot.cell.status;

                slot.cell.update(deltaTime, totalContaminationMultiplier);

                // 检查状态变化
                if (slot.cell.status !== previousStatus) {
                    events.push({
                        type: slot.cell.status,
                        cell: slot.cell,
                        slotIndex: slot.index
                    });
                }
            }
        });

        return events;
    }

    /**
     * 暂停所有生长
     */
    pause(duration) {
        this.isPaused = true;
        setTimeout(() => {
            this.isPaused = false;
        }, duration * 1000);
    }

    /**
     * 设置污染倍数
     */
    setContaminationMultiplier(multiplier, duration) {
        this.contaminationMultiplier = multiplier;
        setTimeout(() => {
            this.contaminationMultiplier = 1;
        }, duration * 1000);
    }

    /**
     * 获取统计信息
     */
    getStats() {
        const occupied = this.getOccupiedSlots();
        const growing = occupied.filter(s => s.cell.status === 'growing').length;
        const ready = occupied.filter(s => s.cell.status === 'ready').length;
        const contaminated = occupied.filter(s => s.cell.status === 'contaminated').length;

        return {
            total: this.unlockedSlots,
            empty: this.unlockedSlots - occupied.length,
            occupied: occupied.length,
            growing: growing,
            ready: ready,
            contaminated: contaminated,
            locked: this.maxSlots - this.unlockedSlots
        };
    }

    /**
     * 序列化
     */
    serialize() {
        return {
            unlockedSlots: this.unlockedSlots,
            modeContaminationRate: this.modeContaminationRate,
            slots: this.slots.map(slot => ({
                index: slot.index,
                cell: slot.cell ? slot.cell.serialize() : null,
                isLocked: slot.isLocked
            }))
        };
    }

    /**
     * 反序列化
     */
    static deserialize(data) {
        const incubator = new Incubator(data.unlockedSlots);
        incubator.modeContaminationRate = data.modeContaminationRate || 1.0;
        incubator.slots = data.slots.map(slotData => ({
            index: slotData.index,
            cell: slotData.cell ? Cell.deserialize(slotData.cell) : null,
            isLocked: slotData.isLocked
        }));
        return incubator;
    }
}
