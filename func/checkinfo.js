// func/checkinfo.js
// 判断单子包含的所有类型，并对应修改flag

(function (iLabel) {
    'use strict';

    /**
     * 检查是否为预埋单
     * 送审时间和当前网络时间是否不在同一天
     */
    function checkPrefilled(data) {
        if (!data.auditTime) return false;

        const auditDate = new Date(data.auditTime * 1000);
        const now = new Date();

        return auditDate.getDate() !== now.getDate() ||
            auditDate.getMonth() !== now.getMonth() ||
            auditDate.getFullYear() !== now.getFullYear();
    }

    /**
     * 检查是否豁免
     * 主播昵称、主播ID、主播认证是否在白名单中
     */
    function checkExempted(data, globalConfig) {
        const whiteList = globalConfig.anchorWhiteList;

        // 1. 检查主播ID白名单
        if (data.anchorUserId && whiteList.anchorUserIdWhiteList) {
            if (whiteList.anchorUserIdWhiteList.includes(data.anchorUserId)) {
                console.log(`主播ID在白名单中: ${data.anchorUserId}`);
                return true;
            }
        }

        // 2. 检查主播昵称白名单（包含匹配）
        if (data.nickname && whiteList.nicknameWhiteList) {
            for (const keyword of whiteList.nicknameWhiteList) {
                if (keyword && data.nickname.includes(keyword)) {
                    console.log(`主播昵称包含白名单关键词: ${keyword}`);
                    return true;
                }
            }
        }

        // 3. 检查主播认证白名单（包含匹配）
        if (data.authStatus && whiteList.authStatusWhiteList) {
            for (const keyword of whiteList.authStatusWhiteList) {
                if (keyword && data.authStatus.includes(keyword)) {
                    console.log(`主播认证包含白名单关键词: ${keyword}`);
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * 检查送审备注类型
     * 复核、点杀、送审备注、投诉
     */
    function checkAuditRemark(data) {
        const remark = data.auditRemark || '';
        const result = {
            review: false,    // 复核
            targeted: false,  // 点杀
            note: false,      // 送审备注
            complaint: false  // 投诉
        };

        if (!remark) return result;

        // 复核：包含"复核"
        if (remark.includes('复核')) {
            result.review = true;
        }

        // 点杀：包含"辛苦注意审核"
        if (remark.includes('辛苦注意审核')) {
            result.targeted = true;
        }

        // 送审备注：包含"辛苦审核"
        if (remark.includes('辛苦审核')) {
            result.note = true;
        }

        // 投诉：包含"投诉"
        if (remark.includes('投诉')) {
            result.complaint = true;
        }

        return result;
    }

    /**
     * 检查处罚关键词
     * 检查顺序：直播间描述 -> 主播昵称 -> 开播位置
     */
    function checkPenalty(data, globalConfig) {
        const keywords = globalConfig.penaltyKeywords || [];
        if (keywords.length === 0) return false;

        const checkFields = [
            { field: 'description', name: '直播间描述' },
            { field: 'nickname', name: '主播昵称' },
            { field: 'poiName', name: '开播位置' }
        ];

        for (const field of checkFields) {
            const value = data[field.field] || '';
            for (const keyword of keywords) {
                if (value.includes(keyword)) {
                    console.log(`${field.name}命中处罚关键词: ${keyword}`);
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * 检查审核人员是否在白名单中
     */
    function checkAuditor(data, globalConfig) {
        const auditor = data.auditor;
        if (!auditor) return true; // 无审核人员时默认通过

        const whiteList = globalConfig.auditorWhiteList || [];
        return whiteList.some(item => item.name === auditor);
    }

    /**
     * 执行所有检查，更新result标志
     */
    function checkAll() {
        const data = iLabel.currentData;
        const config = iLabel.Config.get();

        if (!data || !config) return;

        const globalConfig = config.globalConfig;
        const liveInfo = data.liveInfo;

        // 重置结果
        data.result.reset();

        // 1. 审核人员检查（如果不通过，直接返回，不显示任何弹窗）
        if (!checkAuditor(liveInfo, globalConfig)) {
            console.log('审核人员不在白名单中，不进行处理');
            return;
        }

        // 2. 预埋单检查
        if (checkPrefilled(liveInfo)) {
            data.result.prefilledFlag = 1;
        }

        // 3. 豁免检查
        if (checkExempted(liveInfo, globalConfig)) {
            data.result.exemptedFlag = 1;
        }

        // 4. 送审备注相关检查
        const remarkResult = checkAuditRemark(liveInfo);
        if (remarkResult.review) data.result.reviewFlag = 1;
        if (remarkResult.targeted) data.result.targetedFlag = 1;
        if (remarkResult.note) data.result.noteFlag = 1;
        if (remarkResult.complaint) data.result.complaintFlag = 1;

        // 5. 处罚检查
        if (checkPenalty(liveInfo, globalConfig)) {
            data.result.penaltyFlag = 1;
        }

        // 6. 如果没有命中任何类型，则为普通单
        if (!data.result.hasAny()) {
            data.result.normalFlag = 1;
        }

        console.log('类型判断完成，命中类型:', data.result.getHitTypes());

        // 触发结果更新事件
        window.dispatchEvent(new CustomEvent('ilabel:resultUpdated', {
            detail: data.result
        }));
    }

    /**
     * 监听数据更新，触发检查
     */
    function init() {
        window.addEventListener('ilabel:liveInfoUpdated', function () {
            // 延迟一点执行，确保所有数据都已更新
            setTimeout(checkAll, 100);
        });

        console.log('checkinfo.js 加载完成，类型判断逻辑已就绪');
    }

    // 等待所有模块加载完成后初始化
    window.addEventListener('ilabel:allModulesLoaded', init);

})(window.iLabel || (window.iLabel = {}));