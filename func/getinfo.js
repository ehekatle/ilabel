// 信息获取模块
(function (context) {
    'use strict';

    const { state, utils } = context;

    // 注册到context
    context.getInfo = {
        getAuditorInfo,
        getAuditInfo,
        decodeUnicode,
        checkAllTypes: checkAllTypes.bind(null, context)
    };

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
            console.error('获取审核人员信息失败', e);
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
            console.error('获取送审信息失败', e);
        }
        return { audit_time: 0, auditRemark: '' };
    }

    // Unicode解码
    function decodeUnicode(str) {
        if (!str) return '';
        try {
            return str.replace(/\\u([\dA-F]{4})/gi,
                (match, group) => String.fromCharCode(parseInt(group, 16)));
        } catch (e) {
            return str;
        }
    }

    // 检查所有类型
    function checkAllTypes(liveData, context) {
        const types = [];
        const config = state.globalConfig;

        if (!config) return types;

        // 预埋单检查
        if (isPrefilledOrder(liveData)) {
            types.push('prefilled');
        }

        // 豁免检查
        if (isExempted(liveData, config)) {
            types.push('exempted');
        }

        // 复核单检查
        if (liveData.auditRemark && liveData.auditRemark.includes('复核')) {
            types.push('review');
        }

        // 点杀单检查
        if (liveData.auditRemark && liveData.auditRemark.includes('辛苦注意审核')) {
            types.push('targeted');
        }

        // 处罚检查
        const penaltyResult = checkPenalty(liveData, config);
        if (penaltyResult.found) {
            types.push('penalty');
        }

        // 送审备注检查
        if (liveData.auditRemark && liveData.auditRemark.includes('辛苦审核')) {
            types.push('note');
        }

        // 投诉检查
        if (liveData.auditRemark && liveData.auditRemark.includes('投诉')) {
            types.push('complaint');
        }

        // 普通单（如果没有其他类型）
        if (types.length === 0) {
            types.push('normal');
        }

        return types;
    }

    // 检查是否为预埋单
    function isPrefilledOrder(data) {
        if (!data.auditTime) return false;

        const auditDate = new Date(parseInt(data.auditTime) * 1000);
        const now = new Date();

        return auditDate.getDate() !== now.getDate() ||
            auditDate.getMonth() !== now.getMonth() ||
            auditDate.getFullYear() !== now.getFullYear();
    }

    // 检查是否豁免
    function isExempted(data, config) {
        const whiteList = config.anchorWhiteList || {};

        // 1. 检查主播ID白名单（精确匹配）
        if (data.anchorUserId && whiteList.anchorUserIdWhiteList && whiteList.anchorUserIdWhiteList.length > 0) {
            if (whiteList.anchorUserIdWhiteList.includes(data.anchorUserId)) {
                console.log(`豁免命中: 主播ID "${data.anchorUserId}" 在白名单中`);
                return true;
            }
        }

        // 2. 检查主播昵称白名单（包含匹配）
        if (data.nickname && whiteList.nicknameWhiteList && whiteList.nicknameWhiteList.length > 0) {
            for (const keyword of whiteList.nicknameWhiteList) {
                if (keyword && data.nickname.includes(keyword)) {
                    console.log(`豁免命中: 昵称包含白名单关键词 "${keyword}"`);
                    return true;
                }
            }
        }

        // 3. 检查主播认证白名单（包含匹配）
        if (data.authStatus && whiteList.authStatusWhiteList && whiteList.authStatusWhiteList.length > 0) {
            for (const keyword of whiteList.authStatusWhiteList) {
                if (keyword && data.authStatus.includes(keyword)) {
                    console.log(`豁免命中: 认证包含白名单关键词 "${keyword}"`);
                    return true;
                }
            }
        }

        return false;
    }

    // 检查处罚关键词
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
                    return {
                        found: true,
                        location: check.label,
                        keyword: keyword
                    };
                }
            }
        }

        return { found: false };
    }

})(typeof context !== 'undefined' ? context : window.__ilabelContext);