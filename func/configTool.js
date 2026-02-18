// 配置工具模块
(function (context) {
    'use strict';

    const { state, STORAGE_KEYS, DEFAULT_USER_CONFIG, utils } = context;

    // 类型名称映射
    const TYPE_NAMES = {
        targeted: '点杀',
        prefilled: '预埋',
        exempted: '豁免',
        review: '复核',
        penalty: '违规',
        note: '备注',
        complaint: '投诉',
        normal: '普通'
    };

    // 类型颜色映射
    const TYPE_COLORS = {
        targeted: '#000000',
        prefilled: '#f44336',
        exempted: '#4caf50',
        review: '#2196f3',
        note: '#90caf9',
        penalty: '#ff9800',
        complaint: '#9e9e9e',
        normal: '#9e9e9e'
    };

    let vueApp = null;
    let toolContainer = null;
    let menuCommandId = null;

    // 注册菜单命令
    function registerMenuCommand() {
        // 如果已经注册，先移除
        if (menuCommandId !== null) {
            try {
                GM_registerMenuCommand('', function () { }, { autoClose: false });
            } catch (e) {
                // 忽略错误
            }
        }

        // 注册新的菜单命令
        menuCommandId = GM_registerMenuCommand('⚙️ iLabel配置工具', () => {
            openConfigTool();
        });

        console.log('配置工具菜单命令已注册');
    }

    // 打开配置工具
    function openConfigTool() {
        // 如果已存在，显示并刷新数据
        if (vueApp && toolContainer) {
            // 刷新Vue数据
            vueApp.selectedTypes = [...state.userConfig.promptType];
            vueApp.arrange = state.userConfig.promptArrange;
            vueApp.size = state.userConfig.promptSize;
            vueApp.alarmRing = state.userConfig.alarmRing;

            toolContainer.style.display = 'block';
            return;
        }

        // 创建配置工具UI
        createToolUI();
    }

    // 关闭配置工具
    function closeConfigTool() {
        if (toolContainer) {
            toolContainer.style.display = 'none';
            // 关闭提示预览
            utils.closePrompt();
        }
    }

    // 创建配置工具UI
    function createToolUI() {
        // 创建容器
        toolContainer = document.createElement('div');
        toolContainer.id = 'ilabel-config-tool';
        toolContainer.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 550px;
            max-width: 90vw;
            max-height: 90vh;
            overflow-y: auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.3);
            z-index: 1000001;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            display: none;
        `;
        document.body.appendChild(toolContainer);

        // 添加遮罩层
        const overlay = document.createElement('div');
        overlay.id = 'ilabel-config-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 1000000;
            display: none;
        `;
        overlay.addEventListener('click', closeConfigTool);
        document.body.appendChild(overlay);

        // 引入Vue
        const vueScript = document.createElement('script');
        vueScript.src = 'https://cdn.jsdelivr.net/npm/vue@2/dist/vue.js';
        vueScript.onload = initVueApp;
        vueScript.onerror = function () {
            console.error('Vue加载失败，使用原生JS降级');
            createFallbackUI();
        };
        document.head.appendChild(vueScript);
    }

    // 创建降级UI（Vue加载失败时使用）
    function createFallbackUI() {
        toolContainer.innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <h3 style="margin-top: 0; color: #f44336;">加载失败</h3>
                <p>Vue框架加载失败，请刷新页面重试。</p>
                <button onclick="document.getElementById('ilabel-config-tool').style.display='none'; document.getElementById('ilabel-config-overlay').style.display='none';" 
                        style="padding: 8px 16px; background: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    关闭
                </button>
            </div>
        `;

        toolContainer.style.display = 'block';
        document.getElementById('ilabel-config-overlay').style.display = 'block';
    }

    // 初始化Vue应用
    function initVueApp() {
        const template = `
            <div class="config-tool-container">
                <div class="config-tool-header">
                    <h3>iLabel辅助工具配置</h3>
                    <button @click="closeTool" class="close-btn">×</button>
                </div>
                
                <div class="config-tool-body">
                    <!-- 提示类型多选 -->
                    <div class="config-section">
                        <label class="section-label">提示类型：</label>
                        <div class="checkbox-group">
                            <div v-for="(name, type) in typeNames" :key="type" class="checkbox-item">
                                <input 
                                    type="checkbox" 
                                    :id="'type-' + type" 
                                    :value="type"
                                    v-model="selectedTypes"
                                    @change="updatePromptPreview"
                                >
                                <label :for="'type-' + type" :style="{ color: typeColors[type] }">
                                    {{ name }}
                                </label>
                            </div>
                        </div>
                        <div class="section-tip">勾选的类型才会显示提示</div>
                    </div>
                    
                    <!-- 提示排列方式 -->
                    <div class="config-section">
                        <label class="section-label">提示排列方式：</label>
                        <div class="radio-group">
                            <label class="radio-item">
                                <input type="radio" value="horizontal" v-model="arrange" @change="updatePromptPreview">
                                横向
                            </label>
                            <label class="radio-item">
                                <input type="radio" value="vertical" v-model="arrange" @change="updatePromptPreview">
                                纵向
                            </label>
                        </div>
                    </div>
                    
                    <!-- 提示缩放比例 -->
                    <div class="config-section">
                        <label class="section-label">提示缩放比例 ({{ size }}%)：</label>
                        <div class="slider-container">
                            <input 
                                type="range" 
                                min="20" 
                                max="200" 
                                step="5"
                                v-model.number="size"
                                @input="updatePromptPreview"
                                class="slider-input"
                            >
                            <input 
                                type="number" 
                                min="20" 
                                max="200" 
                                step="5"
                                v-model.number="size"
                                @change="updatePromptPreview"
                                class="size-input"
                            >
                        </div>
                    </div>
                    
                    <!-- 闹钟开关 -->
                    <div class="config-section">
                        <label class="section-label">闹钟开关：</label>
                        <div class="switch-container">
                            <label class="switch">
                                <input type="checkbox" v-model="alarmRing" @change="onAlarmChange">
                                <span class="slider"></span>
                            </label>
                            <button @click="playTestAlarm" class="test-btn" :disabled="!alarmRing">
                                🔊 测试闹钟（3秒）
                            </button>
                        </div>
                        <div class="section-tip">开启后，未确认的提示会每20秒播放一次提醒</div>
                    </div>
                    
                    <!-- 预览区域 -->
                    <div class="preview-section">
                        <label class="section-label">实时预览：</label>
                        <div class="preview-container" :style="{ justifyContent: arrange === 'horizontal' ? 'flex-start' : 'center' }">
                            <div 
                                class="preview-wrapper"
                                :class="{ 'vertical': arrange === 'vertical' }"
                                :style="{ transform: 'scale(' + size/100 + ')' }"
                            >
                                <div 
                                    v-for="type in previewTypes" 
                                    :key="type"
                                    class="preview-item"
                                    :style="{ backgroundColor: typeColors[type] }"
                                >
                                    {{ typeNames[type] }}
                                </div>
                                <div 
                                    class="preview-item confirm-btn"
                                    :style="{ backgroundColor: confirmColor, color: confirmTextColor }"
                                >
                                    确认
                                </div>
                            </div>
                        </div>
                        <div class="preview-tip">拖动下方滑块可实时查看效果</div>
                    </div>
                </div>
                
                <div class="config-tool-footer">
                    <button @click="resetConfig" class="reset-btn">重置默认</button>
                    <button @click="saveConfig" class="save-btn">保存配置</button>
                    <button @click="updateRemoteConfig" class="update-btn">更新远程配置</button>
                </div>
            </div>
        `;

        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .config-tool-container {
                padding: 24px;
            }
            .config-tool-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 2px solid #f0f0f0;
            }
            .config-tool-header h3 {
                margin: 0;
                color: #333;
                font-size: 18px;
                font-weight: 600;
            }
            .close-btn {
                background: none;
                border: none;
                font-size: 28px;
                cursor: pointer;
                color: #999;
                line-height: 1;
                padding: 0 8px;
                transition: color 0.2s;
            }
            .close-btn:hover {
                color: #333;
            }
            .config-section {
                margin-bottom: 25px;
                padding-bottom: 15px;
                border-bottom: 1px dashed #eee;
            }
            .config-section:last-of-type {
                border-bottom: none;
            }
            .section-label {
                display: block;
                margin-bottom: 12px;
                font-weight: 600;
                color: #444;
                font-size: 14px;
            }
            .section-tip {
                margin-top: 6px;
                font-size: 12px;
                color: #999;
            }
            .checkbox-group {
                display: flex;
                flex-wrap: wrap;
                gap: 12px 20px;
                background: #f9f9f9;
                padding: 15px;
                border-radius: 8px;
            }
            .checkbox-item {
                display: flex;
                align-items: center;
                gap: 6px;
                min-width: 60px;
            }
            .checkbox-item input[type="checkbox"] {
                margin: 0;
                width: 16px;
                height: 16px;
                cursor: pointer;
            }
            .checkbox-item label {
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
            }
            .radio-group {
                display: flex;
                gap: 20px;
                background: #f9f9f9;
                padding: 12px 15px;
                border-radius: 8px;
            }
            .radio-item {
                display: flex;
                align-items: center;
                gap: 6px;
                cursor: pointer;
                font-size: 14px;
            }
            .slider-container {
                display: flex;
                align-items: center;
                gap: 15px;
                background: #f9f9f9;
                padding: 12px 15px;
                border-radius: 8px;
            }
            .slider-input {
                flex: 1;
                height: 6px;
                -webkit-appearance: none;
                background: #ddd;
                border-radius: 3px;
                outline: none;
            }
            .slider-input::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 18px;
                height: 18px;
                background: #2196f3;
                border-radius: 50%;
                cursor: pointer;
                box-shadow: 0 2px 6px rgba(33,150,243,0.3);
            }
            .size-input {
                width: 70px;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 6px;
                text-align: center;
                font-size: 14px;
            }
            .switch-container {
                display: flex;
                align-items: center;
                gap: 15px;
                background: #f9f9f9;
                padding: 12px 15px;
                border-radius: 8px;
            }
            .switch {
                position: relative;
                display: inline-block;
                width: 52px;
                height: 26px;
            }
            .switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }
            .slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: #ccc;
                transition: .3s;
                border-radius: 26px;
            }
            .slider:before {
                position: absolute;
                content: "";
                height: 20px;
                width: 20px;
                left: 3px;
                bottom: 3px;
                background-color: white;
                transition: .3s;
                border-radius: 50%;
            }
            input:checked + .slider {
                background-color: #4caf50;
            }
            input:checked + .slider:before {
                transform: translateX(26px);
            }
            .test-btn {
                padding: 8px 16px;
                background: #2196f3;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 500;
                transition: background 0.2s;
            }
            .test-btn:hover:not(:disabled) {
                background: #1976d2;
            }
            .test-btn:disabled {
                background: #ccc;
                cursor: not-allowed;
            }
            .preview-section {
                margin-top: 20px;
                padding: 20px;
                background: #f5f5f5;
                border-radius: 10px;
            }
            .preview-container {
                min-height: 100px;
                display: flex;
                align-items: center;
                margin: 15px 0 10px;
                background: white;
                border-radius: 8px;
                padding: 20px;
                box-shadow: inset 0 2px 6px rgba(0,0,0,0.05);
            }
            .preview-wrapper {
                display: flex;
                gap: 10px;
                transform-origin: left center;
                transition: transform 0.1s;
            }
            .preview-wrapper.vertical {
                flex-direction: column;
            }
            .preview-item {
                padding: 8px 16px;
                border-radius: 6px;
                color: white;
                font-size: 13px;
                font-weight: 500;
                white-space: nowrap;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .preview-item.confirm-btn {
                background-color: white;
                color: #333;
                border: 1px solid #ddd;
                cursor: default;
            }
            .preview-tip {
                font-size: 12px;
                color: #888;
                text-align: center;
                margin-top: 8px;
            }
            .config-tool-footer {
                display: flex;
                justify-content: flex-end;
                gap: 12px;
                margin-top: 25px;
                padding-top: 15px;
                border-top: 2px solid #f0f0f0;
            }
            .config-tool-footer button {
                padding: 10px 20px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s;
            }
            .reset-btn {
                background: #ff9800;
                color: white;
            }
            .reset-btn:hover {
                background: #f57c00;
            }
            .save-btn {
                background: #4caf50;
                color: white;
            }
            .save-btn:hover {
                background: #388e3c;
            }
            .update-btn {
                background: #2196f3;
                color: white;
            }
            .update-btn:hover {
                background: #1976d2;
            }
        `;
        document.head.appendChild(style);

        // 创建Vue实例
        vueApp = new Vue({
            el: '#ilabel-config-tool',
            template,
            data: {
                typeNames: TYPE_NAMES,
                typeColors: TYPE_COLORS,
                selectedTypes: [...state.userConfig.promptType],
                arrange: state.userConfig.promptArrange,
                size: state.userConfig.promptSize,
                alarmRing: state.userConfig.alarmRing,
                previewTypes: [],
                confirmColor: '#ffffff',
                confirmTextColor: '#333333'
            },
            methods: {
                closeTool() {
                    closeConfigTool();
                    document.getElementById('ilabel-config-overlay').style.display = 'none';
                },
                onAlarmChange() {
                    this.updatePromptPreview();
                },
                updatePromptPreview() {
                    // 更新预览类型（显示前3个）
                    this.previewTypes = this.selectedTypes.slice(0, 3);
                    if (this.previewTypes.length === 0) {
                        this.previewTypes = ['normal'];
                    }

                    // 关闭当前提示，稍后按新配置重新打开
                    utils.closePrompt();

                    // 如果有当前直播数据，重新显示提示
                    if (state.currentLiveData && state.currentTypes.length > 0) {
                        setTimeout(() => {
                            const filteredTypes = state.currentTypes.filter(type =>
                                this.selectedTypes.includes(type)
                            );
                            if (filteredTypes.length > 0 || this.alarmRing) {
                                utils.showPrompt(state.currentLiveData, filteredTypes);
                            }
                        }, 100);
                    }
                },
                playTestAlarm() {
                    if (this.alarmRing) {
                        utils.playTestAlarm();
                    }
                },
                saveConfig() {
                    // 保存配置
                    state.userConfig.promptType = this.selectedTypes;
                    state.userConfig.promptArrange = this.arrange;
                    state.userConfig.promptSize = this.size;
                    state.userConfig.alarmRing = this.alarmRing;

                    utils.saveUserConfig();

                    // 显示保存成功提示
                    this.showToast('配置已保存', 'success');

                    // 关闭工具
                    setTimeout(() => {
                        this.closeTool();
                    }, 1000);
                },
                resetConfig() {
                    if (confirm('确定要恢复默认配置吗？')) {
                        this.selectedTypes = [...DEFAULT_USER_CONFIG.promptType];
                        this.arrange = DEFAULT_USER_CONFIG.promptArrange;
                        this.size = DEFAULT_USER_CONFIG.promptSize;
                        this.alarmRing = DEFAULT_USER_CONFIG.alarmRing;
                        this.updatePromptPreview();

                        this.showToast('已恢复默认配置', 'info');
                    }
                },
                async updateRemoteConfig() {
                    try {
                        this.showToast('正在更新远程配置...', 'info');
                        await utils.loadGlobalConfig(true);
                        this.showToast('远程配置更新成功', 'success');
                        this.updatePromptPreview();
                    } catch (error) {
                        console.error('更新远程配置失败', error);
                        this.showToast('更新失败，请查看控制台', 'error');
                    }
                },
                showToast(message, type = 'info') {
                    const toast = document.createElement('div');
                    toast.style.cssText = `
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        padding: 12px 24px;
                        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
                        color: white;
                        border-radius: 6px;
                        font-size: 14px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                        z-index: 1000002;
                        animation: slideIn 0.3s ease;
                    `;
                    toast.textContent = message;
                    document.body.appendChild(toast);

                    setTimeout(() => {
                        toast.style.animation = 'slideOut 0.3s ease';
                        setTimeout(() => toast.remove(), 300);
                    }, 2000);
                }
            },
            mounted() {
                this.updatePromptPreview();

                // 添加动画样式
                const style = document.createElement('style');
                style.textContent = `
                    @keyframes slideIn {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                    @keyframes slideOut {
                        from { transform: translateX(0); opacity: 1; }
                        to { transform: translateX(100%); opacity: 0; }
                    }
                `;
                document.head.appendChild(style);
            }
        });

        // 显示工具和遮罩
        toolContainer.style.display = 'block';
        document.getElementById('ilabel-config-overlay').style.display = 'block';
    }

    // 注册到context
    context.state.configToolInstance = {
        open: openConfigTool,
        close: closeConfigTool,
        registerMenuCommand: registerMenuCommand
    };

    // 自动注册菜单命令
    registerMenuCommand();

})(typeof context !== 'undefined' ? context : window.__moduleContext);