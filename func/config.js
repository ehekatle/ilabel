// func/config.js
// 配置工具UI，提供用户配置界面

(function (iLabel) {
    'use strict';

    let configPanel = null;

    /**
     * 创建配置面板
     */
    function createConfigPanel() {
        if (configPanel) {
            configPanel.style.display = 'block';
            return;
        }

        const config = iLabel.Config.get();
        const userConfig = config.userConfig;

        configPanel = document.createElement('div');
        configPanel.className = 'ilabel-config-panel';
        configPanel.innerHTML = `
            <h3 style="margin-top:0; margin-bottom:15px; font-size:16px; border-bottom:1px solid #eee; padding-bottom:8px;">
                iLabel辅助工具配置
            </h3>
            
            <div style="margin-bottom:15px;">
                <label style="display:block; margin-bottom:8px; font-weight:bold;">提示类型（多选）</label>
                <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:8px;">
                    <label style="display:flex; align-items:center; gap:4px;">
                        <input type="checkbox" data-type="targeted" ${userConfig.promptConfig.targeted ? 'checked' : ''}>
                        <span style="display:inline-block; width:12px; height:12px; background:#000; border-radius:2px;"></span>
                        点杀单
                    </label>
                    <label style="display:flex; align-items:center; gap:4px;">
                        <input type="checkbox" data-type="prefilled" ${userConfig.promptConfig.prefilled ? 'checked' : ''}>
                        <span style="display:inline-block; width:12px; height:12px; background:#f44336; border-radius:2px;"></span>
                        预埋单
                    </label>
                    <label style="display:flex; align-items:center; gap:4px;">
                        <input type="checkbox" data-type="exempted" ${userConfig.promptConfig.exempted ? 'checked' : ''}>
                        <span style="display:inline-block; width:12px; height:12px; background:#4caf50; border-radius:2px;"></span>
                        豁免单
                    </label>
                    <label style="display:flex; align-items:center; gap:4px;">
                        <input type="checkbox" data-type="review" ${userConfig.promptConfig.review ? 'checked' : ''}>
                        <span style="display:inline-block; width:12px; height:12px; background:#2196f3; border-radius:2px;"></span>
                        复核单
                    </label>
                    <label style="display:flex; align-items:center; gap:4px;">
                        <input type="checkbox" data-type="penalty" ${userConfig.promptConfig.penalty ? 'checked' : ''}>
                        <span style="display:inline-block; width:12px; height:12px; background:#ff9800; border-radius:2px;"></span>
                        违规单
                    </label>
                    <label style="display:flex; align-items:center; gap:4px;">
                        <input type="checkbox" data-type="note" ${userConfig.promptConfig.note ? 'checked' : ''}>
                        <span style="display:inline-block; width:12px; height:12px; background:#64b5f6; border-radius:2px;"></span>
                        送审备注
                    </label>
                    <label style="display:flex; align-items:center; gap:4px;">
                        <input type="checkbox" data-type="complaint" ${userConfig.promptConfig.complaint ? 'checked' : ''}>
                        <span style="display:inline-block; width:12px; height:12px; background:#9e9e9e; border-radius:2px;"></span>
                        投诉单
                    </label>
                    <label style="display:flex; align-items:center; gap:4px;">
                        <input type="checkbox" data-type="normal" ${userConfig.promptConfig.normal ? 'checked' : ''}>
                        <span style="display:inline-block; width:12px; height:12px; background:#9e9e9e; border-radius:2px;"></span>
                        普通单
                    </label>
                </div>
            </div>
            
            <div style="margin-bottom:15px;">
                <label style="display:block; margin-bottom:5px; font-weight:bold;">提示排列方式</label>
                <select id="ilabel-arrange-select" style="width:100%; padding:5px; border:1px solid #ddd; border-radius:4px;">
                    <option value="horizontal" ${userConfig.popupArrange === 'horizontal' ? 'selected' : ''}>横向排列</option>
                    <option value="vertical" ${userConfig.popupArrange === 'vertical' ? 'selected' : ''}>纵向排列</option>
                </select>
            </div>
            
            <div style="margin-bottom:15px;">
                <label style="display:block; margin-bottom:5px; font-weight:bold;">提示缩放比例 (20-200%)</label>
                <input type="range" id="ilabel-size-slider" min="20" max="200" value="${userConfig.popupSize}" style="width:calc(100% - 50px); vertical-align:middle;">
                <input type="number" id="ilabel-size-input" min="20" max="200" value="${userConfig.popupSize}" style="width:50px; padding:3px; border:1px solid #ddd; border-radius:4px;">
            </div>
            
            <div style="margin-bottom:15px;">
                <label style="display:block; margin-bottom:5px; font-weight:bold;">闹钟状态</label>
                <select id="ilabel-alarm-select" style="width:100%; padding:5px; border:1px solid #ddd; border-radius:4px;">
                    <option value="0" ${userConfig.alarmRingFlag === 0 ? 'selected' : ''}>关闭</option>
                    <option value="1" ${userConfig.alarmRingFlag === 1 ? 'selected' : ''}>开启（测试3秒）</option>
                    <option value="2" ${userConfig.alarmRingFlag === 2 ? 'selected' : ''}>开启并响铃</option>
                </select>
            </div>
            
            <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:20px; border-top:1px solid #eee; padding-top:15px;">
                <button id="ilabel-config-sync" style="padding:6px 15px; background:#2196f3; color:white; border:none; border-radius:4px; cursor:pointer;">同步远程配置</button>
                <button id="ilabel-config-save" style="padding:6px 15px; background:#4caf50; color:white; border:none; border-radius:4px; cursor:pointer;">保存</button>
                <button id="ilabel-config-close" style="padding:6px 15px; background:#9e9e9e; color:white; border:none; border-radius:4px; cursor:pointer;">关闭</button>
            </div>
            
            <div style="margin-top:10px; font-size:12px; color:#999; text-align:center;">
                提示框可拖动到任意位置，位置会自动保存
            </div>
        `;

        document.body.appendChild(configPanel);

        // 滑块和输入框联动
        const sizeSlider = document.getElementById('ilabel-size-slider');
        const sizeInput = document.getElementById('ilabel-size-input');

        sizeSlider.addEventListener('input', function () {
            sizeInput.value = this.value;
        });

        sizeInput.addEventListener('input', function () {
            let val = parseInt(this.value) || 100;
            val = Math.min(200, Math.max(20, val));
            sizeSlider.value = val;
            this.value = val;
        });

        // 保存按钮
        document.getElementById('ilabel-config-save').addEventListener('click', function () {
            // 收集提示类型配置
            const promptConfig = {};
            document.querySelectorAll('[data-type]').forEach(cb => {
                promptConfig[cb.dataset.type] = cb.checked;
            });

            // 收集其他配置
            const updates = {
                promptConfig: promptConfig,
                popupArrange: document.getElementById('ilabel-arrange-select').value,
                popupSize: parseInt(sizeInput.value) || 100,
                alarmRingFlag: parseInt(document.getElementById('ilabel-alarm-select').value) || 0
            };

            iLabel.Config.updateUser(updates);

            // 显示保存成功提示
            const tip = document.createElement('div');
            tip.textContent = '✓ 配置已保存';
            tip.style.cssText = 'position:fixed; top:20px; right:20px; background:#4caf50; color:white; padding:8px 16px; border-radius:4px; z-index:1000001;';
            document.body.appendChild(tip);
            setTimeout(() => tip.remove(), 2000);
        });

        // 同步按钮
        document.getElementById('ilabel-config-sync').addEventListener('click', function () {
            const btn = this;
            btn.disabled = true;
            btn.textContent = '同步中...';

            iLabel.Config.syncGlobal(function (err, newConfig) {
                btn.disabled = false;
                btn.textContent = '同步远程配置';

                if (err) {
                    alert('同步失败: ' + err.message);
                } else {
                    alert('全局配置同步成功');
                    // 刷新面板
                    configPanel.remove();
                    configPanel = null;
                    createConfigPanel();
                }
            });
        });

        // 关闭按钮
        document.getElementById('ilabel-config-close').addEventListener('click', function () {
            configPanel.style.display = 'none';
        });
    }

    // 添加到篡改猴菜单
    if (typeof GM_registerMenuCommand !== 'undefined') {
        GM_registerMenuCommand('⚙️ iLabel配置工具', function () {
            createConfigPanel();
        });
    }

    // 同时提供一个小的悬浮按钮作为备选
    setTimeout(function () {
        if (!document.querySelector('.ilabel-config-float-btn')) {
            const btn = document.createElement('div');
            btn.className = 'ilabel-config-float-btn';
            btn.textContent = '⚙️';
            btn.title = 'iLabel配置';
            btn.style.cssText = 'position:fixed; top:10px; right:10px; width:36px; height:36px; background:#2196f3; color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:999999; font-size:20px; box-shadow:0 2px 10px rgba(0,0,0,0.2);';
            btn.onclick = createConfigPanel;
            document.body.appendChild(btn);
        }
    }, 3000);

    console.log('config.js 加载完成，配置工具已就绪');

})(window.iLabel || (window.iLabel = {}));