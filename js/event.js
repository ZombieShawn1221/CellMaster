/**
 * 细胞主理人 - 意外事件系统 V2.0
 * 处理随机事件的触发、显示和持续时间
 */

class EventManager {
    constructor() {
        this.activeEvents = [];  // 当前生效的事件
        this.eventHistory = [];  // 事件历史
        this.checkCooldown = 0;  // 检查冷却
        this.checkInterval = 10000;  // 每10秒检查一次是否触发事件
    }

    /**
     * 初始化事件管理器
     */
    init() {
        this.activeEvents = [];
        this.eventHistory = [];
        this.checkCooldown = this.checkInterval;
    }

    /**
     * 更新事件系统
     * @param {number} deltaTime 时间增量（毫秒）
     * @param {number} modeEventFrequency 模式事件频率倍数
     */
    update(deltaTime, modeEventFrequency = 1) {
        const events = [];

        // 更新当前生效的事件持续时间
        for (let i = this.activeEvents.length - 1; i >= 0; i--) {
            const activeEvent = this.activeEvents[i];
            activeEvent.remainingTime -= deltaTime / 1000;

            if (activeEvent.remainingTime <= 0) {
                // 事件结束
                events.push({
                    type: 'event_expired',
                    event: activeEvent
                });
                this.activeEvents.splice(i, 1);
            }
        }

        // 检查是否触发新事件
        this.checkCooldown -= deltaTime;
        if (this.checkCooldown <= 0) {
            this.checkCooldown = this.checkInterval;

            const newEvent = this.tryTriggerEvent(modeEventFrequency);
            if (newEvent) {
                events.push({
                    type: 'event_triggered',
                    event: newEvent
                });
            }
        }

        return events;
    }

    /**
     * 尝试触发随机事件
     */
    tryTriggerEvent(frequencyMultiplier = 1) {
        for (const eventData of RANDOM_EVENTS) {
            // 基础概率 × 模式倍数
            const adjustedChance = eventData.chance * frequencyMultiplier;

            if (Math.random() < adjustedChance) {
                // 检查是否已有同类型事件
                if (this.hasActiveEvent(eventData.id)) {
                    continue;
                }

                return this.triggerEvent(eventData);
            }
        }
        return null;
    }

    /**
     * 触发指定事件
     */
    triggerEvent(eventData) {
        const duration = eventData.effect.duration || 60;  // 默认持续60秒

        const activeEvent = {
            id: Utils.generateId('event_'),
            eventId: eventData.id,
            name: eventData.name,
            description: eventData.description,
            type: eventData.type,
            effect: { ...eventData.effect },
            triggeredAt: Date.now(),
            remainingTime: duration,
            totalDuration: duration
        };

        this.activeEvents.push(activeEvent);
        this.eventHistory.push({
            eventId: eventData.id,
            name: eventData.name,
            triggeredAt: Date.now()
        });

        // 限制历史记录长度
        if (this.eventHistory.length > 50) {
            this.eventHistory = this.eventHistory.slice(-50);
        }

        return activeEvent;
    }

    /**
     * 检查是否有指定事件正在生效
     */
    hasActiveEvent(eventId) {
        return this.activeEvents.some(e => e.eventId === eventId);
    }

    /**
     * 获取当前所有生效的效果
     */
    getActiveEffects() {
        const effects = {
            goldenMultiplier: 1,
            contaminationMultiplier: 1,
            efficiencyMultiplier: 1,
            deadlineMultiplier: 1,
            growthPaused: false
        };

        for (const activeEvent of this.activeEvents) {
            const effect = activeEvent.effect;

            switch (effect.type) {
                case 'golden_boost':
                    effects.goldenMultiplier *= effect.value;
                    break;
                case 'contamination_boost':
                    effects.contaminationMultiplier *= effect.value;
                    break;
                case 'contamination_reduce':
                    effects.contaminationMultiplier *= effect.value;
                    break;
                case 'efficiency_boost':
                    effects.efficiencyMultiplier *= effect.value;
                    break;
                case 'deadline_reduce':
                    effects.deadlineMultiplier *= effect.value;
                    break;
                case 'pause_growth':
                    effects.growthPaused = true;
                    break;
            }
        }

        return effects;
    }

    /**
     * 应用一次性事件效果
     * @returns {Object} 需要应用的一次性效果
     */
    getOneTimeEffects() {
        const oneTimeEffects = [];

        for (const activeEvent of this.activeEvents) {
            const effect = activeEvent.effect;

            // 一次性效果只触发一次
            if (activeEvent.applied) continue;

            switch (effect.type) {
                case 'gold_bonus':
                    oneTimeEffects.push({
                        type: 'gold',
                        value: effect.value,
                        eventName: activeEvent.name
                    });
                    activeEvent.applied = true;
                    break;
                case 'quality_drop':
                    oneTimeEffects.push({
                        type: 'quality_drop',
                        value: effect.value,
                        eventName: activeEvent.name
                    });
                    activeEvent.applied = true;
                    break;
                case 'lose_item':
                    oneTimeEffects.push({
                        type: 'lose_item',
                        items: effect.items,
                        eventName: activeEvent.name
                    });
                    activeEvent.applied = true;
                    break;
                case 'rare_item':
                    oneTimeEffects.push({
                        type: 'rare_item',
                        eventName: activeEvent.name
                    });
                    activeEvent.applied = true;
                    break;
                case 'mutation':
                    oneTimeEffects.push({
                        type: 'mutation',
                        range: effect.range,
                        eventName: activeEvent.name
                    });
                    activeEvent.applied = true;
                    break;
            }
        }

        return oneTimeEffects;
    }

    /**
     * 获取事件图标
     */
    static getEventIcon(eventType) {
        const icons = {
            'power_outage': '⚡',
            'contamination_outbreak': '☣️',
            'equipment_failure': '🔧',
            'reagent_expired': '📦',
            'mentor_pressure': '😰',
            'lucky_day': '🍀',
            'lab_inspection': '💰',
            'equipment_upgrade': '🔬',
            'clean_day': '✨',
            'cell_mutation': '🧬',
            'mysterious_visitor': '👤'
        };
        return icons[eventType] || '❓';
    }

    /**
     * 获取事件类型颜色
     */
    static getEventColor(type) {
        switch (type) {
            case 'positive': return '#67C23A';
            case 'negative': return '#F56C6C';
            case 'special': return '#E6A23C';
            default: return '#909399';
        }
    }

    /**
     * 序列化
     */
    serialize() {
        return {
            activeEvents: this.activeEvents,
            eventHistory: this.eventHistory.slice(-20),
            checkCooldown: this.checkCooldown
        };
    }

    /**
     * 反序列化
     */
    static deserialize(data) {
        const manager = new EventManager();
        manager.activeEvents = data.activeEvents || [];
        manager.eventHistory = data.eventHistory || [];
        manager.checkCooldown = data.checkCooldown || 10000;
        return manager;
    }
}
