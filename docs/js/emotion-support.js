/**
 * Emotion Support Module
 * リアルタイム感情検出による応援機能（高頻度版）
 */

class EmotionSupportManager {
    constructor() {
        this.isActive = false;
        this.emotionAnalyzer = null;
        this.messageRenderer = null;
        this.displayState = null;
        this.sessionActive = false;
        this.lastProcessTime = 0;
        this.processInterval = 200; // 200msごとに処理（高頻度化）
        this.burstMode = false; // バーストモード
        this.burstCounter = 0;
    }

    /**
     * 感情サポート機能を初期化
     */
    initialize() {
        try {
            this.emotionAnalyzer = new EmotionAnalyzer();
            this.messageRenderer = new MessageRenderer();
            this.displayState = new DisplayState();
            this.isActive = true;
            this.sessionActive = true;
            console.log('✅ 感情サポート機能が初期化されました（高頻度モード）');
            return true;
        } catch (error) {
            console.warn('感情サポート機能の初期化に失敗しました:', error);
            this.isActive = false;
            return false;
        }
    }

    /**
     * 感情分析を実行し、必要に応じてサポートメッセージを表示
     */
    processEmotion(faceDetection) {
        if (!this.isActive || !this.sessionActive || !faceDetection) return;
        
        // 高頻度処理
        const now = Date.now();
        if (now - this.lastProcessTime < this.processInterval) return;
        this.lastProcessTime = now;
        
        try {
            const emotionState = this.emotionAnalyzer.analyze(faceDetection);
            
            if (emotionState.needsSupport) {
                console.log(`🎭 感情検出: ${emotionState.emotion} (信頼度: ${(emotionState.confidence * 100).toFixed(1)}%, 強度: ${emotionState.intensity})`);
                
                // バーストモード判定
                if (emotionState.intensity === 'high' || emotionState.confidence > 0.9) {
                    this.activateBurstMode();
                }
                
                if (this.displayState.canShowMessage(emotionState.emotion)) {
                    this.messageRenderer.showSupportMessage(emotionState);
                    this.displayState.recordMessage(emotionState.emotion);
                    
                    // バーストモード中は追加メッセージ
                    if (this.burstMode) {
                        this.showBurstMessages(emotionState);
                    }
                    
                    console.log(`💬 応援メッセージを表示しました`);
                }
                
                // ランダム追加メッセージ（30%の確率）
                if (Math.random() < 0.3) {
                    setTimeout(() => {
                        this.messageRenderer.showRandomSupportMessage();
                    }, Math.random() * 1000 + 500);
                }
            }
        } catch (error) {
            console.error('感情処理エラー:', error);
        }
    }
    
    /**
     * バーストモードを有効化
     */
    activateBurstMode() {
        this.burstMode = true;
        this.burstCounter = 0;
        
        // 3秒後にバーストモード終了
        setTimeout(() => {
            this.burstMode = false;
            this.burstCounter = 0;
        }, 3000);
    }
    
    /**
     * バーストモード中の追加メッセージ
     */
    showBurstMessages(emotionState) {
        if (this.burstCounter >= 5) return; // 最大5個まで
        
        const delays = [300, 600, 900, 1200, 1500];
        const delay = delays[this.burstCounter] || 1500;
        
        setTimeout(() => {
            this.messageRenderer.showSupportMessage(emotionState);
            this.burstCounter++;
        }, delay);
    }

    /**
     * 感情サポート機能を停止
     */
    stop() {
        this.isActive = false;
        this.sessionActive = false;
        this.burstMode = false;
        
        // メモリクリーンアップ
        if (this.messageRenderer) {
            this.messageRenderer.cleanup();
        }
        if (this.displayState) {
            this.displayState.cleanup();
        }
        
        this.lastProcessTime = 0;
    }

    /**
     * セッションをリセット（状態は保持）
     */
    reset() {
        if (this.messageRenderer) {
            this.messageRenderer.cleanup();
        }
        if (this.displayState) {
            this.displayState.cleanup();
        }
        this.sessionActive = true;
        this.lastProcessTime = 0;
        this.burstMode = false;
        this.burstCounter = 0;
    }
}

class EmotionAnalyzer {
    constructor() {
        this.confidenceThreshold = 0.5; // 閾値を下げて頻度アップ
        this.negativeEmotions = ['sad', 'angry', 'fearful', 'disgusted'];
        this.positiveEmotions = ['happy'];
        this.neutralEmotions = ['neutral']; // ニュートラルも追加
        this.emotionPriority = { happy: 5, sad: 4, angry: 3, fearful: 2, disgusted: 1, neutral: 0 };
    }

