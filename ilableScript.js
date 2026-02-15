/* VERSION: 2.5.0 */
/* CONFIG START */
// 昵称白名单
const anchorWhiteList = "百年对语 东南军迷俱乐部 广东新闻广描 广东新闻频道 广东移动频道 湖南国际瑰宝雅集 湖南国际频道文创甄选 湖南国际珍宝收藏 琳琅瑰宝雅集 央博匠心 雨家饰品 雨家首饰 豫见新财富 BRTV大家收藏 BRTV首都经济报道 好物珍宝 央博典藏 央博非遗珍宝 央博好物 央博木作 央博".split(' ');

// 认证白名单
const enterpriseMediaWhiteList = "事业媒体 事业单位 深圳周大福在线传媒有限公司 上海老凤祥旅游产品有限公司 上海老凤祥有限公司 周六福电子商务有限公司 周大生珠宝股份有限公司 周大生 CHOW TAI SENG 六福营销策划(重庆)有限公司 中金珠宝（三亚）有限公司 中国黄金集团黄金珠宝（北京）有限公司 中国黄金集团团黄金珠宝股份有限公司 珀思岚 深圳市珀思岚电子商务有限公司 京润珍珠 深圳京润蔻润商业发展有限公司 京润珍珠 GN PEARL 北京故宫文化传播有限公司 故宫文化创意产业有限公司".split(' ');

// 处罚检查关键词（空格分隔）
const penaltyKeywords = "金包 金重量 金含量 金镯子 金项链 金子这么便宜 缅 曼德勒 越南 老仓库".split(' ');

// 审核白名单 - 姓名+手机号格式
const auditorWhiteList = [
    { name: "王鹏程", mobile: "18423065975" },
    { name: "刘丹娜", mobile: "18323846400" },
    { name: "李晓露", mobile: "15922633098" },
    { name: "何浩", mobile: "17878177114" },
    { name: "卢洪", mobile: "18883245082" },
    { name: "徐蝶", mobile: "17623729348" },
    { name: "冉燕", mobile: "18996493587" },
    { name: "胡洪", mobile: "15086920634" },
    { name: "李美林", mobile: "17782380032" },
    { name: "罗灵", mobile: "19122166093" },
    { name: "张鸿扬", mobile: "18072435724" },
    { name: "桂雪莲", mobile: "18166360194" },
    { name: "王成林", mobile: "15202372642" },
    { name: "涂素榕", mobile: "16602309860" },
    { name: "田一材", mobile: "18883670307" },
    { name: "敖江凤", mobile: "18315203453" },
    { name: "林志洋", mobile: "13640598040" }
];

// 审核黑名单
const auditorBlackList = [""];

// 推送地址
const pushUrl = "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=90014c35-804f-489e-b203-bf59f46f69fb";

// 手机号映射（从白名单自动生成）
const auditorMobileMap = (function() {
    const map = {};
    auditorWhiteList.forEach(auditor => {
        map[auditor.name] = auditor.mobile;
    });
    return map;
})();

// 弹窗颜色配置
const popupColors = {
    prefilled: { bg: '#ffebee', border: '#f44336', text: '#c62828' },      // 预埋单 - 红色
    exempted: { bg: '#e8f5e9', border: '#4caf50', text: '#2e7d32' },       // 豁免单 - 绿色
    review: { bg: '#e3f2fd', border: '#2196f3', text: '#1565c0' },         // 复核单 - 蓝色
    targeted: { bg: '#000000', border: '#000000', text: '#ffffff' },       // 点杀单 - 黑色
    penalty: { bg: '#fff3e0', border: '#ff9800', text: '#ef6c00' },        // 违规单 - 黄色
    normal: { bg: '#f5f5f5', border: '#9e9e9e', text: '#424242' }          // 普通单 - 白色
};
/* CONFIG END */

