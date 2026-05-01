// ==UserScript==
// @name         iLabel直播审核辅助
// @namespace    https://github.com/ehekatle/ilabel
// @version      3.4.5
// @description  直播审核辅助工具（含预埋、豁免、违规检测、推送提醒、队列查询、审核验证、提交时限、数据面板）
// @author       ehekatle
// @homepage     https://github.com/ehekatle/ilabel
// @source       https://raw.githubusercontent.com/ehekatle/ilabel/main/ilabel.user.js
// @updateURL    https://www.tampermonkey.net/script_installation.php#url=https://cdn.gh-proxy.org/https://raw.githubusercontent.com/ehekatle/ilabel/main/ilabel.user.js
// @downloadURL  https://cdn.gh-proxy.org/https://raw.githubusercontent.com/ehekatle/ilabel/main
// @match        https://ilabel.weixin.qq.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_info
// @grant        GM_openInTab
// @connect      tampermonkey.net
// @connect      gh-proxy.org
// @connect      qyapi.weixin.qq.com
// @connect      raw.githubusercontent.com
// @run-at       document-start
// ==/UserScript==

(function(){
'use strict';

const V = GM_info.script.version;
const BASE_RAW = 'https://raw.githubusercontent.com/ehekatle/ilabel/main';
const BASE_PROXY = 'https://cdn.gh-proxy.org/' + BASE_RAW;

const MISSION_IDS = [17331,25425,25427,27943,9637,9638,9639,9640,14587,15040,16198,20292,20293,25150,28118,31349,38599,38642,38703,40656,40687,40743,40838,40901,40976,41049,41128,41236,41331,41359,41420,41451,41506,41507,41724,41817,41907,41972];

const K = {
    CFG: 'il_cfg', CFG_TS: 'il_cfg_ts', USR: 'il_usr',
    AUDIO: 'il_aud', AUDIO_TS: 'il_aud_ts', QLIST: 'il_ql', QLIST_TS: 'il_ql_ts'
};

const NAMES = {
    targeted: '点杀', prefilled: '预埋', exempted: '豁免', review: '复核',
    penalty: '违规', note: '备注', complaint: '投诉', normal: '普通'
};

const COLORS = {
    targeted: '#000000', prefilled: '#f44336', exempted: '#4caf50', review: '#2196f3',
    note: '#90caf9', penalty: '#ff9800', complaint: '#9e9e9e', normal: '#9e9e9e'
};

const VIDEO_POS = ['主播口播', '直播画面'];

const DEF_TYPES = Object.keys(NAMES);

const S = {
    cfg: null, usr: { types: DEF_TYPES, size: 150, pos: null, alarm: true, pushRemind: true, validation: true, minTime: 30 },
    live: null, types: [], prompt: null, pushTimer: null, lastPush: 0, confirmed: false,
    audio: null, playing: false, alarmTimer: null,
    tool: { el: null, overlay: null, show: false },
    queue: { el: null, overlay: null, show: false, liveId: '', results: [], loading: false, list: [], stats: new Map, done: new Set, start: 0 },
    panel: { el: null, show: false, timer: null, last: { delay: '--', label: '--', speed: '--', time: '--:--:--' } },
    auditor: '', ok: false
};

// ========== 工具函数 ==========
const $ = (s, p = document) => p.querySelector(s);
const nw = Date.now;
const t24 = () => new Date().toTimeString().slice(0, 8);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const esc = s => { const d = document.createElement('div'); d.textContent = s ?? ''; return d.innerHTML; };
const log = (msg, status) => console.log(`[iLabel] ${msg} ${status === true ? '✅' : status === false ? '❌' : status || ''}`);

const toast = (msg, err) => {
    const t = document.createElement('div');
    Object.assign(t.style, {
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        padding: '16px 24px', borderRadius: '8px', fontSize: '14px', zIndex: 2147483647,
        animation: 'il-fade 2.5s', maxWidth: '400px', textAlign: 'center', lineHeight: 1.6,
        background: err ? 'rgba(244,67,54,0.95)' : 'rgba(33,150,243,0.95)', color: '#fff'
    });
    t.innerHTML = Array.isArray(msg) ? msg.join('<br>') : msg;
    document.body.appendChild(t);
    setTimeout(() => { t.style.animation = 'il-out 0.3s'; setTimeout(() => t.remove(), 300); }, 2500);
};

const fetchText = (url, timeout = 10000) => new Promise((ok, no) => {
    GM_xmlhttpRequest({
        method: 'GET', url: url + '?t=' + nw(), timeout,
        onload: r => r.status === 200 ? ok(r.responseText) : no(new Error(`HTTP ${r.status}`)),
        onerror: e => no(new Error('Network error'))
    });
});

// ========== 弹窗居中 ==========
function centerDialog(el, mw = 0.9, mh = 0.9) {
    const vw = window.innerWidth, vh = window.innerHeight;
    el.style.width = clamp(vw * 0.7, 400, 750) + 'px';
    el.style.maxWidth = Math.min(750, vw * mw) + 'px';
    el.style.maxHeight = vh * mh - 40 + 'px';
    Object.assign(el.style, { left: '50%', top: '50%', transform: 'translate(-50%,-50%)' });
}

// ========== 配置加载 ==========
function loadUser() {
    try {
        const s = GM_getValue(K.USR);
        if (s) {
            const d = JSON.parse(s);
            S.usr = { types: DEF_TYPES, size: 150, pos: null, alarm: true, pushRemind: true, validation: true, minTime: 30, ...d };
        }
    } catch (e) {}
    if (!S.usr.pos) S.usr.pos = { x: Math.round((window.innerWidth - 200) / 2), y: 100 };
    if (S.usr.alarmRing !== undefined) { S.usr.pushRemind = S.usr.alarmRing; delete S.usr.alarmRing; }
    if (S.usr.minSubmitTime !== undefined) { S.usr.minTime = S.usr.minSubmitTime; delete S.usr.minSubmitTime; }
}

function saveUser() { GM_setValue(K.USR, JSON.stringify(S.usr)); }

async function loadCfg() {
    let success = false;
    const cached = GM_getValue(K.CFG);

    // 先加载缓存
    if (cached) {
        try {
            const parsed = JSON.parse(cached);
            S.cfg = parsed.globalConfig || (parsed.auditorWhiteList ? parsed : null);
            if (S.cfg) success = true;
        } catch (e) {}
    }

    // 检查是否需要更新（24小时）
    if (success && nw() - GM_getValue(K.CFG_TS, 0) < 864e5) return success;

    // 尝试远程更新
    try {
        const text = await fetchText(BASE_PROXY + '/config.json');
        const json = JSON.parse(text);
        if (json.globalConfig) {
            S.cfg = json.globalConfig;
            GM_setValue(K.CFG, JSON.stringify(json));
            GM_setValue(K.CFG_TS, nw());
            return true;
        }
    } catch (e) {}

    // 远程失败，用缓存或空配置
    if (!S.cfg) S.cfg = { auditorWhiteList: [], anchorWhiteList: {}, penaltyKeywords: [], pushUrl: {}, validationRules: {} };
    return success;
}

// ========== 更新检查 ==========
async function checkUpdate() {
    try {
        const text = await fetchText(BASE_PROXY + '/ilabel.user.js');
        const m = text.match(/@version\s+([\d.]+)/);
        if (m && m[1] !== V) {
            window.open(BASE_PROXY + '/ilabel.user.js');
            return true;
        }
    } catch (e) {
        console.error('[iLabel] 版本检查失败:', e);
    }
    return false;
}

// ========== 闹钟 ==========
function preloadAudio() {
    const d = GM_getValue(K.AUDIO);
    if (d && nw() - GM_getValue(K.AUDIO_TS, 0) < 864e5) {
        try {
            const b = new Uint8Array([...atob(d)].map(c => c.charCodeAt(0)));
            S.audio = new Audio(URL.createObjectURL(new Blob([b], { type: 'audio/mpeg' })));
            S.audio.loop = true; S.audio.volume = 0.4; S.audio.load();
            return;
        } catch (e) {}
    }
    GM_xmlhttpRequest({
        method: 'GET', url: BASE_PROXY + '/music.mp3?t=' + nw(), responseType: 'arraybuffer', timeout: 15000,
        onload: r => {
            if (r.status !== 200) return;
            const blob = new Blob([r.response], { type: 'audio/mpeg' });
            S.audio = new Audio(URL.createObjectURL(blob));
            S.audio.loop = true; S.audio.volume = 0.4; S.audio.load();
            const rd = new FileReader();
            rd.onloadend = () => {
                const b64 = rd.result.split(',')[1];
                if (b64) { GM_setValue(K.AUDIO, b64); GM_setValue(K.AUDIO_TS, nw()); }
            };
            rd.readAsDataURL(blob);
        }
    });
}

function playAlarm() {
    S.usr.alarm && !S.confirmed && S.audio && !S.playing && S.audio.play().then(() => S.playing = true).catch(() => {});
}

function stopAlarm() {
    S.audio && S.playing && (S.audio.pause(), S.audio.currentTime = 0, S.playing = false);
}

// ========== 提示框 ==========
function showPrompt(live, types) {
    S.live = live; S.types = types; S.confirmed = false;
    closePrompt(); createPrompt(); startPush(); startAlarmCheck();
    document.addEventListener('keydown', onSpace);
    S.usr.alarm && setTimeout(playAlarm, 100);
}

function closePrompt() {
    S.prompt?.remove(); S.prompt = null;
    S.pushTimer && (clearInterval(S.pushTimer), S.pushTimer = null);
    S.alarmTimer && (clearInterval(S.alarmTimer), S.alarmTimer = null);
    document.removeEventListener('keydown', onSpace);
    stopAlarm(); S.confirmed = false;
}

function onSpace(e) {
    e.code === 'Space' && !S.confirmed && (e.preventDefault(), e.stopPropagation(), confirm());
}

function confirm() {
    if (S.confirmed) return;
    S.confirmed = true;
    S.live?.liveId && navigator.clipboard.writeText(S.live.liveId).catch(() => {});
    S.prompt?.querySelectorAll('.prompt-tag').forEach(t => Object.assign(t.style, { opacity: '0.6', cursor: 'default', pointerEvents: 'none' }));
    S.pushTimer && (clearInterval(S.pushTimer), S.pushTimer = null);
    stopAlarm();
}

function createPrompt() {
    S.prompt = document.createElement('div');
    S.prompt.id = 'il-prompt';
    const { x, y } = S.usr.pos, s = S.usr.size / 100;
    Object.assign(S.prompt.style, {
        position: 'fixed', left: x + 'px', top: y + 'px', zIndex: 2147483646,
        transform: `scale(${s})`, transformOrigin: 'left top', cursor: 'pointer', userSelect: 'none'
    });
    const wrapper = document.createElement('div');
    Object.assign(wrapper.style, { display: 'flex', gap: '0', background: 'transparent', padding: '0' });
    wrapper.addEventListener('click', e => { wrapper._dr || confirm(); wrapper._dr = false; });
    S.types.forEach(t => wrapper.appendChild(tagEl(t)));
    S.prompt.appendChild(wrapper);
    document.body.appendChild(S.prompt);
    dragPrompt(S.prompt, wrapper);
}

function tagEl(type) {
    const t = document.createElement('div'), c = COLORS[type] || '#fff';
    t.className = 'prompt-tag';
    Object.assign(t.style, {
        padding: '6px 0', width: '56px', backgroundColor: c, color: getContrastColor(c),
        fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)', borderRadius: '20px',
        margin: '0', transition: 'all 0.2s', textAlign: 'center'
    });
    t.textContent = NAMES[type] || type;
    return t;
}

function getContrastColor(hex) {
    if (!hex?.startsWith('#')) return '#000';
    const code = hex.length === 7 ? hex.substring(1).match(/../g) : hex.substring(1).match(/./g).map(c => c + c);
    const [r, g, b] = code.map(c => parseInt(c, 16));
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? '#000' : '#fff';
}

function dragPrompt(el, wrapper) {
    let drg = false, mv = false, ox = 0, oy = 0;
    el.addEventListener('mousedown', e => {
        drg = true; mv = false;
        const r = el.getBoundingClientRect(); ox = e.clientX - r.left; oy = e.clientY - r.top;
        el.style.cursor = 'grabbing';
        document.addEventListener('mousemove', mve); document.addEventListener('mouseup', up);
        e.preventDefault();
    });
    const mve = e => {
        if (!drg) return;
        (Math.abs(e.clientX - ox - el.offsetLeft) > 3 || Math.abs(e.clientY - oy - el.offsetTop) > 3) && (mv = true);
        el.style.left = clamp(e.clientX - ox, 0, window.innerWidth - el.offsetWidth) + 'px';
        el.style.top = clamp(e.clientY - oy, 0, window.innerHeight - el.offsetHeight) + 'px';
        S.usr.pos = { x: parseInt(el.style.left), y: parseInt(el.style.top) };
    };
    const up = () => {
        drg = false; el.style.cursor = 'pointer';
        document.removeEventListener('mousemove', mve); document.removeEventListener('mouseup', up);
        mv && (wrapper._dr = true, saveUser());
    };
}

function startAlarmCheck() {
    S.alarmTimer && clearInterval(S.alarmTimer);
    S.alarmTimer = setInterval(() => {
        const has = !!document.getElementById('il-prompt');
        has && !S.confirmed && S.usr.alarm && !S.playing && playAlarm();
        (!has || S.confirmed) && stopAlarm();
    }, 1000);
}

// ========== 推送 ==========
function startPush() {
    if (!S.cfg?.pushUrl?.reminderPushUrl || !S.usr.pushRemind) return;
    S.lastPush = nw();
    S.pushTimer = setInterval(() => {
        if (S.confirmed || !S.live || nw() - S.lastPush < 20000 || !S.ok) return;
        S.lastPush = nw();
        const data = { msgtype: "text", text: { content: `${t24()} ${S.types.map(t => NAMES[t]).join('、')}单未确认` } };
        const auditor = S.cfg?.auditorWhiteList?.find(a => a.name === S.live?.auditor);
        auditor && (data.text.mentioned_mobile_list = [auditor.mobile]);
        GM_xmlhttpRequest({ method: 'POST', url: S.cfg.pushUrl.reminderPushUrl, headers: { 'Content-Type': 'application/json' }, data: JSON.stringify(data), timeout: 5000 });
    }, 1000);
}

// ========== 请求拦截 ==========
function setupIntercept() {
    const _f = window.fetch;
    window.fetch = function(...args) {
        const [url, opts = {}] = args;
        if (typeof url === 'string' && url.includes('/api/answers') && opts.method === 'POST') {
            try {
                const body = typeof opts.body === 'string' ? JSON.parse(opts.body) : opts.body;
                const err = checkSubmit(body);
                if (err) return toast(err, 'error'), Promise.reject(new Error(err));
            } catch (e) { return Promise.reject(e); }
        }
        return _f.apply(this, args).then(r => {
            if (typeof url === 'string' && url.includes('/api/answers') && r.ok) {
                r.clone().json().then(d => d.status === 'ok' && onAnswerSubmit(opts.body)).catch(() => {});
            }
            return r;
        });
    };
    const _o = XMLHttpRequest.prototype.open, _s = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(m, u) { this._m = m.toUpperCase(); this._u = u; return _o.apply(this, arguments); };
    XMLHttpRequest.prototype.send = function(b) {
        const x = this;
        if (x._m === 'POST' && x._u?.includes('/api/answers')) {
            try { const p = typeof b === 'string' ? JSON.parse(b) : b; const e = checkSubmit(p); if (e) return toast(e, 'error'); } catch (e) { return; }
        }
        const wrap = (cb, body) => x.addEventListener('load', () => { try { x.status === 200 && cb(JSON.parse(x.responseText), body); } catch (e) {} });
        x._u?.includes('get_live_info_batch') && wrap((d, _) => d.ret === 0 && d.liveInfoList?.length && onLiveInfo(d.liveInfoList[0]));
        x._m === 'POST' && x._u?.includes('/api/answers') && wrap((d, body) => d.status === 'ok' && onAnswerSubmit(body), b);
        return _s.call(this, b);
    };
}

function checkSubmit(body) {
    const p = typeof body === 'string' ? JSON.parse(body) : body;
    if (S.usr.minTime > 0 && p?.use_time && p.use_time < S.usr.minTime) return `提交时间 ${p.use_time.toFixed(1)}s 小于最小限制 ${S.usr.minTime}s`;
    if (!S.usr.validation || !p?.results) return null;
    const errs = [], rules = S.cfg?.validationRules || {};
    Object.values(p.results).forEach(r => {
        if (!r || r.is_targeted || r.targeted_type) return;
        const fi = r.finder_object?.[0]; if (!fi) return;
        const rl = fi.reason_label || fi.ext_info?.reason_label || fi.ext_info?.punish_keyword_path?.[fi.ext_info.punish_keyword_path.length - 1];
        const pc = fi.ext_info?.punish_content, pi = fi.ext_info?.product_id, im = fi.img_url || [], ct = fi.clip_times || [], rm = fi.remark;
        rl && rules.requireProductIdTags?.includes(rl) && (!pi || (Array.isArray(pi) && !pi.length)) && errs.push('该标签需提供商品id');
        pc && VIDEO_POS.includes(pc) && !ct.length && !im.length && errs.push('视频/图片证据不能为空');
        rl && (!im.length && errs.push('图片证据不能为空'), !rm?.trim() && errs.push('违规备注不能为空'));
    });
    return errs.length ? [...new Set(errs)].join('<br>') : null;
}

// ========== 直播数据处理 ==========
async function onLiveInfo(info) {
    try {
        const [auditor, auditInfo] = await Promise.all([getAuditor(), getAuditInfo()]);
        S.live = {
            liveId: info.liveId || '', anchorUserId: info.anchorUserId || '', nickname: info.nickname || '',
            authStatus: info.authStatus || '', description: info.description || '', poiName: info.poiName || '',
            streamStartTime: info.streamStartTime || '', auditTime: auditInfo.audit_time || 0, auditor,
            auditRemark: auditInfo.auditRemark || ''
        };
        if (S.ok) {
            S.types = checkTypes(S.live);
            const f = S.types.filter(t => S.usr.types.includes(t));
            (f.length || S.usr.alarm) && showPrompt(S.live, f);
        }
    } catch (e) {}
}

function onAnswerSubmit(body) {
    try {
        const p = typeof body === 'string' ? JSON.parse(body) : body;
        if (!p?.results) return;
        Object.values(p.results).forEach(r => {
            if (!r) return;
            const fi = r.finder_object?.[0];
            let cl = '不处罚';
            if (fi) {
                const rl = fi.reason_label || fi.ext_info?.reason_label || fi.ext_info?.punish_keyword_path?.[fi.ext_info.punish_keyword_path.length - 1] || fi.ext_info?.punish_keyword;
                rl && (cl = fi.remark ? `${rl}（${fi.remark}）` : rl);
            }
            pushAnswer({ task_id: r.task_id || '', live_id: r.live_id || '', mid_str: r.mid_str || '', conclusion: cl, operator: r.oper_name?.split('-').pop()?.trim() || r.oper_name?.trim() || '未知' });
        });
    } catch (e) {}
}

function pushAnswer(d) {
    const url = S.cfg?.pushUrl?.answerPushUrl; if (!url) return;
    GM_xmlhttpRequest({
        method: 'POST', url, headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ msgtype: "text", text: { content: `队列：${d.mid_str}\n审核：${d.operator}（${t24()}）\ntaskID：${d.task_id}\nliveID：${d.live_id}\n审核结案：${d.conclusion}` } }),
        timeout: 5000, onload: r => r.status === 200 && S.ok && closePrompt()
    });
}

