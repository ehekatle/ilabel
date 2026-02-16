// ==UserScript==
// @name         iLabel直播审核辅助
// @namespace    https://github.com/ehekatle/ilabel
// @version      3.0.3
// @description  直播审核辅助工具（模块化重构版）
// @author       ehekatle
// @homepage     https://github.com/ehekatle/ilabel
// @source       https://raw.githubusercontent.com/ehekatle/ilabel/main/ilabel.user.js
// @updateURL    https://gh-proxy.org/https://raw.githubusercontent.com/ehekatle/ilabel/main/ilabel.user.js
// @downloadURL  https://gh-proxy.org/https://raw.githubusercontent.com/ehekatle/ilabel/main/ilabel.user.js
// @match        https://ilabel.weixin.qq.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=weixin.qq.com
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_notification
// @grant        GM_info
// @connect      gh-proxy.org
// @connect      qyapi.weixin.qq.com
// @connect      raw.githubusercontent.com
// @connect      github.com
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const MAIN_SCRIPT_URL = 'https://gh-proxy.org/https://raw.githubusercontent.com/ehekatle/ilabel/main/ilabel.main.js';

    console.log('iLabel辅助工具加载器启动，正在加载核心模块...');
    console.log('油猴脚本信息:', GM_info.script);
    console.log('GM函数可用性检查:', {
        GM_getValue: typeof GM_getValue !== 'undefined',
        GM_setValue: typeof GM_setValue !== 'undefined',
        GM_xmlhttpRequest: typeof GM_xmlhttpRequest !== 'undefined',
        GM_addStyle: typeof GM_addStyle !== 'undefined'
    });

    // 尝试多次加载
    function loadMainScript(retryCount = 0) {
        if (retryCount > 3) {
            console.error('核心模块加载失败，已重试3次');
            return;
        }

        GM_xmlhttpRequest({
            method: 'GET',
            url: MAIN_SCRIPT_URL + '?t=' + Date.now(),
            timeout: 15000,
            onload: function (response) {
                if (response.status === 200) {
                    try {
                        // 执行远程主脚本
                        new Function(response.responseText)();
                        console.log('核心模块加载成功');
                    } catch (e) {
                        console.error('核心模块执行失败:', e);
                        console.error('错误详情:', e.message);
                        console.error('错误堆栈:', e.stack);

                        // 重试
                        setTimeout(() => loadMainScript(retryCount + 1), 2000);
                    }
                } else {
                    console.error('核心模块加载失败，状态码:', response.status);
                    // 重试
                    setTimeout(() => loadMainScript(retryCount + 1), 2000);
                }
            },
            onerror: function (error) {
                console.error('核心模块加载网络错误:', error);
                // 重试
                setTimeout(() => loadMainScript(retryCount + 1), 2000);
            },
            ontimeout: function () {
                console.error('核心模块加载超时');
                // 重试
                setTimeout(() => loadMainScript(retryCount + 1), 2000);
            }
        });
    }

    // 开始加载
    loadMainScript();
})();