// 主处理函数
function checkInfo(getInfoData, config, callback) {
    // 1. 审核人员检查
    const auditorName = getInfoData.auditor || '';
    
    // 检查是否在黑名单中
    const isInWhitelist = config.auditorWhiteList.some(item => 
        item.name === auditorName
    );

    if (auditorName && !isInWhitelist) {
        callback({
            type: 'blacklist',
            message: '审核人员不在白名单中'
        });
        return;
    }

    // 2. 预埋单检查
    if (isPrefilledOrder(getInfoData)) {
        callback({
            type: 'prefilled',
            message: '该直播为预埋单'
        });
        return;
    }

    // 3. 豁免检查 - 修改：增加主播认证检查，白名单改为包含匹配
    if (isExempted(getInfoData, config)) {
        callback({
            type: 'exempted',
            message: '该主播为白名单或事业媒体'
        });
        return;
    }

    // 4. 复核单和点杀单检查（基于送审备注）
    const remarkCheckResult = checkAuditRemark(getInfoData);
    if (remarkCheckResult.found) {
        callback({
            type: remarkCheckResult.type,
            message: remarkCheckResult.message
        });
        return;
    }

    // 5. 处罚检查
    const penaltyResult = checkPenalty(getInfoData, config);
    if (penaltyResult.found) {
        callback({
            type: 'penalty',
            message: `${penaltyResult.location}命中处罚关键词：${penaltyResult.keyword}`
        });
        return;
    }

    // 6. 其他情况
    callback({
        type: 'normal',
        message: '该直播为普通单'
    });
}

// 检查是否为预埋单 - 修改：只检查送审时间和当前网络时间是否不在同一天
function isPrefilledOrder(data) {
    if (!data.audit_time) return false;
    
    const auditDate = new Date(parseInt(data.audit_time) * 1000);
    const now = new Date();
    
    // 检查送审时间和当前网络时间是否不在同一天
    const isAuditNotToday = auditDate.getDate() !== now.getDate() || 
                           auditDate.getMonth() !== now.getMonth() || 
                           auditDate.getFullYear() !== now.getFullYear();
    
    return isAuditNotToday;
}

// 检查是否豁免
function isExempted(data, config) {
    // 检查主播昵称是否包含白名单关键词
    if (data.nickname && config.anchorWhiteList) {
        for (let i = 0; i < config.anchorWhiteList.length; i++) {
            const keyword = config.anchorWhiteList[i];
            if (keyword && data.nickname.includes(keyword)) {
                console.log(`主播昵称包含白名单关键词 "${keyword}"`);
                return true;
            }
        }
    }
    
    // 检查主播认证是否包含白名单关键词
    if (data.authStatus && config.enterpriseMediaWhiteList) {
        for (let i = 0; i < config.enterpriseMediaWhiteList.length; i++) {
            const keyword = config.enterpriseMediaWhiteList[i];
            if (keyword && data.authStatus.includes(keyword)) {
                console.log(`主播认证包含白名单关键词 "${keyword}"`);
                return true;
            }
        }
    }
    
    return false;
}

// 检查送审备注，判断是否为复核单或点杀单
function checkAuditRemark(data) {
    // 获取送审备注，如果没有则为空字符串
    const auditRemark = data.auditRemark || '';
    
    if (!auditRemark) {
        return { found: false };
    }
    
    // 检查是否包含"复核"
    if (auditRemark.includes('复核')) {
        return {
            found: true,
            type: 'review',
            message: '该直播为复核单'
        };
    }
    
    // 检查是否包含"辛苦注意审核"
    if (auditRemark.includes('辛苦注意审核')) {
        return {
            found: true,
            type: 'targeted',
            message: '该直播为点杀单'
        };
    }
    
    return { found: false };
}

// 检查处罚关键词
function checkPenalty(data, config) {
    if (!config.penaltyKeywords) {
        return { found: false };
    }
    
    // 检查顺序：直播间描述 -> 主播昵称 -> 开播位置
    const checkOrder = [
        { field: 'description', label: '直播间描述' },
        { field: 'nickname', label: '主播昵称' },
        { field: 'poiName', label: '开播位置' }
    ];
    
    for (const check of checkOrder) {
        const fieldValue = data[check.field] || '';
        for (const keyword of config.penaltyKeywords) {
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
