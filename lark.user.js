// ==UserScript==
// @name         百灵工作量快速提交工具
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  在工作量管理页面添加批量查询和提交功能
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

        /* 弹窗容器 */
        .custom-modal {
            background: #fff;
            border-radius: 12px;
            width: 1000px;
            max-width: 90vw;
            max-height: 85vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            animation: modalFadeIn 0.2s ease;
            border: 1px solid #f0f0f0;
        }

        @keyframes modalFadeIn {
            from {
                opacity: 0;
                transform: translateY(-20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
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

        /* 弹窗内容 */
        .modal-content {
            padding: 24px;
            overflow-y: auto;
            flex: 1;
        }

        /* 查询区域 */
        .query-section {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 24px;
            background: #f8f9fa;
            padding: 16px 20px;
            border-radius: 8px;
            border: 1px solid #e8e8e8;
        }
        .date-picker {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid #d9d9d9;
            border-radius: 4px;
            font-size: 14px;
            transition: all 0.2s;
            height: 38px;
            background: white;
        }
        .date-picker:hover {
            border-color: #40a9ff;
        }
        .date-picker:focus {
            outline: none;
            border-color: #40a9ff;
            box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
        }
        .action-btn {
            padding: 8px 24px;
            border: none;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
            font-weight: 500;
            height: 38px;
            min-width: 80px;
        }
        .query-btn {
            background: #1890ff;
            color: white;
        }
        .query-btn:hover {
            background: #40a9ff;
        }
        .query-btn:disabled {
            background: #bae7ff;
            cursor: not-allowed;
        }
        .submit-btn {
            background: #52c41a;
            color: white;
        }
        .submit-btn:hover {
            background: #73d13d;
        }
        .submit-btn:disabled {
            background: #b7eb8f;
            cursor: not-allowed;
        }

        /* 统计信息 */
        .summary-stats {
            background: #e6f7ff;
            border: 1px solid #91d5ff;
            border-radius: 4px;
            padding: 12px 20px;
            margin-bottom: 20px;
            color: #0050b3;
            font-size: 14px;
            display: flex;
            gap: 32px;
            align-items: center;
        }
        .stat-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .stat-label {
            color: #666;
        }
        .stat-value {
            font-weight: 600;
            color: #1890ff;
            font-size: 16px;
            background: white;
            padding: 2px 10px;
            border-radius: 12px;
            border: 1px solid #91d5ff;
        }

        /* 表格样式 */
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
        .results-table tr:hover td {
            background: #f5f5f5;
        }
        .task-id {
            color: #1890ff;
            font-family: monospace;
            font-weight: 500;
        }
        .task-name {
            max-width: 400px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            color: #333;
        }
        .quantity-badge {
            background: #f0f5ff;
            color: #2f54eb;
            padding: 4px 12px;
            border-radius: 12px;
            font-weight: 500;
            display: inline-block;
            font-size: 12px;
            border: 1px solid #adc6ff;
        }

        /* 加载提示 */
        .loading-tip {
            text-align: center;
            padding: 60px 20px;
            color: #999;
            font-size: 14px;
        }

        /* 空状态 */
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #999;
            background: #fafafa;
            border-radius: 4px;
            border: 1px dashed #d9d9d9;
            font-size: 14px;
        }

        /* 错误提示 */
        .error-message {
            background: #fff2f0;
            border: 1px solid #ffccc7;
            border-radius: 4px;
            padding: 12px 16px;
            color: #f5222d;
            margin-bottom: 20px;
            font-size: 14px;
        }

        /* 成功提示 */
        .success-message {
            background: #f6ffed;
            border: 1px solid #b7eb8f;
            border-radius: 4px;
            padding: 12px 16px;
            color: #52c41a;
            margin-bottom: 20px;
            font-size: 14px;
        }

        /* 加载状态覆盖层 */
        .modal-loading {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10;
            border-radius: 12px;
        }
        .modal-loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #f0f0f0;
            border-top-color: #1890ff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `);

    // 存储任务列表的缓存
    let tasksCache = [];
    let isFetchingTasks = false;
    let modalInitialized = false;

    // 获取当前用户的auditUser
    function getAuditUser() {
        // 从cookie中获取openid
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [key, value] = cookie.trim().split('=');
            if (key === 'openid') {
                console.log('获取到openid:', value);
                return value;
            }
        }
        // 如果找不到，从页面中查找
        const userInfo = document.querySelector('[data-userid]');
        if (userInfo) {
            return userInfo.getAttribute('data-userid');
        }
        // 返回示例中的值作为后备
        console.warn('未找到openid，使用默认值');
        return '2000000010626';
    }

    // 格式化日期为时间戳（选中日期的0点0分0秒）
    function formatDateToTimestamp(dateStr) {
        const date = new Date(dateStr);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
    }

    // 格式化提交日期时间戳（查询日期+8小时）
    function formatSubmitTimestamp(dateStr) {
        const date = new Date(dateStr);
        date.setHours(8, 0, 0, 0);
        return date.getTime();
    }

    // 获取今天的日期字符串 (YYYY-MM-DD)
    function getTodayString() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // 查询任务列表并缓存
    async function fetchTasksList() {
        if (isFetchingTasks) return;

        isFetchingTasks = true;
        try {
            const auditUser = getAuditUser();
            console.log('开始获取任务列表, auditUser:', auditUser);

            const response = await fetch('https://ocean.cdposs.qq.com/api/trpc/WorkforceClientProxy/QueryVisibleTasks', {
                method: 'POST',
                headers: {
                    'accept': 'application/json, text/plain, */*',
                    'content-type': 'application/json; charset=UTF-8',
                    'x-requested-with': 'XMLHttpRequest'
                },
                credentials: 'include',
                body: JSON.stringify({
                    data: {
                        auditUser: auditUser
                    }
                })
            });

            const result = await response.json();
            if (result.code === 0 && result.data && result.data.tasks) {
                tasksCache = result.data.tasks;
                console.log('任务列表缓存成功，共', tasksCache.length, '个任务');
            } else {
                console.error('获取任务列表失败:', result.msg);
            }
        } catch (error) {
            console.error('获取任务列表失败:', error);
        } finally {
            isFetchingTasks = false;
        }
    }

    // 根据taskId获取任务名称
    function getTaskNameById(taskId) {
        const task = tasksCache.find(t => t.taskId === taskId);
        if (task) {
            return task.taskName || '未知任务';
        }
        return `任务${taskId}`;
    }

    // 根据taskId获取managementEffectiveness
    function getManageEffectiveById(taskId) {
        const task = tasksCache.find(t => t.taskId === taskId);
        if (task) {
            // 从ilabelTask获取
            if (task.ilabelTask && task.ilabelTask.managementEffectiveness) {
                return task.ilabelTask.managementEffectiveness.toString();
            }
            // 从versionData获取
            if (task.versionData && task.versionData.currentInfo &&
                task.versionData.currentInfo.effectiveness) {
                const eff = task.versionData.currentInfo.effectiveness.management;
                if (eff) return eff.toString();
            }
            // 从otherTask获取
            if (task.otherTask && task.otherTask.managementEffectiveness) {
                return task.otherTask.managementEffectiveness.toString();
            }
        }
        return '160'; // 默认值
    }

    // 根据taskId获取createTime
    function getCreateTimeById(taskId) {
        const task = tasksCache.find(t => t.taskId === taskId);
        return task && task.createTime ? task.createTime : Date.now().toString();
    }

    // 查询单个任务的摘要
    async function queryTaskSummary(taskId, reportDate) {
        try {
            const auditUser = getAuditUser();

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
                        taskId: taskId,
                        auditUser: auditUser,
                        reportDate: reportDate
                    }
                })
            });

            const result = await response.json();
            if (result.code === 0 && result.data) {
                return {
                    taskId: taskId,
                    auditQuantity: result.data.ilabel?.auditQuantity || '0',
                    checkQuantity: result.data.ilabel?.checkQuantity || '0',
                    raw: result.data
                };
            } else {
                console.warn(`查询任务 ${taskId} 返回错误:`, result.msg);
                return null;
            }
        } catch (error) {
            console.error(`查询任务 ${taskId} 失败:`, error);
            return null;
        }
    }

    // 批量查询任务
    async function batchQueryTasks(taskIds, reportDate, progressCallback) {
        const results = [];
        for (let i = 0; i < taskIds.length; i++) {
            const taskId = taskIds[i];

            if (progressCallback) {
                progressCallback(i + 1, taskIds.length, taskId);
            }

            const result = await queryTaskSummary(taskId, reportDate);
            if (result) {
                results.push(result);
            }

            // 添加延迟避免请求过快
            if (i < taskIds.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        return results;
    }

    // 提交工作量数据
    async function submitWorkData(tasks, reportDateStr) {
        try {
            const auditUser = getAuditUser();
            const submitDate = formatSubmitTimestamp(reportDateStr);

            // 过滤出auditQuantity不为0的任务
            const validTasks = tasks.filter(t => parseInt(t.auditQuantity) > 0);

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
                        auditUser: auditUser,
                        platform: "BaiLing"
                    }
                })
            });

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('提交失败:', error);
            throw error;
        }
    }

    // 显示弹窗
    async function showModal() {
        // 如果弹窗已存在，先移除
        const existingOverlay = document.querySelector('.custom-modal-overlay');
        if (existingOverlay) {
            document.body.removeChild(existingOverlay);
        }

        // 显示加载状态
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'custom-modal-overlay';
        loadingOverlay.innerHTML = '<div class="custom-modal" style="width: 400px;"><div class="modal-content" style="text-align: center; padding: 40px;"><div class="modal-loading-spinner" style="margin: 0 auto 20px;"></div><div>正在初始化，请稍候...</div></div></div>';
        document.body.appendChild(loadingOverlay);

        try {
            // 获取任务列表缓存
            await fetchTasksList();

            // 移除加载遮罩
            document.body.removeChild(loadingOverlay);
        } catch (error) {
            console.error('初始化失败:', error);
            document.body.removeChild(loadingOverlay);
            alert('初始化失败，请刷新页面重试');
            return;
        }

        // 创建遮罩
        const overlay = document.createElement('div');
        overlay.className = 'custom-modal-overlay';

        // 创建弹窗
        const modal = document.createElement('div');
        modal.className = 'custom-modal';

        // 弹窗头部
        const header = document.createElement('div');
        header.className = 'modal-header';
        header.innerHTML = `
            <h3>批量查询提交工具</h3>
            <span class="modal-close">×</span>
        `;

        // 弹窗内容
        const content = document.createElement('div');
        content.className = 'modal-content';

        // 初始内容
        content.innerHTML = `
            <div class="query-section">
                <input type="date" class="date-picker" value="${getTodayString()}">
                <button class="action-btn query-btn">查询</button>
                <button class="action-btn submit-btn" disabled>提交</button>
            </div>
            <div class="summary-stats" style="display: none;">
                <div class="stat-item">
                    <span class="stat-label">符合条件的任务：</span>
                    <span class="stat-value" id="validTaskCount">0</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">审核总量：</span>
                    <span class="stat-value" id="totalAudit">0</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">复核总量：</span>
                    <span class="stat-value" id="totalCheck">0</span>
                </div>
            </div>
            <div id="resultsContainer">
                <div class="empty-state">
                    请选择日期并点击查询按钮
                </div>
            </div>
        `;

        modal.appendChild(header);
        modal.appendChild(content);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // 获取元素
        const closeBtn = header.querySelector('.modal-close');
        const datePicker = content.querySelector('.date-picker');
        const queryBtn = content.querySelector('.query-btn');
        const submitBtn = content.querySelector('.submit-btn');
        const resultsContainer = document.getElementById('resultsContainer');
        const summaryStats = content.querySelector('.summary-stats');
        const validTaskCountSpan = document.getElementById('validTaskCount');
        const totalAuditSpan = document.getElementById('totalAudit');
        const totalCheckSpan = document.getElementById('totalCheck');

        // 存储查询结果
        let currentQueryResults = [];
        let currentDateStr = datePicker.value;

        // 关闭弹窗
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
        });

        // 点击遮罩关闭
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
            }
        });

        // 查询按钮点击事件
        queryBtn.addEventListener('click', async () => {
            const selectedDate = datePicker.value;
            if (!selectedDate) {
                alert('请选择日期');
                return;
            }

            currentDateStr = selectedDate;
            const timestamp = formatDateToTimestamp(selectedDate);

            // 任务ID列表（从示例中获取）
            const taskIds = [
                '6280', '5702', '5701', '5700', '5699', '5697',
                '5696', '5695', '5694', '5693', '5523'
            ];

            queryBtn.disabled = true;
            submitBtn.disabled = true;
            resultsContainer.innerHTML = '<div class="loading-tip">查询中，请稍候...</div>';
            summaryStats.style.display = 'none';

            try {
                // 创建进度提示
                const progressDiv = document.createElement('div');
                progressDiv.className = 'loading-tip';
                progressDiv.id = 'queryProgress';
                resultsContainer.innerHTML = '';
                resultsContainer.appendChild(progressDiv);

                const results = await batchQueryTasks(taskIds, timestamp, (current, total, taskId) => {
                    progressDiv.innerHTML = `正在查询第 ${current}/${total} 个任务 (ID: ${taskId})...`;
                });

                currentQueryResults = results;

                // 过滤出auditQuantity或checkQuantity不为0的结果
                const validResults = results.filter(r =>
                    parseInt(r.auditQuantity) > 0 || parseInt(r.checkQuantity) > 0
                );

                // 更新统计
                const totalAudit = validResults.reduce((sum, r) => sum + parseInt(r.auditQuantity), 0);
                const totalCheck = validResults.reduce((sum, r) => sum + parseInt(r.checkQuantity), 0);

                validTaskCountSpan.textContent = validResults.length;
                totalAuditSpan.textContent = totalAudit;
                totalCheckSpan.textContent = totalCheck;

                if (validResults.length > 0) {
                    summaryStats.style.display = 'flex';
                    submitBtn.disabled = false;
                } else {
                    summaryStats.style.display = 'none';
                    submitBtn.disabled = true;
                }

                // 渲染结果表格
                renderResults(validResults);

            } catch (error) {
                resultsContainer.innerHTML = `<div class="error-message">查询失败: ${error.message}</div>`;
            } finally {
                queryBtn.disabled = false;
            }
        });

        // 提交按钮点击事件
        submitBtn.addEventListener('click', async () => {
            if (!currentDateStr || currentQueryResults.length === 0) {
                alert('请先查询数据');
                return;
            }

            submitBtn.disabled = true;
            const originalText = submitBtn.textContent;
            submitBtn.textContent = '提交中...';

            try {
                const result = await submitWorkData(currentQueryResults, currentDateStr);
                if (result.code === 0) {
                    // 显示成功信息
                    const successDiv = document.createElement('div');
                    successDiv.className = 'success-message';
                    successDiv.textContent = '提交成功！';
                    resultsContainer.insertBefore(successDiv, resultsContainer.firstChild);

                    // 3秒后移除成功信息
                    setTimeout(() => {
                        if (successDiv.parentNode) {
                            successDiv.parentNode.removeChild(successDiv);
                        }
                    }, 3000);
                } else {
                    alert(`提交失败: ${result.msg || '未知错误'}`);
                }
            } catch (error) {
                alert(`提交失败: ${error.message}`);
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });

        // 渲染结果表格
        function renderResults(results) {
            if (results.length === 0) {
                resultsContainer.innerHTML = '<div class="empty-state">没有找到符合条件的任务</div>';
                return;
            }

            let html = `
                <table class="results-table">
                    <thead>
                        <tr>
                            <th style="width: 100px;">任务ID</th>
                            <th>任务名称</th>
                            <th style="width: 100px;">审核量</th>
                            <th style="width: 100px;">复核量</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            results.forEach(r => {
                const taskName = getTaskNameById(r.taskId);
                html += `
                    <tr>
                        <td class="task-id">${r.taskId}</td>
                        <td class="task-name" title="${taskName}">${taskName}</td>
                        <td><span class="quantity-badge">${r.auditQuantity}</span></td>
                        <td><span class="quantity-badge">${r.checkQuantity}</span></td>
                    </tr>
                `;
            });

            html += `
                    </tbody>
                </table>
            `;

            resultsContainer.innerHTML = html;
        }
    }

    // 注册菜单命令
    function registerMenuCommand() {
        GM_registerMenuCommand('⚡ 快速提交', async () => {
            console.log('菜单命令触发');
            await showModal();
        }, {
            accessKey: 'q',
            id: 'quick-submit-command'
        });

        console.log('菜单命令已注册 - 点击Tampermonkey图标选择"快速提交"');
    }

    // 初始化
    function init() {
        console.log('脚本已加载');
        registerMenuCommand();
    }

    // 启动脚本
    init();
})();