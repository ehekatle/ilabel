// ==UserScript==
// @name         iLabel直播审核辅助
// @namespace    https://github.com/ehekatle/ilableScript
// @version      2.4.7
// @description  预埋、豁免、直播信息违规、超时提示功能，集成推送功能和操作日志提取
// @author       ehekatle
// @homepage     https://github.com/ehekatle/ilableScript
// @source       https://raw.githubusercontent.com/ehekatle/ilableScript/main/ilableScript.user.js
// @supportURL   https://github.com/ehekatle/ilableScript/issues
// @updateURL    https://gh-proxy.org/https://raw.githubusercontent.com/ehekatle/ilableScript/main/ilableScript.meta.js
// @downloadURL  https://gh-proxy.org/https://raw.githubusercontent.com/ehekatle/ilableScript/main/ilableScript.user.js
// @match        https://ilabel.weixin.qq.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=weixin.qq.com
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @connect      gh-proxy.org
// @connect      qyapi.weixin.qq.com
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // 全局变量
    const SWITCH_KEY = 'ilabel_reminder_enabled';
    const REMOTE_SCRIPT_URL = 'https://gh-proxy.org/https://raw.githubusercontent.com/ehekatle/ilableScript/main/ilableScript.js';
    const ALARM_AUDIO_URL = 'https://gh-proxy.org/https://raw.githubusercontent.com/ehekatle/ilableScript/main/music.mp3';

    // 本地版本号
    const LOCAL_VERSION = GM_info.script.version;

    let config = null;
    let remoteFunctions = null;
    let currentLiveData = null;
    let currentResultType = null;
    let lastPopupTime = null;
    let popupConfirmed = true;
    let popupCheckInterval = null;
    let remoteVersion = null;
    let alarmAudio = null;
    let isAlarmPlaying = false;
    let pushInterval = null;
    let alarmTestTimeout = null;
    let pendingAuditData = null; // 存储待推送的审核数据

    // ========== 样式定义 ==========
    const STYLES = `
        .ilabel-switch-container {
            position: fixed;
            bottom: 0px;
            left: 0px;
            z-index: 999999;
            background: transparent;
            border-radius: 0px;
            box-shadow: 0 0px 0px rgba(0,0,0,0.2);
            padding: 0px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 3px;
            min-width: auto;
            transition: all 0.3s ease;
        }

        .ilabel-switch-container:hover {
            box-shadow: 0 4px 15px rgba(0,0,0,0.25);
        }

        .ilabel-switch-row {
            display: flex;
            align-items: center;
            gap: 6px;
            width: 100%;
            justify-content: space-between;
        }

        .push-switch {
            position: relative;
            display: inline-block;
            width: 40px;
            height: 20px;
        }

        .push-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }

        .push-switch-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: .4s;
            border-radius: 20px;
        }

        .push-switch-slider:before {
            position: absolute;
            content: "";
            height: 14px;
            width: 14px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: .4s;
            border-radius: 50%;
        }

        .push-switch input:checked + .push-switch-slider {
            background-color: #07c160;
        }

        .push-switch input:checked + .push-switch-slider:before {
            transform: translateX(20px);
        }

        /* alarm-switch 样式 */
        .alarm-switch {
            position: relative;
            display: inline-block;
            width: 40px;
            height: 20px;
        }

        .alarm-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }

        .alarm-switch-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: .4s;
            border-radius: 20px;
        }

        .alarm-switch-slider:before {
            position: absolute;
            content: "";
            height: 14px;
            width: 14px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: .4s;
            border-radius: 50%;
        }

        .alarm-switch input:checked + .alarm-switch-slider {
            background-color: #2196f3;
        }

        .alarm-switch input:checked + .alarm-switch-slider:before {
            transform: translateX(20px);
        }

        .ilabel-switch-label {
            font-size: 12px;
            color: #666;
            white-space: nowrap;
            font-family: Arial, sans-serif;
        }

        /* 状态提示 */
        .ilabel-version-tooltip {
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            background: transparent;
            color: white;
            padding: 6px 10px;  /* 减小内边距 */
            border-radius: 4px;  /* 减小圆角 */
            font-size: 12px;     /* 减小字体大小 */
            font-weight: 500;
            white-space: nowrap;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
            z-index: 1000000;
            pointer-events: none;
            min-width: 55px;     /* 设置最小宽度 */
            max-width: 55px;     /* 设置最大宽度 */
            text-align: center;  /* 文字居中 */
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            margin-bottom: 8px;
        }

        .ilabel-version-tooltip:after {
            content: '';
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            border: 4px solid transparent;  /* 减小箭头大小 */
            border-top-color: transparent;
        }

        .ilabel-switch-container:hover .ilabel-version-tooltip {
            opacity: 1;
            visibility: visible;
        }

        /* 弹窗样式 */
        #ilabel-alert-popup {
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            border: 2px solid !important;
            border-radius: 10px !important;
            padding: 20px !important;
            z-index: 1000000 !important;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
            font-family: Arial, sans-serif !important;
            min-width: 350px !important;
            max-width: 500px !important;
            background: white !important;
        }

        .ilabel-popup-title {
            font-size: 16px !important;
            font-weight: bold !important;
            margin-bottom: 15px !important;
            padding-bottom: 10px !important;
            border-bottom: 1px solid !important;
        }

        .ilabel-popup-content {
            font-size: 14px !important;
            line-height: 1.5 !important;
            margin-bottom: 15px !important;
        }

        .ilabel-button-container {
            display: flex !important;
            justify-content: space-between !important;
            gap: 10px !important;
        }

        .ilabel-button {
            flex: 1 !important;
            padding: 8px 20px !important;
            border: none !important;
            border-radius: 4px !important;
            cursor: pointer !important;
            font-size: 14px !important;
            transition: opacity 0.3s !important;
        }

        .ilabel-button:hover {
            opacity: 0.9 !important;
        }

        .ilabel-copy-liveid {
            cursor: pointer !important;
            color: #2196f3 !important;
            text-decoration: underline !important;
            font-family: monospace !important;
        }

        /* 错误提示样式 */
        .ilabel-error-toast {
            position: fixed;
            top: 10px;
            right: 10px;
            background: #f44336;
            color: white;
            padding: 10px 20px;
            border-radius: 4px;
            z-index: 999999;
            font-family: Arial, sans-serif;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            max-width: 300px;
        }
    `;

    // ========== 功能函数 ==========

    // 预加载音频
    function preloadAlarmAudio() {
        console.log('开始预加载闹钟音频...');

        // 先尝试从缓存加载
        const cachedAudioData = GM_getValue('ilabel_alarm_audio_data', null);
        const cachedTimestamp = GM_getValue('ilabel_alarm_audio_timestamp', 0);
        const cacheExpiry = 24 * 60 * 60 * 1000; // 24小时缓存

        if (cachedAudioData && (Date.now() - cachedTimestamp) < cacheExpiry) {
            console.log('尝试从缓存加载音频...');
            try {
                // 创建Blob URL
                const byteCharacters = atob(cachedAudioData);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'audio/mpeg' });
                const blobUrl = URL.createObjectURL(blob);

                alarmAudio = new Audio();
                alarmAudio.src = blobUrl;
                alarmAudio.loop = true;
                alarmAudio.volume = 0.4;

                // 预加载
                alarmAudio.load();

                alarmAudio.addEventListener('canplaythrough', function() {
                    console.log('缓存的音频预加载完成');
                });

                alarmAudio.addEventListener('error', function(e) {
                    console.error('缓存的音频加载失败:', e);
                    // 缓存失败，从网络加载
                    loadAudioFromNetwork();
                });

                return;
            } catch (e) {
                console.error('缓存音频处理失败:', e);
            }
        }

        // 从网络加载
        loadAudioFromNetwork();
    }

    // 从网络加载音频
    function loadAudioFromNetwork() {
        console.log('从网络加载音频...');

        GM_xmlhttpRequest({
            method: 'GET',
            url: ALARM_AUDIO_URL + '?t=' + Date.now(),
            responseType: 'arraybuffer',
            timeout: 15000,
            onload: function(response) {
                if (response.status === 200) {
                    try {
                        // 创建Blob
                        const blob = new Blob([response.response], { type: 'audio/mpeg' });
                        const blobUrl = URL.createObjectURL(blob);

                        // 创建音频对象
                        alarmAudio = new Audio();
                        alarmAudio.src = blobUrl;
                        alarmAudio.loop = true;
                        alarmAudio.volume = 0.4;

                        // 预加载
                        alarmAudio.load();

                        // 缓存音频数据
                        const reader = new FileReader();
                        reader.onloadend = function() {
                            const base64data = reader.result.split(',')[1];
                            if (base64data) {
                                GM_setValue('ilabel_alarm_audio_data', base64data);
                                GM_setValue('ilabel_alarm_audio_timestamp', Date.now());
                                console.log('音频数据已缓存');
                            }
                        };
                        reader.readAsDataURL(blob);

                        alarmAudio.addEventListener('canplaythrough', function() {
                            console.log('网络音频预加载完成');
                        });

                        alarmAudio.addEventListener('error', function(e) {
                            console.error('网络音频加载失败:', e);
                        });

                    } catch (e) {
                        console.error('处理音频数据失败:', e);
                    }
                } else {
                    console.error('音频下载失败，状态码:', response.status);
                }
            },
            onerror: function(error) {
                console.error('音频下载网络错误:', error);
            },
            ontimeout: function() {
                console.error('音频下载超时');
            }
        });
    }

    // 播放测试闹钟（7.6秒）
    function playAlarmTest() {
        console.log('开始闹钟测试播放...');

        if (!alarmAudio) {
            console.warn('音频对象未初始化，重新初始化...');
            alarmAudio = new Audio(ALARM_AUDIO_URL + '?t=' + Date.now());
            alarmAudio.loop = true;
            alarmAudio.volume = 0.4;
        }

        // 重置音频
        alarmAudio.currentTime = 0;
        alarmAudio.loop = false; // 测试时不循环

        // 播放音频
        const playPromise = alarmAudio.play();

        if (playPromise !== undefined) {
            playPromise.then(() => {
                isAlarmPlaying = true;
                console.log('测试闹钟开始播放');

                // 自动停止
                alarmTestTimeout = setTimeout(() => {
                    stopAlarmTest();
                    console.log('测试闹钟已停止');
                }, 7600);

            }).catch(error => {
                console.error('测试闹钟播放失败:', error);
                isAlarmPlaying = false;
            });
        }
    }

    // 停止测试闹钟
    function stopAlarmTest() {
        if (alarmTestTimeout) {
            clearTimeout(alarmTestTimeout);
            alarmTestTimeout = null;
        }

        if (alarmAudio && isAlarmPlaying) {
            try {
                alarmAudio.pause();
                alarmAudio.currentTime = 0;
                isAlarmPlaying = false;
                console.log('测试闹钟已停止');
            } catch (e) {
                console.error('停止测试闹钟失败:', e);
            }
        }
    }

    // 加载远程脚本
    function loadRemoteScript() {
        console.log('开始加载远程脚本...');

        GM_xmlhttpRequest({
            method: 'GET',
            url: REMOTE_SCRIPT_URL + '?t=' + Date.now(),
            onload: function(response) {
                if (response.status === 200) {
                    try {
                        parseRemoteScript(response.responseText);
                    } catch (e) {
                        console.error('远程脚本解析失败:', e);
                        showError('远程脚本解析失败: ' + e.message);
                    }
                } else {
                    console.error('远程脚本加载失败，状态码:', response.status);
                    showError('远程脚本加载失败，状态码: ' + response.status);
                }
            },
            onerror: function(error) {
                console.error('远程脚本加载网络错误:', error);
                showError('远程脚本加载网络错误');
            }
        });
    }

    // 解析远程脚本
    function parseRemoteScript(scriptContent) {
        // 提取远程版本号
        const versionMatch = scriptContent.match(/\/\*\s*VERSION:\s*([\d\.]+)\s*\*\//);
        remoteVersion = versionMatch ? versionMatch[1].trim() : null;

        if (!remoteVersion) {
            console.error('未找到远程版本号');
            showError('远程配置缺少版本号');
            return;
        }

        // 检查版本一致性
        if (remoteVersion !== LOCAL_VERSION) {
            console.warn(`版本不匹配: 本地=${LOCAL_VERSION}, 远程=${remoteVersion}`);
        }

        // 解析配置
        const configMatch = scriptContent.match(/\/\* CONFIG START \*\/([\s\S]*?)\/\* CONFIG END \*\//);
        if (configMatch) {
            const configStr = configMatch[1];
            config = {};
            parseConfigFromString(configStr);

            console.log('远程配置加载成功');
            loadRemoteFunctions(scriptContent);
        } else {
            console.error('未找到配置块');
            showError('远程配置格式错误');
        }
    }

    // 从字符串解析所有配置
    function parseConfigFromString(configStr) {
        // 解析主播白名单
        const anchorWhiteListMatch = configStr.match(/anchorWhiteList\s*=\s*"([^"]+)"/);
        if (anchorWhiteListMatch) {
            config.anchorWhiteList = anchorWhiteListMatch[1].trim().split(/\s+/);
        }

        // 解析处罚关键词
        const penaltyKeywordsMatch = configStr.match(/penaltyKeywords\s*=\s*"([^"]+)"/);
        if (penaltyKeywordsMatch) {
            config.penaltyKeywords = penaltyKeywordsMatch[1].trim().split(/\s+/);
        }

        // 解析审核白名单
        const auditorWhiteListMatch = configStr.match(/const\s+auditorWhiteList\s*=\s*(\[[\s\S]*?\])\s*;/);
        if (auditorWhiteListMatch) {
            try {
                config.auditorWhiteList = new Function('return ' + auditorWhiteListMatch[1].trim() + ';')();
            } catch (e) {
                console.error('解析审核白名单失败:', e);
                config.auditorWhiteList = [];
            }
        }

        // 解析审核黑名单
        const auditorBlackListMatch = configStr.match(/auditorBlackList\s*=\s*(\[[\s\S]*?\])\s*;/);
        if (auditorBlackListMatch) {
            try {
                config.auditorBlackList = new Function('return ' + auditorBlackListMatch[1].trim() + ';')();
            } catch (e) {
                console.error('解析审核黑名单失败:', e);
                config.auditorBlackList = [];
            }
        }

        // 解析弹窗颜色配置
        const popupColorsMatch = configStr.match(/const\s+popupColors\s*=\s*(\{[\s\S]*?\})\s*;/);
        if (popupColorsMatch) {
            try {
                config.popupColors = new Function('return ' + popupColorsMatch[1].trim() + ';')();
            } catch (e) {
                console.error('解析弹窗颜色配置失败:', e);
            }
        }

        // 解析推送地址
        const pushUrlMatch = configStr.match(/pushUrl\s*=\s*"([^"]+)"/);
        if (pushUrlMatch) {
            config.pushUrl = pushUrlMatch[1].trim();
        }

        // 解析手机号映射
        generateMobileMapFromWhiteList();

        // 解析事业媒体白名单
        const enterpriseMediaListMatch = configStr.match(/enterpriseMediaWhiteList\s*=\s*"([^"]+)"/);
        if (enterpriseMediaListMatch) {
            config.enterpriseMediaWhiteList = enterpriseMediaListMatch[1].trim().split(/\s+/);
        }
    }

    // 从白名单生成手机号映射
    function generateMobileMapFromWhiteList() {
        config.auditorMobileMap = {};
        if (config.auditorWhiteList && Array.isArray(config.auditorWhiteList)) {
            config.auditorWhiteList.forEach(auditor => {
                if (auditor && auditor.name && auditor.mobile) {
                    config.auditorMobileMap[auditor.name] = auditor.mobile;
                }
            });
        }
    }

    // 加载远程功能函数
    function loadRemoteFunctions(scriptContent) {
        const scriptMatch = scriptContent.match(/\/\* CONFIG END \*\/([\s\S]*)$/);
        if (scriptMatch) {
            try {
                const scriptCode = scriptMatch[1];
                remoteFunctions = new Function('getInfoData', 'config', 'callback', `
                    ${scriptCode}
                    return checkInfo(getInfoData, config, callback);
                `);
                console.log('远程函数创建成功');
                updateVersionTooltip();
            } catch (e) {
                console.error('创建远程函数失败:', e);
                throw e;
            }
        } else {
            console.error('未找到功能函数块');
            showError('远程功能函数格式错误');
        }
    }

    // 创建开关按钮
    function createSwitchButton() {
        const container = document.createElement('div');
        container.className = 'ilabel-switch-container';

        // 推送开关行
        const pushSwitchRow = document.createElement('div');
        pushSwitchRow.className = 'ilabel-switch-row';

        const pushLabel = document.createElement('span');
        pushLabel.className = 'ilabel-switch-label';
        pushLabel.style.color = '#07c160';

        const pushSwitch = document.createElement('label');
        pushSwitch.className = 'push-switch';

        const pushCheckbox = document.createElement('input');
        pushCheckbox.type = 'checkbox';
        pushCheckbox.checked = GM_getValue(SWITCH_KEY, true);

        const pushSlider = document.createElement('span');
        pushSlider.className = 'push-switch-slider';

        pushCheckbox.addEventListener('change', function() {
            GM_setValue(SWITCH_KEY, this.checked);
            updateVersionTooltip();
            console.log('推送提醒状态:', this.checked ? '开启' : '关闭');

            // 如果关闭推送，清除推送定时器
            if (!this.checked && pushInterval) {
                clearInterval(pushInterval);
                pushInterval = null;
            }

            // 如果关闭推送，同时关闭闹钟开关
            if (!this.checked) {
                const alarmCheckbox = document.querySelector('.alarm-switch input[type="checkbox"]');
                if (alarmCheckbox && alarmCheckbox.checked) {
                    alarmCheckbox.checked = false;
                    stopAlarm();
                    stopAlarmTest();
                    updateVersionTooltip(); // 更新状态提示
                    console.log('推送关闭，自动关闭闹钟开关');
                }
            }
        });

        pushSwitch.appendChild(pushCheckbox);
        pushSwitch.appendChild(pushSlider);
        pushSwitchRow.appendChild(pushLabel);
        pushSwitchRow.appendChild(pushSwitch);

        // 闹钟开关行
        const alarmSwitchRow = document.createElement('div');
        alarmSwitchRow.className = 'ilabel-switch-row';

        const alarmLabel = document.createElement('span');
        alarmLabel.className = 'ilabel-switch-label';
        alarmLabel.style.color = '#2196f3';

        const alarmSwitch = document.createElement('label');
        alarmSwitch.className = 'alarm-switch blue';

        const alarmCheckbox = document.createElement('input');
        alarmCheckbox.type = 'checkbox';
        // 每次加载都默认关闭，不读取保存的状态
        alarmCheckbox.checked = false;

        const alarmSlider = document.createElement('span');
        alarmSlider.className = 'alarm-switch-slider';

        alarmCheckbox.addEventListener('change', function() {
            const isChecked = this.checked;
            console.log('闹钟提醒状态:', isChecked ? '开启' : '关闭');

            // 更新状态提示
            updateVersionTooltip();

            // 如果开启闹钟，播放测试音频
            if (isChecked) {
                // 自动打开推送开关
                if (!pushCheckbox.checked) {
                    pushCheckbox.checked = true;
                    GM_setValue(SWITCH_KEY, true);
                    updateVersionTooltip(); // 再次更新，因为推送状态也变了
                    console.log('闹钟开启，自动打开推送开关');
                }

                // 播放测试闹钟
                setTimeout(() => {
                    playAlarmTest();
                }, 100);
            } else {
                stopAlarm();
                stopAlarmTest();
            }
        });

        alarmSwitch.appendChild(alarmCheckbox);
        alarmSwitch.appendChild(alarmSlider);
        alarmSwitchRow.appendChild(alarmLabel);
        alarmSwitchRow.appendChild(alarmSwitch);

        // 组装
        container.appendChild(pushSwitchRow);
        container.appendChild(alarmSwitchRow);

        const versionTooltip = document.createElement('div');
        versionTooltip.className = 'ilabel-version-tooltip';
        versionTooltip.id = 'ilabel-version-tooltip';
        versionTooltip.textContent = '加载中...';
        container.appendChild(versionTooltip);

        updateVersionTooltip();

        return container;
    }

    // 更新提示
    function updateVersionTooltip() {
        const tooltip = document.getElementById('ilabel-version-tooltip');
        if (!tooltip) return;

        const pushCheckbox = document.querySelector('.push-switch input[type="checkbox"]');
        const alarmCheckbox = document.querySelector('.alarm-switch input[type="checkbox"]');

        // 推送状态从存储获取
        const isPushEnabled = GM_getValue(SWITCH_KEY, true);
        // 闹钟状态直接从checkbox获取
        const isAlarmEnabled = alarmCheckbox ? alarmCheckbox.checked : false;

        const pushStatus = isPushEnabled ? '推送开' : '推送关';
        const alarmStatus = isAlarmEnabled ? '闹钟开' : '闹钟关';
        tooltip.innerHTML = `${LOCAL_VERSION}<br>${pushStatus}<br>${alarmStatus}`;
    }

    // 监听网络请求（包含第二个脚本的功能）
    function setupRequestInterception() {
        const originalFetch = window.fetch;
        if (originalFetch) {
            window.fetch = function(...args) {
                const url = args[0];
                if (typeof url === 'string') {
                    // 监听直播信息请求
                    if (url.includes('get_live_info_batch')) {
                        const fetchPromise = originalFetch.apply(this, args);
                        fetchPromise.then(response => {
                            if (response.ok) {
                                response.clone().json().then(data => {
                                    if (data.ret === 0 && data.liveInfoList?.length > 0) {
                                        processLiveInfo(data.liveInfoList[0]);
                                    }
                                }).catch(() => {});
                            }
                        }).catch(() => {});
                        return fetchPromise;
                    }
                    // 监听审核提交请求
                    else if (url.includes('/api/answers')) {
                        const body = args[1];
                        if (body && typeof body === 'string' && body.trim()) {
                            try {
                                processAuditData(body);
                            } catch (e) {
                                // 静默处理错误
                            }
                        }
                        return originalFetch.apply(this, args);
                    }
                }
                return originalFetch.apply(this, args);
            };
        }

        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function(method, url) {
            this._method = method.toUpperCase();
            this._url = url;
            return originalOpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function(body) {
            const xhr = this;

            // 监听直播信息请求
            if (xhr._url && xhr._url.includes('get_live_info_batch')) {
                xhr.addEventListener('load', () => {
                    if (xhr.status === 200) {
                        try {
                            const data = JSON.parse(xhr.responseText);
                            if (data.ret === 0 && data.liveInfoList?.length > 0) {
                                processLiveInfo(data.liveInfoList[0]);
                            }
                        } catch (e) {}
                    }
                });
            }
            // 监听审核提交请求
            else if (xhr._method === 'POST' && xhr._url && xhr._url.includes('/api/answers')) {
                if (body) {
                    try {
                        processAuditData(body);
                    } catch (error) {
                        // 静默处理错误
                    }
                }
            }

            return originalSend.call(this, body);
        };
    }

    // 处理直播信息
    async function processLiveInfo(liveInfo) {
        if (!remoteFunctions || !config || remoteVersion !== LOCAL_VERSION) {
            return;
        }

        try {
            const basicInfo = {
                liveid: liveInfo.liveId || '',
                description: liveInfo.description || '',
                nickname: liveInfo.nickname || '',
                signature: liveInfo.signature || '',
                authStatus: liveInfo.authStatus || '',
                createLiveArea: liveInfo.extraField?.createLiveArea || '',
                poiName: liveInfo.poiName || '',
                streamStartTime: liveInfo.streamStartTime || ''
            };

            basicInfo.auditor = await getAuditorInfo();

            const auditInfo = await getAuditInfo();
            basicInfo.audit_time = auditInfo.audit_time;
            basicInfo.auditRemark = auditInfo.auditRemark;

            currentLiveData = basicInfo;
            remoteFunctions(basicInfo, config, displayResult);
        } catch (e) {
            console.error('处理直播信息失败:', e);
        }
    }

    // 处理审核提交数据
    function processAuditData(requestBody) {
        try {
            const parsedData = typeof requestBody === 'string'
                ? JSON.parse(requestBody)
                : requestBody;

            if (!parsedData.results) return;

            Object.values(parsedData.results).forEach(result => {
                if (!result) return;

                // 提取task_id和liveId
                const taskId = result.task_id || '';
                const liveId = result.live_id || '';

                // 提取操作人（获取-后的文字）
                let operator = '未知操作人';
                if (result.oper_name && result.oper_name.includes('-')) {
                    operator = result.oper_name.split('-').pop().trim();
                } else if (result.oper_name) {
                    operator = result.oper_name.trim();
                }

                // 检查punish_keyword和remark
                let conclusion = '不处罚';
                let punishKeyword = null;
                let remark = null;

                if (result.finder_object && Array.isArray(result.finder_object)) {
                    for (const item of result.finder_object) {
                        if (item.ext_info && item.ext_info.punish_keyword) {
                            punishKeyword = item.ext_info.punish_keyword;
                            remark = item.remark || null;
                            break;
                        }
                    }
                }

                // 构建结论
                if (punishKeyword) {
                    conclusion = remark ? `${punishKeyword}（${remark}）` : punishKeyword;
                }

                // 存储待推送的数据
                pendingAuditData = {
                    task_id: taskId,
                    live_id: liveId,
                    conclusion: conclusion,
                    operator: operator
                };

                // 输出到控制台
                console.log(`task_id：${taskId}`);
                console.log(`live_id：${taskId}`);
                console.log(`结论：${conclusion}`);
                console.log(`操作人：${operator}`);

                // 发送企业微信推送
                sendAuditResultToWeChat(pendingAuditData);
            });

        } catch (error) {
            // 静默处理解析错误
            console.error('解析审核数据失败:', error);
        }
    }

    // 发送审核结果到企业微信
    function sendAuditResultToWeChat(auditData) {
        if (!config?.pushUrl) {
            console.error('推送地址未配置');
            return;
        }

        if (!GM_getValue(SWITCH_KEY, true)) {
            console.log('推送开关关闭，不发送审核结果推送');
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

        console.log('发送审核结果到企业微信:', data);

        GM_xmlhttpRequest({
            method: 'POST',
            url: config.pushUrl,
            headers: {
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(data),
            timeout: 5000,
            onload: function(response) {
                if (response.status === 200) {
                    console.log('审核结果推送成功');
                } else {
                    console.error('审核结果推送失败:', response.status, response.responseText);
                }
            },
            onerror: function(error) {
                console.error('审核结果推送错误:', error);
            }
        });
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
            console.error('获取审核人员信息失败:', e);
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
                console.error('获取送审信息HTTP错误:', response.status);
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
            console.error('获取送审信息失败:', e);
        }
        return { audit_time: 0, auditRemark: '' };
    }

    // Unicode解码函数
    function decodeUnicode(str) {
        if (!str) return '';
        try {
            return str.replace(/\\u([\dA-F]{4})/gi,
                (match, group) => String.fromCharCode(parseInt(group, 16)));
        } catch (e) {
            return str;
        }
    }

    // 显示结果
    function displayResult(result) {
        if (!result || !result.message) return;

        currentResultType = result.type;

        // 黑名单不显示任何弹窗
        if (result.type === 'blacklist') {
            console.log('审核人员在黑名单中，不显示弹窗');
            return;
        }

        // 普通单只有在推送开关开启时才显示
        if (result.type === 'normal') {
            if (!GM_getValue(SWITCH_KEY, true)) {
                console.log('推送开关关闭，普通单不显示弹窗');
                return;
            }
        }

        // 非普通单无论推送开关状态都显示
        createPopup(result);
    }

    // 创建弹窗
    function createPopup(result) {
        const oldPopup = document.getElementById('ilabel-alert-popup');
        if (oldPopup) oldPopup.remove();

        if (popupCheckInterval) {
            clearInterval(popupCheckInterval);
        }

        if (pushInterval) {
            clearInterval(pushInterval);
            pushInterval = null;
        }

        stopAlarm();
        stopAlarmTest();

        // 设置颜色
        let color = null;
        if (config && config.popupColors && config.popupColors[result.type]) {
            color = config.popupColors[result.type];
        } else {
            color = { bg: '#f5f5f5', border: '#9e9e9e', text: '#424242' };
        }

        const popup = document.createElement('div');
        popup.id = 'ilabel-alert-popup';
        popup.style.cssText = `
            background: ${color.bg} !important;
            border-color: ${color.border} !important;
            color: ${color.text} !important;
        `;

        // 标题
        const title = document.createElement('div');
        title.className = 'ilabel-popup-title';
        title.style.borderBottomColor = color.border;
        title.textContent = '直播审核提醒';

        // 内容
        const content = document.createElement('div');
        content.className = 'ilabel-popup-content';

        // 格式化时间
        const formatTime = (timestamp) => {
            if (!timestamp || timestamp === '0') return '未知';
            try {
                const date = new Date(parseInt(timestamp) * 1000);
                return date.toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                }).replace(/\//g, '-');
            } catch (e) {
                return '时间格式错误';
            }
        };

        let contentHTML = `
            <div style="margin-bottom: 10px; padding: 8px; background: ${color.bg}40; border-radius: 4px;">
                <strong>提示:</strong> ${result.message}
            </div>
        `;

        if (currentLiveData) {
            // 计算时间差
            const streamTime = parseInt(currentLiveData.streamStartTime) || 0;
            const auditTime = parseInt(currentLiveData.audit_time) || 0;
            let timeDiffText = '';

            if (streamTime > 0 && auditTime > 0) {
                const diffMinutes = Math.round((auditTime - streamTime) / 60);
                timeDiffText = diffMinutes >= 0 ? ` (已开播${diffMinutes}分钟)` : ` (超前${Math.abs(diffMinutes)}分钟)`;
            }

            contentHTML += `
                <div style="margin-bottom: 8px;"><strong>直播ID:</strong>
                    <span class="ilabel-copy-liveid" onclick="this.copyLiveID('${currentLiveData.liveid}')">${currentLiveData.liveid}</span>
                </div>
                <div style="margin-bottom: 6px;"><strong>主播昵称:</strong> ${currentLiveData.nickname}</div>
                <div style="margin-bottom: 6px;"><strong>主播认证:</strong> ${currentLiveData.authStatus || '无认证'}</div>
                <div style="margin-bottom: 6px;"><strong>主播简介:</strong> ${currentLiveData.signature || '无'}</div>
                <div style="margin-bottom: 6px;"><strong>直播间描述:</strong> ${currentLiveData.description || '无'}</div>
                <div style="margin-bottom: 6px;"><strong>开播地:</strong> ${currentLiveData.createLiveArea || '未知'}</div>
                <div style="margin-bottom: 6px;"><strong>开播位置:</strong> ${currentLiveData.poiName || '未知'}</div>
                <div style="margin-bottom: 6px;"><strong>开播时间:</strong> ${formatTime(currentLiveData.streamStartTime)}${timeDiffText}</div>
                <div style="margin-bottom: 6px;"><strong>送审时间:</strong> ${formatTime(currentLiveData.audit_time)}</div>
                <div style="margin-bottom: 6px;"><strong>审核人员:</strong> ${currentLiveData.auditor || '未知'}</div>
                <div style="margin-bottom: 6px;"><strong>送审备注:</strong> ${currentLiveData.auditRemark || '无'}</div>
            `;
        }

        content.innerHTML = contentHTML;

        // 添加复制函数
        content.querySelector('.ilabel-copy-liveid').copyLiveID = function(liveid) {
            navigator.clipboard.writeText(liveid).then(() => {
                const originalText = this.textContent;
                this.textContent = '已复制!';
                this.style.color = '#4caf50';
                setTimeout(() => {
                    this.textContent = originalText;
                    this.style.color = '#2196f3';
                }, 2000);
            });
        };

        // 按钮容器
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'ilabel-button-container';

        // 复制按钮
        const copyBtn = document.createElement('button');
        copyBtn.className = 'ilabel-button';
        copyBtn.textContent = '复制直播ID';
        copyBtn.style.background = '#2196f3';
        copyBtn.style.color = 'white';

        copyBtn.onclick = () => {
            if (currentLiveData?.liveid) {
                navigator.clipboard.writeText(currentLiveData.liveid).then(() => {
                    copyBtn.textContent = '已复制!';
                    copyBtn.style.background = '#4caf50';
                    setTimeout(() => {
                        copyBtn.textContent = '复制直播ID';
                        copyBtn.style.background = '#2196f3';
                    }, 2000);
                });
            }
        };

        // 确认按钮
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'ilabel-button';
        confirmBtn.textContent = '确认';
        confirmBtn.style.background = color.border;
        confirmBtn.style.color = 'white';

        // 确认按钮点击处理函数
        const confirmHandler = function() {
            popup.remove();
            popupConfirmed = true;
            lastPopupTime = null;

            if (popupCheckInterval) {
                clearInterval(popupCheckInterval);
                popupCheckInterval = null;
            }
            if (pushInterval) {
                clearInterval(pushInterval);
                pushInterval = null;
            }

            stopAlarm();
            stopAlarmTest();

            // 移除键盘事件监听
            document.removeEventListener('keydown', keydownHandler);
        };

        confirmBtn.onclick = confirmHandler;

        // 键盘事件处理函数
        const keydownHandler = function(e) {
            // 按下空格键且弹窗存在
            if (e.code === 'Space' && document.getElementById('ilabel-alert-popup')) {
                e.preventDefault(); // 防止页面滚动
                confirmHandler(); // 执行确认操作
            }
        };

        // 添加键盘事件监听
        document.addEventListener('keydown', keydownHandler);

        // 组装弹窗
        buttonContainer.appendChild(copyBtn);
        buttonContainer.appendChild(confirmBtn);
        popup.appendChild(title);
        popup.appendChild(content);
        popup.appendChild(buttonContainer);
        document.body.appendChild(popup);

        // 启动监控
        lastPopupTime = Date.now();
        popupConfirmed = false;
        monitorPopup();
    }

    // 监控弹窗
    function monitorPopup() {
        popupCheckInterval = setInterval(() => {
            const popupExists = !!document.getElementById('ilabel-alert-popup');
            const timeElapsed = Date.now() - lastPopupTime;

            // 闹钟条件：闹钟开关开启且当前没有在响铃
            const alarmCheckbox = document.querySelector('.alarm-switch input[type="checkbox"]');
            const isAlarmEnabled = alarmCheckbox ? alarmCheckbox.checked : false;
            if (isAlarmEnabled && !isAlarmPlaying) {
                playAlarm();
            }

            // 20秒后检查推送
            if (timeElapsed > 20000 && popupExists && currentLiveData && config) {
                const auditorName = currentLiveData.auditor;

                // 检查是否在白名单中
                const isInWhiteList = config.auditorWhiteList &&
                    config.auditorWhiteList.some(item => item && item.name === auditorName);

                // 推送条件：在白名单中且推送开关开启
                if (isInWhiteList && GM_getValue(SWITCH_KEY, true)) {
                    if (!pushInterval) {
                        sendWeChatNotification(auditorName);
                        pushInterval = setInterval(() => {
                            if (popupExists && GM_getValue(SWITCH_KEY, true)) {
                                sendWeChatNotification(auditorName);
                            } else {
                                clearInterval(pushInterval);
                                pushInterval = null;
                            }
                        }, 20000);
                    }
                }
            }

            // 如果弹窗已关闭，清理定时器
            if (!popupExists) {
                if (popupCheckInterval) {
                    clearInterval(popupCheckInterval);
                    popupCheckInterval = null;
                }
                if (pushInterval) {
                    clearInterval(pushInterval);
                    pushInterval = null;
                }
                stopAlarm();
                stopAlarmTest();
            }
        }, 1000);
    }

    // 播放闹钟声音
    function playAlarm() {
        try {
            console.log('开始播放闹钟...');

            if (!alarmAudio) {
                console.warn('音频对象未初始化');
                alarmAudio = new Audio(ALARM_AUDIO_URL + '?t=' + Date.now());
                alarmAudio.loop = true;
                alarmAudio.volume = 0.4;
            }

            alarmAudio.loop = true;
            alarmAudio.currentTime = 0;

            const playPromise = alarmAudio.play();

            if (playPromise !== undefined) {
                playPromise.then(() => {
                    isAlarmPlaying = true;
                    console.log('闹钟开始播放');
                }).catch(error => {
                    console.error('闹钟播放失败:', error);
                    isAlarmPlaying = false;
                });
            }

        } catch (e) {
            console.error('播放闹钟异常:', e);
            isAlarmPlaying = false;
        }
    }

    // 停止闹钟
    function stopAlarm() {
        if (alarmAudio && isAlarmPlaying) {
            try {
                alarmAudio.pause();
                alarmAudio.currentTime = 0;
                isAlarmPlaying = false;
                console.log('闹钟已停止');
            } catch (e) {
                console.error('停止闹钟失败:', e);
            }
        }
    }

    // 获取初判结果文本
    function getInitialJudgmentText() {
        switch (currentResultType) {
            case 'prefilled': return '预埋';
            case 'exempted': return '豁免';
            case 'review': return '复核';
            case 'targeted': return '点杀';
            case 'penalty': return '违规';
            default: return '普通';
        }
    }

    // 格式化时间为24小时制时分秒
    function formatTime24() {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }

    // 发送企业微信通知（弹窗超时提醒）
    function sendWeChatNotification(auditorName) {
        if (!config?.pushUrl) {
            console.error('推送地址未配置');
            return;
        }

        const mentionedMobile = config.auditorMobileMap &&
                                config.auditorMobileMap[auditorName];

        const timeStr = formatTime24();
        const judgmentText = getInitialJudgmentText();
        const content = `${timeStr} ${judgmentText}单未确认`;

        const data = {
            msgtype: "text",
            text: {
                content: content
            }
        };

        if (mentionedMobile) {
            data.text.mentioned_mobile_list = [mentionedMobile];
            console.log(`将@审核人员: ${auditorName} (手机号: ${mentionedMobile})`);
        }

        console.log('发送企业微信通知:', data);

        GM_xmlhttpRequest({
            method: 'POST',
            url: config.pushUrl,
            headers: {
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(data),
            timeout: 5000,
            onload: function(response) {
                if (response.status === 200) {
                    console.log('企业微信通知发送成功');
                } else {
                    console.error('企业微信通知发送失败:', response.status, response.responseText);
                }
            },
            onerror: function(error) {
                console.error('企业微信通知发送错误:', error);
            }
        });
    }

    // 显示错误提示
    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'ilabel-error-toast';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
    }

    // 监听页面变化
    function observePageChanges() {
        let lastUrl = location.href;
        new MutationObserver(() => {
            const url = location.href;
            if (url !== lastUrl) {
                lastUrl = url;
                setTimeout(() => {
                    const existingSwitch = document.querySelector('.ilabel-switch-container');
                    if (!existingSwitch) {
                        const newSwitch = createSwitchButton();
                        document.body.appendChild(newSwitch);
                    }
                }, 1000);
            }
        }).observe(document, { subtree: true, childList: true });
    }

    // 初始化
    function init() {
        console.log(`iLabel直播审核辅助工具 ${LOCAL_VERSION} 初始化...`);

        GM_addStyle(STYLES);
        preloadAlarmAudio();
        loadRemoteScript();

        const addSwitch = () => {
            const switchBtn = createSwitchButton();
            document.body.appendChild(switchBtn);
            console.log('开关按钮已添加');
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', addSwitch);
        } else {
            addSwitch();
        }

        setupRequestInterception();
        observePageChanges();

        window.getReminderStatus = () => GM_getValue(SWITCH_KEY, true);
        window.getAlarmStatus = () => {
            const alarmCheckbox = document.querySelector('.alarm-switch input[type="checkbox"]');
            return alarmCheckbox ? alarmCheckbox.checked : false;
        };

        console.log('iLabel辅助工具初始化完成');
    }

    init();
})();
