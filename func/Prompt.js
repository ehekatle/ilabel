// 提示显示模块
(function (context) {
    'use strict';

    const { state, utils } = context;

    // 类型名称映射
    const TYPE_NAMES = {
        targeted: '点杀',
        prefilled: '预埋',
        exempted: '豁免',
        review: '复核',
        penalty: '违规',
        note: '备注',
        complaint: '投诉',
        normal: '普通'
    };

    let promptContainer = null;
    let currentLiveData = null;
    let currentTypes = [];
    let pushInterval = null;
    let lastPushTime = 0;
    let isConfirmed = false;
    let dragOffset = { x: 0, y: 0 };
    let isDragging = false;

    // 显示提示
    function showPrompt(liveData, types) {
        currentLiveData = liveData;
        currentTypes = types;
        isConfirmed = false;

        // 关闭已有提示
        closePrompt();

        // 创建提示
        createPrompt();

        // 启动推送定时器
        startPushTimer();
    }

    // 关闭提示
    function closePrompt() {
        if (promptContainer) {
            promptContainer.remove();
            promptContainer = null;
        }

        if (pushInterval) {
            clearInterval(pushInterval);
            pushInterval = null;
        }

        stopAlarm();
    }

    // 创建提示
    function createPrompt() {
        promptContainer = document.createElement('div');
        promptContainer.id = 'ilabel-prompt-container';
        promptContainer.style.cssText = `
            position: fixed;
            left: ${state.userConfig.promptPosition.x}px;
            top: ${state.userConfig.promptPosition.y}px;
            z-index: 1000000;
            transform: scale(${state.userConfig.promptSize / 100});
            transform-origin: left top;
            cursor: move;
            user-select: none;
        `;

        // 包装器
        const wrapper = document.createElement('div');
        wrapper.className = `prompt-wrapper ${state.userConfig.promptArrange}`;
        wrapper.style.cssText = `
            display: flex;
            gap: 8px;
            ${state.userConfig.promptArrange === 'vertical' ? 'flex-direction: column;' : ''}
            background: transparent;
            padding: 5px;
            border-radius: 4px;
        `;

        // 添加类型标签
        currentTypes.forEach(type => {
            const tag = createTypeTag(type);
            wrapper.appendChild(tag);
        });

        // 添加确认按钮
        const confirmBtn = createConfirmButton();
        wrapper.appendChild(confirmBtn);

        promptContainer.appendChild(wrapper);
        document.body.appendChild(promptContainer);

        // 添加拖动功能
        makeDraggable(promptContainer);
    }

    // 创建类型标签
    function createTypeTag(type) {
        const tag = document.createElement('div');
        tag.className = 'prompt-tag';

        const color = getTypeColor(type);
        const textColor = getContrastColor(color);

        tag.style.cssText = `
            padding: 6px 12px;
            border-radius: 4px;
            background-color: ${color};
            color: ${textColor};
            font-size: 12px;
            font-weight: bold;
            white-space: nowrap;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;

        tag.textContent = TYPE_NAMES[type] || type;

        return tag;
    }

    // 创建确认按钮
    function createConfirmButton() {
        const btn = document.createElement('div');
        btn.className = 'prompt-confirm-btn';
        btn.style.cssText = `
            padding: 6px 12px;
            border-radius: 4px;
            background-color: white;
            color: #333;
            font-size: 12px;
            font-weight: bold;
            white-space: nowrap;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            cursor: pointer;
            border: 1px solid #ddd;
            transition: all 0.2s;
        `;
        btn.textContent = '确认';

        btn.addEventListener('click', () => {
            confirmPrompt();
        });

        btn.addEventListener('mouseenter', () => {
            btn.style.backgroundColor = '#f5f5f5';
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.backgroundColor = isConfirmed ? '#f0f0f0' : 'white';
        });

        return btn;
    }

    // 确认提示
    function confirmPrompt() {
        isConfirmed = true;

        const confirmBtn = document.querySelector('.prompt-confirm-btn');
        if (confirmBtn) {
            confirmBtn.style.backgroundColor = '#f0f0f0';
        }

        // 停止推送
        if (pushInterval) {
            clearInterval(pushInterval);
            pushInterval = null;
        }

        // 停止闹钟
        stopAlarm();

        console.log('提示已确认');
    }

    // 启动推送定时器
    function startPushTimer() {
        if (!state.globalConfig?.pushUrl?.reminderPushUrl) return;
        if (!state.userConfig.alarmRing) return;

        lastPushTime = Date.now();

        pushInterval = setInterval(() => {
            if (isConfirmed || !currentLiveData) return;

            const now = Date.now();
            if (now - lastPushTime >= 20000) {
                sendReminderPush();
                lastPushTime = now;

                // 播放闹钟
                if (state.userConfig.alarmRing) {
                    playAlarm();
                }
            }
        }, 1000);
    }

    // 发送提醒推送
    function sendReminderPush() {
        const pushUrl = state.globalConfig?.pushUrl?.reminderPushUrl;
        if (!pushUrl) return;

        const timeStr = formatTime24();
        const typeNames = currentTypes.map(t => TYPE_NAMES[t]).join('、');
        const content = `${timeStr} ${typeNames}单未确认`;

        // 获取需要@的审核人员
        const auditorName = currentLiveData?.auditor;
        let mentionedMobile = null;

        if (auditorName && state.globalConfig?.auditorWhiteList) {
            const auditor = state.globalConfig.auditorWhiteList.find(a => a.name === auditorName);
            if (auditor) {
                mentionedMobile = auditor.mobile;
            }
        }

        const data = {
            msgtype: "text",
            text: {
                content: content
            }
        };

        if (mentionedMobile) {
            data.text.mentioned_mobile_list = [mentionedMobile];
            console.log(`将@审核人员: ${auditorName}`);
        }

        console.log('发送提醒推送:', data);

        GM_xmlhttpRequest({
            method: 'POST',
            url: pushUrl,
            headers: {
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(data),
            timeout: 5000,
            onload: function (response) {
                if (response.status === 200) {
                    console.log('提醒推送成功');
                } else {
                    console.error('提醒推送失败:', response.status);
                }
            },
            onerror: function (error) {
                console.error('提醒推送错误:', error);
            }
        });
    }

    // 播放闹钟
    function playAlarm() {
        try {
            if (!state.audioContext) {
                state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            if (state.audioContext.state === 'suspended') {
                state.audioContext.resume();
            }

            // 创建振荡器
            const oscillator = state.audioContext.createOscillator();
            const gainNode = state.audioContext.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.value = 880;
            gainNode.gain.value = 0.1;

            oscillator.connect(gainNode);
            gainNode.connect(state.audioContext.destination);

            oscillator.start();
            oscillator.stop(state.audioContext.currentTime + 1);

            console.log('闹钟提醒');

        } catch (error) {
            console.error('播放闹钟失败', error);
        }
    }

    // 停止闹钟
    function stopAlarm() {
        // Web Audio API 无法直接停止所有声音
        // 这里通过重新创建AudioContext来停止
        if (state.audioContext) {
            state.audioContext.close();
            state.audioContext = null;
        }
    }

    // 获取类型颜色
    function getTypeColor(type) {
        const colors = state.globalConfig?.popupColor || {};

        switch (type) {
            case 'targeted': return colors.targetedColor || '#000000';
            case 'prefilled': return colors.prefilledColor || '#f44336';
            case 'exempted': return colors.exemptedColor || '#4caf50';
            case 'review': return colors.reviewColor || '#2196f3';
            case 'note': return colors.noteColor || '#90caf9';
            case 'penalty': return colors.penaltyColor || '#ff9800';
            case 'complaint': return colors.complaintColor || '#9e9e9e';
            case 'normal': return colors.normalColor || '#9e9e9e';
            default: return '#9e9e9e';
        }
    }

    // 获取对比色（黑或白）
    function getContrastColor(hexcolor) {
        // 将十六进制转换为RGB
        let r, g, b;

        if (hexcolor.startsWith('#')) {
            const hex = hexcolor.substring(1);
            if (hex.length === 3) {
                r = parseInt(hex[0] + hex[0], 16);
                g = parseInt(hex[1] + hex[1], 16);
                b = parseInt(hex[2] + hex[2], 16);
            } else {
                r = parseInt(hex.substring(0, 2), 16);
                g = parseInt(hex.substring(2, 4), 16);
                b = parseInt(hex.substring(4, 6), 16);
            }
        } else {
            return '#ffffff';
        }

        // 计算亮度
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        return luminance > 0.5 ? '#000000' : '#ffffff';
    }

    // 使元素可拖动
    function makeDraggable(element) {
        element.addEventListener('mousedown', startDrag);

        function startDrag(e) {
            if (e.target.classList.contains('prompt-confirm-btn')) return;

            isDragging = true;

            const rect = element.getBoundingClientRect();
            dragOffset.x = e.clientX - rect.left;
            dragOffset.y = e.clientY - rect.top;

            element.style.cursor = 'grabbing';

            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', stopDrag);

            e.preventDefault();
        }

        function drag(e) {
            if (!isDragging) return;

            const x = e.clientX - dragOffset.x;
            const y = e.clientY - dragOffset.y;

            element.style.left = x + 'px';
            element.style.top = y + 'px';

            // 保存位置
            state.userConfig.promptPosition = { x, y };
        }

        function stopDrag() {
            if (!isDragging) return;

            isDragging = false;
            element.style.cursor = 'move';

            document.removeEventListener('mousemove', drag);
            document.removeEventListener('mouseup', stopDrag);

            // 保存配置
            utils.saveUserConfig();
        }
    }

    // 格式化时间
    function formatTime24() {
        const now = new Date();
        return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    }

    // 注册到context
    context.state.promptInstance = {
        show: showPrompt,
        close: closePrompt
    };

})(typeof context !== 'undefined' ? context : window.__moduleContext);