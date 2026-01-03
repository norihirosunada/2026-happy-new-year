<script setup>
import { reactive, ref, onMounted, onUnmounted } from 'vue'
import ThreeViewport from './components/ThreeViewport.vue'
import ControlPanel from './components/ControlPanel.vue'

const config = reactive({
    connectionMode: 'nearest',
    samplingMode: 'random',
    sampleRate: 100,
    curveTension: 0.5,
    rawPointSize: 0.15,
    featurePointSize: 0.5,
    sliceCount: 50,
    sliceAxis: 'y',
    clusterCount: 10,
    enableBloom: true,
    bloomStrength: 1.5,
    bloomThreshold: 0,
    bloomRadius: 0.5,
    floorMode: 'matte',
    enableShadow: true,
    tubeRadius: 0.0005,
    tubeRadialSegments: 6,
    maxPointsLimit: 20000,
    captureAspect: '16:9',
    captureOrientation: 'landscape',
    showGuide: true,
    showRaw: false,
    showFeatures: false,
    showCurve: true,
    showGrid: false,
    colors: {
        raw: '#666666',
        feature: '#ff0055',
        curve: '#00ffff',
        background: '#050505'
    }
})

const viewport = ref(null)
const isDrawerOpen = ref(false)
const uiMode = ref('simple')
const pointStats = reactive({ original: 0, sampled: 0 })

const onStatsUpdate = (stats) => {
    // Simpleモードかつモデル読み込み時（または点数が大きく変わった時）に
    // サンプリング後の点数が 100〜5000 の範囲に収まるよう調整しつつ、レート自体は 100 以上を維持
    if (uiMode.value === 'simple' && (pointStats.original === 0 || Math.abs(stats.original - pointStats.original) > 100)) {
        let targetRate = Math.floor(stats.original / 2000) // 理想は2000点付近
        targetRate = Math.max(100, Math.min(500, targetRate)) // 最低レート100を確保
        
        if (config.sampleRate !== targetRate) {
            config.sampleRate = targetRate
        }
    }
    pointStats.original = stats.original
    pointStats.sampled = stats.sampled
}

const onCapture = () => viewport.value?.takeScreenshot()
const onDemo = () => viewport.value?.generateDemoData()
const onReset = () => viewport.value?.fitCamera()
const onFileUpload = (file) => viewport.value?.loadFile(file)

const onRandomAll = () => {
    // 100以上のレートかつ、結果が100〜5000点に収まる範囲を制限
    const minRate = Math.max(100, Math.floor(pointStats.original / 5000))
    const maxRate = Math.min(500, Math.max(minRate, Math.floor(pointStats.original / 100)))
    
    config.sampleRate = Math.floor(Math.random() * (maxRate - minRate + 1)) + minRate
    config.colors.curve = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
    // 接続モードもランダムに（Simpleモードで選べる nearest か contour）
    config.connectionMode = Math.random() > 0.5 ? 'nearest' : 'contour'
}

// キーボードショートカットでプロモード切り替え
const handleKeydown = (e) => {
    // Control + Shift + P または Command + Shift + P で切り替え
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault() // ブラウザのデフォルト挙動（シークレットウィンドウ等）を回避試行
        uiMode.value = uiMode.value === 'simple' ? 'pro' : 'simple'
        console.log(`UI Mode: ${uiMode.value.toUpperCase()}`)
    }
}

onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
    // 初期モデル読み込み
    setTimeout(() => {
        viewport.value?.loadFromUrl('/src/public/horse_head.glb')
    }, 500)
})

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="app-container">
    <ThreeViewport ref="viewport" :config="config" @stats-update="onStatsUpdate" />
    
    <ControlPanel 
        v-model:config="config" 
        :isOpen="isDrawerOpen"
        :uiMode="uiMode"
        :pointStats="pointStats"
        @update:isOpen="isDrawerOpen = $event"
        @capture="onCapture" 
        @demo="onDemo" 
        @reset="onReset"
        @file-upload="onFileUpload"
        @random-all="onRandomAll"
    />
  </div>
</template>

<style>
body {
    margin: 0;
    overflow: hidden;
    background-color: #050505;
    color: white;
    font-family: sans-serif;
}

.app-container {
    width: 100vw;
    height: 100vh;
    position: relative;
}
</style>
