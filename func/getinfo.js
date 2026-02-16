// func/getinfo.js
// 监听网络请求，获取直播信息和送审信息

(function (iLabel) {
    'use strict';

    /**
     * Unicode解码函数
     */
    function decodeUnicode(str) {
        if (!str) return '';
        try {
            return str.replace(/\\u([\dA-F]{4})/gi,
                (match, group) => String.fromCharCode(parseInt(group, 16)));
        } catch (e) {
            return str;
        }
    }

    /**
     * 处理直播信息
     */
    function processLiveInfo(liveInfo) {
        if (!liveInfo) return;

        iLabel.currentData.liveInfo.fromLiveInfo(liveInfo);

        // 同时获取审核人员信息
        fetchAuditorInfo();

        console.log('直播信息已更新:', iLabel.currentData.liveInfo.toObject());
    }

    /**
     * 获取审核人员信息
     */
    function fetchAuditorInfo() {
        fetch('https://ilabel.weixin.qq.com/api/user/info', {
            headers: {
                'accept': 'application/json, text/plain, */*',
                'x-requested-with': 'XMLHttpRequest'
            },
            credentials: 'include'
        })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'ok' && data.data?.name) {
                    const nameParts = data.data.name.split('-');
                    const auditor = nameParts.length > 1 ? nameParts[1].trim() : data.data.name.trim();
                    iLabel.currentData.liveInfo.setAuditor(auditor);
                    console.log('审核人员已更新:', auditor);

                    // 触发数据更新事件
                    window.dispatchEvent(new CustomEvent('ilabel:liveInfoUpdated', {
                        detail: iLabel.currentData
                    }));
                }
            })
            .catch(e => console.error('获取审核人员信息失败:', e));
    }

    /**
     * 处理送审信息
     */
    function processAuditInfo(data) {
        if (data.status === 'ok' && data.data?.hits?.length > 0) {
            const hit = data.data.hits[0];
            const content = hit.content_data?.content;

            if (content) {
                const audit_time = content.audit_time || 0;
                const rawRemark = content.send_remark || '';
                const auditRemark = decodeUnicode(rawRemark);

                iLabel.currentData.liveInfo.fromAuditInfo({
                    audit_time: audit_time,
                    auditRemark: auditRemark
                });

                console.log('送审信息已更新:', { audit_time, auditRemark });

                // 触发数据更新事件
                window.dispatchEvent(new CustomEvent('ilabel:liveInfoUpdated', {
                    detail: iLabel.currentData
                }));
            }
        }
    }

    /**
     * 处理审核提交
     */
    function processAnswerSubmit(body) {
        try {
            const parsedData = typeof body === 'string' ? JSON.parse(body) : body;

            if (!parsedData.results) return;

            Object.values(parsedData.results).forEach(result => {
                if (!result) return;

                // 提取信息
                const taskId = result.task_id || '';
                const liveId = result.live_id || '';

                let operator = '未知操作人';
                if (result.oper_name && result.oper_name.includes('-')) {
                    operator = result.oper_name.split('-').pop().trim();
                } else if (result.oper_name) {
                    operator = result.oper_name.trim();
                }

                // 检查punish_keyword和remark
                let conclusion = '不处罚';
                let reason_label = null;
                let remark = null;

                if (result.finder_object && Array.isArray(result.finder_object)) {
                    for (const item of result.finder_object) {
                        if (item.reason_label) {
                            reason_label = item.reason_label;
                            remark = item.remark || null;
                            break;
                        }
                    }
                }

                if (reason_label) {
                    conclusion = remark ? `${reason_label}（${remark}）` : reason_label;
                }

                // 准备推送数据
                const timeStr = new Date().toLocaleTimeString('zh-CN', { hour12: false });
                const content = `审核提交记录\n时间: ${timeStr}\ntask_id: ${taskId}\nlive_id: ${liveId}\n结论: ${conclusion}\n操作人: ${operator}`;

                // 获取推送地址
                const config = iLabel.Config.get();
                const url = config.globalConfig.pushUrl.resultUrl;

                // 设置推送数据
                iLabel.currentData.push.setAnswer(content, url);

                console.log('审核结果已记录，等待推送');

                // 触发审核结果事件
                window.dispatchEvent(new CustomEvent('ilabel:answerSubmitted', {
                    detail: iLabel.currentData.push.pushAnswer
                }));
            });

        } catch (error) {
            console.error('解析审核数据失败:', error);
        }
    }

    /**
     * 设置fetch拦截
     */
    function setupFetchInterception() {
        const originalFetch = window.fetch;

        window.fetch = function (...args) {
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
                            }).catch(() => { });
                        }
                    }).catch(() => { });
                    return fetchPromise;
                }

                // 监听送审信息请求
                else if (url.includes('/api/mixed-task/assigned')) {
                    const fetchPromise = originalFetch.apply(this, args);
                    fetchPromise.then(response => {
                        if (response.ok) {
                            response.clone().json().then(data => {
                                processAuditInfo(data);
                            }).catch(() => { });
                        }
                    }).catch(() => { });
                    return fetchPromise;
                }

                // 监听审核提交请求
                else if (url.includes('/api/answers')) {
                    const body = args[1];
                    if (body && typeof body === 'string') {
                        try {
                            processAnswerSubmit(body);
                        } catch (e) { }
                    }
                    return originalFetch.apply(this, args);
                }
            }

            return originalFetch.apply(this, args);
        };
    }

    /**
     * 设置XHR拦截
     */
    function setupXHRInterception() {
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function (method, url) {
            this._method = method.toUpperCase();
            this._url = url;
            return originalOpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function (body) {
            const xhr = this;

            // 监听直播信息
            if (xhr._url && xhr._url.includes('get_live_info_batch')) {
                xhr.addEventListener('load', () => {
                    if (xhr.status === 200) {
                        try {
                            const data = JSON.parse(xhr.responseText);
                            if (data.ret === 0 && data.liveInfoList?.length > 0) {
                                processLiveInfo(data.liveInfoList[0]);
                            }
                        } catch (e) { }
                    }
                });
            }

            // 监听送审信息
            else if (xhr._url && xhr._url.includes('/api/mixed-task/assigned')) {
                xhr.addEventListener('load', () => {
                    if (xhr.status === 200) {
                        try {
                            const data = JSON.parse(xhr.responseText);
                            processAuditInfo(data);
                        } catch (e) { }
                    }
                });
            }

            // 监听审核提交
            else if (xhr._method === 'POST' && xhr._url && xhr._url.includes('/api/answers')) {
                xhr.addEventListener('load', function () {
                    if (xhr.status === 200 && body) {
                        try {
                            processAnswerSubmit(body);
                        } catch (error) { }
                    }
                });
            }

            return originalSend.call(this, body);
        };
    }

    /**
     * 初始化
     */
    function init() {
        setupFetchInterception();
        setupXHRInterception();
        console.log('getinfo.js 加载完成，请求拦截已设置');
    }

    // 等待所有模块加载完成后初始化
    window.addEventListener('ilabel:allModulesLoaded', init);

})(window.iLabel || (window.iLabel = {}));