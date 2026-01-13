/**
 * 细胞主理人 - 游戏配置 V2.0
 */

const CONFIG = {
    // 游戏版本
    VERSION: '2.0.0',

    // 游戏基础设置
    GAME: {
        TICK_INTERVAL: 1000,
        SAVE_INTERVAL: 30000,
        TIME_SCALE: 60,  // 1现实秒 = 60游戏秒
    },

    // 四种开局模式配置
    GAME_MODES: {
        rich: {
            id: 'rich',
            name: '大户圈养组',
            icon: '🏛️',
            initialGold: 5000,
            initialSlots: 7,
            taskIntensity: 1.5,
            successRateBonus: 0.15,
            contaminationRate: 1.0,
            eventFrequency: 2.0,  // 变态级意外
            description: '资源充沛，但导师要求极高，意外事件频发'
        },
        medium: {
            id: 'medium',
            name: '中户散养组',
            icon: '🏢',
            initialGold: 2000,
            initialSlots: 5,
            taskIntensity: 1.0,
            successRateBonus: 0,
            contaminationRate: 1.0,
            eventFrequency: 1.0,
            description: '资源适中，压力适中，适合新手'
        },
        small: {
            id: 'small',
            name: '小户放养组',
            icon: '🏠',
            initialGold: 800,
            initialSlots: 4,
            taskIntensity: 0.7,
            successRateBonus: -0.1,
            contaminationRate: 1.2,
            eventFrequency: 0.5,
            description: '经费紧张，但压力小，细胞容易污染'
        },
        poor: {
            id: 'poor',
            name: '穷困潦倒组',
            icon: '🏚️',
            initialGold: 300,
            initialSlots: 2,
            taskIntensity: 0.3,
            successRateBonus: -0.2,
            contaminationRate: 1.1,
            eventFrequency: 0.2,
            description: '一穷二白，极限生存挑战'
        }
    },

    // 等级系统（单星制）
    LEVELS: [
        { level: 1, name: '胞之者', stars: 1, exp: 0, unlocks: [] },
        { level: 2, name: '胞之者', stars: 1, exp: 100, unlocks: [] },
        { level: 3, name: '胞师', stars: 1, exp: 250, unlocks: ['cell_cho'] },
        { level: 4, name: '胞师', stars: 1, exp: 500, unlocks: ['passage_3'] },
        { level: 5, name: '大胞师', stars: 1, exp: 850, unlocks: [] },
        { level: 6, name: '大胞师', stars: 1, exp: 1300, unlocks: ['cell_vero'] },
        { level: 7, name: '胞灵', stars: 1, exp: 2000, unlocks: ['project_system', 'passage_4'] },
        { level: 8, name: '胞灵', stars: 1, exp: 3000, unlocks: [] },
        { level: 9, name: '胞王', stars: 1, exp: 4500, unlocks: ['cell_ips'] },
        { level: 10, name: '胞王', stars: 1, exp: 6500, unlocks: ['project_province'] },
        { level: 11, name: '胞皇', stars: 1, exp: 9000, unlocks: [] },
        { level: 12, name: '胞皇', stars: 1, exp: 12500, unlocks: [] },
        { level: 13, name: '胞宗', stars: 1, exp: 17000, unlocks: ['cell_neuron', 'project_national_youth'] },
        { level: 14, name: '胞宗', stars: 1, exp: 23000, unlocks: [] },
        { level: 15, name: '胞尊', stars: 1, exp: 32000, unlocks: [] },
        { level: 16, name: '胞尊', stars: 1, exp: 45000, unlocks: ['project_national'] },
        { level: 17, name: '胞圣', stars: 1, exp: 65000, unlocks: [] },
        { level: 18, name: '胞圣', stars: 1, exp: 95000, unlocks: ['cell_organoid'] },
        { level: 19, name: '胞帝', stars: 1, exp: 140000, unlocks: ['project_key'] },
        { level: 20, name: '胞帝', stars: 1, exp: 200000, unlocks: ['cell_car_t'] },
    ],

    // 培养箱
    INCUBATOR: {
        MAX_SLOTS: 20,
        SLOT_UNLOCK_COSTS: [
            0, 0, 0, 0, 0, 0, 0,  // 前7个根据模式免费
            1000, 1500, 2000,     // 8-10
            3000, 4000, 5000,     // 11-13
            8000, 10000, 15000,   // 14-16
            25000, 40000, 60000, 100000  // 17-20
        ],
        BASE_CONTAMINATION_CHANCE: 0.015,
    },

    // 细胞培养
    CELL: {
        GROWTH_VARIANCE: 0.25,
        GOLDEN_PEARL_CHANCE: 0.05,
        GOLDEN_PEARL_VALUE: 1000,
    },

    // 传代配置
    PASSAGE: {
        MAX_RATIO: {
            1: 2,  // 默认1传2
            4: 3,  // 胞师可以1传3
            7: 4,  // 大胞师可以1传4
        },
        SUCCESS_RATE: {
            2: 0.95,
            3: 0.80,
            4: 0.65,
        },
        CONTAMINATION_RISK: {
            2: 0.02,
            3: 0.05,
            4: 0.10,
        }
    },

    // 破产阈值
    BANKRUPTCY: {
        MIN_TASK_COST: 50,  // 最低任务所需经费
    },

    // 命运台词
    FATE_DIALOGUES: {
        intro: [
            "你满怀期待地来到实验室...",
            "准备开始你的细胞培养之旅..."
        ],
        chosen: "你期待的是「{chosen}」",
        but: "但是...",
        assigned: "你被分配到了「{assigned}」",
        reactions: {
            same: [
                "命运对你还算仁慈...",
                "至少这一次，你如愿以偿了。"
            ],
            different: [
                "人生就是这样...",
                "选择权从来不在你手上。",
                "但既然来了...",
                "就接受这个现实吧。"
            ],
            worse: [
                "比想象中更糟糕...",
                "但这就是科研的常态。",
                "适应它，或者被它打败。"
            ]
        },
        final: "准备好了吗？"
    },

    // NPC台词库
    NPC_DIALOGUES: {
        idle: [
            "又是被细胞支配的一天...",
            "培养基的味道，闻着闻着就习惯了",
            "今天的细胞会不会污染呢...",
            "导师说这周要出结果...",
            "隔壁实验室又发Nature了...",
            "细胞我日你先人!!!",
            "什么时候才能毕业啊...",
            "今天的实验一定会顺利的..吧？",
            "早知道去学计算机了...",
            "这培养箱怎么又响了...",
            "血清又要用完了...",
            "paper还差一个实验...",
            "组会又要被骂了...",
            "好人就得被人拿枪指着？",
            "枪头盒又空了...",
            "离心机在转的时候最安心",
            "显微镜下的世界真美...",
            "这细胞密度不太对劲...",
            "液氮罐该加液氮了",
            "师兄/师姐的课题还没结题...",
            "实验记录本又忘记写了",
            "这个protocol谁写的？",
            "reviewer让我重做实验...",
            "PCR又failed了...",
            "Western跑得乱七八糟的",
            "导师让我改PPT...",
            "科研使我快乐（假的）"
        ],
        cellReady: [
            "哦！细胞长好了！",
            "终于有个好消息了！",
            "这波稳了！",
            "细胞状态不错嘛！",
            "漂亮！可以收了！",
            "密度刚刚好！"
        ],
        contamination: [
            "完了完了完了...",
            "谁动了我的超净台！",
            "这个月第几次污染了...",
            "我的细胞啊啊啊!!!",
            "又要重新养了...",
            "污染了...想哭...",
            "是霉菌还是细菌？",
            "支原体检测一下吧...",
            "这瓶培养基有问题吗？",
            "隔壁是不是又没开紫外"
        ],
        levelUp: [
            "升级了！感觉自己又行了！",
            "离毕业又近了一步！",
            "努力没有白费！",
            "我是不是要逆天了？",
            "导师都夸我了！",
            "感觉自己是天选之人"
        ],
        bankruptcy: [
            "实验室要关门了吗...",
            "早知道去转码了...",
            "这就是科研的尽头吗...",
            "经费...没了...",
            "导师会杀了我的...",
            "回家种地去吧...",
            "延毕警告..."
        ],
        taskComplete: [
            "任务完成！奖励到手！",
            "又赚了一笔！",
            "导师应该会满意吧...",
            "可以喘口气了",
            "今天的我太优秀了！",
            "课题经费到账~"
        ],
        taskFailed: [
            "任务失败了...",
            "deadline错过了...",
            "甲方要骂人了...",
            "这单亏大了..."
        ],
        passage: [
            "传代走起！",
            "胰酶先预热一下",
            "消化得差不多了",
            "吹打要温柔点..."
        ],
        shopping: [
            "又要花钱了...",
            "经费在燃烧",
            "耗材真贵啊",
            "打折的时候囤点货"
        ]
    }
};

Object.freeze(CONFIG);