    analyze(faceDetection) {
        if (!faceDetection || !faceDetection.expressions) {
            return new EmotionState();
        }

        const expressions = faceDetection.expressions;
        const prioritizedEmotion = this.getPrioritizedEmotion(expressions);
        const confidence = expressions[prioritizedEmotion];
        
        const needsSupport = this.shouldShowSupport(prioritizedEmotion, confidence);

        return new EmotionState(prioritizedEmotion, confidence, needsSupport);
    }

    getPrioritizedEmotion(expressions) {
        // すべての感情を対象に
        const allEmotions = [...this.positiveEmotions, ...this.negativeEmotions, ...this.neutralEmotions];
        const emotionsAboveThreshold = allEmotions
            .filter(emotion => expressions[emotion] >= this.confidenceThreshold)
            .sort((a, b) => this.emotionPriority[b] - this.emotionPriority[a]);
        
        if (emotionsAboveThreshold.length > 0) {
            return emotionsAboveThreshold[0];
        }
        
        // 閾値以上の感情がない場合は通常の最大値
        return this.getDominantEmotion(expressions);
    }

    shouldShowSupport(emotion, confidence) {
        // すべての感情に対してサポートメッセージを表示（頻度アップ）
        return confidence >= this.confidenceThreshold;
    }

    isNegativeEmotion(emotion) {
        return this.negativeEmotions.includes(emotion);
    }

    isPositiveEmotion(emotion) {
        return this.positiveEmotions.includes(emotion);
    }

    getDominantEmotion(expressions) {
        return Object.entries(expressions)
            .reduce((a, b) => a[1] > b[1] ? a : b)[0];
    }
}

class MessageRenderer {
    constructor() {
        this.container = document.getElementById('supportContainer');
        this.messageCounter = 0;
        this.maxConcurrentMessages = 8;
        this.activeMessages = new Set();
    }

    playVoice(message) {
        const voiceFile = SupportMessageConfig.getVoiceFile(message);
        if (!voiceFile) return;
        
        const audio = new Audio(voiceFile);
        audio.volume = 0.7;
        audio.play().catch(e => console.warn('音声再生エラー:', e));
    }

    showSupportMessage(emotionState) {
        if (!this.container || !emotionState.needsSupport) return;
        
        if (this.activeMessages.size >= this.maxConcurrentMessages) {
            this.removeOldestMessage();
        }

        const messageText = SupportMessageConfig.getRandomMessage(
            emotionState.emotion, 
            emotionState.intensity
        );
        
        if (!messageText) return;

        const animationType = this.selectAnimationType(emotionState.emotion, emotionState.intensity);
        const supportMessage = new SupportMessage(
            messageText, 
            emotionState.emotion, 
            emotionState.intensity,
            animationType
        );

        this.playVoice(messageText);
        this.renderMessage(supportMessage);
    }
    
    showRandomSupportMessage() {
        if (!this.container) return;
        
        const messageText = SupportMessageConfig.getRandomSupportMessage();
        if (!messageText) return;
        
        const supportMessage = new SupportMessage(
            messageText, 
            'random', 
            'medium',
            'slide'
        );
        
        this.playVoice(messageText);
        this.renderMessage(supportMessage);
    }

    selectAnimationType(emotion, intensity) {
        const animations = ['bounce', 'slide', 'fade', 'zoom'];
        
        // 強度に基づくアニメーション選択
        if (intensity === 'high') {
            return emotion === 'angry' ? 'slide' : animations[Math.floor(Math.random() * animations.length)];
        }
        if (intensity === 'low') {
            return 'slide';
        }
        return animations[Math.floor(Math.random() * 2)]; // bounceかslide
    }

