<script setup>
import { reactive, ref } from 'vue'
import ThreeViewport from './components/ThreeViewport.vue'
import ControlPanel from './components/ControlPanel.vue'

const config = reactive({
    connectionMode: 'index',
    samplingMode: 'interval',
    sampleRate: 20,
    curveTension: 0.5,
    rawPointSize: 0.15,
    featurePointSize: 0.5,
    sliceCount: 50,
    sliceAxis: 'y',
    clusterCount: 10,
    enableBloom: false,
    bloomStrength: 1.5,
    bloomThreshold: 0,
    bloomRadius: 0.5,
    floorMode: 'none',
    enableShadow: false,
    tubeRadius: 0.2,
    tubeRadialSegments: 6,
    maxPointsLimit: 20000,
    captureAspect: '16:9',
    captureOrientation: 'landscape',
    showGuide: true,
    showRaw: true,
    showFeatures: true,
    showCurve: true,
    colors: {
        raw: '#666666',
        feature: '#ff0055',
        curve: '#00ffff',
        background: '#222222'
    }
})

const viewport = ref(null)

const onCapture = () => viewport.value?.takeScreenshot()
const onDemo = () => viewport.value?.generateDemoData()
const onReset = () => viewport.value?.fitCamera()
const onFileUpload = (file) => viewport.value?.loadFile(file)

const onRandomAll = () => {
    config.sampleRate = Math.floor(Math.random() * 100) + 1
    config.colors.curve = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
    onDemo()
}
</script>

<template>
  <div class="app-container">
    <ThreeViewport ref="viewport" :config="config" />
    <ControlPanel 
        v-model:config="config" 
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
