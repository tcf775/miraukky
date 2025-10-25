/**
 * Face Detection Validation Module
 * 顔検出バリデーション機能のコアモジュール
 */

// データモデル定義
class FaceDetectionState {
    constructor() {
        this.isDetected = false;
        this.confidence = 0.0;
        this.lastDetectionTime = null;
        this.detectionCount = 0;
        this.state = 'NOT_DETECTED'; // NOT_DETECTED, DETECTING, STABLE_DETECTED
    }
    
    update(detected, confidence) {
        // バリデーション
        confidence = Math.max(0.0, Math.min(1.0, confidence));
        
        this.isDetected = detected && confidence >= 0.5;
        this.confidence = confidence;
        this.lastDetectionTime = this.isDetected ? Date.now() : this.lastDetectionTime;
        
        // 状態遷移
        if (this.isDetected) {
            this.detectionCount++;
            if (this.state === 'NOT_DETECTED') {
                this.state = 'DETECTING';
            } else if (this.state === 'DETECTING' && this.detectionCount >= 3) {
                this.state = 'STABLE_DETECTED';
            }
        } else {
            this.detectionCount = 0;
            this.state = 'NOT_DETECTED';
        }
    }
    
    isStable() {
        return this.state === 'STABLE_DETECTED';
    }
}

class GameValidationState {
    constructor() {
        this.canStart = false;
        this.canContinue = false;
        this.pauseReason = '';
        this.resumeCountdown = 0;
        this.state = 'READY'; // READY, BLOCKED, RESUMING
    }
    
    updateFromFaceDetection(faceState) {
        const wasBlocked = this.state === 'BLOCKED';
        
        if (faceState.isStable()) {
            this.canStart = true;
            this.canContinue = true;
            this.pauseReason = '';
            
            if (wasBlocked) {
                this.state = 'RESUMING';
                this.resumeCountdown = 3;
            } else {
                this.state = 'READY';
            }
        } else {
            this.canStart = false;
            this.canContinue = false;
            this.pauseReason = 'FACE_NOT_DETECTED';
            this.state = 'BLOCKED';
            this.resumeCountdown = 0;
        }
    }
    
    decrementCountdown() {
        if (this.resumeCountdown > 0) {
            this.resumeCountdown--;
            if (this.resumeCountdown === 0) {
                this.state = 'READY';
            }
        }
    }
}

class DetectionFeedback {
    constructor(message, type, autoHideDelay = 0) {
        // バリデーション
        if (!message || message.trim() === '') {
            throw new Error('Message cannot be empty');
        }
        if (!['success', 'warning', 'error'].includes(type)) {
            throw new Error('Invalid feedback type');
        }
        if (autoHideDelay < 0) {
            throw new Error('Auto hide delay must be non-negative');
        }
        
        this.message = message;
        this.type = type;
        this.isVisible = false;
        this.autoHideDelay = autoHideDelay;
    }
}

// Observer パターンの実装
class EventEmitter {
    constructor() {
        this.events = {};
    }
    
    addEventListener(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }
    
    removeEventListener(event, callback) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
    
    emit(event, data) {
        if (!this.events[event]) return;
        this.events[event].forEach(callback => callback(data));
    }
}

// パフォーマンス監視クラス
class PerformanceMonitor {
    constructor() {
        this.detectionTimes = [];
        this.maxSamples = 10;
        this.targetDetectionTime = 100; // 100ms目標
    }
    
    recordDetectionTime(startTime, endTime) {
        const detectionTime = endTime - startTime;
        this.detectionTimes.push(detectionTime);
        
        if (this.detectionTimes.length > this.maxSamples) {
            this.detectionTimes.shift();
        }
        
        return detectionTime;
    }
    
    getAverageDetectionTime() {
        if (this.detectionTimes.length === 0) return 0;
        
        const sum = this.detectionTimes.reduce((a, b) => a + b, 0);
        return sum / this.detectionTimes.length;
    }
    
    shouldOptimizeInterval() {
        const avgTime = this.getAverageDetectionTime();
        return avgTime > this.targetDetectionTime;
    }
    
