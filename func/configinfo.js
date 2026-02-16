// func/configinfo.js
// 配置文件，加载后在本地持久化保存

(function (iLabel) {
    'use strict';

    // 获取GM API
    const gm = iLabel.gm;

    // 默认配置
    const DEFAULT_CONFIG = {
        globalConfig: {
            auditorWhiteList: [
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
            ],
            anchorWhiteList: {
                anchorUserIdWhiteList: ["123456789", "987654321", "555666777", "888999000"],
                nicknameWhiteList: "百年对语 东南军迷俱乐部 广东新闻广描 广东新闻频道 广东移动频道 湖南国际瑰宝雅集 湖南国际频道文创甄选 湖南国际珍宝收藏 琳琅瑰宝雅集 央博匠心 雨家饰品 雨家首饰 豫见新财富 BRTV大家收藏 BRTV首都经济报道 好物珍宝 央博典藏 央博非遗珍宝 央博好物 央博木作 央博".split(' '),
                authStatusWhiteList: "事业媒体 事业单位 深圳周大福在线传媒有限公司 上海老凤祥旅游产品有限公司 上海老凤祥有限公司 周六福电子商务有限公司 周大生珠宝股份有限公司 周大生 CHOW TAI SENG 六福营销策划(重庆)有限公司 中金珠宝（三亚）有限公司 中国黄金集团黄金珠宝（北京）有限公司 中国黄金集团团黄金珠宝股份有限公司 珀思岚 深圳市珀思岚电子商务有限公司 京润珍珠 深圳京润蔻润商业发展有限公司 京润珍珠 GN PEARL 北京故宫文化传播有限公司 故宫文化创意产业有限公司".split(' ')
            },
            popupColor: {
                targetedColor: { bg: '#000000', border: '#000000', text: '#ffffff' },
                prefilledColor: { bg: '#ffebee', border: '#f44336', text: '#c62828' },
                exemptedColor: { bg: '#e8f5e9', border: '#4caf50', text: '#2e7d32' },
                reviewColor: { bg: '#e3f2fd', border: '#2196f3', text: '#1565c0' },
                penaltyColor: { bg: '#fff3e0', border: '#ff9800', text: '#ef6c00' },
                noteColor: { bg: '#bbdefb', border: '#64b5f6', text: '#0d47a1' },
                complaintColor: { bg: '#f5f5f5', border: '#9e9e9e', text: '#424242' },
                normalColor: { bg: '#f5f5f5', border: '#9e9e9e', text: '#424242' }
            },
            penaltyKeywords: "金包 金重量 金含量 金镯子 金项链 金子这么便宜 缅 曼德勒 越南 老仓库".split(' '),
            pushUrl: {
                reminderUrl: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=90014c35-804f-489e-b203-bf59f46f69fb",
                resultUrl: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=90014c35-804f-489e-b203-bf59f46f69fb"
            }
        },
        userConfig: {
            promptConfig: {
                targeted: true,
                prefilled: true,
                exempted: true,
                review: true,
                penalty: true,
                note: true,
                complaint: true,
                normal: true
            },
            alarmRingFlag: 0,
            popupArrange: 'horizontal',
            popupPosition: { x: '50%', y: '50%' },
            popupSize: 100
        }
    };

    /**
     * 配置管理类
     */
    iLabel.ConfigManager = class ConfigManager {
        constructor() {
            this.config = null;
            this.load();
        }

        /**
         * 从本地存储加载配置
         */
        load() {
            const saved = gm.getValue('ilabel_config', null);
            if (saved) {
                try {
                    this.config = JSON.parse(saved);
                } catch (e) {
                    console.error('解析保存的配置失败，使用默认配置', e);
                    this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
                }
            } else {
                this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
                this.save();
            }

            if (iLabel.currentData) {
                iLabel.currentData.config = this.config;
            }

            return this.config;
        }

        /**
         * 保存配置到本地存储
         */
        save() {
            gm.setValue('ilabel_config', JSON.stringify(this.config));

            if (iLabel.currentData) {
                iLabel.currentData.config = this.config;
            }

            window.dispatchEvent(new CustomEvent('ilabel:configChanged', {
                detail: this.config
            }));
        }

        /**
         * 获取完整配置
         */
        get() {
            if (!this.config) {
                this.load();
            }
            return this.config;
        }

        /**
         * 获取全局配置
         */
        getGlobal() {
            return this.get().globalConfig;
        }

        /**
         * 获取用户配置
         */
        getUser() {
            return this.get().userConfig;
        }

        /**
         * 更新用户配置
         */
        updateUser(updates) {
            const config = this.get();
            config.userConfig = { ...config.userConfig, ...updates };
            this.save();
            return config;
        }

        /**
         * 从远程同步全局配置
         */
        syncGlobalFromRemote(callback) {
            const remoteUrl = 'https://gh-proxy.org/https://raw.githubusercontent.com/ehekatle/ilabel/main/func/configinfo.js';

            gm.xmlhttpRequest({
                method: 'GET',
                url: remoteUrl + '?t=' + Date.now(),
                onload: (response) => {
                    if (response.status === 200) {
                        try {
                            // 简化处理，实际应解析远程配置
                            const remoteConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
                            const currentConfig = this.get();
                            currentConfig.globalConfig = remoteConfig.globalConfig;
                            this.save();

                            if (callback) callback(null, currentConfig);
                        } catch (e) {
                            console.error('解析远程配置失败:', e);
                            if (callback) callback(e, null);
                        }
                    } else {
                        if (callback) callback(new Error('加载失败，状态码：' + response.status), null);
                    }
                },
                onerror: (error) => {
                    if (callback) callback(error, null);
                }
            });
        }

        /**
         * 获取类型对应的颜色配置
         */
        getColorForType(type) {
            const globalConfig = this.getGlobal();
            const colorMap = {
                targeted: globalConfig.popupColor.targetedColor,
                prefilled: globalConfig.popupColor.prefilledColor,
                exempted: globalConfig.popupColor.exemptedColor,
                review: globalConfig.popupColor.reviewColor,
                penalty: globalConfig.popupColor.penaltyColor,
                note: globalConfig.popupColor.noteColor,
                complaint: globalConfig.popupColor.complaintColor,
                normal: globalConfig.popupColor.normalColor
            };

            return colorMap[type] || colorMap.normal;
        }
    };

    // 初始化配置管理器实例
    iLabel.configManager = new iLabel.ConfigManager();

    // 提供简化接口
    iLabel.Config = {
        get: () => iLabel.configManager.get(),
        getUser: () => iLabel.configManager.getUser(),
        updateUser: (updates) => iLabel.configManager.updateUser(updates),
        syncGlobal: (callback) => iLabel.configManager.syncGlobalFromRemote(callback),
        getColorForType: (type) => iLabel.configManager.getColorForType(type)
    };

    console.log('configinfo.js 加载完成，配置已初始化');

})(window.iLabel || (window.iLabel = {}));