    renderMessage(supportMessage) {
        const messageId = `support-msg-${++this.messageCounter}`;
        const messageEl = document.createElement('div');
        
        messageEl.id = messageId;
        messageEl.className = `support-message ${supportMessage.animationType}`;
        messageEl.setAttribute('data-intensity', supportMessage.intensity);
        messageEl.textContent = supportMessage.text;
        messageEl.style.left = `${supportMessage.position.x}%`;
        messageEl.style.top = `${supportMessage.position.y}%`;
        
        // ランダムな色とサイズ
        messageEl.style.color = this.getRandomColor(supportMessage.emotion);
        messageEl.style.fontSize = this.getRandomSize(supportMessage.intensity);
        
        this.container.appendChild(messageEl);
        this.activeMessages.add(messageId);
        
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.classList.add('fade-out');
                setTimeout(() => {
                    messageEl.remove();
                    this.activeMessages.delete(messageId);
                }, 300);
            }
        }, supportMessage.displayDuration);
    }
    
    getRandomColor(emotion) {
        const colors = {
            happy: ['#FFD700', '#FF69B4', '#00FF7F', '#FF6347', '#87CEEB'],
            sad: ['#87CEEB', '#DDA0DD', '#F0E68C', '#98FB98', '#FFB6C1'],
            angry: ['#FF6347', '#FFA500', '#FFD700', '#FF69B4', '#87CEEB'],
            fearful: ['#98FB98', '#87CEEB', '#DDA0DD', '#F0E68C', '#FFB6C1'],
            disgusted: ['#98FB98', '#87CEEB', '#F0E68C', '#DDA0DD', '#FFB6C1'],
            neutral: ['#FFD700', '#87CEEB', '#98FB98', '#DDA0DD', '#F0E68C'],
            random: ['#FFD700', '#FF69B4', '#00FF7F', '#FF6347', '#87CEEB', '#DDA0DD']
        };
        
        const emotionColors = colors[emotion] || colors.random;
        return emotionColors[Math.floor(Math.random() * emotionColors.length)];
    }
    
    getRandomSize(intensity) {
        const sizes = {
            low: ['0.6em', '0.7em', '0.8em'],      // さらに小さく調整
            medium: ['0.7em', '0.8em', '0.9em'],   // さらに小さく調整
            high: ['0.8em', '0.9em', '1.0em']      // さらに小さく調整
        };
        
        const intensitySizes = sizes[intensity] || sizes.medium;
        return intensitySizes[Math.floor(Math.random() * intensitySizes.length)];
    }
    
    removeOldestMessage() {
        const oldestId = this.activeMessages.values().next().value;
        if (oldestId) {
            const oldestEl = document.getElementById(oldestId);
            if (oldestEl) {
                oldestEl.remove();
                this.activeMessages.delete(oldestId);
            }
        }
    }

    cleanup() {
        if (this.container) {
            this.container.innerHTML = '';
        }
        this.messageCounter = 0;
        this.activeMessages.clear();
    }
}

class SupportMessage {
    constructor(text, emotion, intensity = 'medium', animationType = 'slide') {
        this.text = text;
        this.emotion = emotion;
        this.intensity = intensity;
        this.animationType = animationType;
        this.displayDuration = this.getDisplayDuration(intensity); // 強度に応じた表示時間
        this.position = this.generateRandomPosition();
    }
    
    getDisplayDuration(intensity) {
        const durations = {
            low: 2000,    // 2秒
            medium: 2500, // 2.5秒
            high: 3000    // 3秒
        };
        return durations[intensity] || 2500;
    }

    generateRandomPosition() {
        // 顔が通常表示される中央部分（30-70%）を避けて配置
        const positions = [
            // 左上エリア
            { x: Math.random() * 25 + 5, y: Math.random() * 25 + 5 },
            // 右上エリア  
            { x: Math.random() * 25 + 70, y: Math.random() * 25 + 5 },
            // 左下エリア
            { x: Math.random() * 25 + 5, y: Math.random() * 25 + 70 },
            // 右下エリア
            { x: Math.random() * 25 + 70, y: Math.random() * 25 + 70 },
            // 左側エリア
            { x: Math.random() * 15 + 5, y: Math.random() * 40 + 30 },
            // 右側エリア
            { x: Math.random() * 15 + 80, y: Math.random() * 40 + 30 }
        ];
        
        return positions[Math.floor(Math.random() * positions.length)];
    }
}

class EmotionState {
    constructor(emotion = null, confidence = 0, needsSupport = false) {
        this.emotion = emotion;
        this.confidence = confidence;
        this.needsSupport = needsSupport;
        this.timestamp = Date.now();
        this.intensity = this.calculateIntensity(confidence);
    }

    calculateIntensity(confidence) {
        if (confidence >= 0.8) return 'high';
        if (confidence >= 0.6) return 'medium'; // 閾値を下げる
        return 'low';
    }

    isNegativeEmotion() {
        return ['sad', 'angry', 'fearful'].includes(this.emotion);
    }
}

class DisplayState {
    constructor() {
        this.lastMessageTime = 0;
        this.cooldownPeriod = 1000; // 1秒クールダウン（大幅短縮）
        this.lastEmotionType = null;
        this.activeMessages = new Set();
        this.emotionTimestamps = {}; // 感情タイプごとのタイムスタンプ
    }

    canShowMessage(emotionType) {
        const now = Date.now();
        const lastTime = this.emotionTimestamps[emotionType] || 0;
        return now - lastTime >= this.cooldownPeriod;
    }

    recordMessage(emotionType) {
        this.lastMessageTime = Date.now();
        this.lastEmotionType = emotionType;
        this.emotionTimestamps[emotionType] = Date.now();
    }

    addActiveMessage(messageId) {
        this.activeMessages.add(messageId);
    }

    removeActiveMessage(messageId) {
        this.activeMessages.delete(messageId);
    }

    cleanup() {
        this.activeMessages.clear();
        this.lastMessageTime = 0;
        this.lastEmotionType = null;
        this.emotionTimestamps = {};
    }
}

// エクスポート
window.EmotionSupportManager = EmotionSupportManager;
