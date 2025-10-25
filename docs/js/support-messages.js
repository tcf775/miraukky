/**
 * Support Messages Configuration
 * 感情に応じた応援メッセージの設定（43個に最適化）
 */

const VOICE_MAP = {
    "いいね！😊": 1, "その調子！✨": 9, "素敵！🌟": 17, "いい感じ！👍": 25, "グッド！😄": 33,
    "ナイス！🎉": 41, "最高！💖": 49, "完璧！⭐": 57, "素晴らしい！🌈": 65, "やったね！🎊": 73,
    "すごい！✨": 81, "かっこいい！😎": 89, "美しい！💫": 97, "輝いてる！🌟": 105, "最高だよ！🎯": 113,
    "その調子！！😄": 121, "最高だよ！🌟": 129, "素敵！✨": 137, "完璧な笑顔！😊": 145, "輝いてる！💫": 153,
    "素晴らしい！🎉": 161, "かっこいい！😎": 169, "美しい笑顔！💖": 177, "最高の表情！⭐": 185, "グレート！👏": 193,
    "最高だよ！！！🎉": 201, "素敵！！！💖": 209, "完璧！！！⭐": 217, "その笑顔最高！！🌈": 225, "輝きすぎ！！✨": 233,
    "神レベル！！🏆": 241, "伝説級！！👑": 249, "奇跡の笑顔！！💫": 257, "天使みたい！！😇": 265, "スーパースター！！🌟": 273,
    "頑張って！😊": 281, "大丈夫だよ！💪": 289, "応援してる！🌟": 297, "君ならできる！✨": 305, "負けないで！🔥": 313,
    "落ち着いて😌": 321, "深呼吸しよう🌸": 329, "リラックス💆": 337
};

