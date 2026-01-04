<script setup>
import { reactive, ref, onMounted, onUnmounted } from 'vue'
import ThreeViewport from './components/ThreeViewport.vue'
import ControlPanel from './components/ControlPanel.vue'

const config = reactive({
    connectionMode: 'nearest',
    samplingMode: 'random',
    targetPoints: 3000,
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
    maxPointsLimit: 10000,
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

    // 目標点数を 500〜10,000点 の範囲でランダム化
    config.targetPoints = Math.floor(Math.random() * 9500) + 500
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
