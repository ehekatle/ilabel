/* iLabel直播审核辅助 - 主入口文件 v3.0.0 */

(function () {
    'use strict';

    // 模块路径配置
    const MODULES = {
        config: 'https://gh-proxy.org/https://raw.githubusercontent.com/ehekatle/ilabel/main/config.json',
        configTool: 'https://gh-proxy.org/https://raw.githubusercontent.com/ehekatle/ilabel/main/func/configTool.js',
        getInfo: 'https://gh-proxy.org/https://raw.githubusercontent.com/ehekatle/ilabel/main/func/getinfo.js',
        prompt: 'https://gh-proxy.org/https://raw.githubusercontent.com/ehekatle/ilabel/main/func/prompt.js'
    };

    // 全局状态
    const state = {
        globalConfig: null,
        userConfig: null,
        currentLiveData: null,
        currentTypes: [],
        promptInstance: null,
        configToolInstance: null,
        lastConfigCheck: 0,
        audioContext: null,
        alarmAudio: null
    };

    // 存储键名
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

    // 加载模块
    async function loadModule(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url + '?t=' + Date.now(),
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

    // 初始化
    async function init() {
        console.log('iLabel辅助工具: 初始化开始');

        try {
            // 加载用户配置
            loadUserConfig();

            // 加载全局配置
            await loadGlobalConfig();

            // 注册菜单命令
            registerMenuCommands();

            // 加载并初始化各模块
            const [configToolCode, getInfoCode, promptCode] = await Promise.all([
                loadModule(MODULES.configTool),
                loadModule(MODULES.getInfo),
                loadModule(MODULES.prompt)
            ]);

            // 创建模块上下文
            const moduleContext = {
                state,
                STORAGE_KEYS,
                DEFAULT_USER_CONFIG,
                utils: {
                    loadGlobalConfig: loadGlobalConfig.bind(this),
                    saveUserConfig: saveUserConfig.bind(this),
                    showPrompt: showPrompt.bind(this),
                    closePrompt: closePrompt.bind(this),
                    playTestAlarm: playTestAlarm.bind(this)
                }
            };

            // 执行模块
            new Function('context', configToolCode)(moduleContext);
            new Function('context', getInfoCode)(moduleContext);
            new Function('context', promptCode)(moduleContext);

            // 启动配置检查定时器
            startConfigChecker();

            // 设置请求拦截
            setupRequestInterception(moduleContext);

            console.log('iLabel辅助工具: 初始化完成');

        } catch (error) {
            console.error('iLabel辅助工具: 初始化失败', error);
        }
    }

    // 加载用户配置
    function loadUserConfig() {
        const saved = GM_getValue(STORAGE_KEYS.USER_CONFIG, null);
        if (saved) {
            try {
                state.userConfig = JSON.parse(saved);
            } catch (e) {
                console.error('解析用户配置失败，使用默认配置', e);
                state.userConfig = { ...DEFAULT_USER_CONFIG };
            }
        } else {
            state.userConfig = { ...DEFAULT_USER_CONFIG };
        }
    }

    // 保存用户配置
    function saveUserConfig() {
        GM_setValue(STORAGE_KEYS.USER_CONFIG, JSON.stringify(state.userConfig));
    }

    // 加载全局配置
    async function loadGlobalConfig(force = false) {
        const now = Date.now();
        const lastUpdate = GM_getValue(STORAGE_KEYS.LAST_CONFIG_UPDATE, 0);

        // 检查是否需要更新（24小时 = 86400000毫秒）
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
            const configText = await loadModule(MODULES.config);
            const config = JSON.parse(configText);

            // 只保存globalConfig部分
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
            // 尝试使用缓存的配置
            const cached = GM_getValue(STORAGE_KEYS.GLOBAL_CONFIG, null);
            if (cached) {
                try {
                    state.globalConfig = JSON.parse(cached);
                    console.log('使用缓存的全局配置（加载失败后）');
                } catch (e) {
                    console.error('解析缓存的全局配置失败', e);
                }
            }
        }
    }

    // 注册菜单命令
    function registerMenuCommands() {
        GM_registerMenuCommand('⚙️ 打开配置工具', () => {
            if (state.configToolInstance && typeof state.configToolInstance.open === 'function') {
                state.configToolInstance.open();
            }
        });

        GM_registerMenuCommand('🔄 立即更新远程配置', async () => {
            await loadGlobalConfig(true);
            alert('全局配置更新完成');
        });

        GM_registerMenuCommand('🔊 测试闹钟', () => {
            playTestAlarm();
        });
    }

    // 启动配置检查器
    function startConfigChecker() {
        setInterval(async () => {
            const now = Date.now();
            const lastUpdate = GM_getValue(STORAGE_KEYS.LAST_CONFIG_UPDATE, 0);

            if (now - lastUpdate > 86400000) {
                console.log('触发定时配置检查');
                await loadGlobalConfig();
            }
        }, 3600000); // 每小时检查一次
    }

    // 播放测试闹钟
    function playTestAlarm() {
        try {
            if (!state.audioContext) {
                state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            if (state.audioContext.state === 'suspended') {
                state.audioContext.resume();
            }

            // 创建一个简单的振荡器作为测试音
            const oscillator = state.audioContext.createOscillator();
            const gainNode = state.audioContext.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.value = 880;
            gainNode.gain.value = 0.1;

            oscillator.connect(gainNode);
            gainNode.connect(state.audioContext.destination);

            oscillator.start();
            oscillator.stop(state.audioContext.currentTime + 3);

            console.log('测试闹钟播放中（3秒）');

            setTimeout(() => {
                console.log('测试闹钟播放结束');
            }, 3000);

        } catch (error) {
            console.error('播放测试闹钟失败', error);
        }
    }

    // 显示提示
    function showPrompt(liveData, types) {
        if (state.promptInstance && typeof state.promptInstance.show === 'function') {
            state.promptInstance.show(liveData, types);
        }
    }

    // 关闭提示
    function closePrompt() {
        if (state.promptInstance && typeof state.promptInstance.close === 'function') {
            state.promptInstance.close();
        }
    }

    // 设置请求拦截
    function setupRequestInterception(context) {
        // 拦截fetch请求
        const originalFetch = window.fetch;
        window.fetch = function (...args) {
            const url = args[0];

            if (typeof url === 'string') {
                // 监听直播信息请求
                if (url.includes('get_live_info_batch')) {
                    return originalFetch.apply(this, args).then(response => {
                        if (response.ok) {
                            response.clone().json().then(data => {
                                if (data.ret === 0 && data.liveInfoList?.length > 0) {
                                    handleLiveInfo(data.liveInfoList[0], context);
                                }
                            }).catch(() => { });
                        }
                        return response;
                    });
                }

                // 监听审核提交请求
                if (url.includes('/api/answers') && args[1]?.method === 'POST') {
                    return originalFetch.apply(this, args).then(response => {
                        if (response.ok) {
                            response.clone().json().then(data => {
                                if (data.status === 'ok') {
                                    handleAnswerSubmit(args[1]?.body, data, context);
                                }
                            }).catch(() => { });
                        }
                        return response;
                    });
                }
            }

            return originalFetch.apply(this, args);
        };

        // 拦截XHR请求
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
                                handleLiveInfo(data.liveInfoList[0], context);
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
                                handleAnswerSubmit(body, data, context);
                            }
                        } catch (e) { }
                    }
                });
            }

            return originalSend.call(this, body);
        };
    }

    // 处理直播信息
    async function handleLiveInfo(liveInfo, context) {
        try {
            // 获取审核人员信息
            const auditor = await getAuditorInfo();

            // 获取送审信息
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

            context.state.currentLiveData = liveData;

            // 判断所有类型
            const types = checkAllTypes(liveData, context);
            context.state.currentTypes = types;

            // 根据用户配置过滤
            const filteredTypes = types.filter(type =>
                context.state.userConfig.promptType.includes(type)
            );

            // 显示提示
            if (filteredTypes.length > 0 || context.state.userConfig.alarmRing) {
                context.utils.showPrompt(liveData, filteredTypes);
            }

        } catch (error) {
            console.error('处理直播信息失败', error);
        }
    }

    // 处理答案提交
    function handleAnswerSubmit(body, responseData, context) {
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

                const auditData = {
                    task_id: taskId,
                    live_id: liveId,
                    conclusion: conclusion,
                    operator: operator
                };

                console.log('审核结果:', auditData);

                // 推送答案
                sendAnswerPush(auditData, context);
            });

        } catch (error) {
            console.error('处理答案提交失败', error);
        }
    }

    // 判断所有类型
    function checkAllTypes(liveData, context) {
        const types = [];
        const config = context.state.globalConfig;

        if (!config) return types;

        // 1. 预埋单检查
        if (isPrefilledOrder(liveData)) {
            types.push('prefilled');
        }

        // 2. 豁免检查
        if (isExempted(liveData, config)) {
            types.push('exempted');
        }

        // 3. 复核单检查
        if (liveData.auditRemark && liveData.auditRemark.includes('复核')) {
            types.push('review');
        }

        // 4. 点杀单检查
        if (liveData.auditRemark && liveData.auditRemark.includes('辛苦注意审核')) {
            types.push('targeted');
        }

        // 5. 处罚检查
        const penaltyResult = checkPenalty(liveData, config);
        if (penaltyResult.found) {
            types.push('penalty');
        }

        // 6. 送审备注检查
        if (liveData.auditRemark && liveData.auditRemark.includes('辛苦审核')) {
            types.push('note');
        }

        // 7. 投诉检查
        if (liveData.auditRemark && liveData.auditRemark.includes('投诉')) {
            types.push('complaint');
        }

        // 8. 普通单（如果没有其他类型）
        if (types.length === 0) {
            types.push('normal');
        }

        return types;
    }

    // 检查是否为预埋单
    function isPrefilledOrder(data) {
        if (!data.auditTime) return false;

        const auditDate = new Date(parseInt(data.auditTime) * 1000);
        const now = new Date();

        return auditDate.getDate() !== now.getDate() ||
            auditDate.getMonth() !== now.getMonth() ||
            auditDate.getFullYear() !== now.getFullYear();
    }

    // 检查是否豁免
    function isExempted(data, config) {
        const whiteList = config.anchorWhiteList || {};

        // 检查主播昵称白名单
        if (data.nickname && whiteList.nicknameWhiteList) {
            for (const keyword of whiteList.nicknameWhiteList) {
                if (keyword && data.nickname.includes(keyword)) {
                    return true;
                }
            }
        }

        // 检查主播认证白名单
        if (data.authStatus && whiteList.authStatusWhiteList) {
            for (const keyword of whiteList.authStatusWhiteList) {
                if (keyword && data.authStatus.includes(keyword)) {
                    return true;
                }
            }
        }

        // 检查主播ID白名单
        if (data.anchorUserId && whiteList.anchorUserIdWhiteList) {
            if (whiteList.anchorUserIdWhiteList.includes(data.anchorUserId)) {
                return true;
            }
        }

        return false;
    }

    // 检查处罚关键词
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
                    return {
                        found: true,
                        location: check.label,
                        keyword: keyword
                    };
                }
            }
        }

        return { found: false };
    }

    // 获取审核人员信息
    async function getAuditorInfo() {
        try {
            const response = await fetch('https://ilabel.weixin.qq.com/api/user/info', {
                headers: {
                    'accept': 'application/json, text/plain, */*',
                    'x-requested-with': 'XMLHttpRequest'
                },
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.status === 'ok' && data.data?.name) {
                    const nameParts = data.data.name.split('-');
                    return nameParts.length > 1 ? nameParts[1].trim() : data.data.name.trim();
                }
            }
        } catch (e) {
            console.error('获取审核人员信息失败', e);
        }
        return '';
    }

    // 获取送审信息
    async function getAuditInfo() {
        try {
            const response = await fetch('https://ilabel.weixin.qq.com/api/mixed-task/assigned?task_id=10', {
                headers: {
                    'accept': 'application/json, text/plain, */*',
                    'x-requested-with': 'XMLHttpRequest'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                return { audit_time: 0, auditRemark: '' };
            }

            const data = await response.json();

            if (data.status === 'ok' && data.data?.hits?.length > 0) {
                const hit = data.data.hits[0];
                const content = hit.content_data?.content;

                if (!content) {
                    return { audit_time: 0, auditRemark: '' };
                }

                const audit_time = content.audit_time || 0;
                const rawRemark = content.send_remark || '';
                const auditRemark = decodeUnicode(rawRemark);

                return { audit_time, auditRemark };
            }
        } catch (e) {
            console.error('获取送审信息失败', e);
        }
        return { audit_time: 0, auditRemark: '' };
    }

    // Unicode解码
    function decodeUnicode(str) {
        if (!str) return '';
        try {
            return str.replace(/\\u([\dA-F]{4})/gi,
                (match, group) => String.fromCharCode(parseInt(group, 16)));
        } catch (e) {
            return str;
        }
    }

    // 推送答案
    function sendAnswerPush(auditData, context) {
        const pushUrl = context.state.globalConfig?.pushUrl?.answerPushUrl;

        if (!pushUrl) {
            console.error('答案推送地址未配置');
            return;
        }

        const timeStr = formatTime24();
        const content = `审核提交记录\n时间: ${timeStr}\ntask_id: ${auditData.task_id}\nlive_id: ${auditData.live_id}\n结论: ${auditData.conclusion}\n操作人: ${auditData.operator}`;

        const data = {
            msgtype: "text",
            text: {
                content: content
            }
        };

        console.log('发送答案推送:', data);

        GM_xmlhttpRequest({
            method: 'POST',
            url: pushUrl,
            headers: {
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(data),
            timeout: 5000,
            onload: function (response) {
                if (response.status === 200) {
                    console.log('答案推送成功');
                } else {
                    console.error('答案推送失败:', response.status);
                }
            },
            onerror: function (error) {
                console.error('答案推送错误:', error);
            }
        });
    }

    // 格式化时间
    function formatTime24() {
        const now = new Date();
        return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    }

    // 启动
    init();
})();