function checkTypes(d) {
    const ts = []; if (!S.cfg) return ts;
    isPre(d) && ts.push('prefilled');
    isEx(d) && ts.push('exempted');
    d.auditRemark?.includes('复核') && ts.push('review');
    d.auditRemark?.includes('辛苦注意审核') && ts.push('targeted');
    penalty(d).found && ts.push('penalty');
    d.auditRemark?.includes('辛苦核实') && ts.push('note');
    d.auditRemark?.includes('投诉') && ts.push('complaint');
    return ts.length ? ts : ['normal'];
}

function isPre(d) {
    if (!d.auditTime) return false;
    const dt = new Date(parseInt(d.auditTime) * 1000), n = new Date();
    return dt.getDate() !== n.getDate() || dt.getMonth() !== n.getMonth() || dt.getFullYear() !== n.getFullYear();
}

function isEx(d) {
    const wl = S.cfg?.anchorWhiteList || {};
    return (d.anchorUserId && wl.anchorUserIdWhiteList?.includes(d.anchorUserId)) ||
           (d.nickname && wl.nicknameWhiteList?.some(k => k && d.nickname.includes(k))) ||
           !!(d.authStatus && wl.authStatusWhiteList?.some(k => k && d.authStatus.includes(k)));
}

function penalty(d) {
    const kw = S.cfg?.penaltyKeywords || [];
    for (const f of ['description', 'nickname', 'poiName']) {
        if (kw.some(k => (d[f] || '').includes(k))) return { found: true, location: f };
    }
    return { found: false };
}

