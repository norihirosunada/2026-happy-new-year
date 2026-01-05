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

const emit = defineEmits(['update:config', 'update:isOpen', 'capture', 'demo', 'reset', 'random-all', 'random-camera', 'file-upload', 'toggle-mode'])

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
const MAX_POINTS = 5000
const SIMPLE_STEPS = [100, 500, 1000, 1500, 2000, 3000, 4000, 5000]

const sliderValue = computed({
  get: () => {
    const val = props.config.targetPoints || 3000
    
    if (props.uiMode === 'simple') {
      // 簡易モード時：最も近いステップのインデックス(0-7)を返す
      let closestIdx = 0
      let minDiff = Math.abs(val - SIMPLE_STEPS[0])
      for (let i = 1; i < SIMPLE_STEPS.length; i++) {
        const diff = Math.abs(val - SIMPLE_STEPS[i])
        if (diff < minDiff) {
          minDiff = diff
          closestIdx = i
        }
      }
      return closestIdx
    }
    
    // プロモード時：3次関数の逆関数で位置を計算
    const normalized = Math.max(0, (val - MIN_POINTS) / (MAX_POINTS - MIN_POINTS))
    return 100 * Math.pow(normalized, 1/3)
  },
  set: (pos) => {
    if (props.uiMode === 'simple') {
      // 簡易モード時：インデックスに基づいた値を選択
      const idx = Math.min(SIMPLE_STEPS.length - 1, Math.max(0, Math.round(pos)))
      localConfig.value.targetPoints = SIMPLE_STEPS[idx]
      return
    }
    
    // プロモード時：3乗のカーブを採用することで、低〜中密度域の変化をより「緩やか」にする
    const val = Math.round(MIN_POINTS + (MAX_POINTS - MIN_POINTS) * Math.pow(pos / 100, 3))
    localConfig.value.targetPoints = val
  }
})

// アクセントカラーに対するコントラストカラー（黒 or 白）を計算
const contrastColor = computed(() => {
  const hex = localConfig.value.colors.curve.replace('#', '')
  if (hex.length !== 6) return '#ffffff'
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  // 近似輝度の計算 (W3C推奨の係数を使用)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#111111' : '#ffffff'
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
    :style="{ 
      '--accent-color': localConfig.colors.curve,
      '--accent-contrast-color': contrastColor 
    }"
    ref="panel"
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
        <div class="slider-container">
          <input 
            type="range" 
            v-model.number="sliderValue" 
            :min="0" 
            :max="props.uiMode === 'simple' ? 7 : 100" 
            :step="props.uiMode === 'simple' ? 1 : 'any'"
            class="mini-range"
          />
          <div v-if="props.uiMode === 'simple'" class="slider-ticks">
            <span v-for="i in 8" :key="i" class="tick-dot"></span>
          </div>
        </div>
      </div>

      <div class="simple-actions-row">
        <button @click="emit('random-all')" class="primary-btn" title="Randomize">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg>
          <span>Shuffle</span>
        </button>
        <button @click="emit('capture')" class="minimal-icon-btn" title="Download Image">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        </button>
      </div>
      
      <div class="pro-hint" @click="emit('toggle-mode')">
        <span class="dot"></span> Dev Mode ⇧⌘P
      </div>
    </div>

    <!-- プロモード UI (既存) -->
    <div v-else class="pro-mode-content">
      <div class="flex justify-end items-center mb-4 pb-2">
          <button @click="emit('toggle-mode')" class="close-icon-btn" title="Exit Pro Mode">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
      </div>

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

            <div class="section-title mt-6">ライティング</div>
            <div class="flex flex-col gap-2">
                <label class="flex items-center gap-2 mb-0">
                    <input type="checkbox" v-model="localConfig.enableAmbientLight"> 環境光 (Ambient)
                </label>
                <label class="flex items-center gap-2 mb-0">
                    <input type="checkbox" v-model="localConfig.enableSpotLight"> スポットライト (Main)
                </label>
                <label class="flex items-center gap-2 mb-0">
                    <input type="checkbox" v-model="localConfig.enableDirectionalLight"> 並行光 (Sub)
                </label>
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
                <input type="range" v-model.number="localConfig.tubeRadius" min="0.001" max="0.5" step="0.001" class="mb-2">
                
                <label class="flex items-center gap-2 mb-1">
                  <input type="checkbox" v-model="localConfig.enableTubeEmissive"> チューブ発光
                </label>
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
    top: 0;
    right: 0;
    bottom: 0;
    background: rgba(10, 10, 18, 0.9);
    padding: 32px 24px;
    border-radius: 0;
    backdrop-filter: blur(20px);
    border: none;
    border-left: 1px solid rgba(255, 255, 255, 0.08);
    width: 320px;
    box-shadow: -10px 0 30px rgba(0, 0, 0, 0.5);
    height: 100%;
    overflow-y: auto;
    z-index: 20;
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 簡易モードの独自スタイル (デスクトップ) */
.mode-simple {
    width: 280px;
    padding: 40px 20px;
    border-left: 1px solid rgba(0, 255, 255, 0.15);
    display: flex;
    flex-direction: column;
}

.simple-mode-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.simple-settings-row {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 20px;
}

.slider-container {
    flex: 1;
    position: relative;
}

.slider-ticks {
    display: flex;
    justify-content: space-between;
    padding: 0 5px;
    margin-top: 2px;
}

.tick-dot {
    width: 3px;
    height: 3px;
    background: color-mix(in srgb, var(--accent-color), transparent 70%);
    border-radius: 50%;
}

.compact-select {
    width: 100%;
    background: rgba(255, 255, 255, 0.05);
    color: var(--accent-color);
    border: 1px solid color-mix(in srgb, var(--accent-color), transparent 80%);
    border-radius: 10px;
    padding: 10px 12px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    appearance: none;
    /* Use currentcolor for SVG or dynamic color string if needed, 
       but for simplicity we'll use a dynamic mask or just accept the border/text change.
       Actually, we can use a simpler approach for the icon if we use a mask or separate element.
       Let's use a standard arrow that doesn't rely on hardcoded colors in the URL. */
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 8px center;
    background-size: 14px;
    opacity: 0.8;
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
    align-items: center;
    gap: 16px;
    margin-top: 4px;
}

.primary-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 44px;
    border-radius: 22px;
    border: none;
    background: var(--accent-color);
    color: var(--accent-contrast-color);
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 12px color-mix(in srgb, var(--accent-color), transparent 70%);
}

