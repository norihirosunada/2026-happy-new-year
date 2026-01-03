<script setup>
import { onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { Reflector } from 'three/addons/objects/Reflector.js'
import { sortPointsByNearest, sortPointsByCluster, sortPointsByContour } from '../utils/algorithms'

const props = defineProps({
    config: Object
})

const emit = defineEmits(['stats-update'])

const container = ref(null)
let scene, camera, renderer, composer, bloomPass, controls, gridHelper
let matteFloor, reflectorFloor
let rawPointCloud, featurePointsMesh, smoothCurveMesh
let originalPoints = []
let workingPoints = []
let sortedPoints = []

// --- Initialization ---
const init = () => {
    scene = new THREE.Scene()
    scene.background = new THREE.Color(props.config.colors.background)

    gridHelper = new THREE.GridHelper(100, 50, 0x333333, 0x111111)
    scene.add(gridHelper)

    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(container.value.clientWidth, container.value.clientHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.value.appendChild(renderer.domElement)

    camera = new THREE.PerspectiveCamera(45, container.value.clientWidth / container.value.clientHeight, 0.1, 5000)
    camera.position.set(20, 20, 40)

    createFloors()

    const renderScene = new RenderPass(scene, camera)
    bloomPass = new UnrealBloomPass(new THREE.Vector2(container.value.clientWidth, container.value.clientHeight), 1.5, 0.4, 0.85)
    updateBloomSettings()

    composer = new EffectComposer(renderer)
    composer.addPass(renderScene)
    composer.addPass(bloomPass)

    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    scene.add(ambientLight)
    const spotLight = new THREE.SpotLight(0xffffff, 2000)
    spotLight.position.set(0, 100, 0)
    spotLight.castShadow = true
    scene.add(spotLight)
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5)
    dirLight.position.set(50, 50, 50)
    scene.add(dirLight)

    animate()
}

const createFloors = () => {
    const geo = new THREE.PlaneGeometry(500, 500)
    const mat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 1.0 })
    matteFloor = new THREE.Mesh(geo, mat)
    matteFloor.rotation.x = -Math.PI / 2
    matteFloor.position.y = -0.2
    matteFloor.receiveShadow = true
    scene.add(matteFloor)

    reflectorFloor = new Reflector(new THREE.PlaneGeometry(300, 300), {
        clipBias: 0.003,
        textureWidth: container.value.clientWidth * window.devicePixelRatio,
        textureHeight: container.value.clientHeight * window.devicePixelRatio,
        color: 0x888888
    })
    reflectorFloor.rotation.x = -Math.PI / 2
    reflectorFloor.position.y = -0.1
    scene.add(reflectorFloor)
    
    updateFloorVisibility()
}

const updateFloorVisibility = () => {
    if (matteFloor) matteFloor.visible = (props.config.floorMode === 'matte')
    if (reflectorFloor) reflectorFloor.visible = (props.config.floorMode === 'reflector')
    if (gridHelper) gridHelper.visible = props.config.showGrid !== false
}

const updateBloomSettings = () => {
    if (!bloomPass) return
    bloomPass.strength = props.config.bloomStrength
    bloomPass.threshold = props.config.bloomThreshold
    bloomPass.radius = props.config.bloomRadius
}

const animate = () => {
    requestAnimationFrame(animate)
    controls.update()
    if (props.config.enableBloom) composer.render()
    else renderer.render(scene, camera)
}

// --- Data Loading ---
const loadFile = (file) => {
    const reader = new FileReader()
    if (file.name.endsWith('.obj')) {
        reader.onload = (e) => {
            const loader = new OBJLoader()
            const object = loader.parse(e.target.result)
            extractPoints(object)
        }
        reader.readAsText(file)
    } else {
        reader.onload = (e) => {
            const loader = new GLTFLoader()
            loader.parse(e.target.result, '', (gltf) => {
                extractPoints(gltf.scene)
            })
        }
        reader.readAsArrayBuffer(file)
    }
}