    getOptimizedInterval(currentInterval) {
        const avgTime = this.getAverageDetectionTime();
        
        if (avgTime > this.targetDetectionTime * 2) {
            // 処理が重い場合は間隔を長くする
            return Math.min(currentInterval * 1.5, 500);
        } else if (avgTime < this.targetDetectionTime * 0.5) {
            // 処理が軽い場合は間隔を短くする
            return Math.max(currentInterval * 0.8, 100);
        }
        
        return currentInterval;
    }
}

// face-api.js統合クラス（パフォーマンス監視付き）
class FaceDetectionIntegration extends EventEmitter {
    constructor(videoElement, options = {}) {
        super();
        this.videoElement = videoElement;
        this.options = {
            detectionInterval: options.detectionInterval || 250,
            confidenceThreshold: options.confidenceThreshold || 0.5,
            stabilityCount: options.stabilityCount || 3,
            ...options
        };
        this.detectionInterval = null;
        this.isInitialized = false;
        this.consecutiveErrors = 0;
        this.maxConsecutiveErrors = 5;
        this.performanceMonitor = new PerformanceMonitor();
        this.currentInterval = this.options.detectionInterval;
    }
    
    async initialize() {
        try {
            // face-api.jsが読み込まれているかチェック
            if (typeof faceapi === 'undefined') {
                throw new Error('face-api.js is not loaded');
            }
            
            // モデルが読み込まれているかチェック
            if (!faceapi.nets.tinyFaceDetector.isLoaded) {
                throw new Error('TinyFaceDetector model is not loaded');
            }
            
            this.isInitialized = true;
            this.emit('initialized');
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }
    
    async detectFace() {
        if (!this.isInitialized) {
            throw new Error('Face detection not initialized');
        }
        
        const startTime = performance.now();
        
        try {
            // ビデオ要素の状態をチェック
            if (this.videoElement.readyState < 2) {
                throw new Error('Video not ready');
            }
            
            const detection = await faceapi.detectSingleFace(
                this.videoElement, 
                new faceapi.TinyFaceDetectorOptions()
            );
            
            const endTime = performance.now();
            const detectionTime = this.performanceMonitor.recordDetectionTime(startTime, endTime);
            
            const isDetected = detection !== undefined;
            const confidence = isDetected ? detection.score : 0.0;
            
            // エラーカウンターをリセット
            this.consecutiveErrors = 0;
            
            // パフォーマンス情報を含めて返す
            return { 
                isDetected, 
                confidence, 
                detection,
                detectionTime,
                avgDetectionTime: this.performanceMonitor.getAverageDetectionTime()
            };
        } catch (error) {
            this.consecutiveErrors++;
            
            // 連続エラーが多い場合はカメラアクセス問題の可能性
            if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
                this.emit('error', new Error('CAMERA_ACCESS_LOST'));
                this.stopDetection();
            }
            
            return { isDetected: false, confidence: 0.0, detection: null };
        }
    }
    
    startDetection() {
        if (this.detectionInterval) return;
        
        this.detectionInterval = setInterval(async () => {
            const result = await this.detectFace();
            this.emit('detection', result);
            
            // パフォーマンスに基づいて間隔を調整
            this.optimizeDetectionInterval();
        }, this.currentInterval);
    }
    
    optimizeDetectionInterval() {
        const newInterval = this.performanceMonitor.getOptimizedInterval(this.currentInterval);
        
        if (newInterval !== this.currentInterval) {
            this.currentInterval = newInterval;
            
            // インターバルを再設定
            if (this.detectionInterval) {
                clearInterval(this.detectionInterval);
                this.detectionInterval = setInterval(async () => {
                    const result = await this.detectFace();
                    this.emit('detection', result);
                    this.optimizeDetectionInterval();
                }, this.currentInterval);
            }
            
            this.emit('intervalOptimized', this.currentInterval);
        }
    }
    
    stopDetection() {
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
            this.detectionInterval = null;
        }
        this.consecutiveErrors = 0;
    }
    
    getPerformanceStats() {
        return {
            averageDetectionTime: this.performanceMonitor.getAverageDetectionTime(),
            currentInterval: this.currentInterval,
            shouldOptimize: this.performanceMonitor.shouldOptimizeInterval()
        };
    }
}

// 顔検出バリデーター
class FaceDetectionValidator extends EventEmitter {
    constructor(videoElement, options = {}) {
        super();
        this.videoElement = videoElement;
        this.options = options;
        this.faceState = new FaceDetectionState();
        this.integration = new FaceDetectionIntegration(videoElement, options);
        
        // イベントリスナー設定
        this.integration.addEventListener('detection', (result) => {
            this.faceState.update(result.isDetected, result.confidence);
            this.emit('stateChange', this.faceState);
        });
        
        this.integration.addEventListener('error', (error) => {
            this.emit('error', error);
        });
    }
    
