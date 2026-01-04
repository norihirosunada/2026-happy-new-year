<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  config: Object,
  isOpen: Boolean,
  uiMode: {
    type: String,
    default: 'simple'
  },
  pointStats: {
    type: Object,
    default: () => ({ original: 0, sampled: 0 })
  }
})

const emit = defineEmits(['update:config', 'update:isOpen', 'capture', 'demo', 'reset', 'random-all', 'random-camera', 'file-upload'])

const activeTab = ref('data')
const touchStartY = ref(0)
const touchStartTime = ref(0)

const tabs = [
  { id: 'data', label: 'データ' },
  { id: 'view', label: '表示' },
  { id: 'curve', label: '曲線' },
  { id: 'tool', label: 'ツール' }
]

const localConfig = computed({
  get: () => props.config,
  set: (val) => emit('update:config', val)
})

const handleFileUpload = (e) => {
  const file = e.target.files[0]
  if (file) {
    emit('file-upload', file)
  }
}

// サンプリングのスライダー用ロジック (3次関数でより緩やかな変化を実現)
const MIN_POINTS = 100
const MAX_POINTS = 10000

const sliderValue = computed({
  get: () => {
    const val = props.config.targetPoints || 3000
    const normalized = Math.max(0, (val - MIN_POINTS) / (MAX_POINTS - MIN_POINTS))
    return 100 * Math.pow(normalized, 1/3)
  },
  set: (pos) => {
    // 3乗のカーブを採用することで、低〜中密度域の変化をより「緩やか」にする
    const val = Math.round(MIN_POINTS + (MAX_POINTS - MIN_POINTS) * Math.pow(pos / 100, 3))
    localConfig.value.targetPoints = val
  }
})

// ジェスチャー処理
const onTouchStart = (e) => {
    touchStartY.value = e.touches[0].clientY
    touchStartTime.value = Date.now()
}

const onTouchEnd = (e) => {
    const touchEndY = e.changedTouches[0].clientY
    const deltaY = touchEndY - touchStartY.value
    const deltaTime = Date.now() - touchStartTime.value
    
    // 短時間で一定以上のスワイプがあった場合
    if (deltaTime < 300) {
        if (deltaY < -30 && !props.isOpen) {
            // スワイプアップ -> 開く
            emit('update:isOpen', true)
        } else if (deltaY > 30 && props.isOpen) {
            // スワイプダウン -> 閉じる
            emit('update:isOpen', false)
        }
    }
}
</script>