async function getAuditor() {
    try {
        const r = await fetch('/api/user/info', { headers: { 'x-requested-with': 'XMLHttpRequest' }, credentials: 'include' });
        if (r.ok) { const d = await r.json(); if (d.data?.name) return d.data.name.split('-').pop().trim().replace(/[^\u4e00-\u9fa5]/g, ''); }
    } catch (e) {}
    return '';
}

async function getAuditInfo() {
    try {
        const r = await fetch('/api/mixed-task/assigned?task_id=10', { headers: { 'x-requested-with': 'XMLHttpRequest' }, credentials: 'include' });
        if (r.ok) {
            const d = await r.json(), c = d.data?.hits?.[0]?.content_data?.content;
            if (c) return { audit_time: c.audit_time || 0, auditRemark: (c.send_remark || '').replace(/\\u([\dA-F]{4})/gi, (_, g) => String.fromCharCode(parseInt(g, 16))) };
        }
    } catch (e) {}
    return { audit_time: 0, auditRemark: '' };
}

// ========== 配置工具 ==========
function toggleTool() { S.tool.show ? closeTool() : openTool(); }
function openTool() {
    if (S.tool.el) { S.tool.el.style.display = S.tool.overlay.style.display = 'block'; S.tool.show = true; refreshTool(); }
    else createTool();
}
function closeTool() {
    S.tool.el && (S.tool.el.style.display = S.tool.overlay.style.display = 'none');
    S.tool.show = false;
}

