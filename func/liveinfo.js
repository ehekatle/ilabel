// func/liveinfo.js
// 直播信息数据结构定义
// 字段名与页面接口返回的保持一致，便于后续维护

(function (iLabel) {
    'use strict';

    /**
     * 直播信息数据结构
     * 对应页面接口返回的字段名
     */
    iLabel.LiveInfo = class LiveInfo {
        constructor() {
            // 从 get_live_info_batch 接口获取
            this.liveId = '';              // 直播ID - liveId
            this.anchorUserId = '';         // 主播ID - anchorUserId
            this.nickname = '';              // 主播昵称 - nickname
            this.authStatus = '';            // 主播认证 - authStatus
            this.signature = '';              // 主播简介 - signature
            this.description = '';            // 直播间描述 - description
            this.createLiveArea = '';         // 开播地 - extraField.createLiveArea
            this.poiName = '';                 // 开播位置 - poiName
            this.streamStartTime = '';         // 开播时间 - streamStartTime

            // 从 /api/mixed-task/assigned 接口获取
            this.auditTime = 0;                // 送审时间 - audit_time
            this.auditRemark = '';              // 送审备注 - send_remark

            // 从 /api/user/info 接口获取
            this.auditor = '';                   // 审核人员 - name (取-后部分)
        }

        /**
         * 重置所有字段
         */
        reset() {
            this.liveId = '';
            this.anchorUserId = '';
            this.nickname = '';
            this.authStatus = '';
            this.signature = '';
            this.description = '';
            this.createLiveArea = '';
            this.poiName = '';
            this.streamStartTime = '';
            this.auditTime = 0;
            this.auditRemark = '';
            this.auditor = '';
        }

        /**
         * 从直播信息接口数据填充
         * @param {Object} liveInfo - 接口返回的直播信息对象
         */
        fromLiveInfo(liveInfo) {
            if (!liveInfo) return this;

            this.liveId = liveInfo.liveId || '';
            this.anchorUserId = liveInfo.anchorUserId || '';
            this.nickname = liveInfo.nickname || '';
            this.authStatus = liveInfo.authStatus || '';
            this.signature = liveInfo.signature || '';
            this.description = liveInfo.description || '';
            this.createLiveArea = liveInfo.extraField?.createLiveArea || '';
            this.poiName = liveInfo.poiName || '';
            this.streamStartTime = liveInfo.streamStartTime || '';

            return this;
        }

        /**
         * 从送审信息接口数据填充
         * @param {Object} auditInfo - 包含送审信息的对象
         */
        fromAuditInfo(auditInfo) {
            if (!auditInfo) return this;

            this.auditTime = auditInfo.audit_time || 0;
            this.auditRemark = auditInfo.auditRemark || '';

            return this;
        }

        /**
         * 设置审核人员
         * @param {string} name - 审核人员姓名
         */
        setAuditor(name) {
            this.auditor = name || '';
            return this;
        }

        /**
         * 转换为普通对象（用于存储或传输）
         */
        toObject() {
            return {
                liveId: this.liveId,
                anchorUserId: this.anchorUserId,
                nickname: this.nickname,
                authStatus: this.authStatus,
                signature: this.signature,
                description: this.description,
                createLiveArea: this.createLiveArea,
                poiName: this.poiName,
                streamStartTime: this.streamStartTime,
                auditTime: this.auditTime,
                auditRemark: this.auditRemark,
                auditor: this.auditor
            };
        }
    };

    /**
     * 判定结果数据结构
     * 所有Flag默认0，命中则设为1
     */
    iLabel.Result = class Result {
        constructor() {
            this.targetedFlag = 0;    // 点杀单
            this.prefilledFlag = 0;    // 预埋单
            this.exemptedFlag = 0;     // 豁免单
            this.reviewFlag = 0;        // 复核单
            this.penaltyFlag = 0;       // 违规单
            this.noteFlag = 0;          // 送审备注单
            this.complaintFlag = 0;     // 投诉单
            this.normalFlag = 0;        // 普通单
        }

        /**
         * 重置所有Flag
         */
        reset() {
            this.targetedFlag = 0;
            this.prefilledFlag = 0;
            this.exemptedFlag = 0;
            this.reviewFlag = 0;
            this.penaltyFlag = 0;
            this.noteFlag = 0;
            this.complaintFlag = 0;
            this.normalFlag = 0;
        }

        /**
         * 检查是否有任何命中
         */
        hasAny() {
            return this.targetedFlag || this.prefilledFlag || this.exemptedFlag ||
                this.reviewFlag || this.penaltyFlag || this.noteFlag ||
                this.complaintFlag || this.normalFlag;
        }

        /**
         * 获取所有命中的类型列表
         * @returns {Array<string>} 类型名称数组
         */
        getHitTypes() {
            const types = [];
            if (this.targetedFlag) types.push('targeted');
            if (this.prefilledFlag) types.push('prefilled');
            if (this.exemptedFlag) types.push('exempted');
            if (this.reviewFlag) types.push('review');
            if (this.penaltyFlag) types.push('penalty');
            if (this.noteFlag) types.push('note');
            if (this.complaintFlag) types.push('complaint');
            if (this.normalFlag) types.push('normal');
            return types;
        }

        /**
         * 获取命中的类型对应的显示名称
         */
        getHitTypeNames() {
            const nameMap = {
                targeted: '点杀',
                prefilled: '预埋',
                exempted: '豁免',
                review: '复核',
                penalty: '违规',
                note: '备注',
                complaint: '投诉',
                normal: '普通'
            };

            return this.getHitTypes().map(type => nameMap[type] || type);
        }
    };

    /**
     * 推送数据结构
     */
    iLabel.Push = class Push {
        constructor() {
            this.pushReminder = {
                content: '',
                mentionedMobileList: [],
                url: ''
            };
            this.pushAnswer = {
                content: '',
                url: ''
            };
        }

        /**
         * 重置推送数据
         */
        reset() {
            this.pushReminder = { content: '', mentionedMobileList: [], url: '' };
            this.pushAnswer = { content: '', url: '' };
        }

        /**
         * 设置提醒推送
         */
        setReminder(content, mobileList, url) {
            this.pushReminder.content = content;
            this.pushReminder.mentionedMobileList = mobileList || [];
            this.pushReminder.url = url;
        }

        /**
         * 设置结果推送
         */
        setAnswer(content, url) {
            this.pushAnswer.content = content;
            this.pushAnswer.url = url;
        }
    };

    /**
     * 完整的数据容器
     */
    iLabel.Data = class Data {
        constructor() {
            this.liveInfo = new iLabel.LiveInfo();
            this.result = new iLabel.Result();
            this.push = new iLabel.Push();
            this.config = null;  // 从configinfo.js加载
        }

        /**
         * 重置所有数据
         */
        reset() {
            this.liveInfo.reset();
            this.result.reset();
            this.push.reset();
        }

        /**
         * 检查是否有需要提示的类型（根据用户配置过滤）
         */
        getPromptTypes() {
            if (!this.config) return [];

            const hitTypes = this.result.getHitTypes();
            const promptConfig = this.config.userConfig.promptConfig;

            return hitTypes.filter(type => promptConfig[type] === true);
        }
    };

    // 初始化全局数据实例
    iLabel.currentData = new iLabel.Data();

    console.log('liveinfo.js 加载完成，数据结构已定义');

})(window.iLabel || (window.iLabel = {}));