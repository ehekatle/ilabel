// func/pushTool.js
// 负责根据liveinfo.json的push中对应参数进行推送

(function (iLabel) {
    'use strict';

    const gm = iLabel.gm;
    let reminderInterval = null;
    let lastReminderTime = 0;

    /**
     * 发送企业微信消息
     */
    function sendWeChatMessage(pushData) {
        if (!pushData || !pushData.url) {
            console.error('推送地址未配置');
            return;
        }

        const data = {
            msgtype: "text",
            text: {
                content: pushData.content
            }
        };

        if (pushData.mentionedMobileList && pushData.mentionedMobileList.length > 0) {
            data.text.mentioned_mobile_list = pushData.mentionedMobileList;
        }

        console.log('发送企业微信推送:', data);

        gm.xmlhttpRequest({
            method: 'POST',
            url: pushData.url,
            headers: {
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(data),
            timeout: 5000,
            onload: function (response) {
                if (response.status === 200) {
                    console.log('推送成功');
                } else {
                    console.error('推送失败:', response.status, response.responseText);
                }
            },
            onerror: function (error) {
                console.error('推送错误:', error);
            }
        });
    }

    /**
     * 处理提醒推送（带重试机制）
     */
    function handleReminderPush(reminderData) {
        if (reminderInterval) {
            clearInterval(reminderInterval);
            reminderInterval = null;
        }

        sendWeChatMessage(reminderData);
        lastReminderTime = Date.now();

        reminderInterval = setInterval(() => {
            const promptExists = !!document.getElementById('ilabel-prompt');

            if (promptExists) {
                sendWeChatMessage(reminderData);
                lastReminderTime = Date.now();
            } else {
                clearInterval(reminderInterval);
                reminderInterval = null;
            }
        }, 20000);
    }

    /**
     * 处理结果推送
     */
    function handleAnswerPush(answerData) {
        sendWeChatMessage(answerData);
    }

    /**
     * 初始化监听
     */
    function init() {
        window.addEventListener('ilabel:reminderReady', function (e) {
            const alarmState = iLabel.Config.get().userConfig.alarmRingFlag;

            if (alarmState === 2) {
                handleReminderPush(e.detail);
            } else {
                console.log('闹钟未开启，不推送提醒');
            }
        });

        window.addEventListener('ilabel:answerSubmitted', function (e) {
            handleAnswerPush(e.detail);
        });

        window.addEventListener('ilabel:alarmStateChanged', function (e) {
            if (e.detail !== 2 && reminderInterval) {
                clearInterval(reminderInterval);
                reminderInterval = null;
                console.log('闹钟关闭，停止推送');
            }
        });

        console.log('pushTool.js 加载完成，推送执行器已就绪');
    }

    window.addEventListener('ilabel:allModulesLoaded', init);

})(window.iLabel || (window.iLabel = {}));