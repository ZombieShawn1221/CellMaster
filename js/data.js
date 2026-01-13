/**
 * 细胞主理人 - 游戏数据 V2.0
 * 基于 CellMaster_cells_consumables_tasks_V1.md 设计文档
 */

// ==================== 细胞类型数据 ====================
// 10种细胞系：按解锁进度分为 T1(Early), T2(Mid), T3(Late), T4(End)
const CELL_TYPES = {
    // ========== T1 日常细胞 (Early) ==========
    hek293t: {
        id: 'hek293t',
        name: 'HEK293T',
        icon: '🟡',
        description: '人胚肾细胞，新手练手首选，稳定现金流',
        tier: 'T1',
        difficulty: 1,
        baseGrowthTime: 30,
        requiredMedia: 'media_dmem',
        requiredSerum: 'fbs',
        optionalAddons: [],
        baseValue: 80,
        expReward: 8,
        unlockLevel: 1,
        contaminationBase: 0.012,
        qualityDrift: 0.5,  // 过密品质下降速度
        traits: ['stable', 'beginner']
    },
    hela: {
        id: 'hela',
        name: 'HeLa',
        icon: '🔴',
        description: '宫颈癌细胞系，生长快但过密惩罚重',
        tier: 'T1',
        difficulty: 1,
        baseGrowthTime: 25,
        requiredMedia: 'media_dmem',
        requiredSerum: 'fbs',
        optionalAddons: [],
        baseValue: 90,
        expReward: 9,
        unlockLevel: 1,
        contaminationBase: 0.012,
        qualityDrift: 1.5,  // 过密惩罚更重
        traits: ['fast', 'overgrowth_penalty']
    },
    a549: {
        id: 'a549',
        name: 'A549',
        icon: '🟢',
        description: '人肺癌细胞，稳定型，适合洁癖订单',
        tier: 'T1',
        difficulty: 1,
        baseGrowthTime: 35,
        requiredMedia: 'media_dmem',
        requiredSerum: 'fbs',
        optionalAddons: [],
        baseValue: 85,
        expReward: 8,
        unlockLevel: 2,
        contaminationBase: 0.010,
        qualityDrift: 0.3,
        traits: ['stable', 'low_variance']
    },

    // ========== T2 专用耗材细胞 (Mid) ==========
    mcf7: {
        id: 'mcf7',
        name: 'MCF-7',
        icon: '🩷',
        description: '乳腺癌细胞，需要激素包，引入成本管理',
        tier: 'T2',
        difficulty: 2,
        baseGrowthTime: 40,
        requiredMedia: 'media_dmem',
        requiredSerum: 'fbs',
        optionalAddons: ['hormone_pack'],
        requiredAddons: ['hormone_pack'],  // 必须使用
        baseValue: 150,
        expReward: 15,
        unlockLevel: 4,
        contaminationBase: 0.015,
        qualityDrift: 0.6,
        traits: ['hormone_dependent']
    },
    raw264: {
        id: 'raw264',
        name: 'RAW264.7',
        icon: '🟤',
        description: '小鼠巨噬细胞，半贴壁易聚团，计数难',
        tier: 'T2',
        difficulty: 2,
        baseGrowthTime: 35,
        requiredMedia: 'media_dmem',
        requiredSerum: 'fbs',
        optionalAddons: [],
        baseValue: 130,
        expReward: 13,
        unlockLevel: 5,
        contaminationBase: 0.014,
        qualityDrift: 0.8,
        traits: ['semi_adherent', 'clumping']
    },
    thp1: {
        id: 'thp1',
        name: 'THP-1',
        icon: '🟣',
        description: '人单核细胞，悬浮培养，可PMA分化',
        tier: 'T2',
        difficulty: 3,
        baseGrowthTime: 45,
        requiredMedia: 'media_rpmi',
        requiredSerum: 'fbs',
        optionalAddons: ['suspension_kit', 'pma'],
        requiredAddons: ['suspension_kit'],
        baseValue: 200,
        expReward: 20,
        unlockLevel: 6,
        contaminationBase: 0.018,
        qualityDrift: 0.7,
        traits: ['suspension', 'differentiable'],
        noTrypsin: true  // 悬浮细胞不需要胰酶传代
    },
    jurkat: {
        id: 'jurkat',
        name: 'Jurkat',
        icon: '🔵',
        description: 'T淋巴细胞，快但脆，高风险高回报',
        tier: 'T2',
        difficulty: 3,
        baseGrowthTime: 30,
        requiredMedia: 'media_rpmi',
        requiredSerum: 'fbs',
        optionalAddons: ['suspension_kit'],
        requiredAddons: ['suspension_kit'],
        baseValue: 180,
        expReward: 18,
        unlockLevel: 7,
        contaminationBase: 0.022,
        qualityDrift: 1.0,
        traits: ['suspension', 'fast', 'fragile'],
        noTrypsin: true
    },

    // ========== T3 娇气高价值细胞 (Late) ==========
    huvec: {
        id: 'huvec',
        name: 'HUVEC',
        icon: '💜',
        description: '人脐静脉内皮细胞，娇气，需要生长因子+涂层',
        tier: 'T3',
        difficulty: 4,
        baseGrowthTime: 60,
        requiredMedia: 'media_dmem',
        requiredSerum: 'fbs',
        optionalAddons: ['gf_pack', 'coating_pack', 'accutase'],
        requiredAddons: ['gf_pack', 'coating_pack'],
        baseValue: 400,
        expReward: 40,
        unlockLevel: 10,
        contaminationBase: 0.020,
        qualityDrift: 1.2,
        traits: ['delicate', 'coating_required', 'growth_factor_required']
    },
    primary_fib: {
        id: 'primary_fib',
        name: '原代成纤维细胞',
        icon: '🧬',
        description: '原代细胞，生长慢占槽久，长线订单首选',
        tier: 'T3',
        difficulty: 4,
        baseGrowthTime: 80,
        requiredMedia: 'media_dmem',
        requiredSerum: 'fbs',
        optionalAddons: ['coating_pack', 'accutase'],
        requiredAddons: ['coating_pack'],
        baseValue: 500,
        expReward: 50,
        unlockLevel: 13,
        contaminationBase: 0.016,
        qualityDrift: 0.4,
        traits: ['primary', 'slow', 'coating_required']
    },

    // ========== T4 3D高阶细胞 (End) ==========
    organoid: {
        id: 'organoid',
        name: '肠道类器官',
        icon: '🫀',
        description: '3D类器官培养，最高难度，强制质控',
        tier: 'T4',
        difficulty: 5,
        baseGrowthTime: 120,
        requiredMedia: 'organoid_media',
        requiredSerum: 'matrigel',
        optionalAddons: ['gf_pack', 'accutase'],
        requiredAddons: ['matrigel', 'gf_pack'],
        baseValue: 2000,
        expReward: 200,
        unlockLevel: 19,
        contaminationBase: 0.025,
        qualityDrift: 0.8,
        traits: ['3d', 'organoid', 'qc_required'],
        yield: 2  // 每次收获产出2单位
    },
    golden_stock: {
        id: 'golden_stock',
        name: '黄金株',
        icon: '🌟',
        description: '稀有奖励，可替代任意细胞交付或直接出售',
        tier: 'T_special',
        difficulty: 0,
        baseGrowthTime: 0,
        requiredMedia: 'media_dmem',
        requiredSerum: 'fbs',
        baseValue: 500,
        expReward: 0,
        unlockLevel: 1,
        contaminationBase: 0,
        qualityDrift: 0,
        traits: ['special'],
        cultivable: false
    }
};