const SUPPORT_MESSAGES = {
    happy: {
        low: [
            "いいね！😊", "その調子！✨", "素敵！🌟", "いい感じ！👍", "グッド！😄",
            "ナイス！🎉", "最高！💖", "完璧！⭐", "素晴らしい！🌈", "やったね！🎊"
        ],
        medium: [
            "すごい！✨", "かっこいい！😎", "美しい！💫", "輝いてる！🌟", "最高だよ！🎯",
            "その調子！！😄", "最高だよ！🌟", "素敵！✨", "完璧な笑顔！😊", "輝いてる！💫",
            "素晴らしい！🎉", "かっこいい！😎", "美しい笑顔！💖", "最高の表情！⭐", "グレート！👏"
        ],
        high: [
            "最高だよ！！！🎉", "素敵！！！💖", "完璧！！！⭐", "その笑顔最高！！🌈", "輝きすぎ！！✨",
            "神レベル！！🏆", "伝説級！！👑", "奇跡の笑顔！！💫", "天使みたい！！😇", "スーパースター！！🌟"
        ]
    },
    sad: {
        low: [
            "頑張って！😊", "大丈夫だよ！💪", "応援してる！🌟", "君ならできる！✨", "負けないで！🔥",
            "いいね！😊", "その調子！✨", "素敵！🌟", "いい感じ！👍", "グッド！😄"
        ],
        medium: [
            "頑張って！😊", "大丈夫だよ！💪", "応援してる！🌟", "君ならできる！✨", "負けないで！🔥",
            "ナイス！🎉", "最高！💖", "完璧！⭐", "素晴らしい！🌈", "やったね！🎊"
        ],
        high: [
            "頑張って！😊", "大丈夫だよ！💪", "応援してる！🌟", "君ならできる！✨", "負けないで！🔥",
            "すごい！✨", "かっこいい！😎", "美しい！💫", "輝いてる！🌟", "最高だよ！🎯"
        ]
    },
    angry: {
        low: [
            "落ち着いて😌", "深呼吸しよう🌸", "リラックス💆", "いいね！😊", "その調子！✨",
            "素敵！🌟", "いい感じ！👍", "グッド！😄", "ナイス！🎉", "最高！💖"
        ],
        medium: [
            "落ち着いて😌", "深呼吸しよう🌸", "リラックス💆", "完璧！⭐", "素晴らしい！🌈",
            "やったね！🎊", "すごい！✨", "かっこいい！😎", "美しい！💫", "輝いてる！🌟"
        ],
        high: [
            "落ち着いて😌", "深呼吸しよう🌸", "リラックス💆", "最高だよ！🎯", "その調子！！😄",
            "最高だよ！🌟", "素敵！✨", "完璧な笑顔！😊", "輝いてる！💫", "素晴らしい！🎉"
        ]
    },
    fearful: {
        low: [
            "大丈夫だよ！💪", "応援してる！🌟", "君ならできる！✨", "いいね！😊", "その調子！✨",
            "素敵！🌟", "いい感じ！👍", "グッド！😄", "ナイス！🎉", "最高！💖"
        ],
        medium: [
            "大丈夫だよ！💪", "応援してる！🌟", "君ならできる！✨", "完璧！⭐", "素晴らしい！🌈",
            "やったね！🎊", "すごい！✨", "かっこいい！😎", "美しい！💫", "輝いてる！🌟"
        ],
        high: [
            "大丈夫だよ！💪", "応援してる！🌟", "君ならできる！✨", "負けないで！🔥", "最高だよ！🎯",
            "その調子！！😄", "最高だよ！🌟", "素敵！✨", "完璧な笑顔！😊", "輝いてる！💫"
        ]
    },
    disgusted: {
        low: [
            "リラックス💆", "いいね！😊", "その調子！✨", "素敵！🌟", "いい感じ！👍",
            "グッド！😄", "ナイス！🎉", "最高！💖", "完璧！⭐", "素晴らしい！🌈"
        ],
        medium: [
            "リラックス💆", "やったね！🎊", "すごい！✨", "かっこいい！😎", "美しい！💫",
            "輝いてる！🌟", "最高だよ！🎯", "その調子！！😄", "最高だよ！🌟", "素敵！✨"
        ],
        high: [
            "リラックス💆", "完璧な笑顔！😊", "輝いてる！💫", "素晴らしい！🎉", "かっこいい！😎",
            "美しい笑顔！💖", "最高の表情！⭐", "グレート！👏", "最高だよ！！！🎉", "素敵！！！💖"
        ]
    },
    neutral: {
        low: [
            "いいね！😊", "その調子！✨", "素敵！🌟", "いい感じ！👍", "グッド！😄",
            "ナイス！🎉", "最高！💖", "完璧！⭐", "素晴らしい！🌈", "やったね！🎊"
        ],
        medium: [
            "すごい！✨", "かっこいい！😎", "美しい！💫", "輝いてる！🌟", "最高だよ！🎯",
            "その調子！！😄", "最高だよ！🌟", "素敵！✨", "完璧な笑顔！😊", "輝いてる！💫"
        ],
        high: [
            "素晴らしい！🎉", "かっこいい！😎", "美しい笑顔！💖", "最高の表情！⭐", "グレート！👏",
            "最高だよ！！！🎉", "素敵！！！💖", "完璧！！！⭐", "その笑顔最高！！🌈", "輝きすぎ！！✨"
        ]
    }
};

class SupportMessageConfig {
    static getRandomMessage(emotion, intensity = 'medium') {
        const emotionMessages = SUPPORT_MESSAGES[emotion] || SUPPORT_MESSAGES.neutral;
        const intensityMessages = emotionMessages[intensity] || emotionMessages.medium;
        
        if (!intensityMessages || intensityMessages.length === 0) return null;
        
        const randomIndex = Math.floor(Math.random() * intensityMessages.length);
        return intensityMessages[randomIndex];
    }

    static getVoiceFile(message) {
        const voiceNum = VOICE_MAP[message];
        return voiceNum ? `sounds/voice/voice_${String(voiceNum).padStart(3, '0')}.wav` : null;
    }

    static getAllEmotions() {
        return Object.keys(SUPPORT_MESSAGES);
    }

    static getIntensityLevels() {
        return ['low', 'medium', 'high'];
    }
    
    static getRandomSupportMessage() {
        const emotions = this.getAllEmotions();
        const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
        const intensities = this.getIntensityLevels();
        const randomIntensity = intensities[Math.floor(Math.random() * intensities.length)];
        
        return this.getRandomMessage(randomEmotion, randomIntensity);
    }
}

window.SupportMessageConfig = SupportMessageConfig;
window.SUPPORT_MESSAGES = SUPPORT_MESSAGES;
window.VOICE_MAP = VOICE_MAP;
