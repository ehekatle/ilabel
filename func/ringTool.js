// func/ringTool.js
// 单纯的音乐播放器，负责播放闹钟音乐和停止闹钟音乐

(function (iLabel) {
    'use strict';

    const ALARM_AUDIO_URL = 'https://gh-proxy.org/https://raw.githubusercontent.com/ehekatle/ilabel/main/music.mp3';

    let audio = null;
    let playTimeout = null;
    let isPlaying = false;

    /**
     * 初始化音频
     */
    function initAudio() {
        if (audio) return;

        audio = new Audio();
        audio.loop = true;
        audio.volume = 0.4;
        audio.src = ALARM_AUDIO_URL + '?t=' + Date.now();

        // 预加载
        audio.load();

        audio.addEventListener('canplaythrough', () => {
            console.log('音频预加载完成');
        });

        audio.addEventListener('error', (e) => {
            console.error('音频加载失败:', e);
        });
    }

    /**
     * 播放闹钟
     * @param {number} duration - 播放时长（毫秒），不传则循环播放
     */
    function play(duration) {
        if (!audio) {
            initAudio();
        }

        // 停止当前播放
        stop();

        // 开始播放
        audio.currentTime = 0;
        audio.loop = !duration; // 如果有时长限制，则不循环

        const playPromise = audio.play();
        if (playPromise) {
            playPromise.then(() => {
                isPlaying = true;
                console.log('闹钟开始播放' + (duration ? `，时长:${duration}ms` : ''));

                // 如果设置了时长，到时自动停止
                if (duration) {
                    playTimeout = setTimeout(() => {
                        stop();
                        console.log('闹钟自动停止');
                    }, duration);
                }
            }).catch(error => {
                console.error('闹钟播放失败:', error);
                isPlaying = false;
            });
        }
    }

    /**
     * 停止闹钟
     */
    function stop() {
        if (playTimeout) {
            clearTimeout(playTimeout);
            playTimeout = null;
        }

        if (audio && isPlaying) {
            audio.pause();
            audio.currentTime = 0;
            isPlaying = false;
            console.log('闹钟已停止');
        }
    }

    /**
     * 检查是否正在播放
     */
    function isPlayingNow() {
        return isPlaying;
    }

    // 导出接口
    iLabel.RingTool = {
        play: play,
        stop: stop,
        isPlaying: isPlayingNow
    };

    console.log('ringTool.js 加载完成，音乐播放器已就绪');

})(window.iLabel || (window.iLabel = {}));