// ==================== 耗材数据 ====================
const SHOP_ITEMS = {
    // ========== 基础培养基 ==========
    medium: {
        media_dmem: {
            id: 'media_dmem',
            name: 'DMEM基础培养基',
            icon: '🧪',
            description: '多数贴壁细胞主培养基',
            price: 18,
            category: 'medium',
            unlockLevel: 1
        },
        media_rpmi: {
            id: 'media_rpmi',
            name: 'RPMI-1640培养基',
            icon: '🧪',
            description: '悬浮系/免疫细胞主培养基',
            price: 20,
            category: 'medium',
            unlockLevel: 6
        },
        organoid_media: {
            id: 'organoid_media',
            name: '类器官培养基包',
            icon: '✨',
            description: '3D类器官维持专用',
            price: 60,
            category: 'medium',
            unlockLevel: 19,
            effect: { growthTime: 0.92, contamination: 0.90 }
        }
    },

    // ========== 血清与添加剂 ==========
    serum: {
        fbs: {
            id: 'fbs',
            name: '胎牛血清(FBS)',
            icon: '🩸',
            description: '最常用的血清添加剂，品质+1',
            price: 25,
            category: 'serum',
            unlockLevel: 1,
            effect: { quality: 1 }
        },
        matrigel: {
            id: 'matrigel',
            name: 'Matrigel基质胶',
            icon: '🧊',
            description: '3D培养核心材料，品质+4',
            price: 55,
            category: 'serum',
            unlockLevel: 19,
            effect: { quality: 4, success3d: 0.15 }
        }
    },

    // ========== 试剂与酶 ==========
    reagent: {
        pbs: {
            id: 'pbs',
            name: 'PBS缓冲液',
            icon: '💦',
            description: '清洗/操作必需',
            price: 10,
            category: 'reagent',
            unlockLevel: 1
        },
        trypsin: {
            id: 'trypsin',
            name: 'Trypsin-EDTA',
            icon: '⚗️',
            description: '贴壁细胞传代必需',
            price: 16,
            category: 'reagent',
            unlockLevel: 1
        },
        accutase: {
            id: 'accutase',
            name: 'Accutase(高级)',
            icon: '💎',
            description: '温和消化酶，传代品质+3',
            price: 28,
            category: 'reagent',
            unlockLevel: 10,
            effect: { passageQuality: 3 }
        },
        consumables: {
            id: 'consumables',
            name: '一次性耗材包',
            icon: '📦',
            description: '枪头/瓶/管综合包，操作必需',
            price: 12,
            category: 'reagent',
            unlockLevel: 1
        }
    },

    // ========== 风险控制 ==========
    riskControl: {
        ps: {
            id: 'ps',
            name: '双抗(P/S)',
            icon: '💊',
            description: '污染风险×0.70，洁癖单可能扣品质',
            price: 22,
            category: 'riskControl',
            unlockLevel: 1,
            effect: { contamination: 0.70, cleanPenalty: -5 }
        },
        antifungal: {
            id: 'antifungal',
            name: '抗真菌剂',
            icon: '🛡️',
            description: '污染风险×0.65，品质-3',
            price: 30,
            category: 'riskControl',
            unlockLevel: 4,
            effect: { contamination: 0.65, quality: -3 }
        },
        myco_test: {
            id: 'myco_test',
            name: '支原体检测券',
            icon: '🔬',
            description: '交付质控，通过品质+6，失败则污染确诊',
            price: 40,
            category: 'riskControl',
            unlockLevel: 3,
            effect: { qcPass: { quality: 6, rareChance: 0.01 } }
        }
    },

    // ========== 专用添加剂 ==========
    addon: {
        gf_pack: {
            id: 'gf_pack',
            name: '生长因子包',
            icon: '🌟',
            description: 'HUVEC/类器官必需，生长×0.95，品质+2',
            price: 35,
            category: 'addon',
            unlockLevel: 10,
            effect: { growthTime: 0.95, quality: 2 }
        },
        hormone_pack: {
            id: 'hormone_pack',
            name: '激素/补充剂包',
            icon: '💉',
            description: 'MCF-7必需，降低生长波动，品质+2',
            price: 32,
            category: 'addon',
            unlockLevel: 4,
            effect: { variance: 0.5, quality: 2 }
        },
        coating_pack: {
            id: 'coating_pack',
            name: '涂层包(胶原/明胶)',
            icon: '🎨',
            description: '原代/HUVEC必需，污染×0.90，品质+2',
            price: 26,
            category: 'addon',
            unlockLevel: 10,
            effect: { contamination: 0.90, quality: 2 }
        },
        suspension_kit: {
            id: 'suspension_kit',
            name: '悬浮培养耗材包',
            icon: '🔄',
            description: 'THP-1/Jurkat必需，波动降低，污染×0.95',
            price: 24,
            category: 'addon',
            unlockLevel: 6,
            effect: { variance: 0.7, contamination: 0.95 }
        },
        pma: {
            id: 'pma',
            name: 'PMA分化试剂',
            icon: '⚡',
            description: 'THP-1分化专用，解锁分化订单',
            price: 30,
            category: 'addon',
            unlockLevel: 7
        }
    },

    // ========== 功能道具 ==========
    tools: {
        speed_boost: {
            id: 'speed_boost',
            name: '生长加速剂',
            icon: '⚡',
            description: '生长速度×1.5，持续一次培养',
            price: 200,
            category: 'tools',
            effect: { type: 'speed', value: 1.5 }
        },
        emergency_save: {
            id: 'emergency_save',
            name: '紧急救援包',
            icon: '🚑',
            description: '清除污染细胞，保留50%收益',
            price: 250,
            category: 'tools',
            effect: { type: 'emergency_save', value: 0.5 }
        },
        lab_lock: {
            id: 'lab_lock',
            name: '实验室门锁',
            icon: '🔒',
            description: '降低被盗概率50%，持续24小时',
            price: 150,
            category: 'tools',
            effect: { type: 'anti_theft', value: 0.5, duration: 86400 }
        },
        anti_contam_basic: {
            id: 'anti_contam_basic',
            name: '初级防污染剂',
            icon: '🧴',
            description: '品质-3，污染概率不变',
            price: 100,
            category: 'tools',
            unlockLevel: 1,
            effect: { type: 'anti_contam_basic', quality: -3, contaminationMultiplier: 1 }
        },
        anti_contam_mid: {
            id: 'anti_contam_mid',
            name: '中级防污染剂',
            icon: '🛡️',
            description: '品质-2，污染概率下降',
            price: 200,
            category: 'tools',
            unlockLevel: 3,
            effect: { type: 'anti_contam_mid', quality: -2, contaminationMultiplier: 0.6 }
        },
        anti_contam_high: {
            id: 'anti_contam_high',
            name: '高级防污染剂',
            icon: '💠',
            description: '品质不变，本次培养免疫污染',
            price: 300,
            category: 'tools',
            unlockLevel: 5,
            effect: { type: 'anti_contam_high', quality: 0, immune: true }
        }
    }

};


