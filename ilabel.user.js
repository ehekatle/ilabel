// ==UserScript==
// @name         iLabel直播审核辅助
// @namespace    https://github.com/ehekatle/ilabel
// @version      3.0.0
// @description  直播审核辅助工具（远程加载版）
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
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @connect      gh-proxy.org
// @connect      qyapi.weixin.qq.com
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const MAIN_SCRIPT_URL = 'https://gh-proxy.org/https://raw.githubusercontent.com/ehekatle/ilabel/main/ilabel.main.js';

    console.log('iLabel辅助工具: 正在加载主脚本...');

    GM_xmlhttpRequest({
        method: 'GET',
        url: MAIN_SCRIPT_URL + '?t=' + Date.now(),
        onload: function (response) {
            if (response.status === 200) {
                try {
                    // 执行远程主脚本
                    new Function(response.responseText)();
                    console.log('iLabel辅助工具: 主脚本加载成功');
                } catch (e) {
                    console.error('iLabel辅助工具: 主脚本执行失败', e);
                }
            } else {
                console.error('iLabel辅助工具: 主脚本加载失败，状态码:', response.status);
            }
        },
        onerror: function (error) {
            console.error('iLabel辅助工具: 主脚本加载网络错误', error);
        }
    });
})();