    async startDetection() {
        try {
            await this.integration.initialize();
            this.integration.startDetection();
        } catch (error) {
            throw error;
        }
    }
    
    stopDetection() {
        this.integration.stopDetection();
    }
    
    getCurrentState() {
        return this.faceState;
    }
}

// ゲーム一時停止・再開管理
class GamePauseManager extends EventEmitter {
    constructor() {
        super();
        this.isPaused = false;
        this.pauseReason = '';
        this.pauseStartTime = null;
        this.gameState = 'PLAYING'; // PLAYING, PAUSED, RESUMING
    }
    
    pauseGame(reason) {
        if (this.isPaused) return;
        
        this.isPaused = true;
        this.pauseReason = reason;
        this.pauseStartTime = Date.now();
        this.gameState = 'PAUSED';
        
        this.emit('gamePaused', {
            reason,
            timestamp: this.pauseStartTime
        });
    }
    
    startResumeCountdown(countdownSeconds = 3) {
        if (!this.isPaused) return;
        
        this.gameState = 'RESUMING';
        let countdown = countdownSeconds;
        
        this.emit('resumeCountdownStarted', countdown);
        
        const countdownInterval = setInterval(() => {
            countdown--;
            this.emit('resumeCountdown', countdown);
            
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                this.resumeGame();
            }
        }, 1000);
        
        return countdownInterval;
    }
    
    resumeGame() {
        this.isPaused = false;
        this.pauseReason = '';
        this.pauseStartTime = null;
        this.gameState = 'PLAYING';
        
        this.emit('gameResumed', {
            timestamp: Date.now()
        });
    }
    
    cancelResume() {
        this.gameState = 'PAUSED';
        this.emit('resumeCancelled');
    }
    
    getState() {
        return {
            isPaused: this.isPaused,
            reason: this.pauseReason,
            gameState: this.gameState,
            pauseDuration: this.pauseStartTime ? Date.now() - this.pauseStartTime : 0
        };
    }
}

// ゲーム進行バリデーター（一時停止機能を無効化）
class GameProgressValidator extends EventEmitter {
    constructor(faceDetector) {
        super();
        this.faceDetector = faceDetector;
        this.gameState = new GameValidationState();
        this.pauseManager = new GamePauseManager();
        this.isGameActive = false;
        this.pausingEnabled = false; // 一時停止機能を無効化
        
        // 顔検出状態の変化を監視
        this.faceDetector.addEventListener('stateChange', (faceState) => {
            this.gameState.updateFromFaceDetection(faceState);
            this.emit('validationChange', this.gameState);
            
            // ゲーム中の一時停止・再開処理は無効化
            // if (this.isGameActive && this.pausingEnabled) {
            //     this.handleGameStateChange(faceState);
            // }
        });
    }
    
    // 一時停止機能を有効/無効にする（デフォルトは無効）
    setPausingEnabled(enabled) {
        this.pausingEnabled = enabled;
    }
    
    handleGameStateChange(faceState) {
        // この機能は現在無効化されています
        return;
    }
    
    setGameActive(active) {
        this.isGameActive = active;
        if (!active) {
            // ゲーム終了時は一時停止状態をリセット
            this.pauseManager.resumeGame();
        }
    }
    
    async canStartGame() {
        return this.gameState.canStart;
    }
    
    canContinueGame() {
        return this.gameState.canContinue; // 一時停止チェックを削除
    }
    
    pauseGame(reason) {
        // 手動一時停止のみ許可
        this.pauseManager.pauseGame(reason);
    }
    
    async resumeGame() {
        this.pauseManager.resumeGame();
    }
    
    getValidationState() {
        return this.gameState;
    }
    
    getPauseManager() {
        return this.pauseManager;
    }
}

// ゲーム開始ブロック機能
class GameBlockManager extends EventEmitter {
    constructor() {
        super();
        this.isBlocked = false;
        this.blockReason = '';
    }
    
    blockGame(reason) {
        this.isBlocked = true;
        this.blockReason = reason;
        this.emit('gameBlocked', { reason, timestamp: Date.now() });
    }
    
