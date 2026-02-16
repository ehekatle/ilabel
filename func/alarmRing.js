// func/alarmRing.js
// 闹钟按钮UI及状态管理

(function (iLabel) {
    'use strict';

    let alarmButton = null;
    let currentState = 0; // 0:关闭, 1:测试, 2:开启

    /**
     * 创建闹钟按钮
     */
    function createAlarmButton() {
        if (alarmButton) return;

        const config = iLabel.Config.get();
        currentState = config.userConfig.alarmRingFlag;

        alarmButton = document.createElement('div');
        alarmButton.className = `ilabel-alarm-button state${currentState}`;
        alarmButton.innerHTML = `
            <svg viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9v2c0 .98.39 1.92 1.07 2.64L7.5 15.07C8.33 15.9 9.53 16.5 11 16.8V18c0 .55.45 1 1 1s1-.45 1-1v-1.2c1.47-.3 2.67-.9 3.5-1.73l1.43-1.43c.68-.72 1.07-1.66 1.07-2.64V9c0-3.87-3.13-7-7-7z"/>
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2z"/>
            </svg>
        `;

        alarmButton.addEventListener('click', handleClick);
        document.body.appendChild(alarmButton);

        console.log('闹钟按钮已创建，初始状态:', currentState);
    }

    /**
     * 处理点击事件
     */
    function handleClick() {
        let newState;

        switch (currentState) {
            case 0: // 关闭 -> 测试
                newState = 1;
                playTestRing();
                break;
            case 1: // 测试 -> 开启
                newState = 2;
                break;
            case 2: // 开启 -> 关闭
                newState = 0;
                stopAllRings();
                break;
        }

        setState(newState);
    }

    /**
     * 设置状态
     */
    function setState(state) {
        currentState = state;
        alarmButton.className = `ilabel-alarm-button state${state}`;

        // 更新配置
        iLabel.Config.updateUser({ alarmRingFlag: state });

        // 触发状态变更事件
        window.dispatchEvent(new CustomEvent('ilabel:alarmStateChanged', {
            detail: state
        }));

        console.log('闹钟状态变更为:', state);
    }

    /**
     * 播放测试铃声（3秒）
     */
    function playTestRing() {
        if (iLabel.RingTool) {
            iLabel.RingTool.play(3000); // 播放3秒
        }
    }

    /**
     * 停止所有铃声
     */
    function stopAllRings() {
        if (iLabel.RingTool) {
            iLabel.RingTool.stop();
        }
    }

    /**
     * 根据结果自动切换状态
     */
    function onResultUpdated() {
        const data = iLabel.currentData;
        if (!data) return;

        const hasTypes = data.result.hasAny() && !data.result.normalFlag;

        // 如果当前是关闭状态(0)，且有需要处理的单子，切换到状态2
        if (currentState === 0 && hasTypes) {
            setState(2);
        }

        // 如果当前是开启状态(2)，且没有需要处理的单子，可以保持状态
    }

    /**
     * 初始化
     */
    function init() {
        createAlarmButton();

        window.addEventListener('ilabel:resultUpdated', onResultUpdated);

        console.log('alarmRing.js 加载完成，闹钟按钮已就绪');
    }

    // 等待所有模块加载完成后初始化
    window.addEventListener('ilabel:allModulesLoaded', init);

})(window.iLabel || (window.iLabel = {}));