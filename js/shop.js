/**
 * 细胞主理人 - 商店系统
 */

class Shop {
    constructor() {
        this.categories = ['medium', 'serum', 'reagent', 'tools'];
        this.currentCategory = 'medium';
    }

    /**
     * 获取指定分类的商品
     */
    getItemsByCategory(category, playerLevel = 1) {
        const categoryItems = SHOP_ITEMS[category];
        if (!categoryItems) return [];

        return Object.values(categoryItems).filter(item => {
            return !item.unlockLevel || item.unlockLevel <= playerLevel;
        });
    }

    /**
     * 获取所有可购买商品
     */
    getAllAvailableItems(playerLevel = 1) {
        const items = [];
        this.categories.forEach(category => {
            items.push(...this.getItemsByCategory(category, playerLevel));
        });
        return items;
    }

    /**
     * 获取商品信息
     */
    getItemInfo(itemId) {
        for (const category of this.categories) {
            const categoryItems = SHOP_ITEMS[category];
            if (categoryItems && categoryItems[itemId]) {
                return categoryItems[itemId];
            }
        }
        return null;
    }

    /**
     * 购买商品
     */
    buyItem(itemId, quantity, playerGold, playerLevel, inventory) {
        const item = this.getItemInfo(itemId);

        if (!item) {
            return { success: false, message: '商品不存在' };
        }

        if (item.unlockLevel && item.unlockLevel > playerLevel) {
            return { success: false, message: `需要等级${item.unlockLevel}解锁` };
        }

        const totalCost = item.price * quantity;

        if (playerGold < totalCost) {
            return {
                success: false,
                message: `金币不足，需要${totalCost}，当前${playerGold}`
            };
        }

        // 添加到背包
        inventory.addItem(itemId, quantity);

        return {
            success: true,
            message: `购买成功: ${item.name} x${quantity}`,
            cost: totalCost,
            item: item,
            quantity: quantity
        };
    }

    /**
     * 获取分类显示名
     */
    getCategoryName(category) {
        const names = {
            medium: '培养基',
            serum: '血清',
            reagent: '试剂',
            tools: '道具'
        };
        return names[category] || category;
    }

    /**
     * 检查培养细胞所需材料
     */
    checkCellRequirements(cellTypeId, inventory) {
        const cellData = CELL_TYPES[cellTypeId];
        if (!cellData) return { canCulture: false, missing: ['未知细胞类型'] };

        const missing = [];
        const required = [];

        // 检查培养基
        required.push({
            type: 'medium',
            id: cellData.requiredMedium,
            name: this.getItemInfo(cellData.requiredMedium)?.name || cellData.requiredMedium
        });

        if (!inventory.hasItem(cellData.requiredMedium)) {
            missing.push(this.getItemInfo(cellData.requiredMedium)?.name || cellData.requiredMedium);
        }

        // 检查血清
        required.push({
            type: 'serum',
            id: cellData.requiredSerum,
            name: this.getItemInfo(cellData.requiredSerum)?.name || cellData.requiredSerum
        });

        if (!inventory.hasItem(cellData.requiredSerum)) {
            missing.push(this.getItemInfo(cellData.requiredSerum)?.name || cellData.requiredSerum);
        }

        return {
            canCulture: missing.length === 0,
            missing: missing,
            required: required
        };
    }
}