    unblockGame() {
        this.isBlocked = false;
        this.blockReason = '';
        this.emit('gameUnblocked', { timestamp: Date.now() });
    }
    
    isGameBlocked() {
        return this.isBlocked;
    }
    
    getBlockReason() {
        return this.blockReason;
    }
}

// ゲーム開始バリデーション機能
class GameStartValidator {
    constructor(faceDetector, gameValidator) {
        this.faceDetector = faceDetector;
        this.gameValidator = gameValidator;
        this.blockManager = new GameBlockManager();
        
        // 顔検出状態の変化を監視してブロック状態を更新
        this.gameValidator.addEventListener('validationChange', (gameState) => {
            if (!gameState.canStart) {
                this.blockManager.blockGame(gameState.pauseReason);
            } else {
                this.blockManager.unblockGame();
            }
        });
    }
    
    async validateGameStart() {
        const canStart = await this.gameValidator.canStartGame();
        
        if (!canStart) {
            const reason = this.getBlockReason();
            this.blockManager.blockGame(reason);
            throw new Error(reason);
        }
        
        this.blockManager.unblockGame();
        return true;
    }
    
    getBlockReason() {
        const faceState = this.faceDetector.getCurrentState();
        const gameState = this.gameValidator.getValidationState();
        
        if (!faceState.isDetected) {
            return 'FACE_NOT_DETECTED';
        } else if (!faceState.isStable()) {
            return 'FACE_NOT_STABLE';
        } else if (!gameState.canStart) {
            return gameState.pauseReason || 'UNKNOWN';
        }
        
        return null;
    }
    
    getBlockManager() {
        return this.blockManager;
    }
}

// 照明条件チェック機能
class LightingConditionChecker {
    constructor() {
        this.lowConfidenceCount = 0;
        this.lowConfidenceThreshold = 5; // 5回連続で低信頼度の場合
        this.confidenceThreshold = 0.3; // 信頼度の閾値
    }
    
    checkLightingCondition(faceState) {
        if (faceState.isDetected && faceState.confidence < this.confidenceThreshold) {
            this.lowConfidenceCount++;
            
            if (this.lowConfidenceCount >= this.lowConfidenceThreshold) {
                return 'POOR_LIGHTING';
            }
        } else {
            this.lowConfidenceCount = 0;
        }
        
        return null;
    }
    
    reset() {
        this.lowConfidenceCount = 0;
    }
}

// 日本語メッセージ管理（照明ガイダンス追加）
class MessageManager {
    constructor() {
        this.messages = {
            'FACE_NOT_DETECTED': {
                title: '顔が検出されません',
                message: 'カメラに顔を映してください',
                type: 'error'
            },
            'FACE_NOT_STABLE': {
                title: '顔検出が不安定です',
                message: 'カメラの前で少しお待ちください',
                type: 'warning'
            },
            'POOR_LIGHTING': {
                title: '照明が不十分です',
                message: '💡 明るい場所に移動するか、照明を追加してください',
                type: 'warning'
            },
            'CAMERA_ERROR': {
                title: 'カメラエラー',
                message: 'カメラへのアクセスを確認してください',
                type: 'error'
            },
            'FACE_DETECTED': {
                title: '顔検出中',
                message: '✓ 顔が認識されています',
                type: 'success'
            },
            'READY_TO_START': {
                title: 'ゲーム開始可能',
                message: '✨ スタートボタンを押してください',
                type: 'success'
            },
            'MULTIPLE_FACES': {
                title: '複数の顔が検出されました',
                message: '一人でプレイしてください',
                type: 'warning'
            },
            'FACE_LOST_DURING_GAME': {
                title: 'ゲーム一時停止',
                message: '⏸️ 顔が見えません。カメラに戻ってください',
                type: 'warning'
            },
            'GAME_RESUMING': {
                title: 'ゲーム再開中',
                message: '▶️ まもなくゲームを再開します',
                type: 'success'
            },
            'RESUME_CANCELLED': {
                title: '再開キャンセル',
                message: '⏸️ 顔が見えなくなりました',
                type: 'warning'
            }
        };
    }
    
    getMessage(code) {
        return this.messages[code] || {
            title: '不明なエラー',
            message: 'しばらくお待ちください',
            type: 'error'
        };
    }
    