function createTool() {
    ['overlay', 'el'].forEach((k, i) => {
        const d = document.createElement('div');
        S.tool[k] = d;
        const baseStyle = { position: 'fixed', zIndex: 2147483645 + i, display: 'none' };
        if (i === 0) {
            Object.assign(d.style, { ...baseStyle, top: '0', left: '0', right: '0', bottom: '0', background: 'rgba(0,0,0,0.4)' });
            d.addEventListener('click', closeTool);
        } else {
            d.id = 'il-tool';
            Object.assign(d.style, { ...baseStyle, background: '#fff', borderRadius: '16px', boxShadow: '0 12px 40px rgba(0,0,0,0.2)', fontFamily: 'system-ui,-apple-system,sans-serif' });
        }
        document.body.appendChild(d);
    });
    window.addEventListener('resize', () => S.tool.show && centerDialog(S.tool.el));
    renderTool(); centerDialog(S.tool.el);
    S.tool.el.style.display = S.tool.overlay.style.display = 'block'; S.tool.show = true;
}

function renderTool() {
    const typesHtml = Object.entries(NAMES).map(([t, n]) => `
        <div class="il-sw-item">
            <label class="il-sw">
                <input type="checkbox" class="il-tc" value="${t}" ${S.usr.types.includes(t) ? 'checked' : ''}>
                <span class="il-sl" style="--sw-color:${COLORS[t]}"></span>
            </label>
            <span class="il-sw-lbl">${n}</span>
        </div>`).join('');

    S.tool.el.innerHTML = `
        <div style="padding:24px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                <div><h3 style="margin:0;font-size:18px;color:#1a1a2e;">iLabel 辅助工具</h3><span style="font-size:11px;color:#999;">v${V}</span></div>
                <button class="il-close" style="width:32px;height:32px;background:#f1f5f9;border:none;border-radius:8px;font-size:18px;cursor:pointer;color:#64748b;">×</button>
            </div>
            <div class="il-sec"><div class="il-lbl">提示类型</div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">${typesHtml}</div></div>
            <div class="il-sec">
                <div class="il-lbl">缩放比例 <span class="il-sz-v">${S.usr.size}</span>%</div>
                <div style="display:flex;align-items:center;gap:12px;">
                    <input type="range" class="il-sz-r" min="20" max="200" step="5" value="${S.usr.size}" style="flex:1;height:4px;">
                    <input type="number" class="il-sz-n" min="20" max="200" step="5" value="${S.usr.size}" style="width:64px;padding:6px 8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;text-align:center;">
                </div>
            </div>
            <div class="il-sec">
                <div class="il-lbl">开关设置</div>
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
                    ${['alarm','push','val','mt'].map(k => `
                        <div class="il-sw-item">
                            ${k !== 'mt' ? `<label class="il-sw"><input type="checkbox" class="il-${k}" ${S.usr[k === 'alarm' ? 'alarm' : k === 'push' ? 'pushRemind' : 'validation'] ? 'checked' : ''}><span class="il-sl"></span></label>` : ''}
                            ${k === 'mt' ? `<div style="display:flex;align-items:center;gap:4px;"><input type="number" class="il-mt" min="0" max="300" step="1" value="${S.usr.minTime}" style="width:48px;padding:4px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;text-align:center;"><span style="font-size:11px;color:#999;">秒</span></div>` : ''}
                            <span class="il-sw-lbl">${k === 'alarm' ? '闹钟提醒' : k === 'push' ? '推送提醒' : k === 'val' ? '答案校验' : '提交时限'}</span>
                        </div>`).join('')}
                </div>
            </div>
            <div style="display:flex;justify-content:flex-end;gap:10px;padding-top:16px;border-top:1px solid #f1f5f9;">
                <button class="il-btn il-btn-ghost">恢复默认</button>
                <button class="il-btn il-btn-primary">保存配置</button>
            </div>
        </div>`;
    bindTool();
}