const loadFromUrl = (url) => {
    if (url.endsWith('.obj')) {
        const loader = new OBJLoader()
        loader.load(url, (object) => {
            extractPoints(object)
        })
    } else {
        const loader = new GLTFLoader()
        loader.load(url, (gltf) => {
            extractPoints(gltf.scene)
        })
    }
}

const extractPoints = (object) => {
    originalPoints = []
    object.traverse((child) => {
        if (child.isMesh) {
            const pos = child.geometry.attributes.position
            for (let i = 0; i < pos.count; i++) {
                originalPoints.push(new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)))
            }
        }
    })
    fitCamera()
    updatePipeline()
}

const generateDemoData = () => {
    originalPoints = []
    const centers = [new THREE.Vector3(0, 5, 0), new THREE.Vector3(15, 10, 5), new THREE.Vector3(-15, 5, 5), new THREE.Vector3(0, 15, -10)]
    centers.forEach(center => {
        for (let i = 0; i < 800; i++) {
            const t = (i / 800) * Math.PI * 8
            const r = 5 + Math.random() * 2
            const x = center.x + r * Math.cos(t)
            const y = center.y + (Math.random() - 0.5) * 5 + i / 50
            const z = center.z + r * Math.sin(t)
            originalPoints.push(new THREE.Vector3(x, y, z).add(new THREE.Vector3((Math.random() - 0.5)*0.8, (Math.random() - 0.5)*0.8, (Math.random() - 0.5)*0.8)))
        }
    })
    updatePipeline()
}

const fitCamera = () => {
    const points = originalPoints.length > 0 ? originalPoints : sortedPoints
    if (points.length === 0) return
    const box = new THREE.Box3().setFromPoints(points)
    const center = new THREE.Vector3(); box.getCenter(center)
    const size = new THREE.Vector3(); box.getSize(size)
    const maxDim = Math.max(size.x, size.y, size.z)
    const fov = camera.fov * (Math.PI / 180)
    let cameraDist = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5
    camera.position.copy(center.clone().add(new THREE.Vector3(maxDim * 0.5, maxDim * 0.5, cameraDist)))
    camera.lookAt(center); controls.target.copy(center); controls.update()
}

const takeScreenshot = () => {
    const originalSize = { width: container.value.clientWidth, height: container.value.clientHeight }
    // Simplify for Vue: just render current size or handle resizing
    if (props.config.enableBloom) composer.render()
    else renderer.render(scene, camera)
    const dataURL = renderer.domElement.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `3d_capture_${Date.now()}.png`
    link.href = dataURL
    link.click()
}

// --- Pipeline ---
const updatePipeline = () => {
    if (originalPoints.length === 0) return
    workingPoints = getSampledPointsCandidate()
    performSorting()
    updateVisuals()
    emit('stats-update', {
        original: originalPoints.length,
        sampled: workingPoints.length
    })
}

const getSampledPointsCandidate = () => {
    const points = []
    const sampleRate = parseInt(props.config.sampleRate)
    const totalPoints = originalPoints.length
    if (props.config.samplingMode === 'random') {
        let targetCount = Math.max(2, Math.floor(totalPoints / sampleRate))
        const indices = new Set()
        while (indices.size < targetCount && indices.size < totalPoints) { indices.add(Math.floor(Math.random() * totalPoints)) }
        const sortedIndices = Array.from(indices).sort((a, b) => a - b)
        for (const idx of sortedIndices) points.push(originalPoints[idx].clone())
    } else {
        const windowSize = Math.max(1, Math.floor(sampleRate / 2))
        for (let i = 0; i < totalPoints; i += sampleRate) {
            let avg = new THREE.Vector3(0, 0, 0); let count = 0
            const start = Math.max(0, i - windowSize), end = Math.min(totalPoints - 1, i + windowSize)
            for (let j = start; j <= end; j++) { avg.add(originalPoints[j]); count++ }
            if (count > 0) points.push(avg.divideScalar(count))
        }
    }
    return points
}