.primary-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px color-mix(in srgb, var(--accent-color), transparent 60%);
    filter: brightness(1.1);
}

.primary-btn:active {
    transform: translateY(0);
}

.minimal-icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: color-mix(in srgb, var(--accent-color), white 40%);
    cursor: pointer;
    transition: all 0.2s ease;
    opacity: 0.7;
}

.minimal-icon-btn:hover {
    background: rgba(255, 255, 255, 0.05);
    color: var(--accent-color);
    opacity: 1;
}

.minimal-icon-btn:active {
    transform: scale(0.95);
}

.close-icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border-radius: 50%;
    border: none;
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    transition: all 0.2s ease;
}

.close-icon-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    transform: rotate(90deg);
}

.pro-hint {
    position: absolute;
    bottom: 12px;
    right: 16px;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.3);
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    transition: color 0.2s;
}

.pro-hint:hover {
    color: rgba(255, 255, 255, 0.8);
}

.pro-hint .dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--accent-color);
    box-shadow: 0 0 8px var(--accent-color);
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
  color: var(--accent-color);
}

.control-group {
    margin-bottom: 24px;
}

.section-title {
    font-size: 0.85rem;
    font-weight: bold;
    margin-top: 15px;
    margin-bottom: 10px;
    color: var(--accent-color);
    border-left: 3px solid var(--accent-color);
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
    accent-color: var(--accent-color);
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
        height: auto;
        max-height: 85svh;
        border-radius: 30px 30px 0 0;
        transform: translateY(calc(100% - 50px)); /* Proモードなどのデフォルトは隠す */
        padding: 0 24px;
        overflow-y: visible;
        background: rgba(10, 10, 18, 0.95);
        transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
    }

    /* 簡易モードは常に表示、変形なし */
    .ui-panel.mode-simple {
        transform: none !important;
        border-radius: 0;
        background: linear-gradient(to top, rgba(10, 10, 18, 1) 0%, rgba(10, 10, 18, 0.95) 70%, rgba(10, 10, 18, 0) 100%);
        /* AndroidのジェスチャーバーやブラウザのUIと重ならないよう底面32pxを確保 */
        padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 32px);
        padding-top: 40px; /* グラデーションの頂点をずらすための上部パディング */
    }

    .ui-panel.is-open {
        transform: translateY(0);
    }

    /* 簡易モードではハンドルを非表示 */
    .mode-simple .mobile-handle {
        display: none;
    }

    /* 簡易モードのヒント位置調整 (オーバーラップ防止) */
    .mode-simple .pro-hint {
        top: 8px;
        bottom: auto;
        right: 24px;
        opacity: 0.15;
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
        padding: 0 0 4px; /* 親のpaddingと合わせて調整 */
    }

    .simple-settings-row {
        margin-bottom: 8px; /* モバイルではさらに行間を詰めて縦幅を節約 */
    }

    .tab-content, .pro-mode-content {
        padding: 0 24px 30px;
        max-height: calc(85svh - 60px);
        overflow-y: auto;
    }

    .tabs-header {
        margin: 0 24px 15px;
    }
}
</style>
