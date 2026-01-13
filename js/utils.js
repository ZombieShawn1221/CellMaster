/**
 * 细胞主理人 - 工具函数
 */

const Utils = {
    /**
     * 生成唯一ID
     */
    generateId(prefix = '') {
        return `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * 随机整数 [min, max]
     */
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * 随机浮点数 [min, max]
     */
    randomFloat(min, max) {
        return Math.random() * (max - min) + min;
    },

    /**
     * 从数组随机选择一个元素
     */
    randomChoice(array) {
        return array[Math.floor(Math.random() * array.length)];
    },

    /**
     * 加权随机选择
     */
    weightedRandom(items, weights) {
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;

        for (let i = 0; i < items.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return items[i];
            }
        }
        return items[items.length - 1];
    },

    /**
     * 概率判定
     */
    chance(probability) {
        return Math.random() < probability;
    },

    /**
     * 格式化数字（添加千分位）
     */
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 10000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toLocaleString();
    },

    /**
     * 格式化时间（秒转 mm:ss）
     */
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        if (mins > 0) {
            return `${mins}分${secs}秒`;
        }
        return `${secs}秒`;
    },

    /**
     * 格式化游戏日期
     */
    formatGameDate(date) {
        const d = new Date(date);
        return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
    },

    /**
     * 深拷贝对象
     */
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    /**
     * 防抖函数
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * 节流函数
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * 等待指定时间
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * 获取等级信息
     */
    getLevelInfo(level) {
        const levelData = CONFIG.LEVELS[level - 1];
        if (!levelData) return CONFIG.LEVELS[0];
        return levelData;
    },

    /**
     * 获取等级显示文本
     */
    getLevelText(level) {
        const info = this.getLevelInfo(level);
        const stars = '⭐'.repeat(info.stars);
        return `${info.name} ${stars}`;
    },

    /**
     * 计算升级所需经验
     */
    getExpForLevel(level) {
        if (level >= CONFIG.LEVELS.length) {
            return Infinity;
        }
        return CONFIG.LEVELS[level].exp;
    },

    /**
     * 根据总经验计算等级
     */
    calculateLevel(totalExp) {
        let level = 1;
        let expUsed = 0;

        for (let i = 1; i < CONFIG.LEVELS.length; i++) {
            if (totalExp >= CONFIG.LEVELS[i].exp) {
                level = i + 1;
            } else {
                break;
            }
        }

        return level;
    },

    /**
     * 获取最大传代比例
     */
    getMaxPassageRatio(level) {
        let maxRatio = 2;
        for (const [lvl, ratio] of Object.entries(CONFIG.PASSAGE.MAX_RATIO)) {
            if (level >= parseInt(lvl)) {
                maxRatio = ratio;
            }
        }
        return maxRatio;
    },

    /**
     * 洗牌数组
     */
    shuffle(array) {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    },

    /**
     * 限制数值范围
     */
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
};