    getFormattedMessage(code) {
        const msg = this.getMessage(code);
        return `${msg.title}: ${msg.message}`;
    }
}

// フィードバック表示管理（照明チェック統合）
class DetectionFeedbackManager extends EventEmitter {
    constructor(containerElement) {
        super();
        this.container = containerElement;
        this.messageManager = new MessageManager();
        this.lightingChecker = new LightingConditionChecker();
        this.currentFeedback = null;
        this.autoHideTimer = null;
        
        this.initializeElements();
    }
    
    initializeElements() {
        if (!this.container) return;
        
        this.indicatorElement = this.container.querySelector('#detection-indicator');
        this.statusElement = this.container.querySelector('#detection-status');
        this.confidenceElement = this.container.querySelector('#detection-confidence');
        this.messageElement = this.container.querySelector('#detection-message');
    }
    
    showFeedback(code, autoHideDelay = 0) {
        const message = this.messageManager.getMessage(code);
        
        if (this.messageElement) {
            this.messageElement.textContent = message.message;
            this.messageElement.className = `detection-message show ${message.type}`;
        }
        
        if (autoHideDelay > 0) {
            this.autoHideTimer = setTimeout(() => {
                this.hideFeedback();
            }, autoHideDelay * 1000);
        }
        
        this.currentFeedback = new DetectionFeedback(message.message, message.type, autoHideDelay);
        this.emit('feedbackShown', this.currentFeedback);
    }
    
    hideFeedback() {
        if (this.messageElement) {
            this.messageElement.classList.remove('show');
        }
        
        if (this.autoHideTimer) {
            clearTimeout(this.autoHideTimer);
            this.autoHideTimer = null;
        }
        
        this.currentFeedback = null;
        this.emit('feedbackHidden');
    }
    
    updateDetectionIndicator(isDetected, confidence) {
        if (!this.indicatorElement || !this.statusElement || !this.confidenceElement) return;
        
        // インジケーターの色を更新
        this.indicatorElement.className = `detection-indicator ${isDetected ? 'detected' : 'not-detected'}`;
        
        // ステータステキストを更新
        this.statusElement.textContent = isDetected ? '顔検出中' : '顔が見つかりません';
        
        // 信頼度バーを更新
        this.confidenceElement.style.setProperty('--confidence', `${confidence * 100}%`);
    }
    
    // 照明条件をチェックしてフィードバックを表示
    checkAndShowLightingFeedback(faceState) {
        const lightingIssue = this.lightingChecker.checkLightingCondition(faceState);
        
        if (lightingIssue) {
            this.showFeedback(lightingIssue, 8); // 8秒間表示
        }
    }
    
    reset() {
        this.lightingChecker.reset();
        this.hideFeedback();
    }
}

// モバイル対応チェック
class MobileCompatibilityChecker {
    static isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    static getTouchSupport() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }
    
    static getOptimalSettings() {
        if (this.isMobile()) {
            return {
                detectionInterval: 500, // モバイルでは間隔を長く
                confidenceThreshold: 0.4,
                stabilityCount: 2
            };
        }
        
        return {
            detectionInterval: 300, // デスクトップでも少し長めに
            confidenceThreshold: 0.5,
            stabilityCount: 3
        };
    }
}

// アクセシビリティ機能
class AccessibilityManager {
    constructor(containerElement) {
        this.container = containerElement;
        this.announcements = [];
    }
    
    announceToScreenReader(message, priority = 'polite') {
        // スクリーンリーダー用の隠し要素を作成
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', priority);
        announcement.setAttribute('aria-atomic', 'true');
        announcement.style.position = 'absolute';
        announcement.style.left = '-10000px';
        announcement.style.width = '1px';
        announcement.style.height = '1px';
        announcement.style.overflow = 'hidden';
        
        announcement.textContent = message;
        document.body.appendChild(announcement);
        
        // 少し遅れて削除
        setTimeout(() => {
            if (announcement.parentNode) {
                announcement.parentNode.removeChild(announcement);
            }
        }, 1000);
    }
    