<template>
  <div 
    class="ui-panel" 
    :class="{ 'is-open': isOpen, 'mode-simple': uiMode === 'simple' }" 
    id="main-panel"
    @touchstart="onTouchStart"
    @touchend="onTouchEnd"
  >
    <!-- モバイル用ハンドル -->
    <div class="mobile-handle" @click="emit('update:isOpen', !isOpen)">
        <div class="handle-bar"></div>
    </div>

    <!-- 簡易モード UI -->
    <div v-if="props.uiMode === 'simple'" class="simple-mode-content">
      <div class="simple-settings-row">
        <div class="color-picker-wrapper">
          <input type="color" v-model="localConfig.colors.curve" />
        </div>
        <div class="simple-label">Stroke & Density</div>
      </div>

      <div class="simple-sampling-row">
        <input 
          type="range" 
          v-model.number="sliderValue" 
          :min="0" 
          :max="100" 
          step="any"
          class="mini-range"
        />
      </div>

      <div class="simple-actions-row">
        <button @click="emit('random-all')" class="icon-action-btn randomize" title="Randomize">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
        </button>
        <button @click="emit('capture')" class="icon-action-btn capture" title="Download Image">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        </button>
      </div>
      
      <div class="pro-hint">
        <span class="dot"></span> Pro Mode Ready
      </div>
    </div>

    <!-- プロモード UI (既存) -->
    <div v-else class="pro-mode-content">
      <h2 class="text-xl font-bold mb-4 pb-2 border-b border-gray-700 hidden md:block">Pro Mode Settings</h2>

      <!-- タブヘッダー -->
      <div class="tabs-header mb-4">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          class="tab-btn"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="tab-content">
        <!-- データタブ -->
        <div v-if="activeTab === 'data'">
          <div class="control-group">
            <label>ファイルをアップロード</label>
            <input type="file" @change="handleFileUpload" accept=".obj,.glb,.gltf" class="text-xs">
          </div>

          <div class="section-title">サンプリング</div>
          <div class="control-group">
            <label class="flex justify-between items-end">
              <div>点数 <span class="text-cyan-400 font-bold ml-1">{{ localConfig.targetPoints }}</span></div>
              <div class="text-[10px] text-gray-500 mb-0.5">Stats: {{ pointStats.original }} &rarr; {{ pointStats.sampled }}</div>
            </label>
            <input type="range" v-model.number="sliderValue" min="0" max="100" step="any">
            <div class="flex gap-4 mt-2">
              <label class="flex items-center gap-1"><input type="radio" v-model="localConfig.samplingMode" value="interval"> 等間隔</label>
              <label class="flex items-center gap-1"><input type="radio" v-model="localConfig.samplingMode" value="random"> ランダム</label>
            </div>
          </div>

          <div class="section-title">接続モード</div>
          <div class="control-group">
            <select v-model="localConfig.connectionMode" class="mb-2">
              <option value="index">記録順</option>
              <option value="contour">等高線</option>
              <option value="cluster">クラスタリング</option>
              <option value="nearest">経路探索</option>
            </select>

            <div v-if="localConfig.connectionMode === 'contour'" class="mode-specific active">
              <label>スライス方向</label>
              <select v-model="localConfig.sliceAxis">
                <option value="y">Y軸</option>
                <option value="x">X軸</option>
                <option value="z">Z軸</option>
              </select>
              <label class="flex justify-between">分割数 <span>{{ localConfig.sliceCount }}</span></label>
              <input type="range" v-model.number="localConfig.sliceCount" min="5" max="200">
            </div>

            <div v-if="localConfig.connectionMode === 'cluster'" class="mode-specific active">
              <label class="flex justify-between">クラスタ数 <span>{{ localConfig.clusterCount }}</span></label>
              <input type="range" v-model.number="localConfig.clusterCount" min="2" max="50">
            </div>
          </div>
        </div>

        <!-- 表示タブ -->
        <div v-if="activeTab === 'view'">
          <div class="control-group">
            <div class="flex justify-between items-center mb-4">
              <label class="mb-0">背景色</label>
              <input type="color" v-model="localConfig.colors.background" class="w-12 h-6 bg-transparent">
            </div>
            
            <div class="flex justify-between items-center mb-2">
              <label class="mb-0 flex items-center gap-2">
                <input type="checkbox" v-model="localConfig.showRaw"> 元データ
              </label>
              <input type="range" v-model.number="localConfig.rawPointSize" min="0.01" max="0.5" step="0.01" class="w-24">
            </div>
            
            <div class="flex justify-between items-center mb-4">
              <label class="mb-0 flex items-center gap-2">
                <input type="checkbox" v-model="localConfig.showFeatures"> 特徴点
              </label>
              <input type="range" v-model.number="localConfig.featurePointSize" min="0.01" max="1.0" step="0.01" class="w-24">
            </div>

            <label class="flex items-center gap-2 mb-2">
              <input type="checkbox" v-model="localConfig.showGrid"> グリッド表示
            </label>

            <label class="mb-1">床のスタイル</label>
            <div class="flex gap-4">
              <label class="flex items-center gap-1"><input type="radio" v-model="localConfig.floorMode" value="none"> なし</label>
              <label class="flex items-center gap-1"><input type="radio" v-model="localConfig.floorMode" value="matte"> Matte</label>
              <label class="flex items-center gap-1"><input type="radio" v-model="localConfig.floorMode" value="reflector"> 反射</label>
            </div>
          </div>
        </div>

        <!-- 曲線タブ -->
        <div v-if="activeTab === 'curve'">
          <div class="control-group">
            <div class="flex justify-between items-center mb-4">
              <label class="mb-0 flex items-center gap-2">
                <input type="checkbox" v-model="localConfig.showCurve"> 曲線
              </label>
              <input type="color" v-model="localConfig.colors.curve" class="w-12 h-6 bg-transparent">
            </div>
            
            <label class="flex justify-between">張力 <span>{{ localConfig.curveTension }}</span></label>
            <input type="range" v-model.number="localConfig.curveTension" min="0" max="1" step="0.1" class="mb-4">
            
            <label class="flex items-center gap-2 mb-2">
              <input type="checkbox" v-model="localConfig.enableShadow"> 厚み (チューブ)
            </label>

            <div v-if="localConfig.enableShadow" class="pl-4 border-l border-gray-600 mt-2 mb-4">
                <label class="flex justify-between">太さ <span>{{ localConfig.tubeRadius }}</span></label>
                <input type="range" v-model.number="localConfig.tubeRadius" min="0.001" max="0.5" step="0.001">
            </div>
            
            <label class="flex items-center gap-2 mb-2">
              <input type="checkbox" v-model="localConfig.enableBloom"> 発光 (Bloom)
            </label>
            
            <div v-if="localConfig.enableBloom" class="pl-4 border-l border-gray-600 mt-2">
              <label class="flex justify-between">強度 <span>{{ localConfig.bloomStrength }}</span></label>
              <input type="range" v-model.number="localConfig.bloomStrength" min="0" max="3" step="0.1">
            </div>
          </div>
        </div>

        <!-- ツールタブ -->
        <div v-if="activeTab === 'tool'">
          <div class="flex flex-col gap-2 mb-4">
            <button @click="emit('demo')" class="secondary py-3">デモデータをロード</button>
            <button @click="emit('reset')" class="secondary py-3">全体を表示</button>
            <button @click="emit('random-all')" class="py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white border-none">全ランダム生成 🎲</button>
          </div>
          <button @click="emit('capture')" class="w-full bg-green-600 text-white py-4 rounded-lg font-bold">画像を保存 📷</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ui-panel {
    position: absolute;
    top: 20px;
    right: 20px;
    background: rgba(10, 10, 18, 0.9);
    padding: 24px;
    border-radius: 20px;
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    width: 320px;
    box-shadow: 0 15px 50px rgba(0, 0, 0, 0.8);
    max-height: 90vh;
    overflow-y: auto;
    z-index: 20;
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 簡易モードの独自スタイル */
.mode-simple {
    width: 240px; /* さらに細身に */
    padding: 18px;
    border: 1px solid rgba(0, 255, 255, 0.15);
}

.simple-mode-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.simple-settings-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
}