// ==================== 任务模板系统 ====================
// 任务修饰词
const TASK_MODIFIERS = {
    urgent: {
        id: 'urgent',
        name: '紧急',
        icon: '🔥',
        deadlineMultiplier: 0.7,
        rewardMultiplier: 1.25,
        penaltyMultiplier: 1.5,
        description: '时限缩短，奖励提升，逾期惩罚加重'
    },
    clean: {
        id: 'clean',
        name: '洁癖甲方',
        icon: '✨',
        qualityBonus: 10,
        rewardMultiplier: 1.35,
        constraints: ['no_antibiotics'],
        description: '品质要求+10，禁用双抗'
    },
    budget: {
        id: 'budget',
        name: '经费紧张',
        icon: '💸',
        qualityBonus: -8,
        rewardMultiplier: 0.85,
        description: '品质要求低，奖励也低但稳定'
    },
    sensitive: {
        id: 'sensitive',
        name: '敏感细胞',
        icon: '⚠️',
        rewardMultiplier: 1.10,
        penaltyMultiplier: 2.0,
        description: '污染惩罚加倍'
    },
    qc_only: {
        id: 'qc_only',
        name: '必须质控',
        icon: '🔬',
        rewardMultiplier: 1.20,
        constraints: ['require_myco_test'],
        description: '必须通过支原体检测才能交付'
    }
};

