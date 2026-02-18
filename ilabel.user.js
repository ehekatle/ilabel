// ==UserScript==
// @name         iLabel直播审核辅助
// @namespace    https://github.com/ehekatle/ilabel
// @version      3.0.0
// @description  直播审核辅助工具（含预埋、豁免、违规检测、推送提醒）
// @author       ehekatle
// @homepage     https://github.com/ehekatle/ilabel
// @source       https://raw.githubusercontent.com/ehekatle/ilabel/main/ilabel.user.js
// @updateURL    https://gh-proxy.org/https://raw.githubusercontent.com/ehekatle/ilabel/main/ilabel.user.js
// @downloadURL  https://gh-proxy.org/https://raw.githubusercontent.com/ehekatle/ilabel/main/ilabel.user.js
// @match        https://ilabel.weixin.qq.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=weixin.qq.com
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @connect      gh-proxy.org
// @connect      qyapi.weixin.qq.com
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // ========== 配置 ==========
    const CONFIG_URL = 'https://gh-proxy.org/https://raw.githubusercontent.com/ehekatle/ilabel/main/config.json';
    const STORAGE_KEYS = {
        GLOBAL_CONFIG: 'ilabel_global_config',
        USER_CONFIG: 'ilabel_user_config',
        LAST_CONFIG_UPDATE: 'ilabel_last_config_update'
    };

    // 默认用户配置
    const DEFAULT_USER_CONFIG = {
        promptType: ['targeted', 'prefilled', 'exempted', 'review', 'penalty', 'note', 'complaint', 'normal'],
        promptArrange: 'horizontal',
        promptSize: 100,
        promptPosition: { x: 100, y: 100 },
        alarmRing: false
    };

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

    // ========== 全局状态 ==========
    const state = {
        globalConfig: null,
        userConfig: null,
        currentLiveData: null,
        currentTypes: [],
        promptContainer: null,
        pushInterval: null,
        lastPushTime: 0,
        isConfirmed: false,
        audioContext: null,
        configToolVisible: false,
        vueApp: null,
        toolContainer: null,
        overlay: null
    };

    // ========== 初始化 ==========
    async function init() {
        console.log('iLabel辅助工具: 初始化开始');

        try {
            // 加载用户配置
            loadUserConfig();

            // 加载全局配置
            await loadGlobalConfig();

            // 添加样式
            addStyles();

            // 注册菜单命令
            registerMenuCommands();

            // 设置请求拦截
            setupRequestInterception();

            // 启动配置检查定时器
            startConfigChecker();

            console.log('iLabel辅助工具: 初始化完成');

        } catch (error) {
            console.error('iLabel辅助工具: 初始化失败', error);
        }
    }

    // ========== 配置管理 ==========
    function loadUserConfig() {
        try {
            const saved = GM_getValue(STORAGE_KEYS.USER_CONFIG, null);
            if (saved) {
                state.userConfig = JSON.parse(saved);
                // 确保所有字段都存在
                state.userConfig = { ...DEFAULT_USER_CONFIG, ...state.userConfig };
            } else {
                state.userConfig = { ...DEFAULT_USER_CONFIG };
            }
            console.log('用户配置加载成功', state.userConfig);
        } catch (e) {
            console.error('加载用户配置失败', e);
            state.userConfig = { ...DEFAULT_USER_CONFIG };
        }
    }

    function saveUserConfig() {
        try {
            GM_setValue(STORAGE_KEYS.USER_CONFIG, JSON.stringify(state.userConfig));
            console.log('用户配置保存成功');
        } catch (e) {
            console.error('保存用户配置失败', e);
        }
    }

    async function loadGlobalConfig(force = false) {
        const now = Date.now();
        const lastUpdate = GM_getValue(STORAGE_KEYS.LAST_CONFIG_UPDATE, 0);

        if (!force && now - lastUpdate < 86400000) {
            const saved = GM_getValue(STORAGE_KEYS.GLOBAL_CONFIG, null);
            if (saved) {
                try {
                    state.globalConfig = JSON.parse(saved);
                    console.log('使用缓存的全局配置');
                    return;
                } catch (e) {
                    console.error('解析缓存的全局配置失败', e);
                }
            }
        }

        try {
            const configText = await fetchConfig();
            const config = JSON.parse(configText);

            if (config.globalConfig) {
                state.globalConfig = config.globalConfig;
                GM_setValue(STORAGE_KEYS.GLOBAL_CONFIG, JSON.stringify(config.globalConfig));
                GM_setValue(STORAGE_KEYS.LAST_CONFIG_UPDATE, now);
                console.log('全局配置更新成功');
            } else {
                throw new Error('配置文件格式错误');
            }
        } catch (error) {
            console.error('加载全局配置失败', error);
            const cached = GM_getValue(STORAGE_KEYS.GLOBAL_CONFIG, null);
            if (cached) {
                state.globalConfig = JSON.parse(cached);
                console.log('使用缓存的全局配置（加载失败后）');
            }
        }
    }

    function fetchConfig() {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: CONFIG_URL + '?t=' + Date.now(),
                onload: function (response) {
                    if (response.status === 200) {
                        resolve(response.responseText);
                    } else {
                        reject(new Error(`加载失败: ${response.status}`));
                    }
                },
                onerror: reject
            });
        });
    }

    function startConfigChecker() {
        setInterval(async () => {
            const now = Date.now();
            const lastUpdate = GM_getValue(STORAGE_KEYS.LAST_CONFIG_UPDATE, 0);
            if (now - lastUpdate > 86400000) {
                console.log('触发定时配置检查');
                await loadGlobalConfig();
            }
        }, 3600000);
    }

    // ========== 菜单命令 ==========
    function registerMenuCommands() {
        GM_registerMenuCommand('⚙️ 打开配置工具', () => {
            toggleConfigTool();
        });

        GM_registerMenuCommand('🔄 立即更新远程配置', async () => {
            await loadGlobalConfig(true);
            alert('全局配置更新完成');
        });

        GM_registerMenuCommand('🔊 测试闹钟', () => {
            playTestAlarm();
        });
    }

    // ========== 配置工具 ==========
    function toggleConfigTool() {
        if (state.configToolVisible) {
            closeConfigTool();
        } else {
            openConfigTool();
        }
    }

    function openConfigTool() {
        if (state.vueApp && state.toolContainer) {
            updateVueData();
            state.toolContainer.style.display = 'block';
            state.overlay.style.display = 'block';
            state.configToolVisible = true;
            return;
        }
        createConfigTool();
    }

    function closeConfigTool() {
        if (state.toolContainer) {
            state.toolContainer.style.display = 'none';
        }
        if (state.overlay) {
            state.overlay.style.display = 'none';
        }
        state.configToolVisible = false;
        closePrompt();
    }

    function updateVueData() {
        if (state.vueApp) {
            state.vueApp.selectedTypes = [...state.userConfig.promptType];
            state.vueApp.arrange = state.userConfig.promptArrange;
            state.vueApp.size = state.userConfig.promptSize;
            state.vueApp.alarmRing = state.userConfig.alarmRing;
        }
    }

    function createConfigTool() {
        // 创建遮罩
        state.overlay = document.createElement('div');
        state.overlay.id = 'ilabel-config-overlay';
        state.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 1000000;
            display: none;
        `;
        state.overlay.addEventListener('click', closeConfigTool);
        document.body.appendChild(state.overlay);

        // 创建容器
        state.toolContainer = document.createElement('div');
        state.toolContainer.id = 'ilabel-config-tool';
        state.toolContainer.style.cssText = `
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
        document.body.appendChild(state.toolContainer);

        // 引入Vue
        const vueScript = document.createElement('script');
        vueScript.src = 'https://cdn.jsdelivr.net/npm/vue@2/dist/vue.js';
        vueScript.onload = initVueApp;
        vueScript.onerror = () => {
            state.toolContainer.innerHTML = `
                <div style="padding: 20px; text-align: center;">
                    <h3 style="color: #f44336;">加载失败</h3>
                    <p>Vue框架加载失败，请刷新页面重试。</p>
                    <button onclick="document.getElementById('ilabel-config-tool').style.display='none'; document.getElementById('ilabel-config-overlay').style.display='none';" 
                            style="padding: 8px 16px; background: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        关闭
                    </button>
                </div>
            `;
            state.toolContainer.style.display = 'block';
            state.overlay.style.display = 'block';
            state.configToolVisible = true;
        };
        document.head.appendChild(vueScript);
    }

    function initVueApp() {
        const template = `
            <div class="config-tool-container">
                <div class="config-tool-header">
                    <h3>iLabel辅助工具配置</h3>
                    <button @click="closeTool" class="close-btn">×</button>
                </div>
                
                <div class="config-tool-body">
                    <div class="config-section">
                        <label class="section-label">提示类型：</label>
                        <div class="checkbox-group">
                            <div v-for="(name, type) in typeNames" :key="type" class="checkbox-item">
                                <input type="checkbox" :id="'type-' + type" :value="type" v-model="selectedTypes" @change="updatePromptPreview">
                                <label :for="'type-' + type" :style="{ color: typeColors[type] }">{{ name }}</label>
                            </div>
                        </div>
                    </div>
                    
                    <div class="config-section">
                        <label class="section-label">提示排列方式：</label>
                        <div class="radio-group">
                            <label><input type="radio" value="horizontal" v-model="arrange" @change="updatePromptPreview"> 横向</label>
                            <label><input type="radio" value="vertical" v-model="arrange" @change="updatePromptPreview"> 纵向</label>
                        </div>
                    </div>
                    
                    <div class="config-section">
                        <label class="section-label">提示缩放比例 ({{ size }}%)：</label>
                        <div class="slider-container">
                            <input type="range" min="20" max="200" step="5" v-model.number="size" @input="updatePromptPreview" class="slider-input">
                            <input type="number" min="20" max="200" step="5" v-model.number="size" @change="updatePromptPreview" class="size-input">
                        </div>
                    </div>
                    
                    <div class="config-section">
                        <label class="section-label">闹钟开关：</label>
                        <div class="switch-container">
                            <label class="switch">
                                <input type="checkbox" v-model="alarmRing" @change="updatePromptPreview">
                                <span class="slider"></span>
                            </label>
                            <button @click="playTestAlarm" class="test-btn" :disabled="!alarmRing">🔊 测试闹钟（3秒）</button>
                        </div>
                    </div>
                    
                    <div class="preview-section">
                        <label class="section-label">实时预览：</label>
                        <div class="preview-container">
                            <div class="preview-wrapper" :class="{ 'vertical': arrange === 'vertical' }" :style="{ transform: 'scale(' + size/100 + ')' }">
                                <div v-for="type in previewTypes" :key="type" class="preview-item" :style="{ backgroundColor: typeColors[type] }">
                                    {{ typeNames[type] }}
                                </div>
                                <div class="preview-item confirm-btn">确认</div>
                            </div>
                        </div>
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
            .config-tool-container { padding: 24px; }
            .config-tool-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #f0f0f0; }
            .config-tool-header h3 { margin: 0; color: #333; font-size: 18px; }
            .close-btn { background: none; border: none; font-size: 28px; cursor: pointer; color: #999; }
            .close-btn:hover { color: #333; }
            .config-section { margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px dashed #eee; }
            .section-label { display: block; margin-bottom: 12px; font-weight: 600; color: #444; font-size: 14px; }
            .checkbox-group { display: flex; flex-wrap: wrap; gap: 12px 20px; background: #f9f9f9; padding: 15px; border-radius: 8px; }
            .checkbox-item { display: flex; align-items: center; gap: 6px; }
            .radio-group { display: flex; gap: 20px; background: #f9f9f9; padding: 12px 15px; border-radius: 8px; }
            .slider-container { display: flex; align-items: center; gap: 15px; background: #f9f9f9; padding: 12px 15px; border-radius: 8px; }
            .slider-input { flex: 1; height: 6px; }
            .size-input { width: 70px; padding: 8px; border: 1px solid #ddd; border-radius: 6px; text-align: center; }
            .switch-container { display: flex; align-items: center; gap: 15px; background: #f9f9f9; padding: 12px 15px; border-radius: 8px; }
            .switch { position: relative; display: inline-block; width: 52px; height: 26px; }
            .switch input { opacity: 0; width: 0; height: 0; }
            .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .3s; border-radius: 26px; }
            .slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; }
            input:checked + .slider { background-color: #4caf50; }
            input:checked + .slider:before { transform: translateX(26px); }
            .test-btn { padding: 8px 16px; background: #2196f3; color: white; border: none; border-radius: 6px; cursor: pointer; }
            .test-btn:disabled { background: #ccc; cursor: not-allowed; }
            .preview-section { margin-top: 20px; padding: 20px; background: #f5f5f5; border-radius: 10px; }
            .preview-container { min-height: 100px; display: flex; align-items: center; background: white; border-radius: 8px; padding: 20px; }
            .preview-wrapper { display: flex; gap: 10px; transform-origin: left center; }
            .preview-wrapper.vertical { flex-direction: column; }
            .preview-item { padding: 8px 16px; border-radius: 6px; color: white; font-size: 13px; font-weight: 500; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .preview-item.confirm-btn { background-color: white; color: #333; border: 1px solid #ddd; }
            .config-tool-footer { display: flex; justify-content: flex-end; gap: 12px; margin-top: 25px; padding-top: 15px; border-top: 2px solid #f0f0f0; }
            .config-tool-footer button { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; }
            .reset-btn { background: #ff9800; color: white; }
            .save-btn { background: #4caf50; color: white; }
            .update-btn { background: #2196f3; color: white; }
        `;
        document.head.appendChild(style);

        // 类型颜色
        const typeColors = {
            targeted: '#000000',
            prefilled: '#f44336',
            exempted: '#4caf50',
            review: '#2196f3',
            note: '#90caf9',
            penalty: '#ff9800',
            complaint: '#9e9e9e',
            normal: '#9e9e9e'
        };

        // 创建Vue实例
        state.vueApp = new Vue({
            el: '#ilabel-config-tool',
            template,
            data: {
                typeNames: TYPE_NAMES,
                typeColors: typeColors,
                selectedTypes: [...state.userConfig.promptType],
                arrange: state.userConfig.promptArrange,
                size: state.userConfig.promptSize,
                alarmRing: state.userConfig.alarmRing,
                previewTypes: []
            },
            methods: {
                closeTool() {
                    closeConfigTool();
                },
                updatePromptPreview() {
                    this.previewTypes = this.selectedTypes.slice(0, 3);
                    if (this.previewTypes.length === 0) {
                        this.previewTypes = ['normal'];
                    }
                    closePrompt();
                    if (state.currentLiveData && state.currentTypes.length > 0) {
                        setTimeout(() => {
                            const filteredTypes = state.currentTypes.filter(type =>
                                this.selectedTypes.includes(type)
                            );
                            if (filteredTypes.length > 0 || this.alarmRing) {
                                showPrompt(state.currentLiveData, filteredTypes);
                            }
                        }, 100);
                    }
                },
                playTestAlarm() {
                    if (this.alarmRing) {
                        playTestAlarm();
                    }
                },
                saveConfig() {
                    state.userConfig.promptType = this.selectedTypes;
                    state.userConfig.promptArrange = this.arrange;
                    state.userConfig.promptSize = this.size;
                    state.userConfig.alarmRing = this.alarmRing;
                    saveUserConfig();
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
                    await loadGlobalConfig(true);
                    alert('远程配置更新成功');
                    this.updatePromptPreview();
                }
            },
            mounted() {
                this.updatePromptPreview();
            }
        });

        state.toolContainer.style.display = 'block';
        state.overlay.style.display = 'block';
        state.configToolVisible = true;
    }

    // ========== 提示显示 ==========
    function showPrompt(liveData, types) {
        state.currentLiveData = liveData;
        state.currentTypes = types;
        state.isConfirmed = false;

        closePrompt();
        createPrompt();
        startPushTimer();
    }

    function closePrompt() {
        if (state.promptContainer) {
            state.promptContainer.remove();
            state.promptContainer = null;
        }
        if (state.pushInterval) {
            clearInterval(state.pushInterval);
            state.pushInterval = null;
        }
        stopAlarm();
    }

    function createPrompt() {
        state.promptContainer = document.createElement('div');
        state.promptContainer.id = 'ilabel-prompt-container';
        state.promptContainer.style.cssText = `
            position: fixed;
            left: ${state.userConfig.promptPosition.x}px;
            top: ${state.userConfig.promptPosition.y}px;
            z-index: 1000000;
            transform: scale(${state.userConfig.promptSize / 100});
            transform-origin: left top;
            cursor: move;
            user-select: none;
        `;

        const wrapper = document.createElement('div');
        wrapper.style.cssText = `
            display: flex;
            gap: 8px;
            ${state.userConfig.promptArrange === 'vertical' ? 'flex-direction: column;' : ''}
            background: transparent;
            padding: 5px;
        `;

        state.currentTypes.forEach(type => {
            const tag = createTypeTag(type);
            wrapper.appendChild(tag);
        });

        const confirmBtn = createConfirmButton();
        wrapper.appendChild(confirmBtn);

        state.promptContainer.appendChild(wrapper);
        document.body.appendChild(state.promptContainer);

        makeDraggable(state.promptContainer);
    }

    function createTypeTag(type) {
        const tag = document.createElement('div');
        const color = getTypeColor(type);
        const textColor = getContrastColor(color);

        tag.style.cssText = `
            padding: 6px 12px;
            border-radius: 4px;
            background-color: ${color};
            color: ${textColor};
            font-size: 12px;
            font-weight: bold;
            white-space: nowrap;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;
        tag.textContent = TYPE_NAMES[type] || type;
        return tag;
    }

    function createConfirmButton() {
        const btn = document.createElement('div');
        btn.style.cssText = `
            padding: 6px 12px;
            border-radius: 4px;
            background-color: white;
            color: #333;
            font-size: 12px;
            font-weight: bold;
            white-space: nowrap;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            cursor: pointer;
            border: 1px solid #ddd;
        `;
        btn.textContent = '确认';

        btn.addEventListener('click', () => {
            state.isConfirmed = true;
            btn.style.backgroundColor = '#f0f0f0';
            if (state.pushInterval) {
                clearInterval(state.pushInterval);
                state.pushInterval = null;
            }
            stopAlarm();
        });

        return btn;
    }

    function makeDraggable(element) {
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };

        element.addEventListener('mousedown', startDrag);

        function startDrag(e) {
            if (e.target.classList.contains('prompt-confirm-btn')) return;

            isDragging = true;
            const rect = element.getBoundingClientRect();
            dragOffset.x = e.clientX - rect.left;
            dragOffset.y = e.clientY - rect.top;
            element.style.cursor = 'grabbing';

            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', stopDrag);
            e.preventDefault();
        }

        function drag(e) {
            if (!isDragging) return;
            const x = e.clientX - dragOffset.x;
            const y = e.clientY - dragOffset.y;
            element.style.left = x + 'px';
            element.style.top = y + 'px';
            state.userConfig.promptPosition = { x, y };
        }

        function stopDrag() {
            if (!isDragging) return;
            isDragging = false;
            element.style.cursor = 'move';
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('mouseup', stopDrag);
            saveUserConfig();
        }
    }

    function startPushTimer() {
        if (!state.globalConfig?.pushUrl?.reminderPushUrl || !state.userConfig.alarmRing) return;

        state.lastPushTime = Date.now();
        state.pushInterval = setInterval(() => {
            if (state.isConfirmed || !state.currentLiveData) return;

            const now = Date.now();
            if (now - state.lastPushTime >= 20000) {
                sendReminderPush();
                state.lastPushTime = now;
                if (state.userConfig.alarmRing) {
                    playAlarm();
                }
            }
        }, 1000);
    }

    function sendReminderPush() {
        const pushUrl = state.globalConfig?.pushUrl?.reminderPushUrl;
        if (!pushUrl) return;

        const timeStr = formatTime24();
        const typeNames = state.currentTypes.map(t => TYPE_NAMES[t]).join('、');
        const content = `${timeStr} ${typeNames}单未确认`;

        const auditorName = state.currentLiveData?.auditor;
        let mentionedMobile = null;

        if (auditorName && state.globalConfig?.auditorWhiteList) {
            const auditor = state.globalConfig.auditorWhiteList.find(a => a.name === auditorName);
            if (auditor) mentionedMobile = auditor.mobile;
        }

        const data = {
            msgtype: "text",
            text: { content }
        };
        if (mentionedMobile) data.text.mentioned_mobile_list = [mentionedMobile];

        GM_xmlhttpRequest({
            method: 'POST',
            url: pushUrl,
            headers: { 'Content-Type': 'application/json' },
            data: JSON.stringify(data),
            timeout: 5000,
            onload: (r) => r.status === 200 ? console.log('推送成功') : console.error('推送失败', r.status),
            onerror: console.error
        });
    }

    // ========== 闹钟 ==========
    function playTestAlarm() {
        playAlarm(3);
    }

    function playAlarm(duration = 1) {
        try {
            if (!state.audioContext) {
                state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (state.audioContext.state === 'suspended') {
                state.audioContext.resume();
            }

            const oscillator = state.audioContext.createOscillator();
            const gainNode = state.audioContext.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.value = 880;
            gainNode.gain.value = 0.1;

            oscillator.connect(gainNode);
            gainNode.connect(state.audioContext.destination);

            oscillator.start();
            oscillator.stop(state.audioContext.currentTime + duration);

            console.log(`闹钟播放 ${duration}秒`);
        } catch (error) {
            console.error('播放闹钟失败', error);
        }
    }

    function stopAlarm() {
        if (state.audioContext) {
            state.audioContext.close();
            state.audioContext = null;
        }
    }

    // ========== 请求拦截 ==========
    function setupRequestInterception() {
        const originalFetch = window.fetch;
        window.fetch = function (...args) {
            const url = args[0];

            if (typeof url === 'string') {
                if (url.includes('get_live_info_batch')) {
                    return originalFetch.apply(this, args).then(response => {
                        if (response.ok) {
                            response.clone().json().then(data => {
                                if (data.ret === 0 && data.liveInfoList?.length > 0) {
                                    handleLiveInfo(data.liveInfoList[0]);
                                }
                            }).catch(() => { });
                        }
                        return response;
                    });
                }

                if (url.includes('/api/answers') && args[1]?.method === 'POST') {
                    return originalFetch.apply(this, args).then(response => {
                        if (response.ok) {
                            response.clone().json().then(data => {
                                if (data.status === 'ok') {
                                    handleAnswerSubmit(args[1]?.body);
                                }
                            }).catch(() => { });
                        }
                        return response;
                    });
                }
            }
            return originalFetch.apply(this, args);
        };

        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function (method, url) {
            this._method = method.toUpperCase();
            this._url = url;
            return originalOpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function (body) {
            const xhr = this;

            if (xhr._url && xhr._url.includes('get_live_info_batch')) {
                xhr.addEventListener('load', () => {
                    if (xhr.status === 200) {
                        try {
                            const data = JSON.parse(xhr.responseText);
                            if (data.ret === 0 && data.liveInfoList?.length > 0) {
                                handleLiveInfo(data.liveInfoList[0]);
                            }
                        } catch (e) { }
                    }
                });
            }

            if (xhr._method === 'POST' && xhr._url && xhr._url.includes('/api/answers')) {
                xhr.addEventListener('load', () => {
                    if (xhr.status === 200) {
                        try {
                            const data = JSON.parse(xhr.responseText);
                            if (data.status === 'ok') {
                                handleAnswerSubmit(body);
                            }
                        } catch (e) { }
                    }
                });
            }

            return originalSend.call(this, body);
        };
    }

    // ========== 数据处理 ==========
    async function handleLiveInfo(liveInfo) {
        try {
            const auditor = await getAuditorInfo();
            const auditInfo = await getAuditInfo();

            const liveData = {
                liveId: liveInfo.liveId || '',
                anchorUserId: liveInfo.anchorUserId || '',
                nickname: liveInfo.nickname || '',
                authStatus: liveInfo.authStatus || '',
                signature: liveInfo.signature || '',
                description: liveInfo.description || '',
                createLiveArea: liveInfo.extraField?.createLiveArea || '',
                poiName: liveInfo.poiName || '',
                streamStartTime: liveInfo.streamStartTime || '',
                auditTime: auditInfo.audit_time || 0,
                auditor: auditor,
                auditRemark: auditInfo.auditRemark || ''
            };

            state.currentLiveData = liveData;
            const types = checkAllTypes(liveData);
            state.currentTypes = types;

            console.log('直播信息分析结果:', { liveData, types });

            const filteredTypes = types.filter(type => state.userConfig.promptType.includes(type));

            if (filteredTypes.length > 0 || state.userConfig.alarmRing) {
                showPrompt(liveData, filteredTypes);
            }
        } catch (error) {
            console.error('处理直播信息失败', error);
        }
    }

    function handleAnswerSubmit(body) {
        try {
            const parsedBody = typeof body === 'string' ? JSON.parse(body) : body;
            if (!parsedBody.results) return;

            Object.values(parsedBody.results).forEach(result => {
                if (!result) return;

                const taskId = result.task_id || '';
                const liveId = result.live_id || '';

                let operator = '未知操作人';
                if (result.oper_name && result.oper_name.includes('-')) {
                    operator = result.oper_name.split('-').pop().trim();
                } else if (result.oper_name) {
                    operator = result.oper_name.trim();
                }

                let conclusion = '不处罚';
                let reasonLabel = null;
                let remark = null;

                if (result.finder_object && Array.isArray(result.finder_object)) {
                    for (const item of result.finder_object) {
                        if (item.ext_info && item.ext_info.reason_label) {
                            reasonLabel = item.ext_info.reason_label;
                            remark = item.remark || null;
                            break;
                        }
                    }
                }

                if (reasonLabel) {
                    conclusion = remark ? `${reasonLabel}（${remark}）` : reasonLabel;
                }

                const auditData = { task_id: taskId, live_id: liveId, conclusion, operator };
                console.log('审核结果:', auditData);
                sendAnswerPush(auditData);
            });
        } catch (error) {
            console.error('处理答案提交失败', error);
        }
    }

    function sendAnswerPush(auditData) {
        const pushUrl = state.globalConfig?.pushUrl?.answerPushUrl;
        if (!pushUrl) return;

        const timeStr = formatTime24();
        const content = `审核提交记录\n时间: ${timeStr}\ntask_id: ${auditData.task_id}\nlive_id: ${auditData.live_id}\n结论: ${auditData.conclusion}\n操作人: ${auditData.operator}`;

        GM_xmlhttpRequest({
            method: 'POST',
            url: pushUrl,
            headers: { 'Content-Type': 'application/json' },
            data: JSON.stringify({ msgtype: "text", text: { content } }),
            timeout: 5000,
            onload: (r) => r.status === 200 ? console.log('答案推送成功') : console.error('答案推送失败', r.status),
            onerror: console.error
        });
    }

    function checkAllTypes(liveData) {
        const types = [];
        const config = state.globalConfig;
        if (!config) return types;

        if (isPrefilledOrder(liveData)) types.push('prefilled');
        if (isExempted(liveData, config)) types.push('exempted');
        if (liveData.auditRemark?.includes('复核')) types.push('review');
        if (liveData.auditRemark?.includes('辛苦注意审核')) types.push('targeted');

        const penaltyResult = checkPenalty(liveData, config);
        if (penaltyResult.found) types.push('penalty');

        if (liveData.auditRemark?.includes('辛苦审核')) types.push('note');
        if (liveData.auditRemark?.includes('投诉')) types.push('complaint');

        if (types.length === 0) types.push('normal');
        return types;
    }

    function isPrefilledOrder(data) {
        if (!data.auditTime) return false;
        const auditDate = new Date(parseInt(data.auditTime) * 1000);
        const now = new Date();
        return auditDate.getDate() !== now.getDate() ||
            auditDate.getMonth() !== now.getMonth() ||
            auditDate.getFullYear() !== now.getFullYear();
    }

    function isExempted(data, config) {
        const whiteList = config.anchorWhiteList || {};

        if (data.anchorUserId && whiteList.anchorUserIdWhiteList?.includes(data.anchorUserId)) {
            console.log(`豁免命中: 主播ID "${data.anchorUserId}"`);
            return true;
        }

        if (data.nickname && whiteList.nicknameWhiteList) {
            for (const keyword of whiteList.nicknameWhiteList) {
                if (keyword && data.nickname.includes(keyword)) {
                    console.log(`豁免命中: 昵称包含 "${keyword}"`);
                    return true;
                }
            }
        }

        if (data.authStatus && whiteList.authStatusWhiteList) {
            for (const keyword of whiteList.authStatusWhiteList) {
                if (keyword && data.authStatus.includes(keyword)) {
                    console.log(`豁免命中: 认证包含 "${keyword}"`);
                    return true;
                }
            }
        }
        return false;
    }

    function checkPenalty(data, config) {
        const keywords = config.penaltyKeywords || [];
        const checkOrder = [
            { field: 'description', label: '直播间描述' },
            { field: 'nickname', label: '主播昵称' },
            { field: 'poiName', label: '开播位置' }
        ];

        for (const check of checkOrder) {
            const fieldValue = data[check.field] || '';
            for (const keyword of keywords) {
                if (fieldValue.includes(keyword)) {
                    return { found: true, location: check.label, keyword };
                }
            }
        }
        return { found: false };
    }

    async function getAuditorInfo() {
        try {
            const response = await fetch('https://ilabel.weixin.qq.com/api/user/info', {
                headers: { 'x-requested-with': 'XMLHttpRequest' },
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                if (data.status === 'ok' && data.data?.name) {
                    const nameParts = data.data.name.split('-');
                    return nameParts.length > 1 ? nameParts[1].trim() : data.data.name.trim();
                }
            }
        } catch (e) { }
        return '';
    }

    async function getAuditInfo() {
        try {
            const response = await fetch('https://ilabel.weixin.qq.com/api/mixed-task/assigned?task_id=10', {
                headers: { 'x-requested-with': 'XMLHttpRequest' },
                credentials: 'include'
            });
            if (!response.ok) return { audit_time: 0, auditRemark: '' };

            const data = await response.json();
            if (data.status === 'ok' && data.data?.hits?.length > 0) {
                const hit = data.data.hits[0];
                const content = hit.content_data?.content;
                if (content) {
                    return {
                        audit_time: content.audit_time || 0,
                        auditRemark: decodeUnicode(content.send_remark || '')
                    };
                }
            }
        } catch (e) { }
        return { audit_time: 0, auditRemark: '' };
    }

    function decodeUnicode(str) {
        if (!str) return '';
        try {
            return str.replace(/\\u([\dA-F]{4})/gi, (m, g) => String.fromCharCode(parseInt(g, 16)));
        } catch (e) {
            return str;
        }
    }

    function getTypeColor(type) {
        const colors = state.globalConfig?.popupColor || {};
        const map = {
            targeted: colors.targetedColor || '#000000',
            prefilled: colors.prefilledColor || '#f44336',
            exempted: colors.exemptedColor || '#4caf50',
            review: colors.reviewColor || '#2196f3',
            note: colors.noteColor || '#90caf9',
            penalty: colors.penaltyColor || '#ff9800',
            complaint: colors.complaintColor || '#9e9e9e',
            normal: colors.normalColor || '#9e9e9e'
        };
        return map[type] || '#9e9e9e';
    }

    function getContrastColor(hexcolor) {
        if (!hexcolor.startsWith('#')) return '#ffffff';
        const hex = hexcolor.substring(1);
        const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.substring(0, 2), 16);
        const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.substring(2, 4), 16);
        const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.substring(4, 6), 16);
        return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? '#000000' : '#ffffff';
    }

    function formatTime24() {
        const now = new Date();
        return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    }

    function addStyles() {
        GM_addStyle(`
            #ilabel-prompt-container {
                position: fixed;
                z-index: 1000000;
                cursor: move;
                user-select: none;
            }
            .prompt-tag, .prompt-confirm-btn {
                padding: 6px 12px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: bold;
                white-space: nowrap;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }
            .prompt-confirm-btn {
                background: white;
                color: #333;
                border: 1px solid #ddd;
                cursor: pointer;
            }
            .prompt-confirm-btn:hover {
                background: #f5f5f5;
            }
            .prompt-confirm-btn.confirmed {
                background: #f0f0f0;
            }
        `);
    }

    // 启动
    init();
})();