const performSorting = () => {
    if (props.config.connectionMode === 'nearest') sortedPoints = sortPointsByNearest(workingPoints)
    else if (props.config.connectionMode === 'cluster') sortedPoints = sortPointsByCluster(workingPoints, props.config.clusterCount)
    else if (props.config.connectionMode === 'contour') sortedPoints = sortPointsByContour(workingPoints, props.config.sliceAxis, props.config.sliceCount)
    else sortedPoints = [...workingPoints]
}

const updateVisuals = () => {
    if (rawPointCloud) scene.remove(rawPointCloud)
    if (featurePointsMesh) scene.remove(featurePointsMesh)
    if (smoothCurveMesh) scene.remove(smoothCurveMesh)

    if (props.config.showRaw) {
        const geo = new THREE.BufferGeometry().setFromPoints(originalPoints)
        const mat = new THREE.PointsMaterial({ color: props.config.colors.raw, size: props.config.rawPointSize })
        rawPointCloud = new THREE.Points(geo, mat)
        scene.add(rawPointCloud)
    }
    if (sortedPoints.length < 2) return
    
    if (props.config.showFeatures) {
        const geo = new THREE.BufferGeometry().setFromPoints(sortedPoints)
        const mat = new THREE.PointsMaterial({ color: props.config.colors.feature, size: props.config.featurePointSize })
        featurePointsMesh = new THREE.Points(geo, mat)
        scene.add(featurePointsMesh)
    }

    if (props.config.showCurve) {
        const curve = new THREE.CatmullRomCurve3(sortedPoints)
        curve.tension = props.config.curveTension
        const division = Math.min(sortedPoints.length * 10, 40000)
        
        const needsTube = props.config.enableShadow || props.config.floorMode !== 'none'
        if (needsTube) {
            const tubeGeo = new THREE.TubeGeometry(curve, division / 2, props.config.tubeRadius, props.config.tubeRadialSegments, false)
            const tubeMat = new THREE.MeshStandardMaterial({ 
                color: props.config.colors.curve, 
                roughness: 0.3, 
                metalness: 0.5,
                emissive: props.config.enableBloom ? props.config.colors.curve : 0x000000,
                emissiveIntensity: props.config.enableBloom ? 0.5 : 0
            })
            smoothCurveMesh = new THREE.Mesh(tubeGeo, tubeMat)
            smoothCurveMesh.castShadow = true
        } else {
            const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(division))
            const mat = new THREE.LineBasicMaterial({ color: props.config.colors.curve })
            smoothCurveMesh = new THREE.Line(geo, mat)
        }
        scene.add(smoothCurveMesh)
    }
}

// Watchers
watch(() => props.config.sampleRate, updatePipeline)
watch(() => props.config.connectionMode, updatePipeline)
watch(() => props.config.samplingMode, updatePipeline)
watch(() => props.config.sliceAxis, updatePipeline)
watch(() => props.config.sliceCount, updatePipeline)
watch(() => props.config.clusterCount, updatePipeline)
watch(() => props.config.curveTension, updateVisuals)
watch(() => props.config.rawPointSize, updateVisuals)
watch(() => props.config.featurePointSize, updateVisuals)
watch(() => props.config.showRaw, updateVisuals)
watch(() => props.config.showFeatures, updateVisuals)
watch(() => props.config.showCurve, updateVisuals)
watch(() => props.config.floorMode, () => { updateFloorVisibility(); updateVisuals() })
watch(() => props.config.bloomStrength, updateBloomSettings)
watch(() => props.config.colors.background, (val) => scene.background.set(val))
watch(() => props.config.colors.curve, updateVisuals)

defineExpose({ generateDemoData, fitCamera, takeScreenshot, loadFile, loadFromUrl })

onMounted(() => {
    init()
    generateDemoData()
    window.addEventListener('resize', () => {
        if (!container.value) return
        renderer.setSize(container.value.clientWidth, container.value.clientHeight)
        composer.setSize(container.value.clientWidth, container.value.clientHeight)
        camera.aspect = container.value.clientWidth / container.value.clientHeight
        camera.updateProjectionMatrix()
    })
})
</script>

<template>
  <div ref="container" class="three-container"></div>
</template>

<style scoped>
.three-container { width: 100%; height: 100%; }
</style>