function refreshTool() { S.tool.el && centerDialog(S.tool.el); }

function bindTool() {
    const el = S.tool.el;
    $('.il-close', el).addEventListener('click', closeTool);
    const szR = $('.il-sz-r', el), szN = $('.il-sz-n', el), szV = $('.il-sz-v', el);
    const sync = v => { szR.value = v; szN.value = v; szV.textContent = v; };
    szR.addEventListener('input', e => sync(e.target.value));
    szN.addEventListener('input', e => sync(e.target.value));
    $('.il-btn-ghost', el).addEventListener('click', () => {
        S.usr = { types: DEF_TYPES, size: 150, pos: { x: Math.round((window.innerWidth - 200) / 2), y: 100 }, alarm: true, pushRemind: true, validation: true, minTime: 30 };
        renderTool(); refreshTool(); saveUser();
    });
    $('.il-btn-primary', el).addEventListener('click', () => {
        S.usr.types = [...el.querySelectorAll('.il-tc:checked')].map(cb => cb.value);
        S.usr.size = parseInt(szR.value || 150);
        S.usr.alarm = $('.il-alm', el).checked;
        S.usr.pushRemind = $('.il-push', el).checked;
        S.usr.validation = $('.il-val', el).checked;
        S.usr.minTime = parseInt($('.il-mt', el).value || 30);
        saveUser(); setTimeout(closeTool, 800);
    });
}

// ========== 队列查询 ==========
function toggleQueue() { S.queue.show ? closeQueue() : openQueue(); }
function openQueue() {
    if (S.queue.el) { S.queue.el.style.display = S.queue.overlay.style.display = 'block'; S.queue.show = true; S.queue.liveId = ''; S.queue.results = []; refreshQueue(); }
    else createQueue();
}
function closeQueue() {
    S.queue.el && (S.queue.el.style.display = 'none');
    S.queue.overlay && (S.queue.overlay.style.display = 'none');
    S.queue.show = false; S.queue.liveId = ''; S.queue.results = [];
    S.queue.done.clear();
}

function createQueue() {
    ['overlay', 'el'].forEach((k, i) => {
        const d = document.createElement('div');
        S.queue[k] = d;
        const baseStyle = { position: 'fixed', zIndex: 2147483645 + i, display: 'none' };
        if (i === 0) {
            Object.assign(d.style, { ...baseStyle, top: '0', left: '0', right: '0', bottom: '0', background: 'rgba(0,0,0,0.4)' });
            d.addEventListener('click', closeQueue);
        } else {
            d.id = 'il-queue';
            Object.assign(d.style, { ...baseStyle, background: '#fff', borderRadius: '16px', boxShadow: '0 12px 40px rgba(0,0,0,0.2)', fontFamily: 'system-ui,-apple-system,sans-serif', overflow: 'hidden' });
        }
        document.body.appendChild(d);
    });
    window.addEventListener('resize', () => S.queue.show && centerDialog(S.queue.el, 0.9, 0.85));
    renderQueue(); centerDialog(S.queue.el, 0.9, 0.85);
    S.queue.el.style.display = S.queue.overlay.style.display = 'block'; S.queue.show = true;
}