// 任务模板池
const TASK_TEMPLATES = {
    // ========== T1 HEK293T 任务 ==========
    hek293t_standard: {
        id: 'hek293t_standard',
        name: '标准扩增单',
        cellType: 'hek293t',
        taskType: 'expand',
        tier: 'T1',
        unitsRange: [1, 2],
        qualityRange: [55, 65],
        deadlineRange: [360, 600],  // 秒 (6-10分钟游戏时间)
        baseReward: { gold: 120, exp: 12 },
        unlockLevel: 1
    },
    hek293t_chain: {
        id: 'hek293t_chain',
        name: '连单客户·批量供给',
        cellType: 'hek293t',
        taskType: 'chain',
        tier: 'T1',
        chainCount: 3,
        unitsRange: [1, 1],
        qualityRange: [50, 60],
        deadlineRange: [300, 480],
        baseReward: { gold: 100, exp: 10 },
        chainBonus: { items: { consumables: 3 } },
        unlockLevel: 2
    },
    hek293t_clean: {
        id: 'hek293t_clean',
        name: '洁癖小单(入门)',
        cellType: 'hek293t',
        taskType: 'expand',
        tier: 'T1',
        modifiers: ['clean'],
        unitsRange: [1, 1],
        qualityRange: [63, 73],
        deadlineRange: [420, 600],
        baseReward: { gold: 150, exp: 15 },
        unlockLevel: 2
    },

    // ========== T1 HeLa 任务 ==========
    hela_fast: {
        id: 'hela_fast',
        name: '快单(常驻)',
        cellType: 'hela',
        taskType: 'expand',
        tier: 'T1',
        modifiers: ['urgent'],
        unitsRange: [1, 2],
        qualityRange: [55, 65],
        deadlineRange: [300, 480],
        baseReward: { gold: 140, exp: 14 },
        unlockLevel: 1
    },
    hela_overgrow: {
        id: 'hela_overgrow',
        name: '过密风险单',
        cellType: 'hela',
        taskType: 'maintain',
        tier: 'T1',
        unitsRange: [1, 1],
        qualityRange: [60, 70],
        deadlineRange: [240, 360],
        baseReward: { gold: 160, exp: 16 },
        constraints: ['harvest_on_time'],
        unlockLevel: 2
    },
    hela_qc: {
        id: 'hela_qc',
        name: 'QC试运行',
        cellType: 'hela',
        taskType: 'expand',
        tier: 'T1',
        modifiers: ['qc_only'],
        unitsRange: [1, 1],
        qualityRange: [55, 65],
        deadlineRange: [420, 600],
        baseReward: { gold: 180, exp: 25 },
        unlockLevel: 3
    },

    // ========== T1 A549 任务 ==========
    a549_stable: {
        id: 'a549_stable',
        name: '稳定供货单',
        cellType: 'a549',
        taskType: 'expand',
        tier: 'T1',
        unitsRange: [2, 3],
        qualityRange: [55, 65],
        deadlineRange: [480, 720],
        baseReward: { gold: 200, exp: 20 },
        unlockLevel: 2
    },
    a549_clean: {
        id: 'a549_clean',
        name: '无抗洁癖单(标准)',
        cellType: 'a549',
        taskType: 'expand',
        tier: 'T1',
        modifiers: ['clean'],
        unitsRange: [1, 2],
        qualityRange: [70, 80],
        deadlineRange: [420, 600],
        baseReward: { gold: 220, exp: 22 },
        unlockLevel: 3
    },
    a549_freeze: {
        id: 'a549_freeze',
        name: '冻存备份单(入门)',
        cellType: 'a549',
        taskType: 'freeze',
        tier: 'T1',
        unitsRange: [1, 1],
        qualityRange: [60, 70],
        deadlineRange: [480, 720],
        baseReward: { gold: 150, exp: 30 },
        unlockLevel: 3
    },

    // ========== T2 MCF-7 任务 ==========
    mcf7_hormone: {
        id: 'mcf7_hormone',
        name: '激素依赖单',
        cellType: 'mcf7',
        taskType: 'expand',
        tier: 'T2',
        unitsRange: [1, 2],
        qualityRange: [60, 70],
        deadlineRange: [540, 720],
        baseReward: { gold: 280, exp: 28 },
        constraints: ['require_hormone_pack'],
        unlockLevel: 4
    },
    mcf7_clean: {
        id: 'mcf7_clean',
        name: '洁癖单(中阶)',
        cellType: 'mcf7',
        taskType: 'expand',
        tier: 'T2',
        modifiers: ['clean'],
        unitsRange: [1, 1],
        qualityRange: [75, 85],
        deadlineRange: [600, 840],
        baseReward: { gold: 350, exp: 35 },
        unlockLevel: 5
    },
    mcf7_maintain: {
        id: 'mcf7_maintain',
        name: '长期维持单',
        cellType: 'mcf7',
        taskType: 'maintain',
        tier: 'T2',
        unitsRange: [1, 1],
        qualityRange: [65, 75],
        deadlineRange: [720, 1080],
        baseReward: { gold: 400, exp: 40 },
        constraints: ['min_media_changes:2'],
        unlockLevel: 5
    },

    // ========== T2 THP-1 任务 ==========
    thp1_suspension: {
        id: 'thp1_suspension',
        name: '悬浮扩增单',
        cellType: 'thp1',
        taskType: 'expand',
        tier: 'T2',
        unitsRange: [1, 2],
        qualityRange: [60, 70],
        deadlineRange: [600, 840],
        baseReward: { gold: 350, exp: 35 },
        constraints: ['require_suspension_kit'],
        unlockLevel: 6
    },
    thp1_urgent: {
        id: 'thp1_urgent',
        name: '紧急免疫单',
        cellType: 'thp1',
        taskType: 'expand',
        tier: 'T2',
        modifiers: ['urgent', 'sensitive'],
        unitsRange: [1, 2],
        qualityRange: [55, 65],
        deadlineRange: [420, 540],
        baseReward: { gold: 450, exp: 45 },
        unlockLevel: 7
    },
    thp1_differentiate: {
        id: 'thp1_differentiate',
        name: '分化订单(特殊)',
        cellType: 'thp1',
        taskType: 'differentiate',
        tier: 'T2',
        unitsRange: [1, 2],
        qualityRange: [70, 80],
        deadlineRange: [720, 960],
        baseReward: { gold: 600, exp: 60 },
        constraints: ['require_pma'],
        unlockLevel: 8
    },

    // ========== T2 Jurkat 任务 ==========
    jurkat_fast: {
        id: 'jurkat_fast',
        name: '快速扩增单',
        cellType: 'jurkat',
        taskType: 'expand',
        tier: 'T2',
        modifiers: ['urgent'],
        unitsRange: [1, 2],
        qualityRange: [55, 65],
        deadlineRange: [360, 480],
        baseReward: { gold: 320, exp: 32 },
        unlockLevel: 7
    },
    jurkat_clean: {
        id: 'jurkat_clean',
        name: '洁癖无抗单',
        cellType: 'jurkat',
        taskType: 'expand',
        tier: 'T2',
        modifiers: ['clean'],
        unitsRange: [1, 1],
        qualityRange: [70, 80],
        deadlineRange: [480, 660],
        baseReward: { gold: 420, exp: 42 },
        unlockLevel: 8
    },

    // ========== T3 HUVEC 任务 ==========
    huvec_gf: {
        id: 'huvec_gf',
        name: '生长因子必需单',
        cellType: 'huvec',
        taskType: 'expand',
        tier: 'T3',
        unitsRange: [1, 2],
        qualityRange: [70, 80],
        deadlineRange: [720, 960],
        baseReward: { gold: 700, exp: 70 },
        constraints: ['require_gf_pack'],
        unlockLevel: 10
    },
    huvec_coating: {
        id: 'huvec_coating',
        name: '涂层规范单',
        cellType: 'huvec',
        taskType: 'expand',
        tier: 'T3',
        unitsRange: [1, 1],
        qualityRange: [75, 85],
        deadlineRange: [840, 1080],
        baseReward: { gold: 800, exp: 80 },
        constraints: ['require_coating_pack'],
        unlockLevel: 11
    },
    huvec_premium: {
        id: 'huvec_premium',
        name: '洁癖高端单',
        cellType: 'huvec',
        taskType: 'expand',
        tier: 'T3',
        modifiers: ['clean', 'qc_only'],
        unitsRange: [1, 1],
        qualityRange: [80, 90],
        deadlineRange: [900, 1200],
        baseReward: { gold: 1200, exp: 120 },
        unlockLevel: 13
    },

    // ========== T3 原代Fib 任务 ==========
    fib_long: {
        id: 'fib_long',
        name: '长期扩增单',
        cellType: 'primary_fib',
        taskType: 'expand',
        tier: 'T3',
        unitsRange: [1, 2],
        qualityRange: [65, 75],
        deadlineRange: [840, 1200],
        baseReward: { gold: 900, exp: 90 },
        unlockLevel: 13
    },
    fib_stable: {
        id: 'fib_stable',
        name: '稳态维持单',
        cellType: 'primary_fib',
        taskType: 'maintain',
        tier: 'T3',
        unitsRange: [1, 1],
        qualityRange: [70, 80],
        deadlineRange: [960, 1320],
        baseReward: { gold: 1000, exp: 100 },
        constraints: ['zero_contamination'],
        unlockLevel: 14
    },

    // ========== T4 类器官 任务 ==========
    organoid_standard: {
        id: 'organoid_standard',
        name: '3D标准交付单',
        cellType: 'organoid',
        taskType: 'expand',
        tier: 'T4',
        unitsRange: [2, 4],
        qualityRange: [70, 80],
        deadlineRange: [1200, 1800],
        baseReward: { gold: 3000, exp: 300 },
        constraints: ['require_matrigel', 'require_organoid_media'],
        unlockLevel: 19
    },
    organoid_qc: {
        id: 'organoid_qc',
        name: 'QC高端单',
        cellType: 'organoid',
        taskType: 'expand',
        tier: 'T4',
        modifiers: ['qc_only'],
        unitsRange: [2, 3],
        qualityRange: [85, 95],
        deadlineRange: [1440, 2100],
        baseReward: { gold: 5000, exp: 500 },
        unlockLevel: 22
    },
    organoid_rush: {
        id: 'organoid_rush',
        name: '高风险加急单',
        cellType: 'organoid',
        taskType: 'expand',
        tier: 'T4',
        modifiers: ['urgent', 'sensitive'],
        unitsRange: [2, 2],
        qualityRange: [75, 85],
        deadlineRange: [900, 1200],
        baseReward: { gold: 6000, exp: 600, goldenChance: 0.15 },
        unlockLevel: 25
    },

    // ========== 复合任务（需要多种细胞组合） ==========
    combo_beginner: {
        id: 'combo_beginner',
        name: '细胞组合包·入门',
        taskType: 'combo',
        tier: 'T1',
        isCombo: true,
        requirements: [
            { cellType: 'hek293t', units: 1, quality: 55 },
            { cellType: 'hela', units: 1, quality: 55 }
        ],
        deadlineRange: [600, 900],
        baseReward: { gold: 300, exp: 30 },
        unlockLevel: 2,
        description: '需要同时交付HEK293T和HeLa各1个'
    },
    combo_trio: {
        id: 'combo_trio',
        name: '三合一套餐',
        taskType: 'combo',
        tier: 'T1',
        isCombo: true,
        requirements: [
            { cellType: 'hek293t', units: 1, quality: 60 },
            { cellType: 'hela', units: 1, quality: 60 },
            { cellType: 'a549', units: 1, quality: 60 }
        ],
        deadlineRange: [900, 1200],
        baseReward: { gold: 500, exp: 50 },
        unlockLevel: 3,
        description: '需要同时交付三种T1细胞'
    },
    combo_immune_pack: {
        id: 'combo_immune_pack',
        name: '免疫细胞套装',
        taskType: 'combo',
        tier: 'T2',
        isCombo: true,
        requirements: [
            { cellType: 'thp1', units: 1, quality: 65 },
            { cellType: 'jurkat', units: 1, quality: 65 }
        ],
        deadlineRange: [720, 1080],
        baseReward: { gold: 650, exp: 65 },
        unlockLevel: 7,
        description: '需要同时交付THP-1和Jurkat'
    },
    combo_cancer_panel: {
        id: 'combo_cancer_panel',
        name: '肿瘤细胞检测板',
        taskType: 'combo',
        tier: 'T2',
        isCombo: true,
        modifiers: ['qc_only'],
        requirements: [
            { cellType: 'hela', units: 2, quality: 70 },
            { cellType: 'a549', units: 2, quality: 70 },
            { cellType: 'mcf7', units: 1, quality: 70 }
        ],
        deadlineRange: [1080, 1440],
        baseReward: { gold: 1200, exp: 120 },
        unlockLevel: 5,
        description: '肿瘤研究用细胞组合包'
    },
    combo_premium_research: {
        id: 'combo_premium_research',
        name: '高端研究套装',
        taskType: 'combo',
        tier: 'T3',
        isCombo: true,
        modifiers: ['clean'],
        requirements: [
            { cellType: 'huvec', units: 1, quality: 75 },
            { cellType: 'primary_fib', units: 1, quality: 70 }
        ],
        deadlineRange: [1200, 1800],
        baseReward: { gold: 1800, exp: 180 },
        unlockLevel: 13,
        description: '原代和内皮细胞高端组合'
    },
    combo_full_spectrum: {
        id: 'combo_full_spectrum',
        name: '全谱系细胞库',
        taskType: 'combo',
        tier: 'T3',
        isCombo: true,
        requirements: [
            { cellType: 'hek293t', units: 2, quality: 65 },
            { cellType: 'hela', units: 2, quality: 65 },
            { cellType: 'thp1', units: 1, quality: 70 },
            { cellType: 'huvec', units: 1, quality: 75 }
        ],
        deadlineRange: [1800, 2400],
        baseReward: { gold: 2500, exp: 250, goldenChance: 0.10 },
        unlockLevel: 11,
        description: '多细胞系全覆盖订单'
    }
};

