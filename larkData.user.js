// ==UserScript==
// @name         百灵数据查询
// @namespace    https://github.com/ehekatle/ilabel
// @version      1.0
// @description  按月份和队列查看工作数据，自动换算标准条
// @author       ehekatle
// @homepage     https://github.com/ehekatle/ilabel
// @source       https://raw.githubusercontent.com/ehekatle/ilabel/main/larkData.user.js
// @updateURL    https://www.tampermonkey.net/script_installation.php#url=https://cdn.gh-proxy.org/https://raw.githubusercontent.com/ehekatle/ilabel/main/larkData.user.js
// @downloadURL  https://cdn.gh-proxy.org/https://raw.githubusercontent.com/ehekatle/ilabel/main/larkData.user.js
// @match        https://ocean.cdposs.qq.com/*
// @require      https://cdn.bootcdn.net/ajax/libs/dayjs/1.11.10/dayjs.min.js
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    // 添加样式
    GM_addStyle(`
        .ilabel-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .ilabel-modal {
            background: #fff;
            border-radius: 8px;
            width: 95vw;
            max-width: 1400px;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .ilabel-modal-header {
            padding: 12px 20px;
            border-bottom: 1px solid #e8e8e8;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-shrink: 0;
        }
        .ilabel-modal-header h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            color: #1a1a1a;
        }
        .ilabel-modal-close {
            cursor: pointer;
            font-size: 20px;
            color: #999;
            border: none;
            background: none;
            padding: 0;
            line-height: 1;
        }
        .ilabel-modal-close:hover {
            color: #333;
        }
        .ilabel-modal-body {
            padding: 16px 20px;
            overflow-y: auto;
            flex: 1;
        }
        .ilabel-controls {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
            flex-wrap: wrap;
        }
        .ilabel-month-select {
            padding: 4px 8px;
            border: 1px solid #d9d9d9;
            border-radius: 4px;
            font-size: 13px;
            height: 28px;
            outline: none;
        }
        .ilabel-month-select:focus {
            border-color: #1890ff;
        }
        .ilabel-filter-btns {
            display: flex;
            gap: 6px;
        }
        .ilabel-filter-btn {
            padding: 4px 12px;
            border: 1px solid #d9d9d9;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            background: #f5f5f5;
            color: #666;
            transition: all 0.2s;
            height: 28px;
        }
        .ilabel-filter-btn.active {
            background: #52c41a;
            color: #fff;
            border-color: #52c41a;
        }
        .ilabel-legend {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-left: auto;
            font-size: 12px;
            color: #666;
        }
        .ilabel-legend-dot {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            margin-right: 4px;
        }
        .ilabel-legend-dot.blue {
            background: #1890ff;
        }
        .ilabel-legend-dot.green {
            background: #52c41a;
        }
        .ilabel-summary {
            display: flex;
            gap: 20px;
            padding: 8px 12px;
            background: #fafafa;
            border-radius: 6px;
            margin-bottom: 12px;
            font-size: 13px;
            flex-wrap: wrap;
        }
        .ilabel-summary-item {
            white-space: nowrap;
        }
        .ilabel-summary-item .actual {
            color: #1890ff;
            font-weight: 500;
        }
        .ilabel-summary-item .standard {
            color: #52c41a;
            font-weight: 500;
        }
        .ilabel-calendar {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 6px;
        }
        .ilabel-day-cell {
            border: 1px solid #e8e8e8;
            border-radius: 4px;
            padding: 6px 8px;
            min-height: 60px;
            font-size: 12px;
        }
        .ilabel-day-header {
            font-weight: 600;
            margin-bottom: 4px;
            color: #333;
            font-size: 14px;
        }
        .ilabel-day-header .day-num {
            font-size: 16px;
        }
        .ilabel-day-standard-sum {
            color: #52c41a;
            font-weight: 500;
            font-size: 13px;
        }
        .ilabel-task-row {
            margin: 2px 0;
            line-height: 1.5;
        }
        .ilabel-task-name {
            color: #555;
            font-size: 11px;
        }
        .ilabel-actual {
            color: #1890ff;
            font-weight: 500;
        }
        .ilabel-standard {
            color: #52c41a;
            font-weight: 500;
        }
        .ilabel-loading {
            text-align: center;
            padding: 40px;
            color: #999;
        }
        .ilabel-weekday-header {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 6px;
            margin-bottom: 6px;
        }
        .ilabel-weekday-item {
            text-align: center;
            font-size: 12px;
            color: #999;
            font-weight: 500;
        }
    `);

    // 注册菜单命令
    GM_registerMenuCommand('查询窗口', openModal);

    function openModal() {
        // 移除已存在的弹窗
        const existing = document.querySelector('.ilabel-modal-overlay');
        if (existing) {
            existing.remove();
        }

        const overlay = document.createElement('div');
        overlay.className = 'ilabel-modal-overlay';
        overlay.innerHTML = `
            <div class="ilabel-modal">
                <div class="ilabel-modal-header">
                    <h3>百灵提报数据</h3>
                    <button class="ilabel-modal-close">&times;</button>
                </div>
                <div class="ilabel-modal-body">
                    <div class="ilabel-controls">
                        <select class="ilabel-month-select"></select>
                        <div class="ilabel-filter-btns">
                            <button class="ilabel-filter-btn active" data-filter="all">全部</button>
                            <button class="ilabel-filter-btn" data-filter="1936">1936</button>
                            <button class="ilabel-filter-btn" data-filter="招募">招募</button>
                            <button class="ilabel-filter-btn" data-filter="ilabel">ilabel</button>
                        </div>
                        <div class="ilabel-legend">
                            <span><span class="ilabel-legend-dot blue"></span>实际条</span>
                            <span><span class="ilabel-legend-dot green"></span>标准条</span>
                        </div>
                    </div>
                    <div class="ilabel-summary"></div>
                    <div class="ilabel-weekday-header">
                        <div class="ilabel-weekday-item">日</div>
                        <div class="ilabel-weekday-item">一</div>
                        <div class="ilabel-weekday-item">二</div>
                        <div class="ilabel-weekday-item">三</div>
                        <div class="ilabel-weekday-item">四</div>
                        <div class="ilabel-weekday-item">五</div>
                        <div class="ilabel-weekday-item">六</div>
                    </div>
                    <div class="ilabel-calendar"></div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const monthSelect = overlay.querySelector('.ilabel-month-select');
        const filterBtns = overlay.querySelectorAll('.ilabel-filter-btn');
        const summaryDiv = overlay.querySelector('.ilabel-summary');
        const calendarDiv = overlay.querySelector('.ilabel-calendar');
        const closeBtn = overlay.querySelector('.ilabel-modal-close');

        let allData = [];
        let currentFilter = 'all';

        // 初始化月份选择器
        const now = dayjs();
        for (let i = 0; i < 12; i++) {
            const month = now.subtract(i, 'month');
            const option = document.createElement('option');
            option.value = month.format('YYYY-MM');
            option.textContent = month.format('YYYY年MM月');
            if (i === 0) option.selected = true;
            monthSelect.appendChild(option);
        }

        // 关闭弹窗
        closeBtn.onclick = () => overlay.remove();
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        // 筛选按钮事件
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilter = btn.dataset.filter;
                renderData();
            });
        });

        // 月份选择事件
        monthSelect.addEventListener('change', () => {
            fetchData(monthSelect.value);
        });

        // 初始加载数据
        fetchData(monthSelect.value);

        async function fetchData(monthStr) {
            calendarDiv.innerHTML = '<div class="ilabel-loading">加载中...</div>';
            summaryDiv.innerHTML = '';

            const [year, month] = monthStr.split('-');
            const startTime = dayjs(`${year}-${month}-01`).startOf('month').valueOf();
            const endTime = dayjs(`${year}-${month}-01`).endOf('month').valueOf();

            try {
                const response = await fetch('https://ocean.cdposs.qq.com/api/trpc/WorkReportServiceProxy/ListWorkData', {
                    method: 'POST',
                    headers: {
                        'accept': 'application/json, text/plain, */*',
                        'content-type': 'application/json; charset=UTF-8',
                        'x-requested-with': 'XMLHttpRequest',
                        'x-tc-language': 'zh-CN',
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        data: {
                            startTime: startTime,
                            endTime: endTime
                        }
                    })
                });

                const result = await response.json();
                if (result.code === 0 && result.data && result.data.records) {
                    allData = result.data.records;
                    renderData();
                } else {
                    calendarDiv.innerHTML = '<div class="ilabel-loading">暂无数据</div>';
                }
            } catch (error) {
                calendarDiv.innerHTML = '<div class="ilabel-loading">请求失败: ' + error.message + '</div>';
            }
        }

        function renderData() {
            const filteredData = filterData(allData, currentFilter);
            renderSummary(filteredData);
            renderCalendar(filteredData);
        }

        function filterData(records, filter) {
            if (filter === 'all') return records;

            return records.map(record => {
                const filteredDetails = record.details.filter(detail => {
                    const category = getTaskCategory(detail.taskName);
                    return category === filter;
                });
                if (filteredDetails.length === 0) return null;
                return { ...record, details: filteredDetails };
            }).filter(r => r !== null);
        }

        function getTaskCategory(taskName) {
            if (taskName.includes('1936-珠宝开平直播审核（聚合）-仙桃')) return '1936';
            if (taskName === '招募队列') return '招募';
            return 'ilabel';
        }

        function calcStandard(detail) {
            const actual = (detail.ilabelAuditQuantity || 0) + (detail.kaipingAuditQuantity || 0);
            const effective = detail.manageEffective || 1;
            return Math.round((actual / effective) * 1000 * 100) / 100;
        }

        function calcActual(detail) {
            return (detail.ilabelAuditQuantity || 0) + (detail.kaipingAuditQuantity || 0);
        }

        function renderSummary(records) {
            const categories = { '1936': { actual: 0, standard: 0 }, '招募': { actual: 0, standard: 0 }, 'ilabel': { actual: 0, standard: 0 } };
            let totalStandard = 0;

            records.forEach(record => {
                record.details.forEach(detail => {
                    const category = getTaskCategory(detail.taskName);
                    const actual = calcActual(detail);
                    const standard = calcStandard(detail);
                    categories[category].actual += actual;
                    categories[category].standard += standard;
                    totalStandard += standard;
                });
            });

            summaryDiv.innerHTML = `
                <div class="ilabel-summary-item">
                    当月标准条：<span class="standard">${totalStandard.toFixed(2)}</span>
                </div>
                <div class="ilabel-summary-item">
                    1936：<span class="actual">${categories['1936'].actual}</span> / <span class="standard">${categories['1936'].standard.toFixed(2)}</span>
                </div>
                <div class="ilabel-summary-item">
                    招募：<span class="actual">${categories['招募'].actual}</span> / <span class="standard">${categories['招募'].standard.toFixed(2)}</span>
                </div>
                <div class="ilabel-summary-item">
                    ilabel：<span class="actual">${categories['ilabel'].actual}</span> / <span class="standard">${categories['ilabel'].standard.toFixed(2)}</span>
                </div>
            `;
        }

        function renderCalendar(records) {
            // 按日期分组
            const dateMap = {};
            records.forEach(record => {
                const date = dayjs(Number(record.reportDate)).format('YYYY-MM-DD');
                if (!dateMap[date]) {
                    dateMap[date] = { details: [] };
                }
                dateMap[date].details.push(...record.details);
            });

            const monthSelect = overlay.querySelector('.ilabel-month-select');
            const [year, month] = monthSelect.value.split('-');
            const firstDay = dayjs(`${year}-${month}-01`);
            const daysInMonth = firstDay.daysInMonth();
            const startDayOfWeek = firstDay.day(); // 0=周日

            let html = '';

            // 填充空白
            for (let i = 0; i < startDayOfWeek; i++) {
                html += '<div class="ilabel-day-cell" style="background:#f9f9f9;"></div>';
            }

            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = dayjs(`${year}-${month}-${String(day).padStart(2, '0')}`).format('YYYY-MM-DD');
                const dayData = dateMap[dateStr];

                let cellContent = `<div class="ilabel-day-header"><span class="day-num">${day}</span></div>`;

                if (dayData) {
                    const categories = { '1936': [], '招募': [], 'ilabel': [] };

                    dayData.details.forEach(detail => {
                        const category = getTaskCategory(detail.taskName);
                        categories[category].push(detail);
                    });

                    // 计算标准条之和
                    let dayStandardSum = 0;
                    Object.values(categories).forEach(details => {
                        details.forEach(d => {
                            dayStandardSum += calcStandard(d);
                        });
                    });

                    if (dayStandardSum > 0) {
                        cellContent += ` <span class="ilabel-day-standard-sum">${dayStandardSum.toFixed(2)}</span>`;
                    }

                    // 渲染各队列数据
                    ['1936', '招募', 'ilabel'].forEach(cat => {
                        if (categories[cat].length > 0) {
                            let catActual = 0;
                            let catStandard = 0;
                            categories[cat].forEach(d => {
                                catActual += calcActual(d);
                                catStandard += calcStandard(d);
                            });
                            if (catActual > 0 || catStandard > 0) {
                                cellContent += `<div class="ilabel-task-row">
                                    <span class="ilabel-task-name">${cat}:</span>
                                    <span class="ilabel-actual">${catActual}</span> /
                                    <span class="ilabel-standard">${catStandard.toFixed(2)}</span>
                                </div>`;
                            }
                        }
                    });
                }

                html += `<div class="ilabel-day-cell">${cellContent}</div>`;
            }

            calendarDiv.innerHTML = html;
        }
    }
})();
