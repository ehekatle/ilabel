// ==UserScript==
// @name         百灵数据看板
// @namespace    https://ocean.cdposs.qq.com
// @version      1.0
// @description  按月份和队列查看工作数据，自动换算标准条
// @author       ehekatle
// @homepage     https://github.com/ehekatle/ilabel
// @source       https://raw.githubusercontent.com/ehekatle/ilabel/main/larkData.js
// @updateURL    https://www.tampermonkey.net/script_installation.php#url=https://cdn.gh-proxy.org/https://raw.githubusercontent.com/ehekatle/ilabel/main/larkData.js
// @downloadURL  https://cdn.gh-proxy.org/https://raw.githubusercontent.com/ehekatle/ilabel/main/ilarkData.js
// @match        https://ocean.cdposs.qq.com/*
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      ocean.cdposs.qq.com
// ==/UserScript==

(function() {
    'use strict';

    // ---------- 样式 ----------
    const style = document.createElement('style');
    style.textContent = `
        #workload-panel-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.4); z-index: 9999;
            display: flex; align-items: center; justify-content: center;
        }
        #workload-panel {
            background: #fff; border-radius: 10px; width: 90%; max-width: 1100px;
            max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 8px 30px rgba(0,0,0,0.2);
        }
        .panel-header {
            padding: 16px 20px; border-bottom: 1px solid #eee;
            display: flex; justify-content: space-between; align-items: center;
        }
        .panel-header h2 { margin: 0; font-size: 18px; }
        .panel-close { background: none; border: none; font-size: 22px; cursor: pointer; }
        .panel-body { padding: 20px; overflow-y: auto; flex: 1; }
        .filter-row {
            display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
            margin-bottom: 20px;
        }
        .filter-row select, .filter-row input, .filter-row button {
            padding: 8px 12px; border-radius: 6px; border: 1px solid #ccc;
            font-size: 14px;
        }
        .filter-row button {
            background: #4f6ef7; color: #fff; border: none; cursor: pointer;
        }
        .summary-cards {
            display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap;
        }
        .card {
            background: #f4f6fb; border-radius: 8px; padding: 12px 18px;
            min-width: 140px;
        }
        .card .label { font-size: 13px; color: #555; }
        .card .value { font-size: 20px; font-weight: 600; }
        .calendar-grid {
            display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px;
        }
        .day-cell {
            border: 1px solid #e0e0e0; border-radius: 6px; padding: 8px;
            min-height: 90px; font-size: 13px; background: #fafafa;
        }
        .day-cell.weekend { background: #f0f0f0; }
        .day-cell .date { font-weight: 600; margin-bottom: 4px; }
        .day-cell .task-line { font-size: 12px; margin: 2px 0; display: flex; justify-content: space-between; }
        .day-cell .total-line { font-weight: 600; border-top: 1px dashed #ccc; margin-top: 4px; padding-top: 2px; }
        .empty-day { visibility: hidden; }
        .week-header {
            display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px;
            margin-bottom: 6px; font-weight: 600; text-align: center; font-size: 14px;
        }
    `;
    document.head.appendChild(style);

    // ---------- 工具函数 ----------
    function getStartOfMonth(year, month) {
        return new Date(year, month, 1);
    }
    function getEndOfMonth(year, month) {
        return new Date(year, month + 1, 0, 23, 59, 59, 999);
    }
    function formatDateStr(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    // 解析时间戳字符串
    function parseTs(tsStr) {
        const num = parseInt(tsStr, 10);
        if (isNaN(num)) return null;
        return new Date(num);
    }

    // 判断taskName属于哪种分类
    function classifyTask(name) {
        if (name.includes('1936')) return '1936';
        if (name.includes('招募')) return '招募';
        return 'ilabel';
    }

    // 计算标准条: (总量 / manageEffective) * 1000, 保留1位小数
    function calcStandard(qty, effective) {
        if (!effective || effective === 0) return 0;
        return (qty / effective) * 1000;
    }

    // ---------- 数据获取 ----------
    function fetchWorkData(startMs, endMs) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: 'https://ocean.cdposs.qq.com/api/trpc/WorkReportServiceProxy/ListWorkData',
                headers: {
                    'Content-Type': 'application/json; charset=UTF-8',
                    'accept': 'application/json, text/plain, */*',
                },
                data: JSON.stringify({
                    data: {
                        startTime: startMs,
                        endTime: endMs
                    }
                }),
                onload: function(resp) {
                    try {
                        const json = JSON.parse(resp.responseText);
                        if (json.code === 0 && json.data && json.data.records) {
                            resolve(json.data.records);
                        } else {
                            reject(new Error(json.msg || '请求失败'));
                        }
                    } catch (e) {
                        reject(e);
                    }
                },
                onerror: reject
            });
        });
    }

    // ---------- 主面板 ----------
    function createPanel() {
        // 移除已有面板
        const old = document.getElementById('workload-panel-overlay');
        if (old) old.remove();

        const overlay = document.createElement('div');
        overlay.id = 'workload-panel-overlay';
        overlay.innerHTML = `
            <div id="workload-panel">
                <div class="panel-header">
                    <h2>工作数据看板</h2>
                    <button class="panel-close">&times;</button>
                </div>
                <div class="panel-body">
                    <div class="filter-row">
                        <label>月份</label>
                        <input type="month" id="monthPicker" />
                        <label>队列筛选</label>
                        <select id="queueFilter">
                            <option value="all">全部</option>
                            <option value="1936">1936</option>
                            <option value="招募">招募</option>
                            <option value="ilabel">ilabel</option>
                        </select>
                        <button id="queryBtn">查询</button>
                    </div>
                    <div id="summaryArea" class="summary-cards"></div>
                    <div id="calendarArea"></div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // 关闭按钮
        overlay.querySelector('.panel-close').onclick = () => overlay.remove();
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        // 默认月份设为当前月
        const now = new Date();
        const monthInput = overlay.querySelector('#monthPicker');
        monthInput.value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

        // 查询逻辑
        const doQuery = async () => {
            const monthVal = monthInput.value; // "YYYY-MM"
            if (!monthVal) return;
            const [y, m] = monthVal.split('-').map(Number);
            const start = getStartOfMonth(y, m-1);
            const end = getEndOfMonth(y, m-1);
            const filterVal = overlay.querySelector('#queueFilter').value;

            try {
                const records = await fetchWorkData(start.getTime(), end.getTime());
                renderData(records, y, m-1, filterVal, overlay);
            } catch (err) {
                alert('获取数据失败: ' + err.message);
            }
        };

        overlay.querySelector('#queryBtn').onclick = doQuery;
        // 点击查询时自动触发一次
        doQuery();
    }

    function renderData(records, year, month, filter, panel) {
        const summaryDiv = panel.querySelector('#summaryArea');
        const calDiv = panel.querySelector('#calendarArea');

        // 按 reportDate 整理数据 (reportDate 是毫秒时间戳字符串)
        // 同时收集所有detail用于统计
        const dayMap = new Map(); // key: "YYYY-MM-DD" -> { details: [] }

        records.forEach(rec => {
            const dateObj = parseTs(rec.reportDate);
            if (!dateObj) return;
            const dateKey = formatDateStr(dateObj);
            if (!dayMap.has(dateKey)) {
                dayMap.set(dateKey, []);
            }
            // 将details全部放入
            if (rec.details && Array.isArray(rec.details)) {
                dayMap.get(dateKey).push(...rec.details);
            }
        });

        // 筛选队列后过滤details
        if (filter !== 'all') {
            for (let [dateKey, details] of dayMap.entries()) {
                const filtered = details.filter(d => classifyTask(d.taskName) === filter);
                dayMap.set(dateKey, filtered);
            }
        }

        // ---------- 整月数据统计 ----------
        let total1936Qty = 0, total1936Std = 0;
        let totalRecruitQty = 0, totalRecruitStd = 0;
        let totalIlabelQty = 0, totalIlabelStd = 0;

        for (let details of dayMap.values()) {
            details.forEach(d => {
                const qty = (d.ilabelAuditQuantity || 0) + (d.kaipingAuditQuantity || 0);
                const effective = d.manageEffective || 160; // 默认160防止除零，但实际都有值
                const std = calcStandard(qty, effective);
                const cat = classifyTask(d.taskName);
                if (cat === '1936') {
                    total1936Qty += qty;
                    total1936Std += std;
                } else if (cat === '招募') {
                    totalRecruitQty += qty;
                    totalRecruitStd += std;
                } else {
                    totalIlabelQty += qty;
                    totalIlabelStd += std;
                }
            });
        }

        const totalAllStd = total1936Std + totalRecruitStd + totalIlabelStd;

        summaryDiv.innerHTML = `
            <div class="card"><div class="label">1936 实际条</div><div class="value">${total1936Qty} <small>(${total1936Std.toFixed(1)}标准)</small></div></div>
            <div class="card"><div class="label">招募 实际条</div><div class="value">${totalRecruitQty} <small>(${totalRecruitStd.toFixed(1)}标准)</small></div></div>
            <div class="card"><div class="label">ilabel 实际条</div><div class="value">${totalIlabelQty} <small>(${totalIlabelStd.toFixed(1)}标准)</small></div></div>
            <div class="card"><div class="label">全部标准条</div><div class="value">${totalAllStd.toFixed(1)}</div></div>
        `;

        // ---------- 日历渲染 ----------
        const daysInMonth = new Date(year, month+1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay(); // 0=周日

        let calHtml = '<div class="week-header">';
        ['日','一','二','三','四','五','六'].forEach(d => calHtml += `<div>${d}</div>`);
        calHtml += '</div><div class="calendar-grid">';

        // 填充空白
        for (let i = 0; i < firstDay; i++) {
            calHtml += '<div class="day-cell empty-day"></div>';
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d);
            const dateKey = formatDateStr(date);
            const dayOfWeek = date.getDay();
            const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
            const details = dayMap.get(dateKey) || [];

            // 当天分类统计
            let day1936Qty = 0, day1936Std = 0;
            let dayRecQty = 0, dayRecStd = 0;
            let dayIlaQty = 0, dayIlaStd = 0;

            details.forEach(detail => {
                const qty = (detail.ilabelAuditQuantity || 0) + (detail.kaipingAuditQuantity || 0);
                const eff = detail.manageEffective || 160;
                const std = calcStandard(qty, eff);
                const cat = classifyTask(detail.taskName);
                if (cat === '1936') {
                    day1936Qty += qty;
                    day1936Std += std;
                } else if (cat === '招募') {
                    dayRecQty += qty;
                    dayRecStd += std;
                } else {
                    dayIlaQty += qty;
                    dayIlaStd += std;
                }
            });

            const dayTotalStd = day1936Std + dayRecStd + dayIlaStd;

            calHtml += `<div class="day-cell${isWeekend ? ' weekend' : ''}">`;
            calHtml += `<div class="date">${d}</div>`;
            if (details.length > 0) {
                calHtml += `<div class="total-line task-line"><span>总计标准</span><span>${dayTotalStd.toFixed(1)}</span></div>`;
                if (filter === 'all' || filter === '1936') {
                    calHtml += `<div class="task-line"><span>1936</span><span>${day1936Qty} (${day1936Std.toFixed(1)})</span></div>`;
                }
                if (filter === 'all' || filter === '招募') {
                    calHtml += `<div class="task-line"><span>招募</span><span>${dayRecQty} (${dayRecStd.toFixed(1)})</span></div>`;
                }
                if (filter === 'all' || filter === 'ilabel') {
                    calHtml += `<div class="task-line"><span>ilabel</span><span>${dayIlaQty} (${dayIlaStd.toFixed(1)})</span></div>`;
                }
            }
            calHtml += '</div>';
        }

        calHtml += '</div>';
        calDiv.innerHTML = calHtml;
    }

    // 注册菜单命令
    GM_registerMenuCommand('打开查询', createPanel);
})();
