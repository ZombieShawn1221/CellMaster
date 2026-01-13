/**
 * 细胞主理人 - 背包系统
 */

class Inventory {
    constructor() {
        this.items = {};           // { itemId: quantity }
        this.harvestedCells = [];  // 已收获的细胞（等待交付）
        this.goldenPearls = 0;     // 黄金珠数量
    }

    /**
     * 添加物品
     */
    addItem(itemId, quantity = 1) {
        if (!this.items[itemId]) {
            this.items[itemId] = 0;
        }
        this.items[itemId] += quantity;
        return this.items[itemId];
    }

    /**
     * 移除物品
     */
    removeItem(itemId, quantity = 1) {
        if (!this.items[itemId] || this.items[itemId] < quantity) {
            return false;
        }
        this.items[itemId] -= quantity;
        if (this.items[itemId] <= 0) {
            delete this.items[itemId];
        }
        return true;
    }

    /**
     * 检查是否拥有物品
     */
    hasItem(itemId, quantity = 1) {
        return this.items[itemId] && this.items[itemId] >= quantity;
    }

    /**
     * 获取物品数量
     */
    getItemCount(itemId) {
        return this.items[itemId] || 0;
    }

    /**
     * 使用道具
     */
    useItem(itemId) {
        const item = this.getItemInfo(itemId);
        if (!item) {
            return { success: false, message: '物品不存在' };
        }

        if (!this.hasItem(itemId)) {
            return { success: false, message: '物品数量不足' };
        }

        // 检查是否是可使用的道具
        if (item.category !== 'tools') {
            return { success: false, message: '该物品不可直接使用' };
        }

        this.removeItem(itemId, 1);

        return {
            success: true,
            message: `使用了 ${item.name}`,
            effect: item.effect
        };
    }

    /**
     * 获取物品信息
     */
    getItemInfo(itemId) {
        for (const category of Object.keys(SHOP_ITEMS)) {
            if (SHOP_ITEMS[category][itemId]) {
                return SHOP_ITEMS[category][itemId];
            }
        }
        return null;
    }

    /**
     * 添加收获的细胞
     */
    addHarvestedCell(cellTypeId) {
        this.harvestedCells.push({
            cellTypeId: cellTypeId,
            harvestTime: Date.now()
        });
    }

    /**
     * 移除收获的细胞（用于交付任务）
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
     * 获取已收获细胞数量
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
            return {
                success: false,
                message: '黄金珠数量不足'
            };
        }

        this.goldenPearls -= count;
        const value = count * CONFIG.CELL.GOLDEN_PEARL_VALUE;

        return {
            success: true,
            message: `出售了${count}颗黄金珠`,
            value: value
        };
    }

    /**
     * 获取所有物品列表（用于显示）
     */
    getAllItems() {
        const itemList = [];

        for (const [itemId, quantity] of Object.entries(this.items)) {
            const info = this.getItemInfo(itemId);
            if (info) {
                itemList.push({
                    ...info,
                    quantity: quantity
                });
            }
        }

        return itemList;
    }

    /**
     * 获取按分类整理的物品
     */
    getItemsByCategory() {
        const categorized = {
            medium: [],
            serum: [],
            reagent: [],
            tools: [],
            cells: [],
            special: []
        };

        // 添加普通物品
        for (const [itemId, quantity] of Object.entries(this.items)) {
            const info = this.getItemInfo(itemId);
            if (info) {
                categorized[info.category].push({
                    ...info,
                    quantity: quantity
                });
            }
        }

        // 添加已收获细胞
        const cellCounts = {};
        this.harvestedCells.forEach(c => {
            cellCounts[c.cellTypeId] = (cellCounts[c.cellTypeId] || 0) + 1;
        });

        for (const [cellTypeId, count] of Object.entries(cellCounts)) {
            const cellInfo = CELL_TYPES[cellTypeId];
            if (cellInfo) {
                categorized.cells.push({
                    id: cellTypeId,
                    name: cellInfo.name,
                    icon: cellInfo.icon,
                    quantity: count
                });
            }
        }

        // 添加黄金珠
        if (this.goldenPearls > 0) {
            categorized.special.push({
                id: 'golden_pearl',
                name: '黄金珠',
                icon: '🔮',
                description: '稀有的黄金珠，可高价出售',
                quantity: this.goldenPearls
            });
        }

        return categorized;
    }

    /**
     * 消耗培养细胞所需材料
     */
    consumeCellMaterials(cellTypeId) {
        const cellData = CELL_TYPES[cellTypeId];
        if (!cellData) return false;

        // 检查材料
        if (!this.hasItem(cellData.requiredMedium) ||
            !this.hasItem(cellData.requiredSerum)) {
            return false;
        }

        // 消耗材料
        this.removeItem(cellData.requiredMedium, 1);
        this.removeItem(cellData.requiredSerum, 1);

        return true;
    }

    /**
     * 序列化
     */
    serialize() {
        return {
            items: { ...this.items },
            harvestedCells: [...this.harvestedCells],
            goldenPearls: this.goldenPearls
        };
    }

    /**
     * 反序列化
     */
    static deserialize(data) {
        const inventory = new Inventory();
        inventory.items = data.items || {};
        inventory.harvestedCells = data.harvestedCells || [];
        inventory.goldenPearls = data.goldenPearls || 0;
        return inventory;
    }
}