    addKeyboardSupport(element, callback) {
        element.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                callback(event);
            }
        });
    }
    
    setAriaLabels() {
        const indicator = document.getElementById('detection-indicator');
        const status = document.getElementById('detection-status');
        const confidence = document.getElementById('detection-confidence');
        const message = document.getElementById('detection-message');
        
        if (indicator) {
            indicator.setAttribute('role', 'status');
            indicator.setAttribute('aria-label', '顔検出状況インジケーター');
        }
        
        if (status) {
            status.setAttribute('aria-live', 'polite');
        }
        
        if (confidence) {
            confidence.setAttribute('role', 'progressbar');
            confidence.setAttribute('aria-label', '顔検出信頼度');
        }
        
        if (message) {
            message.setAttribute('role', 'alert');
            message.setAttribute('aria-live', 'assertive');
        }
    }
}

// 簡素化された統合コントローラー（輪郭描画のみ）
class FaceDetectionController extends EventEmitter {
    constructor(videoElement, feedbackContainer, gameCallbacks = {}) {
        super();
        this.videoElement = videoElement;
        this.gameCallbacks = gameCallbacks;
        
        // モバイル対応設定
        const optimalSettings = MobileCompatibilityChecker.getOptimalSettings();
        this.options = { ...optimalSettings, ...gameCallbacks.options };
        
        // コンポーネント
        this.faceDetector = null;
        this.gameValidator = null;
        this.gameStartValidator = null;
        
        this.isInitialized = false;
        this.isStarted = false;
    }
    
    async initialize() {
        try {
            // 顔検出バリデーターを初期化（モバイル最適化設定）
            this.faceDetector = new FaceDetectionValidator(this.videoElement, this.options);
            this.gameValidator = new GameProgressValidator(this.faceDetector);
            this.gameStartValidator = new GameStartValidator(this.faceDetector, this.gameValidator);
            
            // イベントリスナーを設定
            this.setupEventListeners();
            
            this.isInitialized = true;
            this.emit('initialized');
            
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }
    
    setupEventListeners() {
        // 顔検出状態変化（ゲーム開始前のみ）
        this.faceDetector.addEventListener('stateChange', (faceState) => {
            this.emit('faceStateChange', faceState);
        });
        
        // ゲーム開始ブロック（ゲーム開始前のみ有効）
        this.gameStartValidator.getBlockManager().addEventListener('gameBlocked', (data) => {
            if (this.gameCallbacks.onGameBlock) {
                this.gameCallbacks.onGameBlock(data.reason);
            }
            this.emit('gameBlocked', data);
        });
    }
    
    async start() {
        if (!this.isInitialized) {
            throw new Error('Controller not initialized');
        }
        
        if (this.isStarted) return;
        
        try {
            await this.faceDetector.startDetection();
            this.isStarted = true;
            this.emit('started');
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }
    
    stop() {
        if (this.faceDetector) {
            this.faceDetector.stopDetection();
        }
        
        if (this.gameValidator) {
            this.gameValidator.setGameActive(false);
        }
        
        this.isStarted = false;
        this.emit('stopped');
    }
    
    async validateGameStart() {
        if (!this.gameStartValidator) {
            throw new Error('Game start validator not available');
        }
        
        return await this.gameStartValidator.validateGameStart();
    }
    
    setGameActive(active) {
        if (this.gameValidator) {
            this.gameValidator.setGameActive(active);
        }
    }
    
    getCurrentFaceState() {
        return this.faceDetector ? this.faceDetector.getCurrentState() : null;
    }
    
    getGameValidationState() {
        return this.gameValidator ? this.gameValidator.getValidationState() : null;
    }
    
    getPerformanceStats() {
        return this.faceDetector ? this.faceDetector.integration.getPerformanceStats() : null;
    }
    
    cleanup() {
        this.stop();
        
        // イベントリスナーをクリア
        this.events = {};
        
        // コンポーネントをクリア
        this.faceDetector = null;
        this.gameValidator = null;
        this.gameStartValidator = null;
        
        this.isInitialized = false;
        this.emit('cleanup');
    }
}

// グローバル変数として初期化
window.faceDetectionModule = {
    FaceDetectionState,
    GameValidationState,
    DetectionFeedback,
    EventEmitter,
    FaceDetectionIntegration,
    FaceDetectionValidator,
    GameProgressValidator,
    GameStartValidator,
    GameBlockManager,
    MessageManager,
    DetectionFeedbackManager,
    LightingConditionChecker,
    GamePauseManager,
    FaceDetectionController,
    PerformanceMonitor,
    MobileCompatibilityChecker,
    AccessibilityManager
};
