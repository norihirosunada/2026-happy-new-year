<script setup>
import { reactive, ref, onMounted, onUnmounted } from 'vue'
import ThreeViewport from './components/ThreeViewport.vue'
import ControlPanel from './components/ControlPanel.vue'
import horseModelUrl from './assets/horse_head.glb?url'

const initialConnectionMode = Math.random() > 0.5 ? 'nearest' : 'contour'
const axes = ['x', 'y', 'z']
const initialSliceAxis = axes[Math.floor(Math.random() * axes.length)]
const initialSliceCount = Math.floor(Math.random() * 100) + 20

const config = reactive({
    connectionMode: initialConnectionMode,
    samplingMode: 'random',
    targetPoints: Math.floor(Math.random() * 4500) + 500,
    curveTension: 0.5,
    rawPointSize: 0.15,
    featurePointSize: 0.5,
    sliceCount: initialSliceCount,
    sliceAxis: initialSliceAxis,
    clusterCount: 10,
    enableBloom: true,
    bloomStrength: 1.5,
    bloomThreshold: 0,
    bloomRadius: 0.5,
    floorMode: 'matte',
    enableTubeEmissive: true,
    enableAmbientLight: false,
    enableSpotLight: false,
    enableDirectionalLight: false,
    enableShadow: true,
    tubeRadius: 0.0005,
    tubeRadialSegments: 6,
    maxPointsLimit: 5000,
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
        curve: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
        background: '#050505'
    }
})

const viewport = ref(null)
const isDrawerOpen = ref(false)
const uiMode = ref('simple')
const pointStats = reactive({ original: 0, sampled: 0 })

const onStatsUpdate = (stats) => {
    // モデル読み込み時（または点数が大きく変わった時）のみ自動調整を許可する
    const isModelLoaded = pointStats.original === 0 || Math.abs(stats.original - pointStats.original) > 10
    
    pointStats.original = stats.original
    pointStats.sampled = stats.sampled

    // 簡易モード時、かつモデル読み込み直後のみ、適正な目標点数（3000点など）にセット
    if (uiMode.value === 'simple' && isModelLoaded) {
        // 目標点数が極端に少ない、または多すぎる場合は3000点にリセット
        if (config.targetPoints > 20000 || config.targetPoints < 100) {
            config.targetPoints = 3000
        }
    }
}

const onCapture = () => viewport.value?.takeScreenshot()
const onDemo = () => viewport.value?.generateDemoData()
const onReset = () => viewport.value?.fitCamera()
const onFileUpload = (file) => viewport.value?.loadFile(file)

const onRandomAll = () => {
    if (pointStats.original === 0) return

    if (uiMode.value === 'simple') {
        // 簡易モード時：8つのスナップポイントからランダムに選択
        const SIMPLE_STEPS = [100, 500, 1000, 1500, 2000, 3000, 4000, 5000]
        config.targetPoints = SIMPLE_STEPS[Math.floor(Math.random() * SIMPLE_STEPS.length)]
    } else {
        // プロモード時：目標点数を 500〜5,000点 の範囲でランダム化
        config.targetPoints = Math.floor(Math.random() * 4500) + 500
    }
    config.colors.curve = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
    
    // 接続モードもランダムに
    config.connectionMode = Math.random() > 0.5 ? 'nearest' : 'contour'
    
    // 等高線モードの場合は軸と分割数もランダムに
    if (config.connectionMode === 'contour') {
        const axes = ['x', 'y', 'z']
        config.sliceAxis = axes[Math.floor(Math.random() * axes.length)]
        config.sliceCount = Math.floor(Math.random() * 100) + 20 // 20〜120分割
    }
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
        viewport.value?.loadFromUrl(horseModelUrl)
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
        @toggle-mode="uiMode = uiMode === 'simple' ? 'pro' : 'simple'"
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
