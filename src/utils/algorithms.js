import * as THREE from 'three'

export function sortPointsByNearest(points) {
    if (points.length <= 1) return [...points]
    const sorted = []
    const remaining = points.map((p, i) => ({ point: p, index: i, visited: false }))
    let current = remaining[0]; current.visited = true; sorted.push(current.point)
    let remainCount = points.length - 1
    while (remainCount > 0) {
        let nearest = null; let minDistanceSq = Infinity
        for (let j = 0; j < remaining.length; j++) {
            const next = remaining[j]
            if (!next.visited) {
                const distSq = current.point.distanceToSquared(next.point)
                if (distSq < minDistanceSq) { minDistanceSq = distSq; nearest = next }
            }
        }
        if (nearest) {
            nearest.visited = true; sorted.push(nearest.point); current = nearest; remainCount--
        } else break
    }
    return sorted
}

export function sortPointsByCluster(points, clusterCount) {
    if (points.length === 0) return []
    const k = Math.min(points.length, clusterCount)
    let centroids = []
    for (let i = 0; i < k; i++) centroids.push(points[Math.floor(Math.random() * points.length)].clone())
    let clusters = Array.from({ length: k }, () => [])

    for (let iter = 0; iter < 8; iter++) {
        clusters = Array.from({ length: k }, () => [])
        points.forEach(p => {
            let minDistSq = Infinity; let clusterIdx = 0
            for (let i = 0; i < k; i++) {
                const d = p.distanceToSquared(centroids[i])
                if (d < minDistSq) { minDistSq = d; clusterIdx = i }
            }
            clusters[clusterIdx].push(p)
        })
        let changed = false
        for (let i = 0; i < k; i++) {
            if (clusters[i].length === 0) continue
            const sum = new THREE.Vector3(); clusters[i].forEach(p => sum.add(p))
            const newCentroid = sum.divideScalar(clusters[i].length)
            if (newCentroid.distanceToSquared(centroids[i]) > 0.1) { centroids[i] = newCentroid; changed = true }
        }
        if (!changed) break
    }

    const validClusters = [], validCentroids = []
    for (let i = 0; i < k; i++) { if (clusters[i].length > 0) { validClusters.push(clusters[i]); validCentroids.push(centroids[i]); } }

    let clusterOrder = []
    let remainingClusters = validClusters.map((c, i) => ({ cluster: c, centroid: validCentroids[i], visited: false }))
    let currentClusterObj = null; let minStartDist = Infinity; let startIdx = -1
    const origin = new THREE.Vector3(0, 0, 0)
    remainingClusters.forEach((c, i) => { const d = c.centroid.distanceToSquared(origin); if (d < minStartDist) { minStartDist = d; startIdx = i } })
    if (startIdx !== -1) { currentClusterObj = remainingClusters[startIdx]; currentClusterObj.visited = true; clusterOrder.push(currentClusterObj) }

    while (clusterOrder.length < validClusters.length) {
        let nearest = null; let minDistSq = Infinity
        remainingClusters.forEach(next => { if (!next.visited) { const d = currentClusterObj.centroid.distanceToSquared(next.centroid); if (d < minDistSq) { minDistSq = d; nearest = next } } })
        if (nearest) { nearest.visited = true; clusterOrder.push(nearest); currentClusterObj = nearest } else break
    }

    let sorted = []
    let lastPoint = null
    clusterOrder.forEach(obj => {
        let clusterPoints = [...obj.cluster]
        if (lastPoint) {
            let nearestIdx = -1; let minDistSq = Infinity
            for (let i = 0; i < clusterPoints.length; i++) { const d = lastPoint.distanceToSquared(clusterPoints[i]); if (d < minDistSq) { minDistSq = d; nearestIdx = i } }
            if (nearestIdx !== -1) { const temp = clusterPoints[0]; clusterPoints[0] = clusterPoints[nearestIdx]; clusterPoints[nearestIdx] = temp }
        }
        const sortedCluster = sortPointsByNearest(clusterPoints)
        for (let i = 0; i < sortedCluster.length; i++) sorted.push(sortedCluster[i])
        lastPoint = sortedCluster[sortedCluster.length - 1]
    })
    return sorted
}

export function sortPointsByContour(points, axis, sliceCount) {
    if (points.length === 0) return []
    let minVal = Infinity, maxVal = -Infinity
    points.forEach(p => { if (p[axis] < minVal) minVal = p[axis]; if (p[axis] > maxVal) maxVal = p[axis] })
    const range = maxVal - minVal; const sliceWidth = range / sliceCount
    const bins = new Array(sliceCount + 1); for (let i = 0; i < bins.length; i++) bins[i] = []
    points.forEach(p => { let binIndex = Math.floor((p[axis] - minVal) / sliceWidth); if (binIndex < 0) binIndex = 0; if (binIndex > sliceCount) binIndex = sliceCount; bins[binIndex].push(p) })

    let sorted = []
    let lastPoint = null
    bins.forEach(bin => {
        if (bin.length === 0) return
        let currentBinPoints = [...bin]
        if (lastPoint) {
            let nearestIdx = -1; let minDistSq = Infinity
            for (let i = 0; i < currentBinPoints.length; i++) { const d = lastPoint.distanceToSquared(currentBinPoints[i]); if (d < minDistSq) { minDistSq = d; nearestIdx = i } }
            if (nearestIdx !== -1) { const temp = currentBinPoints[0]; currentBinPoints[0] = currentBinPoints[nearestIdx]; currentBinPoints[nearestIdx] = temp }
        }
        const sortedBin = sortPointsByNearest(currentBinPoints)
        for (let i = 0; i < sortedBin.length; i++) sorted.push(sortedBin[i])
        lastPoint = sortedBin[sortedBin.length - 1]
    })
    return sorted
}
