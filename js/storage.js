/**
 * 细胞主理人 - 存储管理
 */

const Storage = {
    SAVE_KEY: 'cellMaster_save_v2',
    USER_KEY: 'cellMaster_user',

    /**
     * 保存游戏数据
     */
    saveGame(data) {
        try {
            const saveData = {
                version: CONFIG.VERSION,
                timestamp: Date.now(),
                data: data
            };
            localStorage.setItem(this.SAVE_KEY, JSON.stringify(saveData));
            return true;
        } catch (e) {
            console.error('保存游戏失败:', e);
            return false;
        }
    },

    /**
     * 加载游戏数据
     */
    loadGame() {
        try {
            const saveStr = localStorage.getItem(this.SAVE_KEY);
            if (!saveStr) return null;

            const saveData = JSON.parse(saveStr);
            return saveData.data;
        } catch (e) {
            console.error('加载游戏失败:', e);
            return null;
        }
    },

    /**
     * 检查是否有存档
     */
    hasSave() {
        return localStorage.getItem(this.SAVE_KEY) !== null;
    },

    /**
     * 删除存档
     */
    deleteSave() {
        localStorage.removeItem(this.SAVE_KEY);
    },

    /**
     * 保存用户信息
     */
    saveUser(user) {
        try {
            localStorage.setItem(this.USER_KEY, JSON.stringify(user));
            return true;
        } catch (e) {
            console.error('保存用户失败:', e);
            return false;
        }
    },

    /**
     * 加载用户信息
     */
    loadUser() {
        try {
            const userStr = localStorage.getItem(this.USER_KEY);
            if (!userStr) return null;
            return JSON.parse(userStr);
        } catch (e) {
            console.error('加载用户失败:', e);
            return null;
        }
    },

    /**
     * 清除所有数据
     */
    clearAll() {
        localStorage.removeItem(this.SAVE_KEY);
        localStorage.removeItem(this.USER_KEY);
    }
};
