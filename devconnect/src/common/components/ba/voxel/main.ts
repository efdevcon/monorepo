// @ts-nocheck
import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  Object3D,
  Raycaster,
  AmbientLight,
  Group,
  SpotLight,
  Vector2,
  Vector3,
  MeshLambertMaterial,
  PlaneGeometry,
  ShadowMaterial,
  Mesh,
  Color,
  Box3,
  InstancedMesh
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import gsap from 'gsap'

const initializeVoxel = () => {
  const containerEl = document.querySelector('.container')
  const canvasEl = document.querySelector('#canvas')
  const selectorEl = document.querySelector('#selector')
  const loaderEl = document.querySelector('#loader')

  let renderer, mainScene, mainCamera, mainOrbit, lightHolder, topLight
  let instancedMesh, voxelGeometry, voxelMaterial
  let dummy,
    rayCaster,
    rayCasterIntersects = []
  let previewScenes = []

  const voxelsPerModel = []
  let voxels = []

  let activeModelIdx = 4
  const modelURLs = [
    '/voxel-assets/eye.glb',
    '/voxel-assets/key.glb',
    '/voxel-assets/lightning.glb',
    '/voxel-assets/sunglasses.glb',
    '/voxel-assets/sunglasses.glb',
    '/voxel-assets/sunglasses.glb',
    
    // 'https://ksenia-k.com/models/Chili%20Pepper.glb',
    // 'https://ksenia-k.com/models/Chicken.glb',
    // 'https://ksenia-k.com/models/Cherry.glb',
    // 'https://ksenia-k.com/models/Banana%20Bundle.glb',
    // 'https://ksenia-k.com/models/Bonsai.glb',
    // 'https://ksenia-k.com/models/egg.glb',
  ]

  const params = {
    modelPreviewSize: 2,
    modelSize: 9,
    gridSize: 0.24,
    boxSize: 0.24,
    boxRoundness: 0.03,
  }

  createMainScene()
  loadModels()

  window.addEventListener('resize', updateSceneSize)

  function createMainScene() {
    renderer = new WebGLRenderer({
      canvas: canvasEl,
      alpha: true,
      antialias: true,
    })
    renderer.shadowMap.enabled = true
    renderer.shadowMapSoft = true

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setScissorTest(true)

    mainScene = new Scene()

    mainCamera = new PerspectiveCamera(45, containerEl.clientWidth / containerEl.clientHeight, 0.01, 1000)
    mainCamera.position.set(0, 0.5, 2).multiplyScalar(8)

    rayCaster = new Raycaster()
    dummy = new Object3D()

    const ambientLight = new AmbientLight(0xffffff, 0.5)
    mainScene.add(ambientLight)

    lightHolder = new Group()

    topLight = new SpotLight(0xffffff, 0.4)
    topLight.position.set(0, 15, 3)
    topLight.castShadow = true
    topLight.shadow.camera.near = 10
    topLight.shadow.camera.far = 30
    topLight.shadow.mapSize = new Vector2(1024, 1024)
    lightHolder.add(topLight)

    const sideLight = new SpotLight(0xffffff, 0.4)
    sideLight.position.set(0, -4, 5)
    lightHolder.add(sideLight)

    mainScene.add(lightHolder)

    mainOrbit = new OrbitControls(mainCamera, containerEl)
    mainOrbit.enablePan = false
    mainOrbit.autoRotate = true
    mainOrbit.minDistance = 20
    mainOrbit.maxDistance = 30
    mainOrbit.minPolarAngle = 0.35 * Math.PI
    mainOrbit.maxPolarAngle = 0.65 * Math.PI
    mainOrbit.enableDamping = true

    voxelGeometry = new RoundedBoxGeometry(params.boxSize, params.boxSize, params.boxSize, 2, params.boxRoundness)
    voxelMaterial = new MeshLambertMaterial({})

    const planeGeometry = new PlaneGeometry(35, 35)
    const shadowPlaneMaterial = new ShadowMaterial({
      opacity: 0.1,
    })
    const shadowPlaneMesh = new Mesh(planeGeometry, shadowPlaneMaterial)
    shadowPlaneMesh.position.y = -4
    shadowPlaneMesh.rotation.x = -0.5 * Math.PI
    shadowPlaneMesh.receiveShadow = true

    lightHolder.add(shadowPlaneMesh)
  }

  function createPreviewScene(modelIdx) {
    const scene = new Scene()

    scene.background = new Color().setHSL(modelIdx / modelURLs.length, 0.5, 0.7)

    const element = document.createElement('div')
    element.className = 'model-prev'
    scene.userData.element = element
    scene.userData.modelIdx = modelIdx
    selectorEl.appendChild(element)

    const camera = new PerspectiveCamera(50, 1, 1, 100)
    camera.position.set(0, 1, 2).multiplyScalar(1.2)
    scene.userData.camera = camera

    const orbit = new OrbitControls(scene.userData.camera, scene.userData.element)
    orbit.minDistance = 2
    orbit.maxDistance = 5
    orbit.autoRotate = true
    orbit.autoRotateSpeed = 6
    orbit.enableDamping = true
    scene.userData.orbit = orbit

    const ambientLight = new AmbientLight(0xffffff, 0.9)
    scene.add(ambientLight)
    const sideLight = new SpotLight(0xffffff, 0.7)
    sideLight.position.set(2, 0, 5)
    scene.add(sideLight)

    return scene
  }

  function loadModels() {
    recreateInstancedMesh(100)

    const loader = new GLTFLoader()
    let modelsLoadCnt = 0
    modelURLs.forEach((url, modelIdx) => {
      // prepare <div> and Three.js scene for model preview
      const scene = createPreviewScene(modelIdx)
      previewScenes.push(scene)

      // load .glb file
      loader.load(
        url,
        gltf => {
          // add scaled and centered model to the preview panel;
          addModelToPreview(modelIdx, gltf.scene)

          // get the voxel data from the model
          voxelizeModel(modelIdx, gltf.scene)

          // update the instanced mesh
          const numberOfInstances = Math.max(...voxelsPerModel.map(m => m.length))
          if (numberOfInstances > instancedMesh.count) {
            recreateInstancedMesh(numberOfInstances)
          }

          // once all the models are loaded...
          modelsLoadCnt++
          if (modelsLoadCnt === 1) {
            // Once we have once voxelized model ready, start rendering the available content
            gsap.set(loaderEl, {
              innerHTML: 'calculating the voxels...',
              y: 0.3 * window.innerHeight,
            })
            updateSceneSize()
            render()
          }
          if (modelsLoadCnt === modelURLs.length) {
            // Once we have all the models voxelized, start the animation
            gsap.to(loaderEl, {
              duration: 0.3,
              opacity: 0,
            })
            animateVoxels(0, activeModelIdx)
            setupSelectorEvents()
          }
        },
        undefined,
        error => {
          console.error(error)
        }
      )
    })
  }

  function setupSelectorEvents() {
    const highlightActivePreview = () => {
      Array.from(document.querySelectorAll('.model-prev')).forEach((el, idx) => {
        if (idx !== activeModelIdx) {
          el.classList.remove('active')
        } else {
          el.classList.add('active')
        }
      })
    }

    let timeOut,
      isHeldDown = false
    highlightActivePreview()

    previewScenes.forEach(scene => {
      scene.userData.element.addEventListener('mouseup', () => {
        clearTimeout(timeOut)
        if (!isHeldDown) {
          animateVoxels(activeModelIdx, scene.userData.modelIdx)
          activeModelIdx = scene.userData.modelIdx
          highlightActivePreview()
        }
        isHeldDown = false
      })
    })
    window.addEventListener('mousedown', () => {
      timeOut = setTimeout(() => {
        isHeldDown = true
      }, 200)
    })
    window.addEventListener('mouseup', e => {
      clearTimeout(timeOut)
      if (!isHeldDown) {
        if (!e.target.classList.contains('model-prev')) {
          if (modelURLs[activeModelIdx + 1]) {
            animateVoxels(activeModelIdx, activeModelIdx + 1)
            activeModelIdx++
          } else {
            animateVoxels(activeModelIdx, 0)
            activeModelIdx = 0
          }
          highlightActivePreview()
        }
      }
      isHeldDown = false
    })
  }

  function addModelToPreview(modelIdx, importedScene) {
    const model = importedScene.clone()
    const box = new Box3().setFromObject(model)
    const size = box.getSize(new Vector3())
    const scaleFactor = params.modelPreviewSize / size.length()

    const center = box.getCenter(new Vector3()).multiplyScalar(-scaleFactor)
    model.position.copy(center)
    model.scale.set(scaleFactor, scaleFactor, scaleFactor)
    previewScenes[modelIdx].add(model)
  }

  function voxelizeModel(modelIdx, importedScene) {
    const importedMeshes = []
    importedScene.traverse(child => {
      if (child instanceof Mesh) {
        child.material.side = 2 // THREE.DoubleSide = 2
        importedMeshes.push(child)
      }
    })

    let boundingBox = new Box3().setFromObject(importedScene)
    const size = boundingBox.getSize(new Vector3())
    const scaleFactor = params.modelSize / size.length()
    const center = boundingBox.getCenter(new Vector3()).multiplyScalar(-scaleFactor)

    importedScene.scale.multiplyScalar(scaleFactor)
    importedScene.position.copy(center)

    boundingBox = new Box3().setFromObject(importedScene)
    boundingBox.min.y += 0.5 * params.gridSize // for egg grid to look better

    let modelVoxels = []

    for (let i = boundingBox.min.x; i < boundingBox.max.x; i += params.gridSize) {
      for (let j = boundingBox.min.y; j < boundingBox.max.y; j += params.gridSize) {
        for (let k = boundingBox.min.z; k < boundingBox.max.z; k += params.gridSize) {
          for (let meshCnt = 0; meshCnt < importedMeshes.length; meshCnt++) {
            const mesh = importedMeshes[meshCnt]

            const color = new Color()
            const { h, s, l } = mesh.material.color.getHSL(color)
            color.setHSL(h, s * 0.8, l * 0.8 + 0.2)
            const pos = new Vector3(i, j, k)

            if (isInsideMesh(pos, new Vector3(0, 0, 1), mesh)) {
              modelVoxels.push({ color: color, position: pos })
              break
            }
          }
        }
      }
    }

    voxelsPerModel[modelIdx] = modelVoxels
  }

  function isInsideMesh(pos, ray, mesh) {
    rayCaster.set(pos, ray)
    rayCasterIntersects = rayCaster.intersectObject(mesh, false)
    return rayCasterIntersects.length % 2 === 1
  }

  function recreateInstancedMesh(cnt) {
    // remove the old mesh and voxels data
    voxels = []
    mainScene.remove(instancedMesh)

    // re-initiate the voxel array with random colors and positions
    for (let i = 0; i < cnt; i++) {
      const randomCoordinate = () => {
        let v = Math.random() - 0.5
        v -= v % params.gridSize
        return v
      }
      voxels.push({
        position: new Vector3(randomCoordinate(), randomCoordinate(), randomCoordinate()),
        color: new Color().setHSL(Math.random(), 0.8, 0.8),
      })
    }

    // create a new instanced mesh object
    instancedMesh = new InstancedMesh(voxelGeometry, voxelMaterial, cnt)
    instancedMesh.castShadow = true
    instancedMesh.receiveShadow = true

    // assign voxels data to the instanced mesh
    for (let i = 0; i < cnt; i++) {
      instancedMesh.setColorAt(i, voxels[i].color)
      dummy.position.copy(voxels[i].position)
      dummy.updateMatrix()
      instancedMesh.setMatrixAt(i, dummy.matrix)
    }
    instancedMesh.instanceMatrix.needsUpdate = true
    instancedMesh.instanceColor.needsUpdate = true

    // add a new mesh to the scene
    mainScene.add(instancedMesh)
  }

  function animateVoxels(oldModelIdx, newModelIdx) {
    // animate voxels data
    for (let i = 0; i < voxels.length; i++) {
      gsap.killTweensOf(voxels[i].color)
      gsap.killTweensOf(voxels[i].position)

      const duration = 0.5 + 0.5 * Math.pow(Math.random(), 6)
      let targetPos

      // move to new position if we have one;
      // otherwise, move to a randomly selected existing position
      //
      // animate to new color if it's determined
      // otherwise, voxel will be just hidden by animation of instancedMesh.count

      if (voxelsPerModel[newModelIdx][i]) {
        targetPos = voxelsPerModel[newModelIdx][i].position
        gsap.to(voxels[i].color, {
          delay: 0.7 * Math.random() * duration,
          duration: 0.05,
          r: voxelsPerModel[newModelIdx][i].color.r,
          g: voxelsPerModel[newModelIdx][i].color.g,
          b: voxelsPerModel[newModelIdx][i].color.b,
          ease: 'power1.in',
          onUpdate: () => {
            instancedMesh.setColorAt(i, voxels[i].color)
          },
        })
      } else {
        targetPos = voxelsPerModel[newModelIdx][Math.floor(voxelsPerModel[newModelIdx].length * Math.random())].position
      }

      // move to new position if it's determined
      gsap.to(voxels[i].position, {
        delay: 0.2 * Math.random(),
        duration: duration,
        x: targetPos.x,
        y: targetPos.y,
        z: targetPos.z,
        ease: 'back.out(3)',
        onUpdate: () => {
          dummy.position.copy(voxels[i].position)
          dummy.updateMatrix()
          instancedMesh.setMatrixAt(i, dummy.matrix)
        },
      })
    }

    // increase the model rotation during transition
    gsap.to(instancedMesh.rotation, {
      duration: 1.2,
      y: '+=' + 1.3 * Math.PI,
      ease: 'power2.out',
    })

    // show the right number of voxels
    gsap.to(instancedMesh, {
      duration: 0.4,
      count: voxelsPerModel[newModelIdx].length,
    })

    // update the instanced mesh accordingly to voxels data
    gsap.to(
      {},
      {
        duration: 1, // max transition duration
        onUpdate: () => {
          instancedMesh.instanceColor.needsUpdate = true
          instancedMesh.instanceMatrix.needsUpdate = true
        },
      }
    )
  }

  function render() {
    renderer.setViewport(0, 0, containerEl.clientWidth, containerEl.clientHeight)
    renderer.setScissor(0, 0, containerEl.clientWidth, containerEl.clientHeight)
    mainOrbit.update()
    lightHolder.quaternion.copy(mainCamera.quaternion)
    renderer.render(mainScene, mainCamera)

    // render previews
    previewScenes.forEach(scene => {
      renderer.setViewport(
        scene.userData.rect.left,
        scene.userData.rect.bottom,
        scene.userData.rect.width,
        scene.userData.rect.height
      )
      renderer.setScissor(
        scene.userData.rect.left,
        scene.userData.rect.bottom,
        scene.userData.rect.width,
        scene.userData.rect.height
      )
      scene.userData.orbit.update()
      renderer.render(scene, scene.userData.camera)
    })

    requestAnimationFrame(render)
  }

  function updateSceneSize() {
    mainCamera.aspect = containerEl.clientWidth / containerEl.clientHeight
    mainCamera.updateProjectionMatrix()

    previewScenes.forEach(scene => {
      scene.userData.element.style.width = Math.min(90, (window.innerHeight * 0.8) / modelURLs.length) + 'px'
    })
    previewScenes.forEach(scene => {
      const rect = scene.userData.element.getBoundingClientRect()
      scene.userData.rect = {
        width: rect.right - rect.left,
        height: rect.bottom - rect.top,
        left: rect.left,
        bottom: containerEl.clientHeight - rect.bottom,
      }
      scene.userData.camera.aspect = scene.userData.element.clientWidth / scene.userData.element.clientHeight
      scene.userData.camera.updateProjectionMatrix()
    })

    renderer.setSize(containerEl.clientWidth, containerEl.clientHeight)
  }
}

export default initializeVoxel