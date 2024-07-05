import * as THREE from 'three'
import getGeometry from './lib/getGeometry'
import gsap from 'gsap'

export default class Sketch {
  constructor(options) {
    this.scene = new THREE.Scene()
    this.renderer = new THREE.WebGLRenderer({
      // antialias: true
    })
    this.detail = options.detail
    this.nextDOM = options.next
    this.fragment = options.fragment
    this.offsettop = options.offsettop || 0
    this.ease = options.ease || 'none'
    this.duration = options.duration || 2
    this.vertex = options.vertex
    this.container = options.dom
    this.width = this.container.offsetWidth
    this.height = this.container.offsetHeight
    this.images = JSON.parse(this.container.getAttribute('data-images'))
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(this.width, this.height)
    this.renderer.setClearColor(0xeeeeee, 1)
    this.renderer.physicallyCorrectLights = true
    this.renderer.outputEncoding = THREE.sRGBEncoding
    this.currentIndex = 0
    this.rendering = true

    this.container.appendChild(this.renderer.domElement)

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.001, 1000)
    this.camera.position.set(0, 0, 2)
    // this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.time = 0
    this.paused = false
    this.textures = []
    this.initiate(() => {
      this.imageAspect = this.textures[0].image.naturalHeight / this.textures[0].image.naturalWidth
      this.setupResize()
      this.addObjects()
      this.resize()
      this.render()
      // this.settings();

      this.next()

      setInterval(() => {
        this.next()
      }, 15000)

      document.body.classList.remove('loading')
    })
  }

  nextEvent() {
    this.nextDOM.addEventListener('click', () => {
      this.next()
    })
  }

  initiate(cb) {
    const promises = []
    let that = this
    this.images.forEach((url, i) => {
      // const image = new Image()

      // image.src = require(`./polygon-img/${url}`) // .default.src

      let promise = new Promise(resolve => {
        // that.textures[i] = new THREE.TextureLoader().load(require(`./polygon-img/${url}`).default.src, resolve)
        that.textures[i] = new THREE.TextureLoader().load(
          // require(`assets/images/carousel/bogota/Bogota${url}`).default.src,
          require(`assets/images/${url}`).default.src,
          resolve
        )

        // image.onload = function () {
        //   that.textures[i] = new THREE.TextureLoader().load(require(`./polygon-img/${url}`), resolve)

        //   // resolve()
        // }

        // that.textures[i] = new THREE.TextureLoader().load(url, resolve)
      })
      promises.push(promise)
    })
    Promise.all(promises).then(() => {
      cb()
    })
  }

  settings() {
    let that = this
    this.settings = {
      progress: 0,
      next: function () {
        that.next()
      },
    }
    // this.gui = new dat.GUI();
    // this.gui.add(this.settings, "progress", 0, 1, 0.01);
    // this.gui.add(this.settings, "next");
  }

  setupResize() {
    window.addEventListener('resize', this.resize.bind(this))
  }

  resize() {
    this.width = this.container.offsetWidth
    this.height = this.container.offsetHeight
    this.renderer.setSize(this.width, this.height)
    this.camera.aspect = this.width / this.height

    // image cover
    let a1
    let a2
    if (this.height / this.width < this.imageAspect) {
      a2 = ((1 / this.imageAspect) * this.height) / this.width
      a1 = 1
    } else {
      a2 = 1
      a1 = (this.width / this.height) * this.imageAspect
    }
    this.material.uniforms.resolution.value.x = this.width
    this.material1.uniforms.resolution.value.x = this.width
    this.material.uniforms.resolution.value.y = this.height
    this.material1.uniforms.resolution.value.y = this.height
    this.material.uniforms.resolution.value.z = a1
    this.material1.uniforms.resolution.value.z = a1
    this.material.uniforms.resolution.value.w = a2
    this.material1.uniforms.resolution.value.w = a2
    console.log(this.material.uniforms.resolution.value)

    // optional - cover with quad
    const dist = this.camera.position.z
    const height = 2
    let koef = 1
    // if(this.width>this.height) koef = this.camera.aspect

    this.nextMesh.scale.set(this.camera.aspect, 1, 1)
    this.currentMesh.scale.set(this.camera.aspect, 1, 1)
    this.camera.fov = 2 * (180 / Math.PI) * Math.atan(height / (2 * dist * koef))
    this.camera.updateProjectionMatrix()
  }

  next() {
    let that = this

    if (!this.isRunning) {
      this.isRunning = true
      this.rendering = true
      this.currentIndex++
      this.nextTexture = this.textures[this.currentIndex % this.textures.length]
      this.nextnextTexture = this.textures[(this.currentIndex + 1) % this.textures.length]
      gsap.to(this.settings, {
        duration: this.duration,
        progress: 1,
        ease: this.ease,
        onComplete: () => {
          this.isRunning = false
          this.settings.progress = 0
          this.material.uniforms.texture1.value = this.nextTexture
          this.material1.uniforms.texture1.value = this.nextnextTexture
          this.rendering = false
        },
      })
    }
  }

  addObjects() {
    let that = this
    this.material = new THREE.ShaderMaterial({
      extensions: {
        derivatives: '#extension GL_OES_standard_derivatives : enable',
      },
      side: THREE.DoubleSide,
      uniforms: {
        time: { type: 'f', value: 0 },
        progress: { type: 'f', value: 0 },
        resolution: { type: 'v4', value: new THREE.Vector4() },
        texture1: { type: 't', value: this.textures[0] },
      },
      // wireframe: true,
      transparent: true,
      vertexShader: this.vertex,
      fragmentShader: this.fragment,
      depthTest: false,
      depthWrite: false,
    })

    let geo = getGeometry(this.detail, this.offsettop)
    this.material1 = this.material.clone()
    let t = this.textures[1]
    this.material1.uniforms.texture1.value = t
    this.currentMesh = new THREE.Mesh(geo, this.material)
    this.nextMesh = new THREE.Mesh(geo, this.material1)

    this.nextMesh.position.z = -0.0001
    this.scene.add(this.currentMesh)
    this.scene.add(this.nextMesh)
    // this.geometry = new THREE.PlaneGeometry(1, 1, 10, 10);
    // this.testMesh = new THREE.Mesh(this.geometry, new THREE.MeshBasicMaterial({color:0x000000,wireframe: true}));
    // this.scene.add(this.testMesh);
  }

  render() {
    if (this.paused) return
    if (this.material) this.material.uniforms.progress.value = this.settings.progress
    requestAnimationFrame(this.render.bind(this))
    // if(this.rendering)
    this.renderer.render(this.scene, this.camera)
  }
}