function renderQueue() {
    S.queue.el.innerHTML = `
        <div style="display:flex;flex-direction:column;max-height:inherit;">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:20px 24px;border-bottom:1px solid #f1f5f9;">
                <h3 style="margin:0;font-size:16px;color:#1a1a2e;">队列查询</h3>
                <button class="il-q-close" style="width:32px;height:32px;background:#f1f5f9;border:none;border-radius:8px;font-size:18px;cursor:pointer;color:#64748b;">×</button>
            </div>
            <div style="padding:20px 24px;overflow-y:auto;flex:1;">
                <div style="display:flex;gap:10px;margin-bottom:20px;">
                    <input type="text" class="il-q-in" placeholder="输入 Live ID 查询" style="flex:1;padding:10px 14px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px;outline:none;">
                    <button class="il-q-btn" style="padding:10px 24px;background:#2563eb;color:#fff;border:none;border-radius:10px;font-size:14px;cursor:pointer;font-weight:500;">查询</button>
                </div>
                <div class="il-q-list" style="display:flex;flex-direction:column;gap:8px;min-height:200px;"></div>
                <div class="il-q-load" style="display:none;text-align:center;padding:40px;color:#94a3b8;">查询中...</div>
                <div class="il-q-no" style="display:none;text-align:center;padding:40px;color:#94a3b8;">暂无结果</div>
            </div>
            <div style="padding:12px 24px;border-top:1px solid #f1f5f9;font-size:12px;color:#94a3b8;display:flex;justify-content:space-between;">
                <span>统计: ${S.queue.stats.size} 队列</span>
                <span class="il-q-cnt">共 ${S.queue.list.length} 个队列</span>
            </div>
        </div>`;
    bindQueue();
}

function refreshQueue() {
    const el = S.queue.el; if (!el) return;
    const list = $('.il-q-list', el), load = $('.il-q-load', el), no = $('.il-q-no', el), cnt = $('.il-q-cnt', el);
    if (S.queue.loading) {
        list.style.display = no.style.display = 'none'; load.style.display = 'block';
        cnt.textContent = `查询中... ${Math.floor((nw() - S.queue.start) / 1000)}s`;
    } else {
        load.style.display = 'none';
        if (S.queue.results.length) {
            list.style.display = 'flex'; no.style.display = 'none';
            list.innerHTML = S.queue.results.map(q => `
                <div class="il-q-i" data-url="${esc(q.url)}">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <b style="font-size:13px;">${esc(q.title)}</b>
                        <span style="background:#ecfdf5;color:#059669;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;">命中 ${q.total}</span>
                    </div>
                    <div style="font-size:11px;color:#94a3b8;margin-top:4px;">ID: ${q.mid} · ${q.responseTime}ms</div>
                </div>`).join('');
            list.querySelectorAll('.il-q-i').forEach(i => i.addEventListener('click', () => window.open(i.dataset.url, '_blank')));
            cnt.textContent = `${S.queue.results.length}/${S.queue.done.size} 已查`;
        } else {
            list.style.display = 'none'; no.style.display = 'block';
            cnt.textContent = `共 ${S.queue.list.length} 个队列`;
        }
    }
    S.queue.show && centerDialog(S.queue.el, 0.9, 0.85);
}

function bindQueue() {
    const el = S.queue.el;
    $('.il-q-close', el).addEventListener('click', closeQueue);
    const inp = $('.il-q-in', el), btn = $('.il-q-btn', el);
    const go = () => { const id = inp.value.trim(); id && (S.queue.liveId = id, searchQueues(id)); };
    btn.addEventListener('click', go);
    inp.addEventListener('keypress', e => e.key === 'Enter' && go());
}

async function searchQueues(liveId) {
    S.queue.done.clear(); S.queue.loading = true; S.queue.results = []; S.queue.start = nw(); refreshQueue();
    try {
        if (!S.queue.list.length) await preloadQueues();
        const sorted = [...S.queue.list].sort((a, b) => (S.queue.stats.get(b.id) || 0) - (S.queue.stats.get(a.id) || 0));
        for (let i = 0; i < sorted.length; i += 5) {
            await Promise.all(sorted.slice(i, i + 5).map(m => checkHit(m, liveId)));
            refreshQueue();
        }
    } catch (e) {} finally { S.queue.loading = false; refreshQueue(); }
}

function checkHit(m, liveId) {
    const qid = m.id; S.queue.done.add(qid);
    return new Promise(rs => {
        const st = nw();
        GM_xmlhttpRequest({
            method: 'GET',
            url: `https://ilabel.weixin.qq.com/api/labeled-hits?mid=${qid}&pagesize=3&pageindex=1&answer=${encodeURIComponent(JSON.stringify([{key:'live_id',op:'=',value:liveId}]))}&status=all`,
            headers: { 'x-requested-with': 'XMLHttpRequest' },
            onload: r => {
                try {
                    const d = JSON.parse(r.responseText), t = d?.data?.total || 0;
                    t > 0 && (S.queue.stats.set(qid, (S.queue.stats.get(qid) || 0) + 1), addResult({ mid: qid, title: m.title, total: t, url: `https://ilabel.weixin.qq.com/mission/${qid}/modify?title=${encodeURIComponent(m.title)}&status=all&answer=${encodeURIComponent(JSON.stringify({key:'live_id',op:'=',value:liveId}))}`, responseTime: nw() - st }));
                } catch (e) {}
                rs();
            },
            onerror: () => rs()
        });
    });
}

function addResult(r) {
    S.queue.results.some(x => x.mid === r.mid) || (S.queue.results.push(r), S.queue.results.sort((a, b) => a.total !== b.total ? b.total - a.total : a.responseTime - b.responseTime));
}

async function preloadQueues() {
    try {
        const c = GM_getValue(K.QLIST);
        if (c && nw() - GM_getValue(K.QLIST_TS, 0) < 864e5) { S.queue.list = JSON.parse(c); return; }
        const m = await new Promise((ok, no) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: 'https://ilabel.weixin.qq.com/api/mission/list?pageindex=1&pagesize=100&query=%7B%22mid%22:%22%22,%22keyword%22:%22%22,%22status%22:1,%22authorities%22:[]%7D&mission_type=5&business=32',
                headers: { 'x-requested-with': 'XMLHttpRequest' },
                onload: r => { try { const d = JSON.parse(r.responseText); d?.data?.missions ? ok(d.data.missions) : no(); } catch (e) { no(); } },
                onerror: no
            });
        });
        S.queue.list = m; GM_setValue(K.QLIST, JSON.stringify(m)); GM_setValue(K.QLIST_TS, nw());
    } catch (e) { const c = GM_getValue(K.QLIST); c && (S.queue.list = JSON.parse(c)); }
}