.simple-label {
    font-size: 11px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.4);
    text-transform: uppercase;
    letter-spacing: 1px;
}

.simple-sampling-row {
    margin-bottom: 20px;
}

.compact-select {
    width: 100%;
    background: rgba(255, 255, 255, 0.05);
    color: #00ffff;
    border: 1px solid rgba(0, 255, 255, 0.2);
    border-radius: 10px;
    padding: 10px 12px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2300ffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 8px center;
    background-size: 14px;
}

.color-picker-wrapper {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    overflow: hidden;
    position: relative;
    background: rgba(255, 255, 255, 0.05);
}

.color-picker-wrapper input[type="color"] {
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    cursor: pointer;
    border: none;
}

.simple-actions-row {
    display: flex;
    gap: 12px;
}

.icon-action-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 54px;
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.03);
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    color: rgba(255, 255, 255, 0.6);
}

.icon-action-btn:hover {
    transform: scale(1.02) translateY(-1px);
    background: rgba(255, 255, 255, 0.07);
    border-color: rgba(0, 255, 255, 0.3);
    color: #00ffff;
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.1);
}

.icon-action-btn:active {
    transform: scale(0.98);
}

.pro-hint {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.3);
    text-align: center;
    margin-top: 4px;
    letter-spacing: 0.5px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
}

.pro-hint .dot {
    width: 4px;
    height: 4px;
    background: #00ffff;
    border-radius: 50%;
    box-shadow: 0 0 5px #00ffff;
}

.mini-range {
    width: 100%;
    height: 4px;
}

/* プロモード用共有スタイル */
.tabs-header {
  display: flex;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 4px;
  gap: 4px;
}

.tab-btn {
  flex: 1;
  font-size: 0.75rem;
  padding: 8px 0;
  border-radius: 6px;
  background: transparent;
  color: #888;
}

.tab-btn.active {
  background: #444;
  color: #00ffff;
}

.control-group {
    margin-bottom: 24px;
}

.section-title {
    font-size: 0.85rem;
    font-weight: bold;
    margin-top: 15px;
    margin-bottom: 10px;
    color: #00ffff;
    border-left: 3px solid #00ffff;
    padding-left: 8px;
    opacity: 0.8;
}

label {
    display: block;
    font-size: 0.8rem;
    margin-bottom: 8px;
    color: #ccc;
}

input[type="range"] {
    width: 100%;
}

select {
    width: 100%;
    background: #333;
    color: white;
    border: 1px solid #555;
    border-radius: 4px;
    padding: 8px;
}

button {
    width: 100%;
    border-radius: 6px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s;
}

button.secondary {
    background: #333;
    color: #fff;
    border: 1px solid #555;
}

.mobile-handle {
    display: none;
}

/* モバイル対応スタイル */
@media (max-width: 767px) {
    .ui-panel {
        top: auto;
        right: 0;
        bottom: 0;
        width: 100%;
        max-height: 85vh;
        border-radius: 30px 30px 0 0;
        transform: translateY(calc(100% - 50px));
        padding-top: 0;
        overflow-y: visible;
        background: rgba(10, 10, 18, 0.95);
    }

    .ui-panel.mode-simple {
        width: 100%;
        padding: 0 0 10px 0; /* ハンドルエリアを確保 */
    }

    .ui-panel.is-open {
        transform: translateY(0);
    }

    .mobile-handle {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 50px;
        cursor: pointer;
        background: transparent;
    }

    .handle-bar {
        width: 40px;
        height: 5px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
        margin-bottom: 6px;
    }

    .handle-text {
        font-size: 10px;
        color: rgba(255, 255, 255, 0.4);
        text-transform: uppercase;
        letter-spacing: 1.5px;
        font-weight: 700;
    }

    .simple-mode-content {
        padding: 10px 24px 30px;
    }

    .tab-content, .pro-mode-content {
        padding: 0 24px 30px;
        max-height: calc(85vh - 60px);
        overflow-y: auto;
    }

    .tabs-header {
        margin: 0 24px 15px;
    }
}
</style>
