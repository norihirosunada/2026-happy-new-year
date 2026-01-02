<script setup>
import { computed } from 'vue'

const props = defineProps({
  config: Object
})

const emit = defineEmits(['update:config', 'capture', 'demo', 'reset', 'random-all', 'random-camera'])

const localConfig = computed({
  get: () => props.config,
  set: (val) => emit('update:config', val)
})

const handleFileUpload = (e) => {
  const file = e.target.files[0]
  if (file) {
    // This will be handled by ThreeViewport
    // We emit an event or just let it bubbling? Actually, the logic is in ThreeViewport.
    // So we should probably emit 'file-upload'
    emit('file-upload', file)
  }
}
</script>

<template>
  <div class="ui-panel" id="main-panel">
    <h2 class="text-xl font-bold mb-4 pb-2 border-b border-gray-700">3Dデータ処理設定 (Vue)</h2>

    <!-- ファイル入力 -->
    <div class="control-group">
      <label>ファイルをアップロード (OBJ / GLB / GLTF)</label>
      <input type="file" @change="handleFileUpload" accept=".obj,.glb,.gltf">
    </div>

    <!-- サンプリング設定 -->
    <div class="section-title">1. データ処理</div>
    <div class="control-group">
      <label>
        サンプリング (処理点数の削減)
        <span class="value-display">{{ localConfig.sampleRate }}</span>
      </label>
      <input type="range" v-model.number="localConfig.sampleRate" min="1" max="500">
      <div class="flex gap-4 mt-2">
        <label><input type="radio" v-model="localConfig.samplingMode" value="interval"> 等間隔</label>
        <label><input type="radio" v-model="localConfig.samplingMode" value="random"> ランダム</label>
      </div>
    </div>

    <!-- 接続モード設定 -->
    <div class="control-group">
      <label>接続モード</label>
      <div class="flex flex-col gap-1">
        <label><input type="radio" v-model="localConfig.connectionMode" value="index"> 記録順</label>
        <label><input type="radio" v-model="localConfig.connectionMode" value="contour"> 等高線</label>
        <label><input type="radio" v-model="localConfig.connectionMode" value="cluster"> クラスタリング</label>
        <label><input type="radio" v-model="localConfig.connectionMode" value="nearest"> 経路探索</label>
      </div>

      <div v-if="localConfig.connectionMode === 'contour'" class="mode-specific active">
        <label>スライス方向</label>
        <select v-model="localConfig.sliceAxis">
          <option value="y">Y軸</option>
          <option value="x">X軸</option>
          <option value="z">Z軸</option>
        </select>
        <label>スライス分割数: {{ localConfig.sliceCount }}</label>
        <input type="range" v-model.number="localConfig.sliceCount" min="5" max="200">
      </div>

      <div v-if="localConfig.connectionMode === 'cluster'" class="mode-specific active">
        <label>クラスタ数: {{ localConfig.clusterCount }}</label>
        <input type="range" v-model.number="localConfig.clusterCount" min="2" max="50">
      </div>
    </div>

    <!-- 表示設定 -->
    <div class="section-title">2. 表示設定</div>
    <div class="control-group">
      <div class="flex justify-between items-center mb-2">
        <label>背景色</label>
        <input type="color" v-model="localConfig.colors.background">
      </div>
      <div class="flex justify-between items-center mb-2">
        <label><input type="checkbox" v-model="localConfig.showRaw"> 元データ (点群)</label>
        <input type="range" v-model.number="localConfig.rawPointSize" min="0.01" max="1.0" step="0.01" style="width: 80px;">
      </div>
      <div class="flex justify-between items-center mb-2">
        <label><input type="checkbox" v-model="localConfig.showFeatures"> 特徴点</label>
        <input type="range" v-model.number="localConfig.featurePointSize" min="0.01" max="1.0" step="0.01" style="width: 80px;">
      </div>
    </div>

    <!-- 曲線設定 -->
    <div class="section-title">3. 曲線設定</div>
    <div class="control-group">
        <div class="flex justify-between items-center mb-2">
            <label><input type="checkbox" v-model="localConfig.showCurve"> 曲線を表示</label>
            <input type="color" v-model="localConfig.colors.curve">
        </div>
        <label>張力: {{ localConfig.curveTension }}</label>
        <input type="range" v-model.number="localConfig.curveTension" min="0" max="1" step="0.1">
        
        <label class="mt-2"><input type="checkbox" v-model="localConfig.enableShadow"> 影 (チューブ化)</label>
        <label class="mt-2"><input type="checkbox" v-model="localConfig.enableBloom"> 発光 (Bloom)</label>
    </div>

    <div class="flex gap-2 mt-4">
      <button @click="emit('demo')" class="secondary py-2">デモ</button>
      <button @click="emit('reset')" class="secondary py-2">リセット</button>
      <button @click="emit('random-all')" class="py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white border-none">ランダム</button>
    </div>
    
    <button @click="emit('capture')" class="mt-4 bg-green-600 text-white py-2">画像を保存 📷</button>
  </div>
</template>

<style scoped>
.ui-panel {
    position: absolute;
    top: 20px;
    right: 20px;
    background: rgba(20, 20, 30, 0.9);
    padding: 20px;
    border-radius: 12px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    width: 320px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    max-height: 90vh;
    overflow-y: auto;
    z-index: 20;
}

.control-group {
    margin-bottom: 15px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    padding-bottom: 10px;
}

.section-title {
    font-size: 0.9rem;
    font-weight: bold;
    margin-top: 10px;
    margin-bottom: 8px;
    color: #00ffff;
    border-left: 3px solid #00ffff;
    padding-left: 8px;
}

label {
    display: block;
    font-size: 0.8rem;
    margin-bottom: 5px;
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
    padding: 4px;
    margin-bottom: 8px;
}

button {
    width: 100%;
    border-radius: 6px;
    font-weight: bold;
    cursor: pointer;
    transition: opacity 0.2s;
}

button.secondary {
    background: #333;
    color: #fff;
    border: 1px solid #555;
}

button:hover {
    opacity: 0.8;
}

.mode-specific {
    margin-top: 8px;
    padding-left: 8px;
    border-left: 2px solid #00ffff;
}
</style>
