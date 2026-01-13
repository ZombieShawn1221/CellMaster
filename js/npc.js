/**
 * 细胞主理人 - NPC系统
 */

class NPC {
    constructor() {
        this.element = document.getElementById('npc-character');
        this.dialogueElement = document.getElementById('npc-dialogue');
        this.container = document.getElementById('npc-container');

        this.state = 'idle';
        this.dialogueTimer = null;
        this.walkTimer = null;
        this.isDialogueVisible = false;

        this.init();
    }

    init() {
        // 点击NPC显示随机台词
        if (this.element) {
            this.element.addEventListener('click', () => {
                this.sayRandom('idle');
            });
        }

        // 开始随机说话
        this.startRandomDialogue();
    }

    /**
     * 说一句话
     * @param {string} text 对话内容
     * @param {number} duration 显示时长（毫秒）
     * @param {string} style 气泡样式：'normal', 'success', 'warning', 'danger'
     */
    say(text, duration = 3000, style = 'normal') {
        if (!this.dialogueElement) return;

        // 清除之前的样式类
        this.dialogueElement.classList.remove('show', 'success', 'warning', 'danger');

        this.dialogueElement.textContent = text;

        // 添加样式类
        if (style !== 'normal') {
            this.dialogueElement.classList.add(style);
        }

        this.dialogueElement.classList.add('show');
        this.isDialogueVisible = true;

        // 清除之前的定时器
        if (this.dialogueTimer) {
            clearTimeout(this.dialogueTimer);
        }

        // 设置消失定时器
        this.dialogueTimer = setTimeout(() => {
            this.hideDialogue();
        }, duration);
    }

    /**
     * 隐藏对话
     */
    hideDialogue() {
        if (this.dialogueElement) {
            this.dialogueElement.classList.remove('show', 'success', 'warning', 'danger');
            this.isDialogueVisible = false;
        }
    }

    /**
     * 随机说一句话（按类型）
     * @param {string} type 对话类型
     * @param {string} style 气泡样式
     */
    sayRandom(type = 'idle', style = 'normal') {
        const dialogues = CONFIG.NPC_DIALOGUES[type];
        if (!dialogues || dialogues.length === 0) return;

        const text = Utils.randomChoice(dialogues);
        this.say(text, 3000, style);
    }

    /**
     * 开始随机说话循环
     */
    startRandomDialogue() {
        const scheduleNext = () => {
            const delay = Utils.randomInt(15000, 45000); // 15-45秒随机说话
            this.walkTimer = setTimeout(() => {
                if (!this.isDialogueVisible) {
                    this.sayRandom('idle');
                }
                scheduleNext();
            }, delay);
        };

        scheduleNext();
    }

    /**
     * 停止随机说话
     */
    stopRandomDialogue() {
        if (this.walkTimer) {
            clearTimeout(this.walkTimer);
            this.walkTimer = null;
        }
    }

    /**
     * 触发特定事件的台词（带样式）
     */
    react(event) {
        switch (event) {
            case 'cellReady':
                this.sayRandom('cellReady', 'success');
                this.setState('happy');
                break;
            case 'contamination':
                this.sayRandom('contamination', 'danger');
                this.setState('shocked');
                break;
            case 'levelUp':
                this.sayRandom('levelUp', 'success');
                this.setState('happy');
                break;
            case 'bankruptcy':
                this.sayRandom('bankruptcy', 'danger');
                this.setState('sad');
                break;
            case 'taskComplete':
                this.sayRandom('taskComplete', 'success');
                this.setState('happy');
                break;
            case 'taskFailed':
                this.sayRandom('taskFailed', 'warning');
                this.setState('sad');
                break;
            case 'passage':
                this.sayRandom('passage', 'normal');
                break;
            default:
                this.sayRandom('idle', 'normal');
        }
    }

    /**
     * 设置NPC状态
     */
    setState(state) {
        this.state = state;

        // 可以根据状态改变NPC表情
        const sprite = this.element?.querySelector('.npc-sprite');
        if (sprite) {
            switch (state) {
                case 'happy':
                    sprite.textContent = '😊';
                    break;
                case 'sad':
                    sprite.textContent = '😢';
                    break;
                case 'angry':
                    sprite.textContent = '😤';
                    break;
                case 'shocked':
                    sprite.textContent = '😱';
                    break;
                default:
                    sprite.textContent = '🧑‍🔬';
            }

            // 3秒后恢复默认
            setTimeout(() => {
                sprite.textContent = '🧑‍🔬';
            }, 3000);
        }
    }

    /**
     * 销毁
     */
    destroy() {
        this.stopRandomDialogue();
        if (this.dialogueTimer) {
            clearTimeout(this.dialogueTimer);
        }
    }
}
