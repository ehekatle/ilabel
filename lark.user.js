// ==UserScript==
// @name         百灵工作量快速提交工具
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  在工作量管理页面添加批量查询和提交功能（日历版）
// @author       ehekatle
// @homepage     https://github.com/ehekatle/ilabel
// @source       https://raw.githubusercontent.com/ehekatle/ilabel/main/lark.user.js
// @updateURL    https://hk.gh-proxy.org/https://raw.githubusercontent.com/ehekatle/ilabel/main/lark.user.js
// @downloadURL  https://hk.gh-proxy.org/https://raw.githubusercontent.com/ehekatle/ilabel/main/lark.user.js
// @match        https://ocean.cdposs.qq.com/lark/*
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    // 硬编码任务ID列表
    const TASK_IDS = [
        '6280', '5702', '5701', '5700', '5699', '5697',
        '5696', '5695', '5694', '5693', '5523'
    ];

    // 添加自定义样式
    GM_addStyle(`
        /* 弹窗遮罩 */
        .custom-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 999999;
            backdrop-filter: blur(4px);
        }

        /* 弹窗容器 - 更大更宽 */
        .custom-modal {
            background: #fff;
            border-radius: 12px;
            width: 1400px;
            max-width: 95vw;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            animation: modalFadeIn 0.2s ease;
            border: 1px solid #f0f0f0;
        }

        @keyframes modalFadeIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* 弹窗头部 */
        .modal-header {
            padding: 16px 24px;
            border-bottom: 1px solid #f0f0f0;
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #fafafa;
            border-radius: 12px 12px 0 0;
        }
        .modal-header h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 500;
            color: #333;
        }
        .modal-close {
            cursor: pointer;
            color: #999;
            font-size: 24px;
            line-height: 1;
            transition: color 0.2s;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
        }
        .modal-close:hover {
            color: #666;
            background: rgba(0, 0, 0, 0.05);
        }

        /* 弹窗主体 - 左右分栏 */
        .modal-body {
            display: flex;
            flex: 1;
            overflow: hidden;
            min-height: 500px;
        }

        /* 左侧操作区 */
        .left-panel {
            width: 38%;
            padding: 20px;
            border-right: 1px solid #f0f0f0;
            overflow-y: auto;
            background: #fafbfc;
        }

        /* 右侧数据区 */
        .right-panel {
            width: 62%;
            padding: 20px;
            overflow-y: auto;
        }

        /* 月份选择器 */
        .month-picker-section {
            margin-bottom: 20px;
        }
        .month-picker {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #d9d9d9;
            border-radius: 6px;
            font-size: 14px;
            background: white;
        }

        /* 按钮组 */
        .button-group {
            display: flex;
            gap: 12px;
            margin-bottom: 16px;
        }
        .action-btn {
            flex: 1;
            padding: 10px 16px;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
            font-weight: 500;
        }
        .select-all-btn {
            background: #722ed1;
            color: white;
        }
        .select-all-btn:hover {
            background: #9254de;
        }
        .batch-query-btn {
            background: #1890ff;
            color: white;
        }
        .batch-query-btn:hover {
            background: #40a9ff;
        }
        .batch-query-btn:disabled {
            background: #bae7ff;
            cursor: not-allowed;
        }
        .batch-submit-btn {
            background: #52c41a;
            color: white;
        }
        .batch-submit-btn:hover {
            background: #73d13d;
        }
        .batch-submit-btn:disabled {
            background: #b7eb8f;
            cursor: not-allowed;
        }

        /* 统计信息 */
        .stats-info {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
            padding: 12px 16px;
            background: #fff;
            border-radius: 8px;
            border: 1px solid #e8e8e8;
        }
        .stat-badge {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .stat-label {
            color: #666;
            font-size: 13px;
        }
        .stat-number {
            font-weight: 600;
            color: #1890ff;
            font-size: 18px;
        }

        /* 日历网格 */
        .calendar-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 8px;
            margin-top: 10px;
        }
        .calendar-header {
            text-align: center;
            font-size: 12px;
            color: #999;
            padding: 8px 0;
            font-weight: 500;
        }
        .calendar-day {
            aspect-ratio: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s;
            border: 1px solid #e8e8e8;
            background: white;
            padding: 4px;
        }
        .calendar-day.disabled {
            background: #f5f5f5;
            color: #bfbfbf;
            cursor: not-allowed;
            border-color: #d9d9d9;
        }
        .calendar-day.white {
            background: #fff;
            color: #333;
        }
        .calendar-day.white:hover {
            border-color: #ffa940;
            background: #fff7e6;
        }
        .calendar-day.selected {
            background: #ffe7ba;
            border-color: #ffa940;
            color: #ad6800;
        }
        .calendar-day.blue {
            background: #e6f7ff;
            border-color: #69c0ff;
            color: #0050b3;
        }
        .calendar-day.green {
            background: #d9f7be;
            border-color: #95de64;
            color: #135200;
        }
        .calendar-day.red {
            background: #ffccc7;
            border-color: #ff7875;
            color: #a8071a;
        }
        .calendar-day .day-number {
            font-weight: 600;
            font-size: 16px;
        }
        .calendar-day .day-quantity {
            font-size: 11px;
            margin-top: 2px;
            font-weight: 500;
        }

        /* 右侧表格 */
        .detail-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 16px;
        }
        .detail-title {
            font-size: 16px;
            font-weight: 500;
            color: #333;
        }
        .submit-today-btn {
            padding: 8px 24px;
            background: #52c41a;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        .submit-today-btn:hover {
            background: #73d13d;
        }
        .submit-today-btn:disabled {
            background: #b7eb8f;
            cursor: not-allowed;
        }

        .results-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border: 1px solid #e8e8e8;
            border-radius: 4px;
        }
        .results-table th {
            background: #fafafa;
            padding: 12px 16px;
            text-align: left;
            font-weight: 500;
            color: #333;
            border-bottom: 1px solid #e8e8e8;
            font-size: 13px;
        }
        .results-table td {
            padding: 12px 16px;
            border-bottom: 1px solid #f0f0f0;
            color: #666;
            font-size: 13px;
        }
        .results-table tr:last-child td {
            border-bottom: none;
        }
        .task-id {
            color: #1890ff;
            font-family: monospace;
        }
        .task-name {
            max-width: 300px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .quantity-badge {
            background: #f0f5ff;
            color: #2f54eb;
            padding: 4px 12px;
            border-radius: 12px;
            font-weight: 500;
            font-size: 12px;
        }

        .empty-detail {
            text-align: center;
            padding: 60px 20px;
            color: #999;
            background: #fafafa;
            border-radius: 8px;
            border: 1px dashed #d9d9d9;
        }

        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #f0f0f0;
            border-top-color: #1890ff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .legend {
            display: flex;
            gap: 16px;
            margin-bottom: 12px;
            flex-wrap: wrap;
        }
        .legend-item {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            color: #666;
        }
        .legend-color {
            width: 16px;
            height: 16px;
            border-radius: 4px;
            border: 1px solid #d9d9d9;
        }
    `);

    // 全局状态
    let currentUserInfo = null;
    let tasksCache = [];
    let currentMonthData = {}; // 按日期存储 QueryWorkersData 返回的数据，key: 'YYYY-MM-DD'
    let queryResultsCache = {}; // 按日期存储 QueryTaskSummary 返回的数据，key: 'YYYY-MM-DD'
    let selectedDates = new Set(); // 存储选中的日期字符串 'YYYY-MM-DD'
    let currentDisplayYear = new Date().getFullYear();
    let currentDisplayMonth = new Date().getMonth() + 1;

    // 辅助函数：获取用户信息
    async function fetchCurrentUserInfo() {
        try {
            const response = await fetch('https://ocean.cdposs.qq.com/api/trpc/WorkforceManageProxy/GetWechatMembers', {
                method: 'POST',
                headers: {
                    'accept': 'application/json, text/plain, */*',
                    'content-type': 'application/json; charset=UTF-8',
                    'x-requested-with': 'XMLHttpRequest'
                },
                credentials: 'include',
                body: JSON.stringify({ data: {} })
            });
            const result = await response.json();
            if (result.code === 0 && result.data?.members?.length > 0) {
                currentUserInfo = result.data.members[0];
                return currentUserInfo;
            }
            return null;
        } catch (error) {
            console.error('获取用户信息失败:', error);
            return null;
        }
    }

    // 辅助函数：获取 auditUser
    async function getAuditUser() {
        if (currentUserInfo?.ouid) return currentUserInfo.ouid;
        const userInfo = await fetchCurrentUserInfo();
        if (userInfo?.ouid) return userInfo.ouid;
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [key, value] = cookie.trim().split('=');
            if (key === 'openid') return value;
        }
        return '2000000010626';
    }

    // 辅助函数：获取任务列表
    async function fetchTasksList() {
        try {
            const auditUser = await getAuditUser();
            const response = await fetch('https://ocean.cdposs.qq.com/api/trpc/WorkforceClientProxy/QueryVisibleTasks', {
                method: 'POST',
                headers: {
                    'accept': 'application/json, text/plain, */*',
                    'content-type': 'application/json; charset=UTF-8',
                    'x-requested-with': 'XMLHttpRequest'
                },
                credentials: 'include',
                body: JSON.stringify({ data: { auditUser } })
            });
            const result = await response.json();
            if (result.code === 0 && result.data?.tasks) {
                tasksCache = result.data.tasks;
            }
        } catch (error) {
            console.error('获取任务列表失败:', error);
        }
    }

    // 辅助函数：根据 taskId 获取任务名称
    function getTaskNameById(taskId) {
        const task = tasksCache.find(t => t.taskId === taskId);
        return task ? task.taskName : `任务${taskId}`;
    }

    // 辅助函数：根据 taskId 获取 managementEffectiveness
    function getManageEffectiveById(taskId) {
        const task = tasksCache.find(t => t.taskId === taskId);
        if (task) {
            if (task.ilabelTask?.managementEffectiveness) return task.ilabelTask.managementEffectiveness.toString();
            if (task.versionData?.currentInfo?.effectiveness?.management) return task.versionData.currentInfo.effectiveness.management.toString();
            if (task.otherTask?.managementEffectiveness) return task.otherTask.managementEffectiveness.toString();
        }
        return '160';
    }

    // 辅助函数：根据 taskId 获取 createTime
    function getCreateTimeById(taskId) {
        const task = tasksCache.find(t => t.taskId === taskId);
        return task?.createTime || Date.now().toString();
    }

    // 辅助函数：日期字符串转时间戳（0点）
    function dateStrToTimestamp(dateStr) {
        const date = new Date(dateStr);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
    }

    // 辅助函数：日期字符串转提交时间戳（8点）
    function dateStrToSubmitTimestamp(dateStr) {
        const date = new Date(dateStr);
        date.setHours(8, 0, 0, 0);
        return date.getTime();
    }

    // 辅助函数：获取当月数据
    async function fetchMonthData(year, month) {
        const auditUser = await getAuditUser();
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        const startTime = startDate.getTime();
        const endTime = new Date(year, month, 0, 23, 59, 59, 999).getTime();

        const response = await fetch('https://ocean.cdposs.qq.com/api/v2/trpc?feService=QueryWorkersData', {
            method: 'POST',
            headers: {
                'accept': 'application/json, text/plain, */*',
                'content-type': 'application/json',
                'x-requested-with': 'XMLHttpRequest'
            },
            credentials: 'include',
            body: JSON.stringify({
                pkg: "@tencent/tpro_cpcdp_ocean_workforce_manage",
                service: "WorkforceManageProxy",
                method: "QueryWorkersData",
                params: {
                    userId: [auditUser],
                    startTime,
                    endTime
                }
            })
        });

        const result = await response.json();
        if (result.code === 0 && result.data?.workersData) {
            // 按日期整理数据
            const dataMap = {};
            for (const workerData of result.data.workersData) {
                const reportDate = new Date(parseInt(workerData.reportDate));
                const dateStr = `${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, '0')}-${String(reportDate.getDate()).padStart(2, '0')}`;
                dataMap[dateStr] = workerData;
            }
            return dataMap;
        }
        return {};
    }

    // 辅助函数：查询单个任务摘要
    async function queryTaskSummary(taskId, reportDate) {
        try {
            const auditUser = await getAuditUser();
            const response = await fetch('https://ocean.cdposs.qq.com/api/v2/trpc?feService=QueryTaskSummary', {
                method: 'POST',
                headers: {
                    'accept': 'application/json, text/plain, */*',
                    'content-type': 'application/json',
                    'x-requested-with': 'XMLHttpRequest'
                },
                credentials: 'include',
                body: JSON.stringify({
                    pkg: "@tencent/tpro_cpcdp_ocean_workforce_manage",
                    service: "WorkforceClientProxy",
                    method: "QueryTaskSummary",
                    params: {
                        taskType: 3,
                        taskId,
                        auditUser,
                        reportDate
                    }
                })
            });
            const result = await response.json();
            if (result.code === 0 && result.data) {
                return {
                    taskId,
                    auditQuantity: result.data.ilabel?.auditQuantity || '0',
                    checkQuantity: result.data.ilabel?.checkQuantity || '0',
                    raw: result.data
                };
            }
            return null;
        } catch (error) {
            console.error(`查询任务 ${taskId} 失败:`, error);
            return null;
        }
    }

    // 辅助函数：批量查询单日所有任务（并发）
    async function batchQuerySingleDate(dateStr) {
        const reportDate = dateStrToTimestamp(dateStr);
        const promises = TASK_IDS.map(taskId => queryTaskSummary(taskId, reportDate));
        const results = await Promise.all(promises);
        return results.filter(r => r !== null);
    }

    // 辅助函数：提交单日数据
    async function submitSingleDate(dateStr, tasksData) {
        const auditUser = await getAuditUser();
        const submitDate = dateStrToSubmitTimestamp(dateStr);

        const validTasks = tasksData.filter(t => parseInt(t.auditQuantity) > 0);
        if (validTasks.length === 0) return { code: -1, msg: '没有有效数据' };

        const submitTasks = validTasks.map(t => ({
            taskId: t.taskId,
            taskName: getTaskNameById(t.taskId),
            createTime: getCreateTimeById(t.taskId),
            isFreeTime: false,
            ilabelAuditQuantity: t.auditQuantity,
            ilabelCheckQuantity: t.checkQuantity,
            manageEffective: getManageEffectiveById(t.taskId)
        }));

        const response = await fetch('https://ocean.cdposs.qq.com/api/v2/trpc?feService=ReportWorkData', {
            method: 'POST',
            headers: {
                'accept': 'application/json, text/plain, */*',
                'content-type': 'application/json',
                'x-requested-with': 'XMLHttpRequest'
            },
            credentials: 'include',
            body: JSON.stringify({
                pkg: "@tencent/tpro_cpcdp_ocean_workforce_manage",
                service: "WorkforceClientProxy",
                method: "ReportWorkData",
                params: {
                    data: {
                        reportDate: submitDate,
                        attendanceTime: 540,
                        tasks: submitTasks
                    },
                    auditUser,
                    platform: "BaiLing"
                }
            })
        });

        return await response.json();
    }

    // 判断日期是否可选（今天及今天之前不可选，即只有昨天之前可选？原需求说昨日及昨日之后不可选，意思是只能选更早的日期？）
    // 根据需求："不可选日期为灰色（查询时间的昨日及昨日之后都为不可选）"
    // 意思是：昨天、今天、明天... 都不可选，只能选前天及更早的日期
    function isDateSelectable(dateStr) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        const targetDate = new Date(dateStr);
        targetDate.setHours(0, 0, 0, 0);

        return targetDate < yesterday;
    }

    // 计算日期总数量
    function calcDateTotalQuantity(workerData) {
        if (!workerData?.tasks) return 0;
        return workerData.tasks.reduce((sum, t) => sum + (parseInt(t.ilabelAuditQuantity) || 0) + (parseInt(t.ilabelCheckQuantity) || 0), 0);
    }

    // 计算查询结果总数量
    function calcQueryTotalQuantity(results) {
        if (!results) return 0;
        return results.reduce((sum, r) => sum + parseInt(r.auditQuantity || 0) + parseInt(r.checkQuantity || 0), 0);
    }

    // 渲染弹窗
    async function showModal() {
        // 移除已存在的弹窗
        const existingOverlay = document.querySelector('.custom-modal-overlay');
        if (existingOverlay) document.body.removeChild(existingOverlay);

        // 显示加载
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'custom-modal-overlay';
        loadingOverlay.innerHTML = '<div class="custom-modal" style="width: 400px;"><div class="modal-content" style="text-align: center; padding: 40px;"><div class="loading-spinner"></div><div>正在初始化...</div></div></div>';
        document.body.appendChild(loadingOverlay);

        try {
            await fetchCurrentUserInfo();
            await fetchTasksList();

            const now = new Date();
            currentDisplayYear = now.getFullYear();
            currentDisplayMonth = now.getMonth() + 1;
            currentMonthData = await fetchMonthData(currentDisplayYear, currentDisplayMonth);
            queryResultsCache = {};
            selectedDates.clear();

            document.body.removeChild(loadingOverlay);
        } catch (error) {
            console.error('初始化失败:', error);
            document.body.removeChild(loadingOverlay);
            alert('初始化失败');
            return;
        }

        // 创建弹窗
        const overlay = document.createElement('div');
        overlay.className = 'custom-modal-overlay';

        const modal = document.createElement('div');
        modal.className = 'custom-modal';

        // 头部
        const header = document.createElement('div');
        header.className = 'modal-header';
        header.innerHTML = `<h3>批量查询提交工具 V2</h3><span class="modal-close">×</span>`;

        // 主体
        const body = document.createElement('div');
        body.className = 'modal-body';

        // 左侧面板
        const leftPanel = document.createElement('div');
        leftPanel.className = 'left-panel';
        leftPanel.innerHTML = `
            <div class="month-picker-section">
                <input type="month" class="month-picker" value="${currentDisplayYear}-${String(currentDisplayMonth).padStart(2, '0')}">
            </div>
            <div class="button-group">
                <button class="action-btn select-all-btn">全选</button>
                <button class="action-btn batch-query-btn" disabled>批量查询</button>
                <button class="action-btn batch-submit-btn" disabled>批量提交</button>
            </div>
            <div class="stats-info">
                <div class="stat-badge"><span class="stat-label">已选中:</span><span class="stat-number" id="selectedCount">0</span></div>
                <div class="stat-badge"><span class="stat-label">可提交:</span><span class="stat-number" id="submitCount">0</span></div>
            </div>
            <div class="legend">
                <div class="legend-item"><span class="legend-color" style="background:#f5f5f5;"></span>不可选</div>
                <div class="legend-item"><span class="legend-color" style="background:#fff;"></span>可选/无数据</div>
                <div class="legend-item"><span class="legend-color" style="background:#ffe7ba;"></span>已选中</div>
                <div class="legend-item"><span class="legend-color" style="background:#e6f7ff;"></span>已有数据</div>
                <div class="legend-item"><span class="legend-color" style="background:#d9f7be;"></span>查询有数据</div>
                <div class="legend-item"><span class="legend-color" style="background:#ffccc7;"></span>查询无数据</div>
            </div>
            <div id="calendarContainer"></div>
        `;

        // 右侧面板
        const rightPanel = document.createElement('div');
        rightPanel.className = 'right-panel';
        rightPanel.id = 'rightPanel';
        rightPanel.innerHTML = `<div class="empty-detail">请点击日期查看详情</div>`;

        body.appendChild(leftPanel);
        body.appendChild(rightPanel);
        modal.appendChild(header);
        modal.appendChild(body);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // 获取元素
        const closeBtn = header.querySelector('.modal-close');
        const monthPicker = leftPanel.querySelector('.month-picker');
        const selectAllBtn = leftPanel.querySelector('.select-all-btn');
        const batchQueryBtn = leftPanel.querySelector('.batch-query-btn');
        const batchSubmitBtn = leftPanel.querySelector('.batch-submit-btn');
        const calendarContainer = document.getElementById('calendarContainer');
        const selectedCountSpan = document.getElementById('selectedCount');
        const submitCountSpan = document.getElementById('submitCount');

        // 刷新日历
        function renderCalendar() {
            const year = currentDisplayYear;
            const month = currentDisplayMonth;
            const firstDay = new Date(year, month - 1, 1);
            const lastDay = new Date(year, month, 0);
            const startDayOfWeek = firstDay.getDay();

            let html = '<div class="calendar-grid">';
            const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
            weekDays.forEach(d => { html += `<div class="calendar-header">${d}</div>`; });

            // 填充空白
            for (let i = 0; i < startDayOfWeek; i++) {
                html += '<div class="calendar-day" style="visibility: hidden;"></div>';
            }

            // 填充日期
            for (let d = 1; d <= lastDay.getDate(); d++) {
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const isSelectable = isDateSelectable(dateStr);
                const hasMonthData = !!currentMonthData[dateStr];
                const hasQueryData = !!queryResultsCache[dateStr];
                const queryHasContent = hasQueryData && calcQueryTotalQuantity(queryResultsCache[dateStr]) > 0;

                let colorClass = 'white';
                if (!isSelectable) colorClass = 'disabled';
                else if (selectedDates.has(dateStr)) colorClass = 'selected';
                else if (hasMonthData) colorClass = 'blue';
                else if (hasQueryData) colorClass = queryHasContent ? 'green' : 'red';

                const quantity = hasMonthData ? calcDateTotalQuantity(currentMonthData[dateStr]) :
                                (hasQueryData ? calcQueryTotalQuantity(queryResultsCache[dateStr]) : 0);
                const quantityDisplay = quantity > 9999 ? '9999+' : quantity;

                html += `<div class="calendar-day ${colorClass}" data-date="${dateStr}">
                    <span class="day-number">${d}</span>
                    ${quantity > 0 ? `<span class="day-quantity">${quantityDisplay}</span>` : ''}
                </div>`;
            }

            html += '</div>';
            calendarContainer.innerHTML = html;

            // 更新统计
            updateStats();
        }

        // 更新统计
        function updateStats() {
            const selectableDates = getSelectableDates();
            const selectedSelectable = selectableDates.filter(d => selectedDates.has(d));
            selectedCountSpan.textContent = selectedSelectable.length;

            const greenDates = getGreenDates();
            submitCountSpan.textContent = greenDates.length;

            batchQueryBtn.disabled = selectedSelectable.length === 0;
            batchSubmitBtn.disabled = greenDates.length === 0;
        }

        // 获取所有可选日期
        function getSelectableDates() {
            const dates = [];
            const year = currentDisplayYear;
            const month = currentDisplayMonth;
            const lastDay = new Date(year, month, 0).getDate();
            for (let d = 1; d <= lastDay; d++) {
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                if (isDateSelectable(dateStr)) dates.push(dateStr);
            }
            return dates;
        }

        // 获取绿色日期（有数据的）
        function getGreenDates() {
            const dates = [];
            const year = currentDisplayYear;
            const month = currentDisplayMonth;
            const lastDay = new Date(year, month, 0).getDate();
            for (let d = 1; d <= lastDay; d++) {
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                if (queryResultsCache[dateStr] && calcQueryTotalQuantity(queryResultsCache[dateStr]) > 0) {
                    dates.push(dateStr);
                }
            }
            return dates;
        }

        // 渲染右侧详情
        function renderDetail(dateStr) {
            const rightPanel = document.getElementById('rightPanel');
            const hasMonthData = currentMonthData[dateStr];
            const hasQueryData = queryResultsCache[dateStr];

            let tasksData = null;
            if (hasMonthData) {
                tasksData = currentMonthData[dateStr].tasks.map(t => ({
                    taskId: t.taskId,
                    taskName: t.taskName,
                    auditQuantity: t.ilabelAuditQuantity,
                    checkQuantity: t.ilabelCheckQuantity
                }));
            } else if (hasQueryData) {
                tasksData = queryResultsCache[dateStr];
            }

            if (!tasksData || tasksData.length === 0) {
                rightPanel.innerHTML = `<div class="empty-detail">${dateStr} 暂无数据</div>`;
                return;
            }

            const validTasks = tasksData.filter(t => parseInt(t.auditQuantity) > 0 || parseInt(t.checkQuantity) > 0);
            const totalAudit = validTasks.reduce((s, t) => s + parseInt(t.auditQuantity || 0), 0);
            const totalCheck = validTasks.reduce((s, t) => s + parseInt(t.checkQuantity || 0), 0);

            let html = `
                <div class="detail-header">
                    <span class="detail-title">${dateStr} 工作量详情 (审核:${totalAudit} 复核:${totalCheck})</span>
                    <button class="submit-today-btn" data-date="${dateStr}">提交当天</button>
                </div>
                <table class="results-table">
                    <thead><tr><th>任务ID</th><th>任务名称</th><th>审核量</th><th>复核量</th></tr></thead>
                    <tbody>
            `;
            validTasks.forEach(t => {
                html += `<tr><td class="task-id">${t.taskId}</td><td class="task-name">${t.taskName}</td>
                    <td><span class="quantity-badge">${t.auditQuantity || 0}</span></td>
                    <td><span class="quantity-badge">${t.checkQuantity || 0}</span></td></tr>`;
            });
            html += '</tbody></table>';
            rightPanel.innerHTML = html;

            // 绑定提交当天事件
            rightPanel.querySelector('.submit-today-btn')?.addEventListener('click', async (e) => {
                const btn = e.target;
                const date = btn.dataset.date;
                btn.disabled = true;
                btn.textContent = '提交中...';
                try {
                    const data = queryResultsCache[date] || (currentMonthData[date]?.tasks.map(t => ({
                        taskId: t.taskId,
                        taskName: t.taskName,
                        auditQuantity: t.ilabelAuditQuantity,
                        checkQuantity: t.ilabelCheckQuantity
                    })));
                    if (data) {
                        const result = await submitSingleDate(date, data);
                        if (result.code === 0) {
                            alert('提交成功');
                            currentMonthData = await fetchMonthData(currentDisplayYear, currentDisplayMonth);
                            renderCalendar();
                        } else {
                            alert('提交失败: ' + (result.msg || '未知错误'));
                        }
                    }
                } catch (err) {
                    alert('提交失败: ' + err.message);
                } finally {
                    btn.disabled = false;
                    btn.textContent = '提交当天';
                }
            });
        }

        // 事件：日历点击
        calendarContainer.addEventListener('click', (e) => {
            const dayEl = e.target.closest('.calendar-day');
            if (!dayEl) return;
            const dateStr = dayEl.dataset.date;
            if (!dateStr) return;

            // 不可选日期不处理点击
            if (!isDateSelectable(dateStr)) return;

            // 如果已经是蓝色或绿色，显示详情
            if (currentMonthData[dateStr] || queryResultsCache[dateStr]) {
                renderDetail(dateStr);
                return;
            }

            // 白色日期：切换选中
            if (selectedDates.has(dateStr)) {
                selectedDates.delete(dateStr);
            } else {
                selectedDates.add(dateStr);
            }
            renderCalendar();
        });

        // 月份切换
        monthPicker.addEventListener('change', async (e) => {
            const [year, month] = e.target.value.split('-').map(Number);
            currentDisplayYear = year;
            currentDisplayMonth = month;
            selectedDates.clear();

            // 显示加载
            calendarContainer.innerHTML = '<div class="loading-spinner"></div>';

            currentMonthData = await fetchMonthData(year, month);
            queryResultsCache = {};
            renderCalendar();
            document.getElementById('rightPanel').innerHTML = '<div class="empty-detail">请点击日期查看详情</div>';
        });

        // 全选
        selectAllBtn.addEventListener('click', () => {
            const selectableDates = getSelectableDates();
            const whiteDates = selectableDates.filter(d => !currentMonthData[d] && !queryResultsCache[d]);
            whiteDates.forEach(d => selectedDates.add(d));
            renderCalendar();
        });

        // 批量查询
        batchQueryBtn.addEventListener('click', async () => {
            const selectableDates = getSelectableDates();
            const selectedSelectable = selectableDates.filter(d => selectedDates.has(d));
            if (selectedSelectable.length === 0) return;

            batchQueryBtn.disabled = true;
            batchQueryBtn.textContent = '查询中...';

            for (const dateStr of selectedSelectable) {
                // 更新日期为查询中状态（可加个loading效果，简化处理）
                try {
                    const results = await batchQuerySingleDate(dateStr);
                    queryResultsCache[dateStr] = results;
                } catch (err) {
                    console.error(`查询 ${dateStr} 失败:`, err);
                    queryResultsCache[dateStr] = [];
                }
            }

            selectedDates.clear();
            renderCalendar();
            batchQueryBtn.textContent = '批量查询';
            batchQueryBtn.disabled = false;
        });

        // 批量提交
        batchSubmitBtn.addEventListener('click', async () => {
            const greenDates = getGreenDates();
            if (greenDates.length === 0) return;

            if (!confirm(`确定要提交 ${greenDates.length} 天的数据吗？`)) return;

            batchSubmitBtn.disabled = true;
            batchSubmitBtn.textContent = '提交中...';

            let successCount = 0;
            let failCount = 0;

            for (const dateStr of greenDates) {
                try {
                    const result = await submitSingleDate(dateStr, queryResultsCache[dateStr]);
                    if (result.code === 0) successCount++;
                    else failCount++;
                } catch (err) {
                    failCount++;
                }
            }

            alert(`提交完成！成功 ${successCount} 天，失败 ${failCount} 天。`);

            // 刷新数据
            currentMonthData = await fetchMonthData(currentDisplayYear, currentDisplayMonth);
            // 清除已提交日期的查询缓存
            greenDates.forEach(d => { delete queryResultsCache[d]; });
            renderCalendar();
            batchSubmitBtn.textContent = '批量提交';
            batchSubmitBtn.disabled = false;
        });

        // 关闭弹窗
        closeBtn.addEventListener('click', () => document.body.removeChild(overlay));
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) document.body.removeChild(overlay);
        });

        renderCalendar();
    }

    // 注册菜单命令
    function registerMenuCommand() {
        GM_registerMenuCommand('⚡ 快速提交 V2', showModal, {
            accessKey: 'q',
            id: 'quick-submit-command-v2'
        });
    }

    function init() {
        console.log('百灵工作量快速提交工具 V2 已加载');
        registerMenuCommand();
    }

    init();
})();