// ========== 数据面板 ==========
function getUsername() {
    const m = document.cookie.match(/ilabel-username="[^"]*?([^|=]+?)==/);
    return (m && m[1]) ? (() => { try { return atob(m[1]); } catch (e) { return 'oUCl2wCZ1wIa38dAQOh2xFrv1uHg'; } })() : 'oUCl2wCZ1wIa38dAQOh2xFrv1uHg';
}

function getDayRange() {
    const n = new Date();
    return {
        start: Math.floor(new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime() / 1000),
        end: Math.floor(new Date(n.getFullYear(), n.getMonth(), n.getDate(), 23, 59, 59).getTime() / 1000)
    };
}

function getHourRange() {
    const n = new Date(), h = n.getMinutes() < 2 ? new Date(n.getTime() - 36e5) : n;
    const y = h.getFullYear(), mo = String(h.getMonth() + 1).padStart(2, '0'), d = String(h.getDate()).padStart(2, '0'), hr = String(h.getHours()).padStart(2, '0');
    return { begin: `${y}-${mo}-${d} ${hr}:00:00`, end: `${y}-${mo}-${d} ${hr}:59:59` };
}

function togglePanel() { S.panel.show ? hidePanel() : showPanel(); }
function showPanel() {
    if (!S.panel.el) { createPanel(); S.panel.show = true; updatePanelData(); S.panel.timer = setInterval(updatePanelData, 60000); }
    else { S.panel.el.style.display = 'block'; S.panel.show = true; S.panel.timer || (updatePanelData(), S.panel.timer = setInterval(updatePanelData, 60000)); }
}
function hidePanel() {
    S.panel.el && (S.panel.el.style.display = 'none'); S.panel.show = false;
    S.panel.timer && (clearInterval(S.panel.timer), S.panel.timer = null);
}

function createPanel() {
    const d = document.createElement('div'); d.className = 'il-panel';
    Object.assign(d.style, {
        position: 'fixed', right: '20px', top: '100px', width: '220px',
        background: 'rgba(255,255,255,0.8)', color: '#1e293b', borderRadius: '14px',
        padding: '10px 14px', fontSize: '12px', fontFamily: 'system-ui,-apple-system,sans-serif',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)', zIndex: 2147483546,
        backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.06)',
        cursor: 'move', userSelect: 'none'
    });
    d.innerHTML = `
        <div class="il-pd-row"><span class="il-pd-lbl">质检余量</span><span class="il-pd-val" id="il-pd-d">${S.panel.last.delay}</span></div>
        <div class="il-pd-row"><span class="il-pd-lbl">小时审核</span><span class="il-pd-val" id="il-pd-l">${S.panel.last.label}</span></div>
        <div class="il-pd-row"><span class="il-pd-lbl">小时速度</span><span class="il-pd-val" id="il-pd-s">${S.panel.last.speed}</span></div>
        <div class="il-pd-footer"><span id="il-pd-t">${S.panel.last.time}</span><button class="il-pd-btn" id="il-pd-b">刷新</button></div>
    `;
    document.body.appendChild(d);
    dragPanel(d);
    $('#il-pd-b', d).addEventListener('click', () => !$('#il-pd-b', d).disabled && updatePanelData());
    S.panel.el = d;
}

function dragPanel(el) {
    let dr = false, ox = 0, oy = 0;
    el.addEventListener('mousedown', e => {
        if (e.target.tagName === 'BUTTON') return;
        dr = true; const r = el.getBoundingClientRect(); ox = e.clientX - r.left; oy = e.clientY - r.top;
        el.style.opacity = '0.9';
        document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
        e.preventDefault();
    });
    const mv = e => {
        dr && (el.style.left = clamp(e.clientX - ox, 0, window.innerWidth - el.offsetWidth) + 'px',
               el.style.top = clamp(e.clientY - oy, 0, window.innerHeight - el.offsetHeight) + 'px',
               el.style.right = 'auto', el.style.bottom = 'auto');
    };
    const up = () => { dr = false; el.style.opacity = '1'; document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); };
}

function updatePanelData() {
    if (!S.panel.el) return;
    const btn = $('#il-pd-b', S.panel.el); btn.disabled = true;
    let delayDone = false, speedDone = false;
    const checkDone = () => { delayDone && speedDone && (btn.disabled = false); };

    const { start, end } = getDayRange();
    GM_xmlhttpRequest({
        method: 'GET',
        url: `https://ilabel.weixin.qq.com/api/statistic/crm-all-summary?start_time=${start}&end_time=${end}&task_id=10`,
        headers: { 'x-requested-with': 'XMLHttpRequest' },
        onload: r => {
            try { const d = JSON.parse(r.responseText); updateDelay((d.status === 'ok' && d.data ? d.data.find(i => i.mid === 9639) : null)?.delay_cnt ?? '--', false); }
            catch (e) { updateDelay('--', true); }
            delayDone = true; checkDone();
        },
        onerror: () => { updateDelay('--', true); delayDone = true; checkDone(); }
    });

    const hr = getHourRange();
    GM_xmlhttpRequest({
        method: 'GET',
        url: `https://ilabel.weixin.qq.com/api/statistic/detail?time_interval=0&time_begin=${encodeURIComponent(hr.begin)}&time_end=${encodeURIComponent(hr.end)}&group_ids=&usernames=${getUsername()}&mission_ids=${MISSION_IDS.join(',')}&group_dims=marker&answer=[]&cal_summary=1&filter_sync_appeal=0`,
        headers: { 'x-requested-with': 'XMLHttpRequest' },
        onload: r => {
            try { const d = JSON.parse(r.responseText); const s = d.status === 'ok' && d.data?.statistics?.length ? d.data.statistics[0] : null; updateSpeed(s ? s.label_cnt || 0 : 0, s ? s.use_time || 0 : 0, false); }
            catch (e) { updateSpeed(0, 0, true); }
            speedDone = true; checkDone();
        },
        onerror: () => { updateSpeed(0, 0, true); speedDone = true; checkDone(); }
    });
}

