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

    // 打开配置工具
    function openConfigTool() {
        if (vueApp) {
            vueApp.$el.style.display = 'block';
            return;
        }

        createToolUI();
    }

    // 关闭配置工具
    function closeConfigTool() {
        if (vueApp) {
            vueApp.$el.style.display = 'none';
            // 关闭提示
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
            width: 500px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 1000001;
            font-family: Arial, sans-serif;
            display: none;
        `;
        document.body.appendChild(toolContainer);

        // 引入Vue
        const vueScript = document.createElement('script');
        vueScript.src = 'https://cdn.jsdelivr.net/npm/vue@2/dist/vue.js';
        vueScript.onload = initVueApp;
        document.head.appendChild(vueScript);
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
                        <label>提示类型：</label>
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
                    </div>
                    
                    <!-- 提示排列方式 -->
                    <div class="config-section">
                        <label>提示排列方式：</label>
                        <select v-model="arrange" @change="updatePromptPreview">
                            <option value="horizontal">横向</option>
                            <option value="vertical">纵向</option>
                        </select>
                    </div>
                    
                    <!-- 提示缩放比例 -->
                    <div class="config-section">
                        <label>提示缩放比例 ({{ size }}%)：</label>
                        <div class="slider-container">
                            <input 
                                type="range" 
                                min="20" 
                                max="200" 
                                v-model.number="size"
                                @input="updatePromptPreview"
                            >
                            <input 
                                type="number" 
                                min="20" 
                                max="200" 
                                v-model.number="size"
                                @change="updatePromptPreview"
                                class="size-input"
                            >
                        </div>
                    </div>
                    
                    <!-- 闹钟开关 -->
                    <div class="config-section">
                        <label>闹钟开关：</label>
                        <label class="switch">
                            <input type="checkbox" v-model="alarmRing">
                            <span class="slider"></span>
                        </label>
                        <button @click="playTestAlarm" class="test-btn" :disabled="!alarmRing">测试闹钟</button>
                    </div>
                    
                    <!-- 预览区域 -->
                    <div class="preview-section">
                        <label>实时预览：</label>
                        <div 
                            class="prompt-preview" 
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
                                :style="{ backgroundColor: confirmColor }"
                            >
                                确认
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="config-tool-footer">
                    <button @click="resetConfig" class="reset-btn">重置</button>
                    <button @click="saveConfig" class="save-btn">保存</button>
                    <button @click="updateRemoteConfig" class="update-btn">更新远程配置</button>
                </div>
            </div>
        `;

        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .config-tool-container {
                padding: 20px;
            }
            .config-tool-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 1px solid #eee;
            }
            .config-tool-header h3 {
                margin: 0;
                color: #333;
            }
            .close-btn {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #999;
            }
            .close-btn:hover {
                color: #333;
            }
            .config-section {
                margin-bottom: 20px;
            }
            .config-section label {
                display: block;
                margin-bottom: 8px;
                font-weight: bold;
                color: #555;
            }
            .checkbox-group {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
            }
            .checkbox-item {
                display: flex;
                align-items: center;
                gap: 4px;
            }
            .checkbox-item input[type="checkbox"] {
                margin: 0;
            }
            select {
                padding: 5px;
                border: 1px solid #ddd;
                border-radius: 4px;
            }
            .slider-container {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .slider-container input[type="range"] {
                flex: 1;
            }
            .size-input {
                width: 60px;
                padding: 5px;
                border: 1px solid #ddd;
                border-radius: 4px;
            }
            .switch {
                position: relative;
                display: inline-block;
                width: 50px;
                height: 24px;
                margin-right: 10px;
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
                transition: .4s;
                border-radius: 24px;
            }
            .slider:before {
                position: absolute;
                content: "";
                height: 18px;
                width: 18px;
                left: 3px;
                bottom: 3px;
                background-color: white;
                transition: .4s;
                border-radius: 50%;
            }
            input:checked + .slider {
                background-color: #2196f3;
            }
            input:checked + .slider:before {
                transform: translateX(26px);
            }
            .test-btn {
                padding: 5px 10px;
                background: #4caf50;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }
            .test-btn:disabled {
                background: #ccc;
                cursor: not-allowed;
            }
            .preview-section {
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #eee;
            }
            .prompt-preview {
                display: flex;
                gap: 8px;
                margin-top: 10px;
                min-height: 40px;
                transform-origin: left top;
            }
            .prompt-preview.vertical {
                flex-direction: column;
            }
            .preview-item {
                padding: 6px 12px;
                border-radius: 4px;
                color: white;
                font-size: 12px;
                white-space: nowrap;
            }
            .preview-item.confirm-btn {
                background-color: #fff;
                color: #333;
                border: 1px solid #ddd;
                cursor: pointer;
            }
            .preview-item.confirm-btn.confirmed {
                background-color: #f0f0f0;
            }
            .config-tool-footer {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                margin-top: 20px;
                padding-top: 10px;
                border-top: 1px solid #eee;
            }
            .config-tool-footer button {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }
            .reset-btn {
                background: #f44336;
                color: white;
            }
            .save-btn {
                background: #4caf50;
                color: white;
            }
            .update-btn {
                background: #2196f3;
                color: white;
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
                confirmColor: '#ffffff'
            },
            methods: {
                closeTool() {
                    closeConfigTool();
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
                    state.userConfig.promptType = this.selectedTypes;
                    state.userConfig.promptArrange = this.arrange;
                    state.userConfig.promptSize = this.size;
                    state.userConfig.alarmRing = this.alarmRing;

                    utils.saveUserConfig();

                    alert('配置已保存');
                    this.closeTool();
                },
                resetConfig() {
                    if (confirm('确定要恢复默认配置吗？')) {
                        this.selectedTypes = [...DEFAULT_USER_CONFIG.promptType];
                        this.arrange = DEFAULT_USER_CONFIG.promptArrange;
                        this.size = DEFAULT_USER_CONFIG.promptSize;
                        this.alarmRing = DEFAULT_USER_CONFIG.alarmRing;
                        this.updatePromptPreview();
                    }
                },
                async updateRemoteConfig() {
                    try {
                        await utils.loadGlobalConfig(true);
                        alert('远程配置更新成功');
                        this.updatePromptPreview();
                    } catch (error) {
                        console.error('更新远程配置失败', error);
                        alert('更新远程配置失败，请查看控制台');
                    }
                }
            },
            mounted() {
                this.updatePromptPreview();
            }
        });

        // 显示工具
        toolContainer.style.display = 'block';
    }

    // 注册到context
    context.state.configToolInstance = {
        open: openConfigTool,
        close: closeConfigTool
    };

})(typeof context !== 'undefined' ? context : window.__moduleContext);