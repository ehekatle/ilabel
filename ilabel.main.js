// ==MainEntry==
// iLabel辅助工具主入口 - 版本 3.0.4
// ==/MainEntry==

(function () {
    'use strict';

    console.log('iLabel辅助工具主模块启动');

    // 注意：在new Function中无法直接访问GM_*函数
    // 所以我们需要通过闭包来捕获这些函数
    // 这里尝试从上层作用域获取GM函数
    let gmFunctions = {
        getValue: null,
        setValue: null,
        xmlhttpRequest: null,
        addStyle: null
    };

    try {
        // 尝试从上层作用域获取GM函数
        // 在油猴脚本中，这些函数应该在全局作用域可用
        gmFunctions = {
            getValue: typeof GM_getValue !== 'undefined' ? GM_getValue : (typeof window.GM_getValue !== 'undefined' ? window.GM_getValue : null),
            setValue: typeof GM_setValue !== 'undefined' ? GM_setValue : (typeof window.GM_setValue !== 'undefined' ? window.GM_setValue : null),
            xmlhttpRequest: typeof GM_xmlhttpRequest !== 'undefined' ? GM_xmlhttpRequest : (typeof window.GM_xmlhttpRequest !== 'undefined' ? window.GM_xmlhttpRequest : null),
            addStyle: typeof GM_addStyle !== 'undefined' ? GM_addStyle : (typeof window.GM_addStyle !== 'undefined' ? window.GM_addStyle : null)
        };
    } catch (e) {
        console.error('获取GM函数时出错:', e);
    }

    // 检查GM API是否可用，但即使不可用也继续执行（有些模块可能不需要）
    const gmAvailable = !!(gmFunctions.getValue && gmFunctions.setValue && gmFunctions.xmlhttpRequest && gmFunctions.addStyle);

    if (!gmAvailable) {
        console.warn('部分GM_* 函数不可用，某些功能可能受限');
        console.warn('可用的GM函数:', {
            getValue: !!gmFunctions.getValue,
            setValue: !!gmFunctions.setValue,
            xmlhttpRequest: !!gmFunctions.xmlhttpRequest,
            addStyle: !!gmFunctions.addStyle
        });
    }

    // 存储模块导出和GM API
    window.iLabel = window.iLabel || {};
    window.iLabel.gm = gmFunctions;  // 提供GM API给远程模块

    console.log('GM API已传递给远程模块', gmAvailable ? '(完整)' : '(部分)');

    // 模块加载顺序
    const MODULES = [
        { name: 'liveinfo', url: 'func/liveinfo.js' },       // 数据结构定义
        { name: 'configinfo', url: 'func/configinfo.js' },   // 配置文件
        { name: 'config', url: 'func/config.js' },           // 配置工具
        { name: 'ringTool', url: 'func/ringTool.js' },       // 音乐播放器
        { name: 'alarmRing', url: 'func/alarmRing.js' },     // 闹钟按钮
        { name: 'getinfo', url: 'func/getinfo.js' },         // 信息获取
        { name: 'checkinfo', url: 'func/checkinfo.js' },     // 类型判断
        { name: 'push', url: 'func/push.js' },               // 推送参数拼接
        { name: 'pushTool', url: 'func/pushTool.js' },       // 推送执行
        { name: 'Prompt', url: 'func/Prompt.js' }            // 浮动提示
    ];

    // 加载样式（在主模块中执行，确保GM_addStyle可用）
    function loadStyles() {
        try {
            if (gmFunctions.addStyle) {
                const styles = `
                    .ilabel-draggable {
                        cursor: move;
                        user-select: none;
                        position: fixed !important;
                        z-index: 999999 !important;
                    }
                    
                    .ilabel-prompt-container {
                        display: flex;
                        gap: 8px;
                        padding: 10px;
                        background: transparent;
                        border-radius: 8px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                        transition: box-shadow 0.2s;
                    }
                    
                    .ilabel-prompt-container:hover {
                        box-shadow: 0 6px 16px rgba(0,0,0,0.2);
                    }
                    
                    .ilabel-prompt-item {
                        padding: 6px 12px;
                        border-radius: 20px;
                        font-size: 14px;
                        font-weight: bold;
                        color: white;
                        text-shadow: 0 1px 2px rgba(0,0,0,0.2);
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        white-space: nowrap;
                    }
                    
                    .ilabel-prompt-container.vertical {
                        flex-direction: column;
                    }
                    
                    .ilabel-prompt-container.horizontal {
                        flex-direction: row;
                    }
                    
                    .ilabel-alarm-button {
                        position: fixed;
                        bottom: 20px;
                        left: 20px;
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        background: white;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        z-index: 999998;
                        transition: all 0.3s;
                        border: 2px solid #ccc;
                    }
                    
                    .ilabel-alarm-button.state0 {
                        background: white;
                        border-color: #ccc;
                    }
                    
                    .ilabel-alarm-button.state0 svg {
                        color: #666;
                    }
                    
                    .ilabel-alarm-button.state1 {
                        background: #4caf50;
                        border-color: #4caf50;
                    }
                    
                    .ilabel-alarm-button.state1 svg {
                        color: white;
                    }
                    
                    .ilabel-alarm-button.state2 {
                        background: #f44336;
                        border-color: #f44336;
                    }
                    
                    .ilabel-alarm-button.state2 svg {
                        color: white;
                    }
                    
                    .ilabel-alarm-button svg {
                        width: 24px;
                        height: 24px;
                    }
                    
                    .ilabel-config-panel {
                        position: fixed;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        background: white;
                        border-radius: 8px;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                        padding: 20px;
                        z-index: 1000000;
                        min-width: 300px;
                        max-width: 400px;
                    }
                `;

                gmFunctions.addStyle(styles);
                console.log('样式加载成功');
            } else {
                console.warn('GM_addStyle不可用，无法添加样式');
                // 尝试使用普通的style标签
                const style = document.createElement('style');
                style.textContent = `
                    .ilabel-draggable { cursor: move; user-select: none; position: fixed !important; z-index: 999999 !important; }
                    .ilabel-prompt-container { display: flex; gap: 8px; padding: 10px; background: transparent; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: box-shadow 0.2s; }
                    .ilabel-prompt-container:hover { box-shadow: 0 6px 16px rgba(0,0,0,0.2); }
                    .ilabel-prompt-item { padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: bold; color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.2); box-shadow: 0 2px 4px rgba(0,0,0,0.1); white-space: nowrap; }
                    .ilabel-prompt-container.vertical { flex-direction: column; }
                    .ilabel-prompt-container.horizontal { flex-direction: row; }
                    .ilabel-alarm-button { position: fixed; bottom: 20px; left: 20px; width: 40px; height: 40px; border-radius: 50%; background: white; box-shadow: 0 2px 10px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 999998; transition: all 0.3s; border: 2px solid #ccc; }
                    .ilabel-alarm-button.state0 { background: white; border-color: #ccc; }
                    .ilabel-alarm-button.state0 svg { color: #666; }
                    .ilabel-alarm-button.state1 { background: #4caf50; border-color: #4caf50; }
                    .ilabel-alarm-button.state1 svg { color: white; }
                    .ilabel-alarm-button.state2 { background: #f44336; border-color: #f44336; }
                    .ilabel-alarm-button.state2 svg { color: white; }
                    .ilabel-alarm-button svg { width: 24px; height: 24px; }
                    .ilabel-config-panel { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); padding: 20px; z-index: 1000000; min-width: 300px; max-width: 400px; }
                `;
                document.head.appendChild(style);
                console.log('使用普通style标签添加样式');
            }
        } catch (e) {
            console.error('样式加载失败:', e);
        }
    }

    // 加载所有模块
    function loadModules(index) {
        if (index >= MODULES.length) {
            console.log('所有模块加载完成，初始化完成');

            // 触发所有模块加载完成事件
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('ilabel:allModulesLoaded'));
            }, 100);

            return;
        }

        const module = MODULES[index];
        const moduleUrl = `https://gh-proxy.org/https://raw.githubusercontent.com/ehekatle/ilabel/main/${module.url}`;

        console.log(`正在加载模块: ${module.name} (${index + 1}/${MODULES.length})`);

        // 使用GM_xmlhttpRequest或普通的fetch
        const requestFn = gmFunctions.xmlhttpRequest || function (options) {
            // 降级使用fetch
            fetch(options.url, {
                method: options.method || 'GET',
                headers: options.headers || {}
            })
                .then(response => {
                    if (response.ok) {
                        return response.text();
                    }
                    throw new Error('HTTP ' + response.status);
                })
                .then(text => {
                    if (options.onload) {
                        options.onload({ status: 200, responseText: text });
                    }
                })
                .catch(error => {
                    if (options.onerror) {
                        options.onerror(error);
                    }
                });
        };

        requestFn({
            method: 'GET',
            url: moduleUrl + '?t=' + Date.now(),
            timeout: 10000,
            headers: {
                'Cache-Control': 'no-cache'
            },
            onload: function (response) {
                if (response.status === 200) {
                    try {
                        // 执行模块代码，传入iLabel对象
                        new Function('iLabel', response.responseText)(window.iLabel);
                        console.log(`✓ 模块加载成功: ${module.name}`);

                        // 加载下一个模块
                        setTimeout(() => loadModules(index + 1), 50);
                    } catch (e) {
                        console.error(`✗ 模块执行失败 ${module.name}:`, e);
                        console.error('错误详情:', e.message);
                        // 继续加载下一个
                        setTimeout(() => loadModules(index + 1), 50);
                    }
                } else {
                    console.error(`✗ 模块加载失败 ${module.name}，状态码:`, response.status);
                    setTimeout(() => loadModules(index + 1), 50);
                }
            },
            onerror: function (error) {
                console.error(`✗ 模块加载网络错误 ${module.name}:`, error);
                setTimeout(() => loadModules(index + 1), 50);
            },
            ontimeout: function () {
                console.error(`✗ 模块加载超时 ${module.name}`);
                setTimeout(() => loadModules(index + 1), 50);
            }
        });
    }

    // 先加载样式，再加载模块
    try {
        loadStyles();
        loadModules(0);
    } catch (e) {
        console.error('初始化失败:', e);
    }
})();