function updateDelay(v, err) {
    if (!S.panel.el) return;
    S.panel.last.delay = v;
    const el = $('#il-pd-d', S.panel.el); el && (el.textContent = v);
    if (!err) { S.panel.last.time = t24(); const t = $('#il-pd-t', S.panel.el); t && (t.textContent = S.panel.last.time); }
}

function updateSpeed(cnt, ut, err) {
    if (!S.panel.el) return;
    const lv = Math.round(cnt), sv = cnt > 0 ? (ut / cnt).toFixed(2) : '--';
    S.panel.last.label = lv + '条'; S.panel.last.speed = sv === '--' ? '--s' : sv + 's';
    [['#il-pd-l', S.panel.last.label], ['#il-pd-s', S.panel.last.speed]].forEach(([id, val]) => {
        const el = $(id, S.panel.el); if (!el) return;
        el.textContent = val; el.className = 'il-pd-val';
        sv !== '--' && el.classList.add(parseFloat(sv) > 150 ? 'il-pd-red' : parseFloat(sv) < 80 ? 'il-pd-yel' : 'il-pd-grn');
    });
    if (!err) { S.panel.last.time = t24(); const t = $('#il-pd-t', S.panel.el); t && (t.textContent = S.panel.last.time); }
}

// ========== 样式 ==========
function addStyles() {
    GM_addStyle(`
        .prompt-tag{padding:6px 0;width:56px;font-weight:bold;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.2);border-radius:20px;margin:0;text-align:center;transition:all 0.2s;}
        @keyframes il-fade{0%{opacity:0;transform:translate(-50%,60%)}20%{opacity:1;transform:translate(-50%,-50%)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-140%)}}
        @keyframes il-out{from{opacity:1;transform:translate(-50%,-50%)}to{opacity:0;transform:translate(-50%,-40%)}}
        #il-tool .il-sec{background:#f8fafc;padding:14px 16px;border-radius:12px;border:1px solid #f1f5f9;margin-bottom:16px;}
        #il-tool .il-lbl{font-size:12px;font-weight:600;color:#64748b;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;}
        #il-tool .il-sw{position:relative;display:inline-block;width:40px;height:22px;}
        #il-tool .il-sw input{opacity:0;width:0;height:0;}
        #il-tool .il-sl{position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:#d1d5db;transition:.3s;border-radius:22px;}
        #il-tool .il-sl:before{position:absolute;content:"";height:16px;width:16px;left:3px;bottom:3px;background:#fff;transition:.3s;border-radius:50%;}
        #il-tool .il-sw input:checked+.il-sl{background:var(--sw-color, #2563eb);}
        #il-tool .il-sw input:checked+.il-sl:before{transform:translateX(18px);}
        #il-tool .il-sw-item{display:flex;flex-direction:column;align-items:center;gap:6px;}
        #il-tool .il-sw-lbl{font-size:11px;color:#64748b;font-weight:500;}
        #il-tool .il-btn{padding:8px 20px;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:500;transition:all 0.2s;}
        #il-tool .il-btn-ghost{background:#f1f5f9;color:#475569;}
        #il-tool .il-btn-ghost:hover{background:#e2e8f0;}
        #il-tool .il-btn-primary{background:#2563eb;color:#fff;}
        #il-tool .il-btn-primary:hover{background:#1d4ed8;}
        #il-queue .il-q-i{padding:12px 16px;background:#f8fafc;border-radius:10px;cursor:pointer;border:1px solid #f1f5f9;transition:all 0.15s;}
        #il-queue .il-q-i:hover{background:#eff6ff;border-color:#2563eb;}
        .il-pd-row{display:flex;justify-content:space-between;align-items:center;padding:6px 8px;margin-bottom:4px;background:rgba(0,0,0,0.03);border-radius:8px;}
        .il-pd-lbl{font-size:11px;color:#64748b;font-weight:500;}
        .il-pd-val{font-weight:600;font-size:12px;}
        .il-pd-red{color:#dc2626;}
        .il-pd-yel{color:#d97706;}
        .il-pd-grn{color:#059669;}
        .il-pd-footer{display:flex;justify-content:space-between;align-items:center;margin-top:6px;padding-top:6px;border-top:1px solid rgba(0,0,0,0.06);font-size:10px;color:#94a3b8;}
        .il-pd-btn{background:rgba(0,0,0,0.05);border:1px solid rgba(0,0,0,0.1);color:#475569;padding:3px 10px;border-radius:8px;cursor:pointer;font-size:11px;transition:all 0.2s;}
        .il-pd-btn:hover{background:rgba(0,0,0,0.1);}
        .il-pd-btn:disabled{opacity:0.4;cursor:not-allowed;}
    `);
}

// ========== 初始化 ==========
(async function init() {
    log(`辅助工具 v${V} 初始化`);
    try {
        loadUser();
        if (!S.usr.pos) S.usr.pos = { x: Math.round((window.innerWidth - 200) / 2), y: 100 };

        // 并行加载
        const [auditorName, cfgLoaded] = await Promise.all([getAuditor(), loadCfg()]);
        S.auditor = auditorName;
        S.ok = S.cfg?.auditorWhiteList?.some(a => a.name === S.auditor);

        // 精简日志：审核员✅/❌，配置✅/❌，版本✅/❌
        log(`审核员: ${S.auditor || '未知'} 白名单`, S.ok);
        log(`配置加载`, cfgLoaded);

        // 更新检查（异步，不阻塞）
        checkUpdate().then(updated => log(`版本更新`, !updated)).catch(() => log(`版本检查`, false));

        S.ok && (preloadAudio(), await preloadQueues());
        addStyles();
        GM_registerMenuCommand('配置工具', toggleTool);
        GM_registerMenuCommand('数据面板', togglePanel);
        GM_registerMenuCommand('队列查询', toggleQueue);
        setupIntercept();
    } catch (e) {
        console.error('[iLabel] 初始化失败', e);
    }
})();

})();