// ==================== 随机事件 ====================
const RANDOM_EVENTS = [
    // 负面事件
    {
        id: 'power_outage',
        name: '停电事故',
        type: 'negative',
        description: 'CO2培养箱短暂停电，所有细胞生长暂停30秒',
        effect: { type: 'pause_growth', duration: 30 },
        chance: 0.005
    },
    {
        id: 'contamination_outbreak',
        name: '污染爆发',
        type: 'negative',
        description: '隔壁实验室污染蔓延，所有细胞污染概率临时翻倍',
        effect: { type: 'contamination_boost', value: 2, duration: 60 },
        chance: 0.003
    },
    {
        id: 'equipment_failure',
        name: '设备故障',
        type: 'negative',
        description: '培养箱故障，随机一个细胞品质-10',
        effect: { type: 'quality_drop', value: -10 },
        chance: 0.008
    },
    {
        id: 'reagent_expired',
        name: '试剂过期',
        type: 'negative',
        description: '发现一瓶试剂过期了',
        effect: { type: 'lose_item', items: ['consumables'] },
        chance: 0.01
    },
    {
        id: 'mentor_pressure',
        name: '导师催进度',
        type: 'negative',
        description: '导师说这周要出结果...',
        effect: { type: 'deadline_reduce', value: 0.8 },
        chance: 0.015
    },
    // 正面事件
    {
        id: 'lucky_day',
        name: '幸运日',
        type: 'positive',
        description: '今天手气不错，黄金珠掉落率翻倍！',
        effect: { type: 'golden_boost', value: 2, duration: 120 },
        chance: 0.015
    },
    {
        id: 'lab_inspection',
        name: '导师心情好',
        type: 'positive',
        description: '导师发了bonus，奖励经费+500！',
        effect: { type: 'gold_bonus', value: 500 },
        chance: 0.01
    },
    {
        id: 'equipment_upgrade',
        name: '学校设备更新',
        type: 'positive',
        description: '实验室新装备到货，效率提升10%',
        effect: { type: 'efficiency_boost', value: 1.1, duration: 180 },
        chance: 0.008
    },
    {
        id: 'clean_day',
        name: '实验室大扫除',
        type: 'positive',
        description: '大扫除后环境改善，污染率降低',
        effect: { type: 'contamination_reduce', value: 0.7, duration: 120 },
        chance: 0.012
    },
    // 特殊事件
    {
        id: 'cell_mutation',
        name: '细胞突变',
        type: 'special',
        description: '细胞发生突变，可能变好可能变差...',
        effect: { type: 'mutation', range: [-15, 20] },
        chance: 0.002
    },
    {
        id: 'mysterious_visitor',
        name: '神秘访客',
        type: 'special',
        description: '一位神秘学者来访，赠送了稀有道具',
        effect: { type: 'rare_item' },
        chance: 0.001
    }
];

// 导出数据
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CELL_TYPES, SHOP_ITEMS, TASK_TEMPLATES, TASK_MODIFIERS, RANDOM_EVENTS };
}
