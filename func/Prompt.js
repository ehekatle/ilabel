// func/Prompt.js
// 根据liveinfo信息的result和config显示单子类型的浮动提示

(function (iLabel) {
    'use strict';

    let promptElement = null;
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    // 类型显示名称映射
    const TYPE_NAME_MAP = {
        targeted: '点杀',
        prefilled: '预埋',
        exempted: '豁免',
        review: '复核',
        penalty: '违规',
        note: '备注',
        complaint: '投诉',
        normal: '普通'
    };

    /**
     * 创建提示元素
     */
    function createPrompt(types) {
        // 移除旧提示
        if (promptElement) {
            promptElement.remove();
        }

        const config = iLabel.Config.get();
        const userConfig = config.userConfig;
        const position = userConfig.popupPosition || { x: '50%', y: '50%' };
        const size = userConfig.popupSize / 100; // 转换为倍数
        const arrange = userConfig.popupArrange;

        // 创建容器
        promptElement = document.createElement('div');
        promptElement.id = 'ilabel-prompt';
        promptElement.className = `ilabel-prompt-container ${arrange} ilabel-draggable`;
        promptElement.style.cssText = `
            left: ${position.x};
            top: ${position.y};
            transform: translate(-50%, -50%) scale(${size});
            transform-origin: center;
        `;

        // 添加每个类型
        types.forEach(type => {
            const color = iLabel.Config.getColorForType(type);
            const item = document.createElement('div');
            item.className = 'ilabel-prompt-item';
            item.style.backgroundColor = color.bg;
            item.style.border = `1px solid ${color.border}`;
            item.style.color = 'white'; // 固定白色文字
            item.textContent = TYPE_NAME_MAP[type] || type;
            promptElement.appendChild(item);
        });

        document.body.appendChild(promptElement);

        // 添加拖动功能
        makeDraggable(promptElement);
    }

    /**
     * 使元素可拖动
     */
    function makeDraggable(element) {
        element.addEventListener('mousedown', startDrag);
        element.addEventListener('mouseup', stopDrag);
        element.addEventListener('mousemove', drag);
        element.addEventListener('mouseleave', stopDrag);
    }

    function startDrag(e) {
        isDragging = true;
        const rect = promptElement.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
        promptElement.style.cursor = 'grabbing';
        promptElement.style.transition = 'none';
    }

    function stopDrag() {
        if (!isDragging) return;
        isDragging = false;
        promptElement.style.cursor = 'move';
        promptElement.style.transition = '';

        // 保存位置
        const rect = promptElement.getBoundingClientRect();
        const x = (rect.left / window.innerWidth * 100).toFixed(2) + '%';
        const y = (rect.top / window.innerHeight * 100).toFixed(2) + '%';

        iLabel.Config.updateUser({
            popupPosition: { x, y }
        });
    }

    function drag(e) {
        if (!isDragging) return;
        e.preventDefault();

        const left = e.clientX - dragOffsetX;
        const top = e.clientY - dragOffsetY;

        // 边界限制
        const maxLeft = window.innerWidth - promptElement.offsetWidth;
        const maxTop = window.innerHeight - promptElement.offsetHeight;

        promptElement.style.left = Math.max(0, Math.min(left, maxLeft)) + 'px';
        promptElement.style.top = Math.max(0, Math.min(top, maxTop)) + 'px';
        promptElement.style.transform = `scale(${iLabel.Config.get().userConfig.popupSize / 100})`;
    }

    /**
     * 更新提示
     */
    function updatePrompt() {
        const data = iLabel.currentData;
        if (!data) return;

        const promptTypes = data.getPromptTypes();

        if (promptTypes.length > 0) {
            createPrompt(promptTypes);

            // 触发推送准备
            window.dispatchEvent(new CustomEvent('ilabel:promptShown', {
                detail: promptTypes
            }));
        } else if (promptElement) {
            promptElement.remove();
            promptElement = null;
        }
    }

    /**
     * 监听配置变化，更新提示样式
     */
    function onConfigChanged() {
        if (!promptElement) return;

        const config = iLabel.Config.get();
        const userConfig = config.userConfig;

        // 更新排列方式
        promptElement.className = `ilabel-prompt-container ${userConfig.popupArrange} ilabel-draggable`;

        // 更新缩放
        promptElement.style.transform = `translate(-50%, -50%) scale(${userConfig.popupSize / 100})`;
    }

    /**
     * 初始化
     */
    function init() {
        window.addEventListener('ilabel:resultUpdated', updatePrompt);
        window.addEventListener('ilabel:configChanged', onConfigChanged);

        console.log('Prompt.js 加载完成，浮动提示已就绪');
    }

    // 等待所有模块加载完成后初始化
    window.addEventListener('ilabel:allModulesLoaded', init);

})(window.iLabel || (window.iLabel = {}));