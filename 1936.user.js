// ==UserScript==
// @name         1936助手
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  监控GetLiveInfo请求，队列处理，计时直到ReportAuditResult
// @author       ehekatle
// @homepage     https://github.com/ehekatle/ilabel
// @source       https://raw.githubusercontent.com/ehekatle/ilabel/main/1936.user.js
// @updateURL    https://hk.gh-proxy.org/https://raw.githubusercontent.com/ehekatle/ilabel/main/1936.user.js
// @downloadURL  https://hk.gh-proxy.org/https://raw.githubusercontent.com/ehekatle/ilabel/main/1936.user.js
// @match        https://mp.weixinbridge.com/outsourcing/*
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // ==================== 常量配置 ====================
    var MUSIC_URL = 'https://hk.gh-proxy.org/https://raw.githubusercontent.com/ehekatle/ilabel/main/music.mp3';
    var WEBHOOK_URL = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=90014c35-804f-489e-b203-bf59f46f69fb';
    var WHITELIST = [
        "事业媒体",
        "事业单位",
        "深圳周大福在线传媒有限公司",
        "上海老凤祥旅游产品有限公司",
        "上海老凤祥有限公司",
        "周六福电子商务有限公司",
        "周大生珠宝股份有限公司",
        "周大生",
        "CHOW TAI SENG",
        "六福营销策划(重庆)有限公司",
        "中金珠宝（三亚）有限公司",
        "中国黄金集团黄金珠宝（北京）有限公司",
        "中国黄金集团团黄金珠宝股份有限公司",
        "珀思岚",
        "深圳市珀思岚电子商务有限公司",
        "京润珍珠",
        "深圳京润蔻润商业发展有限公司",
        "京润珍珠",
        "GN PEARL",
        "北京故宫文化传播有限公司",
        "故宫文化创意产业有限公司"
    ];

    // ==================== 日志系统 ====================
    var LOG_PREFIX = '【监控胶囊】';
    var debugMode = true;

    function log() {
        if (debugMode) {
            console.log.apply(console, [LOG_PREFIX].concat(Array.prototype.slice.call(arguments)));
        }
    }

    function logInfo() {
        if (debugMode) {
            console.info.apply(console, [LOG_PREFIX, '信息'].concat(Array.prototype.slice.call(arguments)));
        }
    }

    function logWarn() {
        if (debugMode) {
            console.warn.apply(console, [LOG_PREFIX, '警告'].concat(Array.prototype.slice.call(arguments)));
        }
    }

    function logError() {
        if (debugMode) {
            console.error.apply(console, [LOG_PREFIX, '错误'].concat(Array.prototype.slice.call(arguments)));
        }
    }

    function logSuccess() {
        if (debugMode) {
            console.log.apply(console, [LOG_PREFIX, '成功'].concat(Array.prototype.slice.call(arguments)));
        }
    }

    // ==================== 请求队列管理 ====================
    var requestQueue = [];
    var currentRequest = null;
    var timerInterval = null;
    var pushInterval = null;
    var audio = null;
    var isTimerRunning = false;
    var startTime = null;
    var currentLiveId = null;
    var lastAuthStatus = '';  // 改为存储 auth_status
    var isWhiteListed = false;
    var lastDisplayTime = '00:00';
    var pushTimeout = null;
    var pageLoadTime = Date.now();
    var hasBeenClicked = false;

    // ==================== 胶囊元素 ====================
    var capsule = document.createElement('div');
    var timerDisplay = document.createElement('span');
    var queueDisplay = document.createElement('span');

    // ==================== 加深的颜色定义 ====================
    var colors = {
        white: '#e0e0e0',        // 更深的灰色（默认状态）
        yellow: '#ffe082',        // 更深的黄色（GetLiveInfo后未点击）
        green: '#a5d6a7',         // 更深的绿色（白名单点击后）
        red: '#ef9a9a'            // 更深的红色（备用）
    };

    // ==================== 默认配置 ====================
    var defaultConfig = {
        position: { x: 100, y: 100 },
        sizePercent: 100,
        opacity: 0.9,
        phoneNumber: '',
        alarmEnabled: true,
        debugMode: true
    };

    // 从存储加载配置
    var config = GM_getValue('capsuleConfig', defaultConfig);

    // 验证位置是否有效
    function validatePosition(pos) {
        if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number' ||
            isNaN(pos.x) || isNaN(pos.y) || pos.x < 0 || pos.y < 0) {
            return false;
        }
        return true;
    }

    // 如果位置无效，使用默认值
    if (!validatePosition(config.position)) {
        log('检测到无效的胶囊位置，使用默认值');
        config.position = { x: defaultConfig.position.x, y: defaultConfig.position.y };
        GM_setValue('capsuleConfig', config);
    }

    // ==================== 基础尺寸 ====================
    var BASE_WIDTH = 160;
    var BASE_HEIGHT = 40;

    // ==================== 工具函数：从FormData中提取内容 ====================
    function extractFromFormData(formData) {
        try {
            var result = {};
            if (formData && typeof formData.forEach === 'function') {
                formData.forEach(function(value, key) {
                    result[key] = value;
                });
            }
            return result;
        } catch (e) {
            logError('解析FormData失败:', e);
            return {};
        }
    }

    function extractLiveIdFromBody(body) {
        if (!body) return null;

        try {
            // 处理 FormData
            if (body && body.constructor && body.constructor.name === 'FormData') {
                var formDataObj = extractFromFormData(body);
                // 检查 body 字段
                if (formDataObj.body) {
                    var match = formDataObj.body.toString().match(/"live_id":"(\d+)"/);
                    if (match && match[1]) {
                        return match[1];
                    }
                }
            }

            // 处理字符串
            if (typeof body === 'string') {
                var match = body.match(/"live_id":"(\d+)"/);
                if (match && match[1]) {
                    return match[1];
                }
            }

        } catch (e) {
            logError('提取live_id失败:', e);
        }

        return null;
    }

    function isGetLiveInfoRequest(body) {
        if (!body) return false;

        try {
            if (body && body.constructor && body.constructor.name === 'FormData') {
                var formDataObj = extractFromFormData(body);
                return formDataObj.method === 'GetLiveInfo';
            }
            if (typeof body === 'string') {
                return body.includes('GetLiveInfo');
            }
        } catch (e) {}

        return false;
    }

    // 检测是否是审计完成请求
    function isReportAuditResult(body) {
        if (!body) return false;

        try {
            // 处理 FormData
            if (body && body.constructor && body.constructor.name === 'FormData') {
                var formDataObj = extractFromFormData(body);
                // 检查 method 字段
                if (formDataObj.method === 'ReportAuditResult') {
                    log('检测到 ReportAuditResult (FormData method)');
                    return true;
                }
                // 检查 body 字段
                if (formDataObj.body && typeof formDataObj.body === 'string') {
                    if (formDataObj.body.includes('ReportAuditResult')) {
                        log('检测到 ReportAuditResult (FormData body)');
                        return true;
                    }
                }
            }

            // 处理字符串
            if (typeof body === 'string') {
                if (body.includes('ReportAuditResult')) {
                    log('检测到 ReportAuditResult (String)');
                    return true;
                }
            }

            // 处理对象
            if (typeof body === 'object') {
                var str = String(body);
                if (str.includes('ReportAuditResult')) {
                    log('检测到 ReportAuditResult (Object)');
                    return true;
                }
            }

        } catch (e) {
            logError('检查ReportAuditResult失败:', e);
        }

        return false;
    }

    // ==================== 队列管理函数 ====================
    function addToQueue(liveId) {
        var exists = requestQueue.some(function(item) { return item === liveId; }) || currentRequest === liveId;
        if (exists) {
            log('请求已存在队列中:', liveId);
            return false;
        }

        requestQueue.push(liveId);
        log('添加到队列，当前队列:', requestQueue);
        updateQueueDisplay();

        if (!currentRequest) {
            processNextInQueue();
        }

        return true;
    }

    function processNextInQueue() {
        if (requestQueue.length === 0) {
            log('队列为空');
            return;
        }

        currentRequest = requestQueue.shift();
        currentLiveId = currentRequest;
        hasBeenClicked = false;

        log('========== 开始处理队列中的请求 ==========');
        log('Live ID:', currentRequest);
        log('剩余队列:', requestQueue);
        updateQueueDisplay();

        resetTimer();
        startMonitoring(currentRequest);
    }

    // 直接结束当前请求
    function completeCurrentRequest() {
        if (!currentRequest) {
            log('没有当前正在处理的请求，忽略审计完成信号');
            return;
        }

        log('========== 审计完成 ==========');
        log('完成当前请求 - Live ID:', currentRequest);
        log('当前计时:', lastDisplayTime);

        // 停止计时器（保持显示当前时间）
        stopTimer();

        // 停止推送
        stopPushNotifications();

        // 停止音乐
        stopMusic();

        if (pushTimeout) {
            clearTimeout(pushTimeout);
            pushTimeout = null;
        }

        // 提交后显示为白色
        updateCapsuleColor(colors.white, '等待监控');

        log('当前请求处理完成，计时停留在:', lastDisplayTime);

        // 清空当前请求
        var completedRequest = currentRequest;
        currentRequest = null;
        currentLiveId = null;
        hasBeenClicked = false;

        // 处理下一个请求
        processNextInQueue();

        logSuccess('请求 ' + completedRequest + ' 处理完成');
    }

    function resetAllState() {
        log('页面刷新/重新加载，清空所有状态');

        requestQueue = [];
        currentRequest = null;
        currentLiveId = null;
        hasBeenClicked = false;

        stopTimer();
        stopPushNotifications();
        stopMusic();

        if (pushTimeout) {
            clearTimeout(pushTimeout);
            pushTimeout = null;
        }

        lastDisplayTime = '00:00';
        timerDisplay.textContent = lastDisplayTime;
        updateCapsuleColor(colors.white, '等待监控');
        updateQueueDisplay();

        pageLoadTime = Date.now();
    }

    // ==================== 胶囊初始化 ====================
    function initCapsule() {
        capsule.id = 'monitor-capsule';

        // 右侧队列显示圆
        queueDisplay.id = 'capsule-queue';
        updateQueueDisplay();

        // 计时器
        timerDisplay.id = 'capsule-timer';
        timerDisplay.textContent = lastDisplayTime;
        timerDisplay.style.pointerEvents = 'none';
        timerDisplay.style.flex = '1';
        timerDisplay.style.textAlign = 'center';
        timerDisplay.style.paddingRight = '5px'; // 给右侧圆留出空间

        capsule.appendChild(timerDisplay);
        capsule.appendChild(queueDisplay);
        document.body.appendChild(capsule);

        // 应用存储的位置 - 使用 !important 强制覆盖其他样式
        applyPosition();

        makeDraggable(capsule);
        capsule.addEventListener('click', onCapsuleClick);

        logSuccess('胶囊初始化完成，位置:', config.position);
    }

    // 应用存储的位置，使用 !important 防止被其他代码覆盖
    function applyPosition() {
        if (!capsule) return;

        // 先应用样式
        updateCapsuleStyle();

        // 使用 setProperty 和 !important 强制覆盖
        capsule.style.setProperty('left', config.position.x + 'px', 'important');
        capsule.style.setProperty('top', config.position.y + 'px', 'important');

        // 同时设置普通样式作为备份
        capsule.style.left = config.position.x + 'px';
        capsule.style.top = config.position.y + 'px';
    }

    function updateCapsuleStyle() {
        var width = Math.round(BASE_WIDTH * (config.sizePercent / 100));
        var height = Math.round(BASE_HEIGHT * (config.sizePercent / 100));
        var fontSize = Math.round(14 * (config.sizePercent / 100));

        capsule.style.cssText =
            'position: fixed;' +
            'background-color: ' + colors.white + ';' +
            'border-radius: 999px;' +
            'opacity: ' + config.opacity + ';' +
            'width: ' + width + 'px;' +
            'height: ' + height + 'px;' +
            'display: flex;' +
            'justify-content: space-between;' +
            'align-items: center;' +
            'cursor: move;' +
            'z-index: 999999;' +
            'box-shadow: 0 2px 10px rgba(0,0,0,0.2);' +
            'user-select: none;' +
            'transition: background-color 0.3s, box-shadow 0.2s;' +
            'color: #333;' +
            'font-weight: bold;' +
            'font-size: ' + fontSize + 'px;' +
            'border: 2px solid white;' +
            'padding: 0;' +
            'box-sizing: border-box;' +
            'will-change: left, top;';

        // 修复队列显示圆的样式 - 精确对齐
        var circleSize = height; // 圆的大小等于胶囊高度

        queueDisplay.style.cssText =
            'width: ' + circleSize + 'px;' +
            'height: ' + circleSize + 'px;' +
            'border-radius: 50%;' +
            'background-color: ' + colors.white + ';' +
            'color: #333;' +
            'display: flex;' +
            'justify-content: center;' +
            'align-items: center;' +
            'font-size: ' + Math.round(fontSize * 1.1) + 'px;' +
            'font-weight: bold;' +
            'position: relative;' +
            'right: -2px;' + // 向右偏移2px实现重叠
            'box-shadow: -1px 0 3px rgba(0,0,0,0.1);' +
            'border: 2px solid white;' +
            'margin-left: -' + (circleSize / 4) + 'px;' + // 向左margin实现重叠
            'pointer-events: none;' +
            'flex-shrink: 0;'; // 防止被压缩

        // 计时器样式调整
        timerDisplay.style.paddingRight = (circleSize / 3) + 'px'; // 动态调整右边距
    }

    function updateQueueDisplay() {
        var queueLength = requestQueue.length;
        queueDisplay.textContent = queueLength;
        queueDisplay.style.backgroundColor = colors.white;
    }

    function updateCapsuleColor(color, status) {
        capsule.style.backgroundColor = color;
        if (status) {
            capsule.setAttribute('title', status);
        }
    }

    // ==================== 拖拽功能 ====================
    function makeDraggable(element) {
        var isDragging = false;
        var offsetX, offsetY;

        element.addEventListener('mousedown', function(e) {
            if (e.button !== 0) return;

            e.preventDefault();
            e.stopPropagation();

            var rect = element.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;

            isDragging = true;

            element.style.cursor = 'grabbing';
            element.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
            element.style.transition = 'none';
        });

        document.addEventListener('mousemove', function(e) {
            if (!isDragging) return;

            e.preventDefault();

            var newLeft = e.clientX - offsetX;
            var newTop = e.clientY - offsetY;

            newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - element.offsetWidth));
            newTop = Math.max(0, Math.min(newTop, window.innerHeight - element.offsetHeight));

            element.style.left = newLeft + 'px';
            element.style.top = newTop + 'px';
        });

        document.addEventListener('mouseup', function(e) {
            if (isDragging) {
                isDragging = false;

                element.style.cursor = 'move';
                element.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
                element.style.transition = 'background-color 0.3s, box-shadow 0.2s';

                var rect = element.getBoundingClientRect();
                config.position = {
                    x: Math.round(rect.left),
                    y: Math.round(rect.top)
                };
                GM_setValue('capsuleConfig', config);

                // 重新应用 !important 确保位置被保存
                element.style.setProperty('left', config.position.x + 'px', 'important');
                element.style.setProperty('top', config.position.y + 'px', 'important');

                logSuccess('胶囊位置已保存:', config.position);
            }
        });

        element.addEventListener('dragstart', function(e) {
            e.preventDefault();
        });
    }

    function formatTime(seconds) {
        var mins = Math.floor(seconds / 60);
        var secs = Math.floor(seconds % 60);
        return (mins < 10 ? '0' + mins : mins) + ':' + (secs < 10 ? '0' + secs : secs);
    }

    function startMonitoring(liveId) {
        log('========== 开始监控 ==========');
        log('Live ID:', liveId);

        // GetLiveInfo出现后，未点击时，胶囊为黄色
        updateCapsuleColor(colors.yellow, '监控中 - 未点击 - Live ID: ' + liveId);

        startTimer();

        if (config.alarmEnabled) {
            playMusic();
        }

        if (pushTimeout) {
            clearTimeout(pushTimeout);
        }

        pushTimeout = setTimeout(function() {
            if (currentRequest === liveId && !hasBeenClicked) {
                log('延迟20秒结束，开始推送');
                startPushNotifications();
            }
        }, 20000);

        logSuccess('监控已启动: ' + liveId);
    }

    function startTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
        }

        startTime = Date.now();
        isTimerRunning = true;

        timerInterval = setInterval(function() {
            if (startTime && isTimerRunning) {
                var elapsed = Math.floor((Date.now() - startTime) / 1000);
                lastDisplayTime = formatTime(elapsed);
                timerDisplay.textContent = lastDisplayTime;
            }
        }, 1000);
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        isTimerRunning = false;
        log('计时器已停止，当前时间:', lastDisplayTime);
    }

    function resetTimer() {
        stopTimer();
        startTime = null;
        lastDisplayTime = '00:00';
        timerDisplay.textContent = lastDisplayTime;
    }

    function stopPushNotifications() {
        if (pushInterval) {
            clearInterval(pushInterval);
            pushInterval = null;
        }
        if (pushTimeout) {
            clearTimeout(pushTimeout);
            pushTimeout = null;
        }
    }

    function stopMusic() {
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
            audio = null;
        }
    }

    function onCapsuleClick(e) {
        if (e && e.defaultPrevented) return;

        log('胶囊被点击');

        // 标记当前请求已被点击
        hasBeenClicked = true;

        // 停止推送和音乐
        stopPushNotifications();
        stopMusic();

        // 根据白名单状态更新颜色
        if (isWhiteListed) {
            // 当前处理中的单，GetLiveInfo的响应中auth_status包含了白名单，点击后显示为绿色
            updateCapsuleColor(colors.green, '白名单 - 已点击');
            logSuccess('白名单命中，变为绿色');
        } else {
            // 其它情况，点击后显示为白色
            updateCapsuleColor(colors.white, '已点击 - 等待审计完成');
            logInfo('非白名单，变为白色');
        }

        logSuccess('闹钟和推送已关闭');
    }

    function playMusic() {
        if (!config.alarmEnabled) return;

        stopMusic();

        audio = new Audio(MUSIC_URL);
        audio.loop = true;
        audio.play().catch(function(e) {
            logWarn('音乐播放失败: ' + e.message);
        });
    }

    function sendWechatNotification() {
        if (!config.phoneNumber) {
            log('未配置手机号，不发送推送');
            return;
        }

        var now = new Date();
        var timeStr =
            (now.getHours() < 10 ? '0' + now.getHours() : now.getHours()) + ':' +
            (now.getMinutes() < 10 ? '0' + now.getMinutes() : now.getMinutes()) + ':' +
            (now.getSeconds() < 10 ? '0' + now.getSeconds() : now.getSeconds());

        var content = timeStr + ' 普通单未确认';
        var mentionedList = [config.phoneNumber];

        var payload = {
            msgtype: 'text',
            text: {
                content: content,
                mentioned_mobile_list: mentionedList
            }
        };

        GM_xmlhttpRequest({
            method: 'POST',
            url: WEBHOOK_URL,
            headers: {
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(payload),
            onload: function(response) {
                if (response.status === 200) {
                    logSuccess('推送成功: ' + timeStr);
                } else {
                    logError('推送失败: ' + response.status);
                }
            },
            onerror: function(error) {
                logError('推送请求失败');
            }
        });
    }

    function startPushNotifications() {
        if (pushInterval) {
            clearInterval(pushInterval);
        }

        sendWechatNotification();
        pushInterval = setInterval(sendWechatNotification, 20000);
    }

    // 修改：使用 auth_status 进行白名单判断
    function checkWhitelist(authStatus) {
        if (!authStatus) return false;

        for (var i = 0; i < WHITELIST.length; i++) {
            if (authStatus.indexOf(WHITELIST[i]) !== -1) {
                logSuccess('白名单匹配: ' + WHITELIST[i]);
                return true;
            }
        }
        return false;
    }

    // 修改：从响应中提取 auth_status
    function parseGetLiveInfoResponse(responseText) {
        try {
            var data = JSON.parse(responseText);

            // 按照新格式提取 auth_status
            var authStatus = '';
            if (data &&
                data.response &&
                data.response.user_info &&
                data.response.user_info.base_info) {
                authStatus = data.response.user_info.base_info.auth_status || '';
            }

            lastAuthStatus = authStatus;
            isWhiteListed = checkWhitelist(authStatus);

            logInfo('解析响应完成，auth_status:', authStatus);

            // 如果已经是白名单且当前有请求且未被点击，可以更新状态提示
            if (isWhiteListed && currentRequest && !hasBeenClicked) {
                log('当前请求命中白名单，等待点击');
            }
        } catch (e) {
            logError('解析响应失败: ' + e.message);
        }
    }

    // ==================== XHR 拦截 ====================
    var XHR = XMLHttpRequest;
    var originalOpen = XHR.prototype.open;
    var originalSend = XHR.prototype.send;

    XHR.prototype.open = function(method, url) {
        this._url = url;
        this._method = method;
        return originalOpen.apply(this, arguments);
    };

    XHR.prototype.send = function(body) {
        var self = this;
        var url = this._url || '';

        // 检查 GetLiveInfo
        if (url && url.includes('action=call') && isGetLiveInfoRequest(body)) {
            log('发现 GetLiveInfo 请求!');

            var liveId = extractLiveIdFromBody(body);
            if (liveId) {
                log('提取到 live_id:', liveId);

                this.addEventListener('load', function() {
                    if (this.responseText) {
                        log('GetLiveInfo 响应收到');
                        parseGetLiveInfoResponse(this.responseText);
                    }
                });

                addToQueue(liveId);
            }
        }

        // 检查 ReportAuditResult - 直接结束当前请求
        if (isReportAuditResult(body)) {
            log('========== 发现 ReportAuditResult ==========');

            // 延迟一点执行，确保响应处理完成
            setTimeout(function() {
                completeCurrentRequest();
            }, 500);
        }

        return originalSend.apply(this, arguments);
    };

    // ==================== 监听页面事件 ====================
    window.addEventListener('beforeunload', function() {
        resetAllState();
    });

    window.addEventListener('pageshow', function(event) {
        if (event.persisted) {
            resetAllState();
        }
    });

    // ==================== 恢复默认配置 ====================
    function resetToDefault() {
        log('恢复默认配置');

        // 重置为默认配置
        config = JSON.parse(JSON.stringify(defaultConfig));

        // 更新样式并应用位置
        updateCapsuleStyle();
        applyPosition();

        // 保存到存储
        GM_setValue('capsuleConfig', config);

        logSuccess('已恢复默认配置');
    }

    // ==================== 配置弹窗 ====================
    function showConfigDialog() {
        log('打开配置弹窗');

        var overlay = document.createElement('div');
        overlay.style.cssText =
            'position: fixed;' +
            'top: 0;' +
            'left: 0;' +
            'right: 0;' +
            'bottom: 0;' +
            'background: rgba(0,0,0,0.5);' +
            'z-index: 1000000;' +
            'display: flex;' +
            'justify-content: center;' +
            'align-items: center;';

        var dialog = document.createElement('div');
        dialog.style.cssText =
            'background: white;' +
            'padding: 20px;' +
            'border-radius: 8px;' +
            'min-width: 300px;' +
            'max-width: 400px;' +
            'box-shadow: 0 2px 20px rgba(0,0,0,0.3);';

        dialog.innerHTML =
            '<h3 style="margin-top:0;text-align:center;margin-bottom:20px;">胶囊配置</h3>' +

            '<div style="margin-bottom:15px;">' +
                '<label style="display:block;margin-bottom:5px;font-weight:bold;">手机号:</label>' +
                '<input type="text" id="config-phone" value="' + (config.phoneNumber || '') + '" placeholder="输入手机号以接收推送" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box;">' +
            '</div>' +

            '<div style="margin-bottom:15px;">' +
                '<label style="display:flex;align-items:center;gap:8px;">' +
                    '<input type="checkbox" id="config-alarm" ' + (config.alarmEnabled ? 'checked' : '') + ' style="width:16px;height:16px;">' +
                    '<span style="font-weight:bold;">启用闹钟</span>' +
                '</label>' +
            '</div>' +

            '<div style="margin-bottom:15px;">' +
                '<label style="display:flex;align-items:center;gap:8px;">' +
                    '<input type="checkbox" id="config-debug" ' + (config.debugMode ? 'checked' : '') + ' style="width:16px;height:16px;">' +
                    '<span style="font-weight:bold;">调试模式</span>' +
                '</label>' +
            '</div>' +

            '<div style="margin-bottom:15px;">' +
                '<label style="display:block;margin-bottom:5px;font-weight:bold;">大小 (30-300%):</label>' +
                '<input type="number" id="config-size" value="' + config.sizePercent + '" min="30" max="300" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box;">' +
                '<div style="font-size:12px;color:#666;margin-top:4px;">当前宽度: ' + Math.round(BASE_WIDTH * (config.sizePercent / 100)) + 'px</div>' +
            '</div>' +

            '<div style="margin-bottom:20px;">' +
                '<label style="display:block;margin-bottom:5px;font-weight:bold;">透明度 (0.1-1):</label>' +
                '<input type="number" id="config-opacity" value="' + config.opacity + '" min="0.1" max="1" step="0.1" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box;">' +
            '</div>' +

            '<div style="margin-bottom:20px;padding:10px;background:#f5f5f5;border-radius:4px;color:#666;font-size:12px;">' +
                '<div><strong>当前状态:</strong></div>' +
                '<div>队列长度: ' + requestQueue.length + '</div>' +
                '<div>当前Live ID: ' + (currentLiveId || '无') + '</div>' +
                '<div>计时: ' + lastDisplayTime + '</div>' +
                '<div>白名单: ' + (isWhiteListed ? '是' : '否') + '</div>' +
                '<div>已点击: ' + (hasBeenClicked ? '是' : '否') + '</div>' +
                '<div>胶囊位置: (' + config.position.x + ', ' + config.position.y + ')</div>' +
            '</div>' +

            '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px;">' +
                '<button id="config-reset" style="padding:8px 15px;background:#ff9800;color:white;border:none;border-radius:4px;cursor:pointer;">恢复默认</button>' +
                '<button id="config-save" style="padding:8px 15px;background:#4CAF50;color:white;border:none;border-radius:4px;cursor:pointer;">保存</button>' +
                '<button id="config-cancel" style="padding:8px 15px;background:#f44336;color:white;border:none;border-radius:4px;cursor:pointer;">取消</button>' +
            '</div>';

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // 恢复默认按钮
        document.getElementById('config-reset').addEventListener('click', function() {
            if (confirm('确定要恢复默认配置吗？')) {
                resetToDefault();

                // 更新表单值
                document.getElementById('config-phone').value = config.phoneNumber || '';
                document.getElementById('config-alarm').checked = config.alarmEnabled;
                document.getElementById('config-debug').checked = config.debugMode;
                document.getElementById('config-size').value = config.sizePercent;
                document.getElementById('config-opacity').value = config.opacity;

                logSuccess('配置已重置为默认值');
            }
        });

        // 保存按钮
        document.getElementById('config-save').addEventListener('click', function() {
            var newPhone = document.getElementById('config-phone').value.trim();
            var newAlarm = document.getElementById('config-alarm').checked;
            var newDebug = document.getElementById('config-debug').checked;
            var newSize = parseInt(document.getElementById('config-size').value) || 100;
            var newOpacity = parseFloat(document.getElementById('config-opacity').value) || 0.9;

            newSize = Math.min(300, Math.max(30, newSize));
            newOpacity = Math.min(1, Math.max(0.1, newOpacity));

            config.phoneNumber = newPhone;
            config.alarmEnabled = newAlarm;
            config.debugMode = newDebug;
            config.sizePercent = newSize;
            config.opacity = newOpacity;

            if (debugMode !== newDebug) {
                debugMode = newDebug;
            }

            updateCapsuleStyle();
            applyPosition(); // 应用位置并强制覆盖
            GM_setValue('capsuleConfig', config);

            logSuccess('配置已保存');
            document.body.removeChild(overlay);
        });

        // 取消按钮
        document.getElementById('config-cancel').addEventListener('click', function() {
            document.body.removeChild(overlay);
        });

        // 点击遮罩层关闭
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
            }
        });
    }

    // ==================== 初始化 ====================
    function init() {
        GM_addStyle(
            '#monitor-capsule {' +
                'font-family: Arial, sans-serif;' +
            '}'
        );

        initCapsule();
        GM_registerMenuCommand('⚙️ 打开胶囊配置', showConfigDialog);

        log('========== 1936助手 auth_status版已启动 ==========');
        log('等待 GetLiveInfo 请求...');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
