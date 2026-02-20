// ==UserScript==
// @name         iLabel直播审核辅助3.1.0
// @namespace    https://github.com/ehekatle/ilabel
// @version      3.1.0
// @description  直播审核辅助工具（含预埋、豁免、违规检测、推送提醒、队列查询）
// @author       ehekatle
// @homepage     https://github.com/ehekatle/ilabel
// @source       https://raw.githubusercontent.com/ehekatle/ilabel/main/ilabel.user.js
// @updateURL    https://hk.gh-proxy.org/https://raw.githubusercontent.com/ehekatle/ilabel/main/ilabel.user.js
// @downloadURL  https://hk.gh-proxy.org/https://raw.githubusercontent.com/ehekatle/ilabel/main/ilabel.user.js
// @match        https://ilabel.weixin.qq.com/*
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

    // 获取脚本版本号
    const SCRIPT_VERSION = GM_info.script.version;

    // 可选：屏蔽WebSocket相关错误
    const originalConsoleError = console.error;
    console.error = function (...args) {
        if (args[0] && typeof args[0] === 'string' &&
            (args[0].includes('WebSocket') || args[0].includes('ws://') || args[0].includes('wss://'))) {
            return;
        }
        originalConsoleError.apply(console, args);
    };

    // ========== 配置 ==========
    const CONFIG_URL = 'https://hk.gh-proxy.org/https://raw.githubusercontent.com/ehekatle/ilabel/main/config.json';
    const ALARM_AUDIO_URL = 'https://hk.gh-proxy.org/https://raw.githubusercontent.com/ehekatle/ilabel/main/music.mp3';

    const STORAGE_KEYS = {
        GLOBAL_CONFIG: 'ilabel_global_config',
        USER_CONFIG: 'ilabel_user_config',
        LAST_CONFIG_UPDATE: 'ilabel_last_config_update',
        ALARM_AUDIO_DATA: 'ilabel_alarm_audio_data',
        ALARM_AUDIO_TIMESTAMP: 'ilabel_alarm_audio_timestamp',
        // 队列相关缓存键
        QUEUE_LIST: 'ilabel_queue_list',
        QUEUE_LIST_TIMESTAMP: 'ilabel_queue_list_timestamp',
        QUEUE_HIT_CACHE: 'ilabel_queue_hit_cache',
        QUEUE_HIT_STATS: 'ilabel_queue_hit_stats'
    };

    // 队列查询API
    const QUEUE_API = {
        LIST: 'https://ilabel.weixin.qq.com/api/mission/list?pageindex=1&pagesize=100&query=%7B%22mid%22:%22%22,%22keyword%22:%22%22,%22status%22:1,%22authorities%22:[]%7D&mission_type=5&business=32',
        HITS: 'https://ilabel.weixin.qq.com/api/labeled-hits'
    };

    // 队列查询配置
    const QUEUE_CONFIG = {
        CACHE_EXPIRY: 5 * 60 * 1000, // 缓存有效期5分钟
        BATCH_SIZE: 5, // 每批查询5个队列
        MAX_HISTORY: 100, // 保留最近100条查询历史用于统计
        STATS_UPDATE_INTERVAL: 10 // 每10次查询更新一次统计
    };

    // 默认用户配置
    const DEFAULT_USER_CONFIG = {
        promptType: ['targeted', 'prefilled', 'exempted', 'review', 'penalty', 'note', 'complaint', 'normal'],
        promptArrange: 'horizontal',
        promptSize: 100,
        promptOpacity: 100,
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

    // 类型颜色映射
    const TYPE_COLORS = {
        targeted: '#000000',
        prefilled: '#f44336',
        exempted: '#4caf50',
        review: '#2196f3',
        note: '#90caf9',
        penalty: '#ff9800',
        complaint: '#9e9e9e',
        normal: '#ffffff'
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
        alarmAudio: null,
        isAlarmPlaying: false,
        alarmCheckInterval: null,
        configToolVisible: false,
        toolContainer: null,
        overlay: null,
        lastPopupTime: null,
        popupConfirmed: true,
        spaceHandler: null,
        // 队列查询相关状态
        queueModalVisible: false,
        queueModal: null,
        queueOverlay: null,
        currentLiveId: '',
        queueResults: [],
        isLoadingQueues: false,
        // 队列优化相关状态
        queueList: [], // 预加载的队列列表
        queueHitCache: new Map(), // 查询结果缓存
        queueHitStats: new Map(), // 队列命中率统计
        pendingQueries: new Map(), // 进行中的查询
        searchStartTime: 0, // 查询开始时间
        processedQueues: new Set(), // 已处理的队列
        queryCount: 0 // 查询计数器
    };

    // ========== 初始化 ==========
    async function init() {
        console.log('iLabel辅助工具: 初始化开始');

        try {
            // 加载用户配置
            loadUserConfig();

            // 加载全局配置
            await loadGlobalConfig();

            // 预加载闹钟音频
            preloadAlarmAudio();

            // 预加载队列列表
            await preloadQueueList();

            // 加载队列缓存和统计
            loadQueueCache();

            // 添加样式
            addStyles();

            // 注册菜单命令
            GM_registerMenuCommand(`提示配置`, () => {
                toggleConfigTool();
            });

            // 注册队列查询菜单
            GM_registerMenuCommand(`队列查询`, () => {
                toggleQueueModal();
            });

            // 设置请求拦截
            setupRequestInterception();

            // 启动配置检查定时器
            startConfigChecker();

            console.log('iLabel辅助工具: 初始化完成');

        } catch (error) {
            console.error('iLabel辅助工具: 初始化失败', error);
        }
    }

    // ========== 队列缓存和统计功能 ==========

    // 预加载队列列表
    async function preloadQueueList() {
        try {
            const cached = GM_getValue(STORAGE_KEYS.QUEUE_LIST, null);
            const timestamp = GM_getValue(STORAGE_KEYS.QUEUE_LIST_TIMESTAMP, 0);

            // 缓存有效期24小时
            if (cached && (Date.now() - timestamp) < 24 * 60 * 60 * 1000) {
                state.queueList = JSON.parse(cached);
                console.log('使用缓存的队列列表，共', state.queueList.length, '个队列');
                return;
            }

            console.log('正在加载队列列表...');
            const missions = await fetchQueueList();
            state.queueList = missions;

            // 保存到缓存
            GM_setValue(STORAGE_KEYS.QUEUE_LIST, JSON.stringify(missions));
            GM_setValue(STORAGE_KEYS.QUEUE_LIST_TIMESTAMP, Date.now());

            console.log('队列列表加载完成，共', missions.length, '个队列');
        } catch (error) {
            console.error('预加载队列列表失败', error);
            // 如果加载失败但有缓存，使用缓存
            const cached = GM_getValue(STORAGE_KEYS.QUEUE_LIST, null);
            if (cached) {
                state.queueList = JSON.parse(cached);
                console.log('使用旧缓存队列列表，共', state.queueList.length, '个队列');
            }
        }
    }

    // 加载队列缓存和统计
    function loadQueueCache() {
        try {
            // 加载命中缓存
            const hitCache = GM_getValue(STORAGE_KEYS.QUEUE_HIT_CACHE, '{}');
            const cache = JSON.parse(hitCache);

            // 清理过期缓存
            const now = Date.now();
            Object.entries(cache).forEach(([key, value]) => {
                if (now - value.timestamp < QUEUE_CONFIG.CACHE_EXPIRY) {
                    state.queueHitCache.set(key, value);
                }
            });

            console.log('加载命中缓存:', state.queueHitCache.size, '条');

            // 加载命中统计
            const hitStats = GM_getValue(STORAGE_KEYS.QUEUE_HIT_STATS, '{}');
            const stats = JSON.parse(hitStats);
            Object.entries(stats).forEach(([queueId, count]) => {
                state.queueHitStats.set(parseInt(queueId), count);
            });

            console.log('加载命中统计:', state.queueHitStats.size, '个队列');
        } catch (e) {
            console.error('加载队列缓存失败', e);
        }
    }

    // 保存查询结果到缓存
    function saveToHitCache(liveId, queueId, total) {
        const key = `${liveId}_${queueId}`;
        state.queueHitCache.set(key, {
            total,
            timestamp: Date.now()
        });

        // 更新统计
        if (total > 0) {
            const currentCount = state.queueHitStats.get(queueId) || 0;
            state.queueHitStats.set(queueId, currentCount + 1);
        }

        // 定期保存到GM存储
        state.queryCount++;
        if (state.queryCount % QUEUE_CONFIG.STATS_UPDATE_INTERVAL === 0) {
            saveQueueCache();
        }
    }

    // 保存队列缓存到GM存储
    function saveQueueCache() {
        try {
            // 保存命中缓存
            const cacheObj = {};
            state.queueHitCache.forEach((value, key) => {
                cacheObj[key] = value;
            });
            GM_setValue(STORAGE_KEYS.QUEUE_HIT_CACHE, JSON.stringify(cacheObj));

            // 保存命中统计
            const statsObj = {};
            state.queueHitStats.forEach((value, key) => {
                statsObj[key] = value;
            });
            GM_setValue(STORAGE_KEYS.QUEUE_HIT_STATS, JSON.stringify(statsObj));
        } catch (e) {
            console.error('保存队列缓存失败', e);
        }
    }

    // 获取队列优先级（用于排序）
    function getQueuePriority(queueId) {
        const hitCount = state.queueHitStats.get(queueId) || 0;
        // 命中率越高的队列优先级越高
        return hitCount;
    }

    // ========== 队列查询功能 ==========
    function toggleQueueModal() {
        if (state.queueModalVisible) {
            closeQueueModal();
        } else {
            openQueueModal();
        }
    }

    function openQueueModal() {
        if (state.queueModal) {
            state.queueModal.style.display = 'block';
            state.queueOverlay.style.display = 'block';
            state.queueModalVisible = true;
            // 清空之前的输入和结果
            state.currentLiveId = '';
            state.queueResults = [];
            updateQueueModalContent();
            return;
        }
        createQueueModal();
    }

    function closeQueueModal() {
        if (state.queueModal) {
            state.queueModal.style.display = 'none';
        }
        if (state.queueOverlay) {
            state.queueOverlay.style.display = 'none';
        }
        state.queueModalVisible = false;
        state.currentLiveId = '';
        state.queueResults = [];

        // 清理进行中的查询
        state.pendingQueries.forEach((controller, queueId) => {
            if (controller.abort) controller.abort();
        });
        state.pendingQueries.clear();
        state.processedQueues.clear();
    }

    function createQueueModal() {
        // 创建遮罩层
        state.queueOverlay = document.createElement('div');
        state.queueOverlay.id = 'ilabel-queue-overlay';
        state.queueOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 1000000;
            display: none;
        `;
        state.queueOverlay.addEventListener('click', closeQueueModal);
        document.body.appendChild(state.queueOverlay);

        // 创建弹窗
        state.queueModal = document.createElement('div');
        state.queueModal.id = 'ilabel-queue-modal';
        state.queueModal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 600px;
            max-width: 90vw;
            max-height: 80vh;
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.3);
            z-index: 1000001;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            display: none;
            overflow: hidden;
        `;

        state.queueModal.innerHTML = buildQueueModalHTML();
        document.body.appendChild(state.queueModal);

        bindQueueModalEvents();
        updateQueueModalContent();

        state.queueModal.style.display = 'block';
        state.queueOverlay.style.display = 'block';
        state.queueModalVisible = true;
    }

    function buildQueueModalHTML() {
        return `
            <div class="queue-modal-container" style="display: flex; flex-direction: column; height: 100%;">
                <div class="queue-modal-header" style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #eee;">
                    <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #333;">队列查询</h3>
                    <button class="close-queue-btn" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #999; line-height: 1; padding: 0 5px;">×</button>
                </div>

                <div class="queue-modal-body" style="padding: 20px; overflow-y: auto; flex: 1;">
                    <div class="search-section" style="display: flex; gap: 10px; margin-bottom: 20px;">
                        <input type="text" id="live-id-input" placeholder="请输入 Live ID" value="${state.currentLiveId}"
                            style="flex: 1; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                        <button id="search-queue-btn" class="search-btn" style="padding: 8px 20px; background: #2196f3; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;">查询</button>
                    </div>

                    <div class="results-section" style="min-height: 200px;">
                        <div class="results-header" style="display: flex; justify-content: space-between; margin-bottom: 12px; padding: 0 4px;">
                            <span style="font-size: 14px; color: #666;">查询结果 <span id="result-tip" style="margin-left: 8px; font-size: 12px; color: #999;"></span></span>
                            <span id="result-count" style="font-size: 14px; color: #999;">0/0</span>
                        </div>

                        <div id="queue-results-list" class="results-list" style="display: flex; flex-direction: column; gap: 8px;">
                            <!-- 结果将动态生成 -->
                        </div>

                        <div id="loading-indicator" style="display: none; text-align: center; padding: 40px 0; color: #999;">
                            <div style="margin-bottom: 10px;">查询中...</div>
                            <div style="width: 30px; height: 30px; border: 3px solid #f3f3f3; border-top: 3px solid #2196f3; border-radius: 50%; margin: 0 auto; animation: spin 1s linear infinite;"></div>
                        </div>

                        <div id="partial-results" style="display: none; text-align: center; padding: 20px 0; color: #999; border-top: 1px dashed #eee;">
                            已显示部分结果，仍在查询中...
                        </div>

                        <div id="no-results" style="display: none; text-align: center; padding: 40px 0; color: #999;">
                            暂无结果，请尝试其他 Live ID
                        </div>
                    </div>
                </div>

                <div class="queue-modal-footer" style="padding: 12px 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; display: flex; justify-content: space-between;">
                    <span>缓存: ${state.queueHitCache.size}条 | 统计: ${state.queueHitStats.size}队列</span>
                    <span>队列数: ${state.queueList.length}</span>
                </div>
            </div>
        `;
    }

    function bindQueueModalEvents() {
        if (!state.queueModal) return;

        // 关闭按钮
        const closeBtn = state.queueModal.querySelector('.close-queue-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeQueueModal);
        }

        // 查询按钮
        const searchBtn = state.queueModal.querySelector('#search-queue-btn');
        const liveIdInput = state.queueModal.querySelector('#live-id-input');

        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                const liveId = liveIdInput.value.trim();
                if (liveId) {
                    state.currentLiveId = liveId;
                    searchQueues(liveId);
                } else {
                    showToast('请输入 Live ID', 'error');
                }
            });
        }

        // 回车键查询
        if (liveIdInput) {
            liveIdInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const liveId = liveIdInput.value.trim();
                    if (liveId) {
                        state.currentLiveId = liveId;
                        searchQueues(liveId);
                    } else {
                        showToast('请输入 Live ID', 'error');
                    }
                }
            });
        }
    }

    function updateQueueModalContent() {
        if (!state.queueModal) return;

        const resultsList = state.queueModal.querySelector('#queue-results-list');
        const loadingIndicator = state.queueModal.querySelector('#loading-indicator');
        const partialResults = state.queueModal.querySelector('#partial-results');
        const noResults = state.queueModal.querySelector('#no-results');
        const resultCount = state.queueModal.querySelector('#result-count');
        const resultTip = state.queueModal.querySelector('#result-tip');
        const liveIdInput = state.queueModal.querySelector('#live-id-input');

        if (liveIdInput) {
            liveIdInput.value = state.currentLiveId;
        }

        if (state.isLoadingQueues) {
            if (resultsList) resultsList.style.display = 'none';
            if (noResults) noResults.style.display = 'none';
            if (loadingIndicator) loadingIndicator.style.display = 'block';
            if (partialResults) partialResults.style.display = 'none';
            if (resultTip) resultTip.textContent = '';

            const elapsed = Date.now() - state.searchStartTime;
            if (resultCount) resultCount.textContent = `查询中... ${Math.floor(elapsed / 1000)}s`;
        } else {
            if (loadingIndicator) loadingIndicator.style.display = 'none';

            if (state.queueResults.length > 0) {
                if (resultsList) {
                    resultsList.style.display = 'flex';
                    resultsList.innerHTML = state.queueResults.map(queue => `
                        <div class="queue-item" data-mid="${queue.mid}" data-title="${queue.title}" data-url="${queue.url}"
                            style="padding: 12px 16px; background: #f5f5f5; border-radius: 8px; cursor: pointer; transition: all 0.2s; border: 1px solid transparent;"
                            onmouseover="this.style.backgroundColor='#e8e8e8'; this.style.borderColor='#2196f3'"
                            onmouseout="this.style.backgroundColor='#f5f5f5'; this.style.borderColor='transparent'">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div style="font-weight: 600; color: #333;">${queue.title}</div>
                                <span style="background: #4caf50; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">命中: ${queue.total}</span>
                            </div>
                            <div style="font-size: 11px; color: #999; margin-top: 6px;">队列ID: ${queue.mid} | 响应: ${queue.responseTime}ms</div>
                        </div>
                    `).join('');

                    // 绑定点击事件
                    resultsList.querySelectorAll('.queue-item').forEach(item => {
                        item.addEventListener('click', () => {
                            const url = item.dataset.url;
                            if (url) {
                                window.open(url, '_blank');
                            }
                        });
                    });
                }

                if (state.processedQueues.size < state.queueList.length) {
                    if (partialResults) {
                        partialResults.style.display = 'block';
                        partialResults.textContent = `已显示 ${state.queueResults.length}/${state.queueList.length} 个队列的结果，仍在查询中...`;
                    }
                    if (resultTip) resultTip.textContent = '(部分结果)';
                } else {
                    if (partialResults) partialResults.style.display = 'none';
                    if (resultTip) resultTip.textContent = '';
                }

                if (noResults) noResults.style.display = 'none';
                if (resultCount) resultCount.textContent = `${state.queueResults.length}/${state.processedQueues.size}`;
            } else {
                if (resultsList) resultsList.style.display = 'none';
                if (noResults) noResults.style.display = 'block';
                if (partialResults) partialResults.style.display = 'none';
                if (resultTip) resultTip.textContent = '';
                if (resultCount) resultCount.textContent = '0/0';
            }
        }
    }

    // 添加一个结果项
    function addQueueResult(result) {
        // 检查是否已存在
        const exists = state.queueResults.some(r => r.mid === result.mid);
        if (!exists) {
            state.queueResults.push(result);
            // 按命中数和响应时间排序
            state.queueResults.sort((a, b) => {
                if (a.total !== b.total) return b.total - a.total;
                return a.responseTime - b.responseTime;
            });
            updateQueueModalContent();
        }
    }

    async function searchQueues(liveId) {
        // 清理之前的查询
        state.pendingQueries.forEach((controller, queueId) => {
            if (controller.abort) controller.abort();
        });
        state.pendingQueries.clear();
        state.processedQueues.clear();

        state.isLoadingQueues = true;
        state.queueResults = [];
        state.searchStartTime = Date.now();
        updateQueueModalContent();

        try {
            // 如果没有队列列表，先加载
            if (state.queueList.length === 0) {
                await preloadQueueList();
            }

            // 按优先级排序队列
            const sortedQueues = [...state.queueList].sort((a, b) => {
                const priorityA = getQueuePriority(a.id);
                const priorityB = getQueuePriority(b.id);
                return priorityB - priorityA; // 优先级高的在前
            });

            // 分批次查询
            const batches = [];
            for (let i = 0; i < sortedQueues.length; i += QUEUE_CONFIG.BATCH_SIZE) {
                batches.push(sortedQueues.slice(i, i + QUEUE_CONFIG.BATCH_SIZE));
            }

            // 逐批次查询
            for (const batch of batches) {
                // 并发查询当前批次
                const promises = batch.map(mission => checkQueueHitWithCache(mission, liveId));
                await Promise.all(promises);

                // 每批次完成后更新显示
                updateQueueModalContent();
            }

        } catch (error) {
            console.error('队列查询失败:', error);
            showToast('查询失败: ' + error.message, 'error');
        } finally {
            state.isLoadingQueues = false;
            updateQueueModalContent();

            // 保存缓存
            saveQueueCache();

            const elapsed = Date.now() - state.searchStartTime;
            console.log(`查询完成，耗时: ${elapsed}ms，命中: ${state.queueResults.length}个队列`);
        }
    }

    // 带缓存的队列查询
    async function checkQueueHitWithCache(mission, liveId) {
        const queueId = mission.id;

        // 标记为已处理
        state.processedQueues.add(queueId);

        // 检查缓存
        const cacheKey = `${liveId}_${queueId}`;
        const cached = state.queueHitCache.get(cacheKey);

        if (cached && (Date.now() - cached.timestamp) < QUEUE_CONFIG.CACHE_EXPIRY) {
            console.log(`使用缓存: 队列 ${mission.title} 命中数 ${cached.total}`);

            if (cached.total > 0) {
                const detailUrl = `https://ilabel.weixin.qq.com/mission/${queueId}/modify?title=${encodeURIComponent(mission.title)}&status=all&answer=${encodeURIComponent(JSON.stringify({ key: 'live_id', op: '=', value: liveId }))}`;

                addQueueResult({
                    mid: queueId,
                    title: mission.title,
                    total: cached.total,
                    url: detailUrl,
                    responseTime: 0
                });
            }

            return {
                mid: queueId,
                title: mission.title,
                total: cached.total,
                url: '',
                responseTime: 0
            };
        }

        // 创建 abort controller 用于取消请求
        const controller = new AbortController();
        state.pendingQueries.set(queueId, controller);

        const startTime = Date.now();

        try {
            // 构建查询参数
            const answerParam = JSON.stringify([{
                key: 'live_id',
                op: '=',
                value: liveId
            }]);

            const url = `${QUEUE_API.HITS}?mid=${queueId}&pagesize=3&pageindex=1&query=&status=all&marker=&hit_id=&answer_id=&second_status=all&answer=${encodeURIComponent(answerParam)}&content_query=[]`;

            const result = await new Promise((resolve) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: url,
                    headers: {
                        'accept': 'application/json, text/plain, */*',
                        'x-requested-with': 'XMLHttpRequest'
                    },
                    onload: function (response) {
                        const responseTime = Date.now() - startTime;

                        try {
                            if (response.status === 200) {
                                const data = JSON.parse(response.responseText);
                                if (data.status === 'ok') {
                                    const total = data.data?.total || 0;

                                    // 保存到缓存
                                    saveToHitCache(liveId, queueId, total);

                                    if (total > 0) {
                                        const detailUrl = `https://ilabel.weixin.qq.com/mission/${queueId}/modify?title=${encodeURIComponent(mission.title)}&status=all&answer=${encodeURIComponent(JSON.stringify({ key: 'live_id', op: '=', value: liveId }))}`;

                                        // 立即添加结果
                                        addQueueResult({
                                            mid: queueId,
                                            title: mission.title,
                                            total: total,
                                            url: detailUrl,
                                            responseTime: responseTime
                                        });
                                    }

                                    resolve({
                                        mid: queueId,
                                        title: mission.title,
                                        total: total,
                                        url: '',
                                        responseTime: responseTime
                                    });
                                } else {
                                    resolve({
                                        mid: queueId,
                                        title: mission.title,
                                        total: 0,
                                        url: '',
                                        responseTime: responseTime
                                    });
                                }
                            } else {
                                resolve({
                                    mid: queueId,
                                    title: mission.title,
                                    total: 0,
                                    url: '',
                                    responseTime: responseTime
                                });
                            }
                        } catch (e) {
                            console.error(`解析队列 ${mission.title} 响应失败:`, e);
                            resolve({
                                mid: queueId,
                                title: mission.title,
                                total: 0,
                                url: '',
                                responseTime: responseTime
                            });
                        }
                    },
                    onerror: function (error) {
                        console.error(`查询队列 ${mission.title} 网络错误:`, error);
                        resolve({
                            mid: queueId,
                            title: mission.title,
                            total: 0,
                            url: '',
                            responseTime: Date.now() - startTime
                        });
                    }
                });
            });

            state.pendingQueries.delete(queueId);
            return result;

        } catch (error) {
            console.error(`查询队列 ${mission.title} 异常:`, error);
            state.pendingQueries.delete(queueId);
            return {
                mid: queueId,
                title: mission.title,
                total: 0,
                url: '',
                responseTime: Date.now() - startTime
            };
        }
    }

    function fetchQueueList() {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: QUEUE_API.LIST,
                headers: {
                    'accept': 'application/json, text/plain, */*',
                    'x-requested-with': 'XMLHttpRequest'
                },
                onload: function (response) {
                    try {
                        if (response.status === 200) {
                            const data = JSON.parse(response.responseText);
                            if (data.status === 'ok' && data.data?.missions) {
                                resolve(data.data.missions);
                            } else {
                                reject(new Error('获取队列列表失败'));
                            }
                        } else {
                            reject(new Error(`HTTP ${response.status}`));
                        }
                    } catch (e) {
                        reject(e);
                    }
                },
                onerror: reject
            });
        });
    }

    // ========== 配置管理 ==========
    function loadUserConfig() {
        try {
            const saved = GM_getValue(STORAGE_KEYS.USER_CONFIG, null);
            if (saved) {
                state.userConfig = JSON.parse(saved);
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

    // ========== 闹钟音频预加载 ==========
    function preloadAlarmAudio() {
        console.log('预加载闹钟音频...');

        const cachedAudioData = GM_getValue(STORAGE_KEYS.ALARM_AUDIO_DATA, null);
        const cachedTimestamp = GM_getValue(STORAGE_KEYS.ALARM_AUDIO_TIMESTAMP, 0);
        const cacheExpiry = 24 * 60 * 60 * 1000;

        if (cachedAudioData && (Date.now() - cachedTimestamp) < cacheExpiry) {
            try {
                const byteCharacters = atob(cachedAudioData);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'audio/mpeg' });
                const blobUrl = URL.createObjectURL(blob);

                state.alarmAudio = new Audio();
                state.alarmAudio.src = blobUrl;
                state.alarmAudio.loop = true;
                state.alarmAudio.volume = 0.4;
                state.alarmAudio.load();

                console.log('缓存音频加载完成');
                return;
            } catch (e) {
                console.error('缓存音频处理失败', e);
            }
        }

        loadAlarmAudioFromNetwork();
    }

    function loadAlarmAudioFromNetwork() {
        GM_xmlhttpRequest({
            method: 'GET',
            url: ALARM_AUDIO_URL + '?t=' + Date.now(),
            responseType: 'arraybuffer',
            timeout: 15000,
            onload: function (response) {
                if (response.status === 200) {
                    try {
                        const blob = new Blob([response.response], { type: 'audio/mpeg' });
                        const blobUrl = URL.createObjectURL(blob);

                        state.alarmAudio = new Audio();
                        state.alarmAudio.src = blobUrl;
                        state.alarmAudio.loop = true;
                        state.alarmAudio.volume = 0.4;
                        state.alarmAudio.load();

                        const reader = new FileReader();
                        reader.onloadend = function () {
                            const base64data = reader.result.split(',')[1];
                            if (base64data) {
                                GM_setValue(STORAGE_KEYS.ALARM_AUDIO_DATA, base64data);
                                GM_setValue(STORAGE_KEYS.ALARM_AUDIO_TIMESTAMP, Date.now());
                            }
                        };
                        reader.readAsDataURL(blob);

                        console.log('网络音频加载完成');
                    } catch (e) {
                        console.error('处理音频数据失败', e);
                    }
                } else {
                    console.error('音频下载失败');
                }
            },
            onerror: function (error) {
                console.error('音频下载网络错误', error);
            }
        });
    }

    // ========== 闹钟控制 ==========
    function playAlarm() {
        if (!state.userConfig.alarmRing || state.isConfirmed) return;

        try {
            if (!state.alarmAudio) {
                console.warn('音频对象未初始化');
                state.alarmAudio = new Audio(ALARM_AUDIO_URL + '?t=' + Date.now());
                state.alarmAudio.loop = true;
                state.alarmAudio.volume = 0.4;
            }

            if (state.isAlarmPlaying) return;

            state.alarmAudio.loop = true;
            state.alarmAudio.currentTime = 0;

            const playPromise = state.alarmAudio.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    state.isAlarmPlaying = true;
                    console.log('闹钟开始播放');
                }).catch(error => {
                    console.error('闹钟播放失败:', error);
                    state.isAlarmPlaying = false;
                });
            }
        } catch (e) {
            console.error('播放闹钟异常:', e);
            state.isAlarmPlaying = false;
        }
    }

    function stopAlarm() {
        if (state.alarmAudio && state.isAlarmPlaying) {
            try {
                state.alarmAudio.pause();
                state.alarmAudio.currentTime = 0;
                state.isAlarmPlaying = false;
                console.log('闹钟已停止');
            } catch (e) {
                console.error('停止闹钟失败:', e);
            }
        }
    }

    function playTestAlarm() {
        if (!state.userConfig.alarmRing) return;

        try {
            if (!state.alarmAudio) {
                state.alarmAudio = new Audio(ALARM_AUDIO_URL + '?t=' + Date.now());
                state.alarmAudio.loop = false;
                state.alarmAudio.volume = 0.4;
            }

            state.alarmAudio.loop = false;
            state.alarmAudio.currentTime = 0;

            const playPromise = state.alarmAudio.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log('测试闹钟播放');
                    setTimeout(() => {
                        if (state.alarmAudio) {
                            state.alarmAudio.pause();
                            state.alarmAudio.currentTime = 0;
                        }
                    }, 3000);
                }).catch(console.error);
            }
        } catch (e) {
            console.error('播放测试闹钟失败', e);
        }
    }

    function startAlarmCheck() {
        if (state.alarmCheckInterval) {
            clearInterval(state.alarmCheckInterval);
        }

        state.alarmCheckInterval = setInterval(() => {
            const popupExists = !!document.getElementById('ilabel-prompt-container');
            if (popupExists && !state.isConfirmed && state.userConfig.alarmRing && !state.isAlarmPlaying) {
                playAlarm();
            }

            if (!popupExists || state.isConfirmed) {
                stopAlarm();
            }
        }, 1000);
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
        if (state.toolContainer) {
            state.toolContainer.style.display = 'block';
            state.overlay.style.display = 'block';
            state.configToolVisible = true;
            updateConfigToolValues();
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
    }

    function updateConfigToolValues() {
        if (!state.toolContainer) return;

        const checkboxes = state.toolContainer.querySelectorAll('.type-checkbox');
        checkboxes.forEach(cb => {
            cb.checked = state.userConfig.promptType.includes(cb.value);
        });

        const arrangeRadios = state.toolContainer.querySelectorAll('input[name="arrange"]');
        arrangeRadios.forEach(radio => {
            radio.checked = radio.value === state.userConfig.promptArrange;
        });

        const sizeSlider = state.toolContainer.querySelector('#size-slider');
        const sizeInput = state.toolContainer.querySelector('#size-input');
        if (sizeSlider) sizeSlider.value = state.userConfig.promptSize;
        if (sizeInput) sizeInput.value = state.userConfig.promptSize;

        const opacitySlider = state.toolContainer.querySelector('#opacity-slider');
        const opacityInput = state.toolContainer.querySelector('#opacity-input');
        if (opacitySlider) opacitySlider.value = state.userConfig.promptOpacity;
        if (opacityInput) opacityInput.value = state.userConfig.promptOpacity;

        const alarmSwitch = state.toolContainer.querySelector('#alarm-switch');
        if (alarmSwitch) alarmSwitch.checked = state.userConfig.alarmRing;

        updatePreview();
    }

    function createConfigTool() {
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

        state.toolContainer = document.createElement('div');
        state.toolContainer.id = 'ilabel-config-tool';
        state.toolContainer.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 750px;
            max-width: 95vw;
            max-height: 90vh;
            overflow-y: auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.3);
            z-index: 1000001;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            display: none;
        `;

        state.toolContainer.innerHTML = buildConfigToolHTML();
        document.body.appendChild(state.toolContainer);

        bindConfigToolEvents();
        updatePreview();

        state.toolContainer.style.display = 'block';
        state.overlay.style.display = 'block';
        state.configToolVisible = true;
    }

    function buildConfigToolHTML() {
        const selectedTypes = state.userConfig.promptType;

        let typesHTML = '';
        for (const [type, name] of Object.entries(TYPE_NAMES)) {
            const checked = selectedTypes.includes(type) ? 'checked' : '';
            typesHTML += `
                <label class="checkbox-item">
                    <input type="checkbox" class="type-checkbox" value="${type}" ${checked}>
                    <span style="color: ${TYPE_COLORS[type]}">${name}</span>
                </label>
            `;
        }

        return `
            <div class="config-tool-container">
                <div class="config-tool-header">
                    <h3>iLabel辅助工具配置 v${SCRIPT_VERSION}</h3>
                    <button class="close-btn" id="close-config-btn">×</button>
                </div>

                <div class="config-tool-body" style="display: flex; gap: 20px;">
                    <!-- 左侧配置区 -->
                    <div style="flex: 1;">
                        <div class="config-section">
                            <label class="section-label">提示类型：</label>
                            <div class="checkbox-group" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                                ${typesHTML}
                            </div>
                        </div>

                        <div class="config-section" style="margin-top: 15px;">
                            <label class="section-label">排列方式：</label>
                            <div class="radio-group" style="display: flex; gap: 20px;">
                                <label><input type="radio" name="arrange" value="horizontal" ${state.userConfig.promptArrange === 'horizontal' ? 'checked' : ''}> 横向</label>
                                <label><input type="radio" name="arrange" value="vertical" ${state.userConfig.promptArrange === 'vertical' ? 'checked' : ''}> 纵向</label>
                            </div>
                        </div>

                        <div class="config-section" style="margin-top: 15px;">
                            <label class="section-label">缩放比例 <span id="size-value">${state.userConfig.promptSize}</span>%：</label>
                            <div style="display: flex; gap: 10px; align-items: center;">
                                <input type="range" id="size-slider" min="20" max="200" step="5" value="${state.userConfig.promptSize}" style="flex: 1;">
                                <input type="number" id="size-input" min="20" max="200" step="5" value="${state.userConfig.promptSize}" style="width: 60px; padding: 4px;">
                            </div>
                        </div>

                        <div class="config-section" style="margin-top: 15px;">
                            <label class="section-label">透明度 <span id="opacity-value">${state.userConfig.promptOpacity}</span>%：</label>
                            <div style="display: flex; gap: 10px; align-items: center;">
                                <input type="range" id="opacity-slider" min="10" max="100" step="5" value="${state.userConfig.promptOpacity}" style="flex: 1;">
                                <input type="number" id="opacity-input" min="10" max="100" step="5" value="${state.userConfig.promptOpacity}" style="width: 60px; padding: 4px;">
                            </div>
                        </div>

                        <div class="config-section" style="margin-top: 15px;">
                            <label class="section-label">闹钟提醒：</label>
                            <div style="display: flex; gap: 10px; align-items: center;">
                                <label class="switch">
                                    <input type="checkbox" id="alarm-switch" ${state.userConfig.alarmRing ? 'checked' : ''}>
                                    <span class="slider"></span>
                                </label>
                                <span id="alarm-status">${state.userConfig.alarmRing ? '开启' : '关闭'}</span>
                                <button id="test-alarm-btn" class="test-btn" ${!state.userConfig.alarmRing ? 'disabled' : ''}>测试闹钟</button>
                            </div>
                        </div>
                    </div>

                    <!-- 右侧预览区 -->
                    <div style="width: 220px;">
                        <div class="preview-section">
                            <label class="section-label">预览：</label>
                            <div class="preview-container" style="background: #f5f5f5; padding: 20px 10px; border-radius: 8px;">
                                <div id="preview-wrapper" class="preview-wrapper ${state.userConfig.promptArrange}" style="justify-content: center; width: 200px;">
                                    <!-- 预览内容动态生成 -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="config-tool-footer" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee;">
                    <button id="reset-config-btn" class="reset-btn">恢复默认</button>
                    <button id="save-config-btn" class="save-btn">保存配置</button>
                </div>
            </div>
        `;
    }

    function bindConfigToolEvents() {
        if (!state.toolContainer) return;

        const closeBtn = state.toolContainer.querySelector('#close-config-btn');
        if (closeBtn) closeBtn.addEventListener('click', closeConfigTool);

        const checkboxes = state.toolContainer.querySelectorAll('.type-checkbox');
        checkboxes.forEach(cb => {
            cb.addEventListener('change', updatePreview);
        });

        const arrangeRadios = state.toolContainer.querySelectorAll('input[name="arrange"]');
        arrangeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                const wrapper = state.toolContainer.querySelector('#preview-wrapper');
                if (wrapper) {
                    if (e.target.value === 'vertical') {
                        wrapper.classList.add('vertical');
                    } else {
                        wrapper.classList.remove('vertical');
                    }
                }
                updatePreview();
            });
        });

        const sizeSlider = state.toolContainer.querySelector('#size-slider');
        const sizeInput = state.toolContainer.querySelector('#size-input');
        const sizeValue = state.toolContainer.querySelector('#size-value');

        if (sizeSlider) {
            sizeSlider.addEventListener('input', (e) => {
                const val = e.target.value;
                if (sizeInput) sizeInput.value = val;
                if (sizeValue) sizeValue.textContent = val;
                updatePreview();
            });
        }

        if (sizeInput) {
            sizeInput.addEventListener('input', (e) => {
                const val = e.target.value;
                if (sizeSlider) sizeSlider.value = val;
                if (sizeValue) sizeValue.textContent = val;
                updatePreview();
            });
        }

        const opacitySlider = state.toolContainer.querySelector('#opacity-slider');
        const opacityInput = state.toolContainer.querySelector('#opacity-input');
        const opacityValue = state.toolContainer.querySelector('#opacity-value');

        if (opacitySlider) {
            opacitySlider.addEventListener('input', (e) => {
                const val = e.target.value;
                if (opacityInput) opacityInput.value = val;
                if (opacityValue) opacityValue.textContent = val;
                updatePreview();
            });
        }

        if (opacityInput) {
            opacityInput.addEventListener('input', (e) => {
                const val = e.target.value;
                if (opacitySlider) opacitySlider.value = val;
                if (opacityValue) opacityValue.textContent = val;
                updatePreview();
            });
        }

        const alarmSwitch = state.toolContainer.querySelector('#alarm-switch');
        const alarmStatus = state.toolContainer.querySelector('#alarm-status');
        const testBtn = state.toolContainer.querySelector('#test-alarm-btn');

        if (alarmSwitch) {
            alarmSwitch.addEventListener('change', (e) => {
                const checked = e.target.checked;
                if (alarmStatus) alarmStatus.textContent = checked ? '开启' : '关闭';
                if (testBtn) testBtn.disabled = !checked;
            });
        }

        if (testBtn) {
            testBtn.addEventListener('click', playTestAlarm);
        }

        const resetBtn = state.toolContainer.querySelector('#reset-config-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('确定要恢复默认配置吗？')) {
                    const checkboxes = state.toolContainer.querySelectorAll('.type-checkbox');
                    checkboxes.forEach(cb => {
                        cb.checked = DEFAULT_USER_CONFIG.promptType.includes(cb.value);
                    });

                    const horizontalRadio = state.toolContainer.querySelector('input[value="horizontal"]');
                    if (horizontalRadio) horizontalRadio.checked = true;

                    if (sizeSlider) sizeSlider.value = DEFAULT_USER_CONFIG.promptSize;
                    if (sizeInput) sizeInput.value = DEFAULT_USER_CONFIG.promptSize;
                    if (sizeValue) sizeValue.textContent = DEFAULT_USER_CONFIG.promptSize;

                    if (opacitySlider) opacitySlider.value = DEFAULT_USER_CONFIG.promptOpacity;
                    if (opacityInput) opacityInput.value = DEFAULT_USER_CONFIG.promptOpacity;
                    if (opacityValue) opacityValue.textContent = DEFAULT_USER_CONFIG.promptOpacity;

                    if (alarmSwitch) {
                        alarmSwitch.checked = DEFAULT_USER_CONFIG.alarmRing;
                        if (alarmStatus) alarmStatus.textContent = DEFAULT_USER_CONFIG.alarmRing ? '开启' : '关闭';
                        if (testBtn) testBtn.disabled = !DEFAULT_USER_CONFIG.alarmRing;
                    }

                    state.userConfig.promptPosition = { x: 100, y: 100 };

                    updatePreview();
                    showToast('已恢复默认配置', 'info');
                }
            });
        }

        const saveBtn = state.toolContainer.querySelector('#save-config-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const selectedTypes = [];
                const checkboxes = state.toolContainer.querySelectorAll('.type-checkbox');
                checkboxes.forEach(cb => {
                    if (cb.checked) selectedTypes.push(cb.value);
                });

                let arrange = 'horizontal';
                const selectedArrange = state.toolContainer.querySelector('input[name="arrange"]:checked');
                if (selectedArrange) arrange = selectedArrange.value;

                const size = parseInt(sizeSlider?.value || DEFAULT_USER_CONFIG.promptSize);
                const opacity = parseInt(opacitySlider?.value || DEFAULT_USER_CONFIG.promptOpacity);
                const alarmRing = alarmSwitch?.checked || false;

                state.userConfig.promptType = selectedTypes;
                state.userConfig.promptArrange = arrange;
                state.userConfig.promptSize = size;
                state.userConfig.promptOpacity = opacity;
                state.userConfig.alarmRing = alarmRing;

                saveUserConfig();
                showToast('配置已保存', 'success');

                setTimeout(closeConfigTool, 1000);
            });
        }
    }

    function updatePreview() {
        if (!state.toolContainer) return;

        const wrapper = state.toolContainer.querySelector('#preview-wrapper');
        if (!wrapper) return;

        const previewTypes = ['prefilled', 'exempted'];

        const sizeSlider = state.toolContainer.querySelector('#size-slider');
        const opacitySlider = state.toolContainer.querySelector('#opacity-slider');
        const scale = (parseInt(sizeSlider?.value || 100) / 100);
        const opacity = (parseInt(opacitySlider?.value || 100) / 100);

        let previewHTML = '';
        previewTypes.forEach(type => {
            previewHTML += `<div class="preview-item" style="background-color: ${TYPE_COLORS[type]}; opacity: ${opacity};">${TYPE_NAMES[type]}</div>`;
        });
        previewHTML += `<div class="preview-item confirm-btn" style="background-color: #f44336; color: white; border: none; opacity: ${opacity};">确认</div>`;

        wrapper.innerHTML = previewHTML;
        wrapper.style.transform = `scale(${scale})`;

        if (!wrapper.classList.contains('vertical')) {
            const items = wrapper.querySelectorAll('.preview-item');
            const height = 28;
            items.forEach(item => {
                item.style.width = (height * 2) + 'px';
                item.style.textAlign = 'center';
                item.style.padding = '6px 0';
            });
        } else {
            // 竖向模式：宽度自适应内容，不设置固定宽度
            const items = wrapper.querySelectorAll('.preview-item');
            items.forEach(item => {
                item.style.width = 'auto';
                item.style.minWidth = '56px';
                item.style.padding = '6px 16px';
                item.style.textAlign = 'center';
            });

            // 让所有项宽度一致（取最大宽度）
            setTimeout(() => {
                const items = wrapper.querySelectorAll('.preview-item');
                const maxWidth = Math.max(...Array.from(items).map(item => item.offsetWidth));
                items.forEach(item => {
                    item.style.width = maxWidth + 'px';
                });
            }, 0);
        }
    }

    function showToast(message, type = 'info') {
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

    // ========== 提示显示 ==========
    function showPrompt(liveData, types) {
        state.currentLiveData = liveData;
        state.currentTypes = types;
        state.isConfirmed = false;
        state.lastPopupTime = Date.now();
        state.popupConfirmed = false;

        closePrompt();
        createPrompt();
        startPushTimer();
        startAlarmCheck();

        // 添加空格键监听
        if (state.spaceHandler) {
            document.removeEventListener('keydown', state.spaceHandler);
        }

        state.spaceHandler = (e) => {
            if (e.code === 'Space' && !state.isConfirmed && document.getElementById('ilabel-prompt-container')) {
                e.preventDefault();
                e.stopPropagation();
                handleConfirmAndCopy();
            }
        };

        document.addEventListener('keydown', state.spaceHandler);

        if (state.userConfig.alarmRing) {
            setTimeout(() => playAlarm(), 100);
        }
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
        if (state.alarmCheckInterval) {
            clearInterval(state.alarmCheckInterval);
            state.alarmCheckInterval = null;
        }
        if (state.spaceHandler) {
            document.removeEventListener('keydown', state.spaceHandler);
            state.spaceHandler = null;
        }
        stopAlarm();
        state.isConfirmed = false;
        state.popupConfirmed = true;
    }

    function copyLiveId() {
        if (state.currentLiveData?.liveId) {
            navigator.clipboard.writeText(state.currentLiveData.liveId).then(() => {
                console.log('LiveID已复制:', state.currentLiveData.liveId);
                const toast = document.createElement('div');
                toast.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    padding: 8px 16px;
                    background: rgba(0,0,0,0.8);
                    color: white;
                    border-radius: 4px;
                    font-size: 14px;
                    z-index: 1000002;
                    animation: fadeInOut 1s ease;
                `;
                toast.textContent = 'LiveID已复制';
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 1000);
            }).catch(err => {
                console.error('复制失败:', err);
            });
        }
    }

    function handleConfirmAndCopy() {
        if (state.isConfirmed) return;

        state.isConfirmed = true;
        state.popupConfirmed = true;

        // 复制LiveID
        copyLiveId();

        // 移除确认按钮
        const confirmWrapper = document.querySelector('.confirm-wrapper');
        if (confirmWrapper) {
            confirmWrapper.remove();
        }

        // 停止推送和闹钟
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
            opacity: ${state.userConfig.promptOpacity / 100};
        `;

        const wrapper = document.createElement('div');
        wrapper.style.cssText = `
            display: flex;
            gap: 0;
            ${state.userConfig.promptArrange === 'vertical' ? 'flex-direction: column;' : ''}
            background: transparent;
            padding: 0;
        `;

        state.currentTypes.forEach(type => {
            const tag = createTypeTag(type);
            wrapper.appendChild(tag);
        });

        const confirmWrapper = document.createElement('div');
        confirmWrapper.className = 'confirm-wrapper';

        const confirmBtn = createConfirmButton();
        confirmWrapper.appendChild(confirmBtn);
        wrapper.appendChild(confirmWrapper);

        if (state.userConfig.promptArrange === 'horizontal') {
            setTimeout(() => {
                const items = wrapper.querySelectorAll('.prompt-tag, .prompt-confirm-btn');
                const height = 28;
                items.forEach(item => {
                    item.style.width = (height * 2) + 'px';
                    item.style.textAlign = 'center';
                    item.style.padding = '6px 0';
                });
            }, 0);
        }

        if (state.userConfig.promptArrange === 'vertical') {
            setTimeout(() => {
                const items = wrapper.querySelectorAll('.prompt-tag, .prompt-confirm-btn');
                // 竖向模式：宽度自适应内容，不设置固定宽度
                items.forEach(item => {
                    item.style.width = 'auto';
                    item.style.minWidth = '56px';
                    item.style.padding = '6px 16px';
                    item.style.textAlign = 'center';
                });

                // 让所有项宽度一致（取最大宽度）
                const maxWidth = Math.max(...Array.from(items).map(item => item.offsetWidth));
                items.forEach(item => {
                    item.style.width = maxWidth + 'px';
                });
            }, 0);
        }

        state.promptContainer.appendChild(wrapper);
        document.body.appendChild(state.promptContainer);

        makeDraggable(state.promptContainer);
    }

    function createTypeTag(type) {
        const tag = document.createElement('div');
        tag.className = 'prompt-tag';
        const color = TYPE_COLORS[type] || TYPE_COLORS.normal;
        const textColor = getContrastColor(color);

        tag.style.cssText = `
            padding: 6px 16px;
            background-color: ${color};
            color: ${textColor};
            font-size: 12px;
            font-weight: bold;
            white-space: nowrap;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            border-radius: 20px;
            margin: 0;
        `;

        tag.textContent = TYPE_NAMES[type] || type;
        return tag;
    }

    function createConfirmButton() {
        const btn = document.createElement('div');
        btn.className = 'prompt-confirm-btn';
        btn.style.cssText = `
            padding: 6px 16px;
            background-color: #f44336;
            color: white;
            font-size: 12px;
            font-weight: bold;
            white-space: nowrap;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            cursor: pointer;
            border: none;
            border-radius: 20px;
            margin: 0;
            text-align: center;
            transition: all 0.2s;
        `;
        btn.textContent = '确认';

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleConfirmAndCopy();
        });

        btn.addEventListener('mouseenter', () => {
            if (!state.isConfirmed) {
                btn.style.backgroundColor = '#d32f2f';
            }
        });

        btn.addEventListener('mouseleave', () => {
            if (!state.isConfirmed) {
                btn.style.backgroundColor = '#f44336';
            }
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
            onload: (r) => {
                if (r.status === 200) {
                    console.log('推送成功');
                } else {
                    console.error('推送失败', r.status);
                }
            },
            onerror: console.error
        });
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

                // 构建结论 - 优先使用 reason_label
                let conclusion = '不处罚';
                let reasonLabel = null;
                let remark = null;

                // 从finder_object中提取处罚信息
                if (result.finder_object && Array.isArray(result.finder_object) && result.finder_object.length > 0) {
                    const finderItem = result.finder_object[0];
                    if (finderItem.ext_info) {
                        // 优先使用 reason_label（最具体的处罚原因）
                        reasonLabel = finderItem.ext_info.reason_label;

                        // 如果没有 reason_label，则使用 punish_keyword_path 的最后一个
                        if (!reasonLabel && finderItem.ext_info.punish_keyword_path && finderItem.ext_info.punish_keyword_path.length > 0) {
                            reasonLabel = finderItem.ext_info.punish_keyword_path[finderItem.ext_info.punish_keyword_path.length - 1];
                        }

                        remark = finderItem.remark || null;
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
            onload: (r) => {
                if (r.status === 200) {
                    console.log('答案推送成功');
                    closePrompt();
                } else {
                    console.error('答案推送失败', r.status);
                }
            },
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

        if (liveData.auditRemark?.includes('辛苦核实')) types.push('note');
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
            #ilabel-prompt-container > div {
                display: flex;
                gap: 0;
                background: transparent;
                padding: 0;
            }
            #ilabel-prompt-container > div.vertical {
                flex-direction: column;
            }
            .prompt-tag, .prompt-confirm-btn {
                padding: 6px 16px;
                font-size: 12px;
                font-weight: bold;
                white-space: nowrap;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                border-radius: 20px;
                margin: 0;
                text-align: center;
                transition: all 0.2s;
            }
            .prompt-confirm-btn {
                cursor: pointer;
            }
            .prompt-confirm-btn:hover {
                background-color: #d32f2f !important;
            }

            @keyframes fadeInOut {
                0% { opacity: 0; transform: translate(-50%, 60%); }
                20% { opacity: 1; transform: translate(-50%, -50%); }
                80% { opacity: 1; transform: translate(-50%, -50%); }
                100% { opacity: 0; transform: translate(-50%, -140%); }
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            /* 配置工具样式 */
            #ilabel-config-tool * {
                box-sizing: border-box;
            }
            #ilabel-config-tool .config-tool-container {
                padding: 20px;
            }
            #ilabel-config-tool .config-tool-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 2px solid #f0f0f0;
            }
            #ilabel-config-tool .config-tool-header h3 {
                margin: 0;
                color: #333;
                font-size: 16px;
                font-weight: 600;
            }
            #ilabel-config-tool .close-btn {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #999;
                line-height: 1;
                padding: 0 5px;
            }
            #ilabel-config-tool .close-btn:hover {
                color: #333;
            }
            #ilabel-config-tool .section-label {
                display: block;
                margin-bottom: 8px;
                font-weight: 600;
                color: #444;
                font-size: 13px;
            }
            #ilabel-config-tool .checkbox-item {
                display: flex;
                align-items: center;
                gap: 5px;
                cursor: pointer;
                font-size: 12px;
            }
            #ilabel-config-tool .checkbox-item input[type="checkbox"] {
                margin: 0;
            }
            #ilabel-config-tool .radio-group label {
                display: flex;
                align-items: center;
                gap: 4px;
                cursor: pointer;
                font-size: 12px;
            }
            #ilabel-config-tool .switch {
                position: relative;
                display: inline-block;
                width: 44px;
                height: 22px;
            }
            #ilabel-config-tool .switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }
            #ilabel-config-tool .slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: #ccc;
                transition: .3s;
                border-radius: 22px;
            }
            #ilabel-config-tool .slider:before {
                position: absolute;
                content: "";
                height: 18px;
                width: 18px;
                left: 2px;
                bottom: 2px;
                background-color: white;
                transition: .3s;
                border-radius: 50%;
            }
            #ilabel-config-tool input:checked + .slider {
                background-color: #4caf50;
            }
            #ilabel-config-tool input:checked + .slider:before {
                transform: translateX(22px);
            }
            #ilabel-config-tool .test-btn {
                padding: 4px 12px;
                background: #2196f3;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
            }
            #ilabel-config-tool .test-btn:disabled {
                background: #ccc;
                cursor: not-allowed;
            }
            #ilabel-config-tool .preview-wrapper {
                display: flex;
                gap: 0;
                transform-origin: center;
            }
            #ilabel-config-tool .preview-wrapper.vertical {
                flex-direction: column;
            }
            #ilabel-config-tool .preview-wrapper.vertical .preview-item {
                width: auto !important;
                min-width: 56px;
                text-align: center;
                padding: 6px 16px;
            }
            #ilabel-config-tool .preview-wrapper:not(.vertical) .preview-item {
                width: 56px;
                text-align: center;
                padding: 6px 0;
            }
            #ilabel-config-tool .preview-item {
                padding: 4px 12px;
                font-size: 12px;
                font-weight: 500;
                white-space: nowrap;
                border-radius: 20px;
                color: white;
            }
            #ilabel-config-tool .preview-item.confirm-btn {
                background-color: #f44336 !important;
                color: white !important;
                border: none !important;
            }
            #ilabel-config-tool .reset-btn {
                background: #ff9800;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 6px 16px;
                cursor: pointer;
                font-size: 12px;
            }
            #ilabel-config-tool .save-btn {
                background: #4caf50;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 6px 16px;
                cursor: pointer;
                font-size: 12px;
            }

            /* 队列查询弹窗样式 */
            #ilabel-queue-modal * {
                box-sizing: border-box;
            }
            #ilabel-queue-modal .queue-item {
                transition: all 0.2s;
            }
            #ilabel-queue-modal .queue-item:hover {
                background-color: #e8e8e8;
                border-color: #2196f3;
            }
        `);
    }

    // 启动
    init();
})();