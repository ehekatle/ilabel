// ==UserScript==
// @name         iLabel自动摸鱼机
// @namespace    https://ilabel.weixin.qq.com/
// @version      1.6
// @description  自动摸鱼机
// @author       ehekatle
// @match        https://ilabel.weixin.qq.com/mixed-task/10/label*
// @run-at       document-start
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @connect      sctapi.ftqq.com
// @connect      gh-proxy.org
// @connect      raw.githubusercontent.com
// ==/UserScript==

(function () {
    'use strict';

    /* ===================== 配置 ===================== */
    const SEND_KEY         = '';
    const MIN_DELAY_MS     = 60 * 1000;
    const RANDOM_DELAY_MS  = 10 * 1000;
    const PUSH_INTERVAL_MS = 60 * 1000;
    const MUSIC_URL        = 'https://gh-proxy.org/https://raw.githubusercontent.com/ehekatle/ilabel/main/music.mp3';
    const MUSIC_CACHE      = 'ilabel-music-v1';
    /* =============================================== */

    const HISTORY_API = 'get_live_history';

    /* ----------------- 状态 ----------------- */
    let enabled     = false;
    let indicatorEl = null;

    let currentLiveId   = '';
    let liveIdChangedAt = 0; // 检测到 LiveId 变化时的 performance.now()
    let historyItems    = null;
    let submitted       = false;

    // 用 performance.now() 记录的绝对截止时间（0 = 未安排）
    let submitDeadline  = 0;
    let tightLoopActive = false;

    let alertActive = false;
    let pushTimer   = null;
    const confirmedLiveIds = new Set();

    let pollTimer = null;

    /* =================== DOM 读取 =================== */

    function getPageLiveId() {
        const el = document.querySelector(
            'table tbody tr td:first-child div > span:nth-of-type(2) > span'
        );
        if (el && /^\d{19}$/.test(el.textContent.trim())) return el.textContent.trim();
        for (const s of document.querySelectorAll('span')) {
            const t = s.textContent.trim();
            if (/^\d{19}$/.test(t)) return t;
        }
        return '';
    }

    function getQueueText() {
        let el = document.querySelector(
            'body > div:nth-child(1) > div:nth-child(1) > div:nth-child(2) > div:nth-child(2) ' +
            '> div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > span'
        );
        if (el && el.textContent.trim()) return el.textContent.trim();

        el = document.querySelector('span[data-v-74a31df4]');
        if (el && el.textContent.trim()) return el.textContent.trim();

        const sp = [...document.querySelectorAll('span')]
            .find(s => s.textContent.trim() === '兜底');
        return sp ? '兜底' : '';
    }

    function getRemainTime() {
        const el = document.querySelector('h4 span.number')
              || document.querySelector('h4 > div > div:nth-child(2) > span');
        return el ? el.textContent.trim() : '';
    }

    function selectNoViolation() {
        const inner = [...document.querySelectorAll('.el-radio-button__inner')]
            .find(e => e.textContent.includes('无违规'));
        if (!inner) return false;

        const label = inner.closest('label') || inner;
        if (!label.classList.contains('is-active')) label.click();
        return true;
    }

    function clickSubmit() {
        const btn = [...document.querySelectorAll('button')]
            .find(b => b.textContent.trim().includes('提交本题'));
        if (!btn) return false;
        btn.click();
        return true;
    }

    /* =================== Server酱 =================== */

    function sendPush(title, desp) {
        if (!SEND_KEY) return;
        GM_xmlhttpRequest({
            method: 'POST',
            url: `https://sctapi.ftqq.com/${SEND_KEY}.send`,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            data: `title=${encodeURIComponent(title)}&desp=${encodeURIComponent(desp)}`,
            onload: r => console.log('[推送]', r.status, r.responseText),
            onerror: e => console.error('[推送失败]', e)
        });
    }

    function sendPushOnce() {
        sendPush(`${getQueueText()}${getPageLiveId()}`, `剩余时间：${getRemainTime()}`);
    }

    function startPushTimer() {
        stopPushTimer();
        sendPushOnce();
        pushTimer = setInterval(sendPushOnce, PUSH_INTERVAL_MS);
    }

    function stopPushTimer() {
        if (pushTimer) {
            clearInterval(pushTimer);
            pushTimer = null;
        }
    }

    /* =================== 告警音乐 =================== */

    let audioEl         = null;   // 正在播放的音频元素
    let musicUrlPromise = null;   // 缓存「获取音频」的 Promise，避免重复请求

    function downloadMusic() {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: MUSIC_URL,
                responseType: 'arraybuffer',
                onload: r => r.status === 200
                    ? resolve(new Blob([r.response], { type: 'audio/mpeg' }))
                    : reject(new Error('HTTP ' + r.status)),
                onerror: reject
            });
        });
    }

    // 优先读本地缓存，没有才走网络；返回可播放的 objectURL
    function getMusicUrl() {
        if (!musicUrlPromise) {
            musicUrlPromise = (async () => {
                const cache  = typeof caches !== 'undefined' ? await caches.open(MUSIC_CACHE) : null;
                const cached = cache ? await cache.match(MUSIC_URL) : null;

                let blob;
                if (cached) {
                    blob = await cached.blob();
                    console.log('[音乐] 使用本地缓存');
                } else {
                    blob = await downloadMusic();
                    if (cache) await cache.put(MUSIC_URL, new Response(blob));
                    console.log('[音乐] 已下载并缓存到本地');
                }
                return URL.createObjectURL(blob);
            })().catch(e => {
                musicUrlPromise = null;   // 失败后允许下次重试
                console.error('[音乐] 获取失败', e);
                throw e;
            });
        }
        return musicUrlPromise;
    }

    function playMusic() {
        if (audioEl) return;
        getMusicUrl().then(url => {
            // 异步期间可能已被确认 / 重置
            if (audioEl || !alertActive) return;
            audioEl = new Audio(url);
            audioEl.loop = true;
            audioEl.play().catch(e => console.warn('[音乐] 播放被浏览器拦截', e));
        }).catch(() => {});
    }

    function stopMusic() {
        if (!audioEl) return;
        audioEl.pause();
        audioEl.currentTime = 0;
        audioEl = null;
    }

    /* =================== 指示器 =================== */

    function createIndicator() {
        if (indicatorEl) return;

        indicatorEl = document.createElement('div');
        indicatorEl.style.cssText = [
            'position:fixed',
            'right:24px',
            'bottom:24px',
            'width:44px',
            'height:44px',
            'border-radius:50%',
            'background:#4caf50',
            'cursor:pointer',
            'z-index:2147483647',
            'box-shadow:0 2px 8px rgba(0,0,0,.4)',
            'transition:background .2s',
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'color:#fff',
            'font-size:14px',
            'font-weight:700',
            'user-select:none',
            'font-family:Arial,sans-serif'
        ].join(';');

        indicatorEl.title = '绿色：正常/倒计时；红色：待确认（点击确认）';
        indicatorEl.addEventListener('click', onIndicatorClick);
        document.body.appendChild(indicatorEl);
    }

    function removeIndicator() {
        if (indicatorEl) {
            indicatorEl.remove();
            indicatorEl = null;
        }
    }

    function updateIndicator() {
        if (!indicatorEl) return;

        let color = '#4caf50';
        let text = '';

        if (alertActive) {
            color = '#f44336';
            text = '!';
        } else if (submitDeadline && !submitted) {
            const remainMs = Math.max(0, submitDeadline - performance.now());
            text = String(Math.ceil(remainMs / 1000));
        }

        indicatorEl.style.background = color;
        indicatorEl.textContent = text;
    }

    function onIndicatorClick() {
        if (!alertActive) return;

        if (currentLiveId) confirmedLiveIds.add(currentLiveId);
        alertActive = false;
        updateIndicator();
        stopPushTimer();
        stopMusic();

        console.log('[告警] 用户已确认，停止推送');
    }

    /* =================== 告警 =================== */

    function activateAlert() {
        if (alertActive) return;

        alertActive = true;
        updateIndicator();
        startPushTimer();
        playMusic();

        console.log('[告警] 条件未同时通过，开始推送');
    }

    /* =================== 状态重置 =================== */

    // 检测到新 LiveId 时调用：刷新当前题状态和指示器
    function resetForNewLiveId(liveId) {
        currentLiveId   = liveId;
        liveIdChangedAt = performance.now();

        submitted       = false;
        submitDeadline  = 0;
        tightLoopActive = false;

        alertActive = false;
        stopPushTimer();
        stopMusic();

        updateIndicator();

        console.log('[iLabel] 检测到新 LiveId：' + liveId);
    }

    // 启停时全量重置
    function resetAll() {
        currentLiveId   = '';
        liveIdChangedAt = 0;

        submitted       = false;
        submitDeadline  = 0;
        tightLoopActive = false;

        alertActive = false;
        stopPushTimer();
        stopMusic();
        confirmedLiveIds.clear();

        updateIndicator();
    }

    /* =================== 定时工具：MessageChannel 微任务循环 =================== */

    const tickChannel = new MessageChannel();
    let tickPending = false;

    tickChannel.port1.onmessage = () => {
        tickPending = false;
        onTimerTick();
        updateIndicator();

        const remain = submitDeadline - performance.now();

        // 只有临近截止点时才继续密集检查，避免长时间忙循环
        if (enabled && submitDeadline && !submitted && remain <= 3000) {
            scheduleNextTick();
        } else {
            tightLoopActive = false;
        }
    };

    function scheduleNextTick() {
        if (tickPending) return;
        tickPending = true;
        tickChannel.port2.postMessage(null);
    }

    // 主定时检查：绝对时间戳比较，不依赖“等了多久”
    function onTimerTick() {
        if (!enabled) {
            updateIndicator();
            return;
        }

        if (!submitDeadline || submitted) {
            updateIndicator();
            return;
        }

        const now = performance.now();
        updateIndicator();

        if (now < submitDeadline) return;

        // 已切题 → 放弃
        if (getPageLiveId() !== currentLiveId) {
            submitDeadline = 0;
            updateIndicator();
            return;
        }

        if (clickSubmit()) {
            submitted = true;
            submitDeadline = 0;
            tightLoopActive = false;
            updateIndicator();

            console.log('[自动] 已提交本题');
        } else {
            // 按钮还没渲染，2 秒后重试
            submitDeadline = performance.now() + 2000;
            updateIndicator();
            scheduleNextTick();
        }
    }

    // 启动对 submitDeadline 的密集检查，仅在临近截止点时生效
    function startTightLoop() {
        if (tightLoopActive) return;
        if (!submitDeadline || submitted) return;
        if (submitDeadline - performance.now() > 3000) return;

        tightLoopActive = true;
        scheduleNextTick();
    }

    /* =================== 历史数据辅助 =================== */

    function getHistoryLiveId(item) {
        const id = item.liveId
            ?? item.liveid
            ?? item.live_id
            ?? item.liveID
            ?? item.id;
        return id == null ? '' : String(id);
    }

    function getHistoryOperatorName(item) {
        return String(
            item.opername
            ?? item.operatorName
            ?? item.operator_name
            ?? item.opName
            ?? item.operator
            ?? item.userName
            ?? ''
        );
    }

    function hasYunqueOperator(liveId) {
        if (!Array.isArray(historyItems)) return false;

        return historyItems.some(item =>
            getHistoryLiveId(item) === String(liveId) &&
            getHistoryOperatorName(item).includes('云雀')
        );
    }

    /* =================== 核心评估 =================== */

    function evaluate() {
        if (!enabled) return;

        const liveId = getPageLiveId();
        if (!liveId) return;

        if (liveId !== currentLiveId) {
            resetForNewLiveId(liveId);
        }

        const queueText = getQueueText();
        if (!queueText) return;

        if (submitted || historyItems === null) return;

        // 非兜底，或同 LiveId 历史操作人含“云雀”：一律只做提醒
        const needAlert = queueText !== '兜底' || hasYunqueOperator(liveId);

        if (needAlert) {
            // 如果此前已经安排了自动提交，立即取消
            if (submitDeadline) {
                submitDeadline = 0;
                tightLoopActive = false;
            }

            if (!confirmedLiveIds.has(liveId) && !alertActive) {
                activateAlert();
            } else {
                updateIndicator();
            }
            return;
        }

        // 只有“兜底且无云雀”才允许自动提交
        if (submitDeadline) return;

        if (!selectNoViolation()) return;

        const delay = MIN_DELAY_MS + Math.random() * RANDOM_DELAY_MS;
        const base  = liveIdChangedAt || performance.now();

        submitDeadline = base + delay;
        updateIndicator();

        const remainSec = Math.max(
            0,
            Math.round((submitDeadline - performance.now()) / 1000)
        );

        console.log(`[自动] 已选中「无违规」，${remainSec}s 后提交`);

        startTightLoop();
    }

    /* =================== 主轮询 + 事件唤醒 =================== */

    function poll() {
        if (!enabled) return;

        onTimerTick();
        evaluate();
        updateIndicator();

        // 距离截止点不到 3 秒时切换到密集检查
        if (submitDeadline && !submitted &&
            submitDeadline - performance.now() < 3000) {
            startTightLoop();
        }
    }

    function startPoll() {
        if (pollTimer) return;
        pollTimer = setInterval(poll, 1000);
    }

    function stopPoll() {
        if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
        }
        tightLoopActive = false;
    }

    // 三个唤醒源，覆盖切回页面的各种时机
    function onWake() {
        if (!enabled) return;
        onTimerTick();
        evaluate();
        updateIndicator();
    }

    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);
    window.addEventListener('pageshow', onWake);

    /* =================== 历史接口拦截 =================== */

    function onHistory(json) {
        if (!json) return;

        const items = (json.history && json.history.items)
                   || (json.data && json.data.history && json.data.history.items)
                   || null;

        if (!items) return;

        historyItems = items;

        // 注意：这里不再 resetAll，避免历史接口刷新时重置 LiveId 变化时间
        evaluate();
    }

    const origFetch = window.fetch;
    window.fetch = function (...args) {
        const url = typeof args[0] === 'string'
            ? args[0]
            : (args[0] && args[0].url) || '';

        const p = origFetch.apply(this, args);

        if (url.includes(HISTORY_API)) {
            p.then(r => r.clone().json().then(onHistory).catch(() => {})).catch(() => {});
        }

        return p;
    };

    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        this.__url = url;
        return origOpen.call(this, method, url, ...rest);
    };

    XMLHttpRequest.prototype.send = function (...args) {
        if (String(this.__url || '').includes(HISTORY_API)) {
            this.addEventListener('load', () => {
                try {
                    onHistory(JSON.parse(this.responseText));
                } catch (e) {}
            });
        }
        return origSend.apply(this, args);
    };

    /* =================== 菜单 =================== */

    GM_registerMenuCommand('启停', () => {
        enabled = !enabled;

        if (enabled) {
            resetAll();
            createIndicator();
            updateIndicator();
            startPoll();
            poll();
            console.log('[iLabel] 已启用');
        } else {
            resetAll();
            removeIndicator();
            stopPoll();
            console.log('[iLabel] 已停用');
        }
    });
})();
