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
  InstancedMesh,
  sRGBEncoding,
  ACESFilmicToneMapping,
  PMREMGenerator,
  TextureLoader,
  LinearToneMapping
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import gsap from 'gsap'

/**
 * Initializes the voxel scene.
 *
 * @param setActiveModelIndex - A callback that gets called whenever the active model index changes.
 */
const initializeVoxel = (setActiveModelIndex) => {
  const containerEl = document.querySelector('.container')
  const canvasEl = document.querySelector('#canvas')
  const selectorEl = document.querySelector('#selector')
  const loaderEl = document.querySelector('#loader')

  let renderer, mainScene, mainCamera, mainOrbit, lightHolder, topLight
  let voxelGeometry, voxelMaterial
  let dummy,
    rayCaster,
    rayCasterIntersects = []
  let previewScenes = []

  const voxelsPerModel = []
  let voxels = []

  // Initial active model index – note that while the React component uses 0 as its initial state,
  // here we choose a fixed default (e.g. 4) for our scene. You may wish to align these values.
  let activeModelIdx = 0
  const modelURLs = [
    '/voxel-assets/unicorn.glb',
    // '/voxel-assets/eye.glb',
    // '/voxel-assets/key.glb',
    '/voxel-assets/padlock.glb',
    '/voxel-assets/lightning.glb',
    '/voxel-assets/sunglasses.glb',
    '/voxel-assets/yellow-unicorn.glb',

    // '/voxel-assets/rocket-ship.glb',
    // '/voxel-assets/rose.glb',
    // 'https://ksenia-k.com/models/Chili%20Pepper.glb',
    // 'https://ksenia-k.com/models/Chicken.glb',
    // 'https://ksenia-k.com/models/Cherry.glb',
    // 'https://ksenia-k.com/models/Banana%20Bundle.glb',
    // 'https://ksenia-k.com/models/Bonsai.glb',
    // 'https://ksenia-k.com/models/egg.glb',
  ]

  const params = {
    modelPreviewSize: 2,
    modelSize: 35,
    gridSize: 0.24,
    boxSize: 0.24,
    boxRoundness: 0.03,
  }

  createMainScene()
  loadModels()
  let mainModelHolder = new Group();
  mainScene.add(mainModelHolder);
  const fullModels: any[] = []; // Array to store the loaded full models

  // Add these variables at the top level of initializeVoxel
  let autoSwapInterval = null;
  let isPaused = false;

  window.addEventListener('resize', updateSceneSize)

  function createMainScene() {
    renderer = new WebGLRenderer({
      canvas: canvasEl,
      alpha: true,
      antialias: true,
    })

    renderer.setClearColor(new Color('#EEF6FF'), 1)

    renderer.outputEncoding = sRGBEncoding
    renderer.toneMapping = LinearToneMapping
    renderer.toneMappingExposure = 1.2
    renderer.physicallyCorrectLights = true

    renderer.shadowMap.enabled = true
    renderer.shadowMapSoft = true

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setScissorTest(true)

    mainScene = new Scene()

    // Load and set an environment map for PBR materials
    const pmremGenerator = new PMREMGenerator(renderer)
    pmremGenerator.compileEquirectangularShader()
    new TextureLoader().load('/voxel-assets/envmap.jpg', texture => {
      texture.encoding = sRGBEncoding;
      const envMap = pmremGenerator.fromEquirectangular(texture).texture;
      mainScene.environment = envMap;
    })

    mainCamera = new PerspectiveCamera(
      22,
      containerEl.clientWidth / containerEl.clientHeight,
      0.01,
      1000
    )
    // Set camera to view models from the side (adjust the values as needed)
    mainCamera.position.set(70, 35, 0)

    rayCaster = new Raycaster()
    dummy = new Object3D()

    // Use a lower ambient light intensity for more dynamic, natural contrast
    const ambientLight = new AmbientLight(0xffffff, 1.8)
    mainScene.add(ambientLight)

    lightHolder = new Group()

    // Boost the intensities of your spot lights
    // topLight = new SpotLight(0xffffff, 1.5)
    // topLight.position.set(0, 15, 3)
    // topLight.castShadow = true
    // topLight.shadow.camera.near = 10
    // topLight.shadow.camera.far = 30
    // topLight.shadow.mapSize = new Vector2(1024, 1024)
    // lightHolder.add(topLight)

    const sideLight = new SpotLight(0xffffff, 1.0)
    sideLight.position.set(0, -4, 5)
    lightHolder.add(sideLight)

    mainScene.add(lightHolder)

    mainOrbit = new OrbitControls(mainCamera, containerEl)
    mainOrbit.enablePan = false
    mainOrbit.autoRotate = true
    mainOrbit.minDistance = 90  // Increased for larger models
    mainOrbit.maxDistance = 150  // Increased maximum distance
    mainOrbit.minPolarAngle = 0.15 * Math.PI
    mainOrbit.maxPolarAngle = 0.75 * Math.PI
    mainOrbit.enableDamping = true

    voxelGeometry = new RoundedBoxGeometry(params.boxSize, params.boxSize, params.boxSize, 2, params.boxRoundness)
    voxelMaterial = new MeshLambertMaterial({})

    const planeGeometry = new PlaneGeometry(120, 120)  // Increased shadow plane size
    const shadowPlaneMaterial = new ShadowMaterial({
      opacity: 0.1,
    })
    const shadowPlaneMesh = new Mesh(planeGeometry, shadowPlaneMaterial)
    shadowPlaneMesh.position.y = -15  // Adjusted shadow plane position
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
    const loader = new GLTFLoader()
    let modelsLoadCnt = 0
    modelURLs.forEach((url, modelIdx) => {
      // Prepare the preview scene
      const scene = createPreviewScene(modelIdx)
      previewScenes.push(scene)

      // Load the .glb file
      loader.load(
        url,
        gltf => {
          // Force any texture maps to use sRGB encoding
          gltf.scene.traverse(child => {
            if (child.isMesh && child.material) {
              // Handle case where material might be an array (multi-material)
              const materials = Array.isArray(child.material) ? child.material : [child.material];
              materials.forEach(mat => {
                if (mat.map) {
                  mat.map.encoding = sRGBEncoding;
                  mat.map.needsUpdate = true;
                }
              });
            }
          });

          // Add the model to the preview panel.
          addModelToPreview(modelIdx, gltf.scene)

          // Normalize the full model for the main scene.
          const model = gltf.scene
          normalizeModelForMain(model)
          fullModels[modelIdx] = model
          model.visible = false // Hide by default

          // Display the active model.
          if (modelIdx === activeModelIdx) {
            model.visible = true;
            mainModelHolder.add(model);
            // Update the orbit target so the new model appears centered.
            const box = new Box3().setFromObject(model);
            const height = box.max.y - box.min.y;
            mainOrbit.target.set(0, height / 2, 0);
          }

          modelsLoadCnt++
          if (modelsLoadCnt === 1) {
            gsap.set(loaderEl, {
              innerHTML: 'loading models...',
              y: 0.3 * window.innerHeight,
            })
            updateSceneSize()
            render()
          }
          if (modelsLoadCnt === modelURLs.length) {
            gsap.to(loaderEl, {
              duration: 0.3,
              opacity: 0,
            })
            setupSelectorEvents()
            startAutoSwap() // Start auto-swap after all models are loaded
          }
        },
        undefined,
        error => {
          console.error(error)
        }
      )
    })
  }

  function updateProgressBar() {
    // Remove any existing progress bar
    const oldBar = containerEl.querySelector('.progress-bar')
    if (oldBar) oldBar.remove()

    // Create new progress bar
    const progressBar = document.createElement('div')
    progressBar.className = 'progress-bar'
    containerEl.appendChild(progressBar)

    // Animate the progress
    gsap.to(progressBar, {
      width: '100%',
      duration: 5, // Match this with the auto-swap interval
      ease: "none",
    })
  }

  function startAutoSwap() {
    if (autoSwapInterval) {
      clearInterval(autoSwapInterval)
    }

    const startNewInterval = () => {
      updateProgressBar() // Reset progress bar
      autoSwapInterval = setInterval(() => {
        if (!isPaused && modelURLs.length > 1) {
          const nextIdx = (activeModelIdx + 1) % modelURLs.length
          animateModelTransition(activeModelIdx, nextIdx)
          activeModelIdx = nextIdx
          setActiveModelIndex(activeModelIdx)
          updateProgressBar() // Start new progress bar
        }
      }, 5000)
    }

    startNewInterval()
  }

  function setupSelectorEvents() {
    let timeOut,
      isHeldDown = false
    updateProgressBar() // Initialize progress bar

    const voxelContainer = document.getElementById("voxel-container")

    voxelContainer.addEventListener('mousedown', () => {
      timeOut = setTimeout(() => {
        isHeldDown = true
      }, 200)
      isPaused = true
      if (autoSwapInterval) {
        clearInterval(autoSwapInterval)
        autoSwapInterval = null
      }
      // Remove progress bar when interaction starts
      const progressBar = containerEl.querySelector('.progress-bar')
      if (progressBar) progressBar.remove()
    })

    voxelContainer.addEventListener('mouseup', e => {
      clearTimeout(timeOut)
      if (!isHeldDown) {
        if (!e.target.classList.contains('model-prev')) {
          const nextIdx = modelURLs[activeModelIdx + 1] ? activeModelIdx + 1 : 0
          animateModelTransition(activeModelIdx, nextIdx)
          activeModelIdx = nextIdx
          setActiveModelIndex(activeModelIdx)
        }
      }
      isHeldDown = false
      
      // Resume auto-swap after interaction
      setTimeout(() => {
        isPaused = false
        if (!autoSwapInterval) {
          startAutoSwap()
        }
      }, 500)
    })

    // When a preview element is clicked, update the active model index
    previewScenes.forEach(scene => {
      scene.userData.element.addEventListener('mouseup', () => {
        clearTimeout(timeOut)
        if (!isHeldDown) {
          animateModelTransition(activeModelIdx, scene.userData.modelIdx)
          activeModelIdx = scene.userData.modelIdx
          // Call the callback here to notify the parent component.
          setActiveModelIndex(activeModelIdx)
        }
        isHeldDown = false
      })
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

  function animateModelTransition(oldModelIdx, newModelIdx) {
    const oldModel = fullModels[oldModelIdx];
    const newModel = fullModels[newModelIdx];

    if (!oldModel || !newModel) {
      console.error("Invalid model indexes for transition", oldModelIdx, newModelIdx);
      return;
    }

    // Ensure the new model is added if not yet present, but keep it hidden initially.
    if (!mainModelHolder.children.includes(newModel)) {
      mainModelHolder.add(newModel);
    }
    newModel.visible = false;

    // Update the orbit target based on the new model's geometry smoothly.
    const newBox = new Box3().setFromObject(newModel);
    const newSizeY = newBox.max.y - newBox.min.y;
    gsap.to(mainOrbit.target, {
      duration: 0.4,
      y: newSizeY / 2,
      ease: "power1.inOut",
      onUpdate: () => {
        mainOrbit.update();
      }
    });

    // Prepare materials for fade animations.
    const oldMaterials = [];
    oldModel.traverse(child => {
      if (child.isMesh) {
        child.material.transparent = true;
        oldMaterials.push(child.material);
      }
    });

    const newMaterials = [];
    newModel.traverse(child => {
      if (child.isMesh) {
        child.material.transparent = true;
        // Set opacity to 0 initially so it can fade in.
        child.material.opacity = 0;
        newMaterials.push(child.material);
      }
    });

    // Faster opacity transitions.
    const fadeOutDuration = 0.4;
    const fadeInDuration = 0.4;
    // The rotation remains at the original speed.
    const rotationDuration = 1.5;
    const rotationAngle = 1.3 * Math.PI;

    const tl = gsap.timeline({
      onComplete: () => {
        // Optional: additional cleanup can go here.
      }
    });

    // Step 1: Fade out the old model.
    tl.to(oldMaterials, {
      duration: fadeOutDuration,
      opacity: 0,
      ease: "power1.out"
    });

    // Step 2: Hide the old model fully once it has faded out.
    tl.add(() => {
      oldModel.visible = false;
    });

    // Step 3: Make the new model visible.
    tl.add(() => {
      newModel.visible = true;
    });

    // Step 4: Fade in the new model's materials.
    tl.to(newMaterials, {
      duration: fadeInDuration,
      opacity: 1,
      ease: "power1.in"
    });

    // Step 5: Rotate the container concurrently with the fade in.
    tl.to(
      mainModelHolder.rotation,
      {
        duration: rotationDuration,
        y: "+=" + rotationAngle,
        ease: "power2.out"
      },
      `-=${fadeInDuration}` // starts the rotation at the same time as the new model begins to fade in.
    );
  }

  function normalizeModelForMain(model) {
    const box = new Box3().setFromObject(model);
    const size = box.getSize(new Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scaleFactor = (params.modelSize * 0.75) / maxDim;
    model.scale.set(scaleFactor, scaleFactor, scaleFactor);

    // Recompute the bounding box after scaling
    box.setFromObject(model);
    const center = new Vector3();
    box.getCenter(center);
    const bottom = box.min.y;

    // Center the model horizontally (x & z) while aligning the bottom to y = 0.
    model.position.x -= center.x;
    model.position.z -= center.z;
    // Shift upward so that the model's lowest point is at y = 0.
    model.position.y -= bottom;
  }
}

export default initializeVoxel