import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { USDZExporter } from 'three/examples/jsm/exporters/USDZExporter.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { DeviceOrientationControls } from 'three/examples/jsm/controls/DeviceOrientationControls.js'

import fragment from '../assets/shaders/fragment.glsl'
import vertex from '../assets/shaders/vertex.glsl'

import * as dat from 'dat.gui'
import gsap from 'gsap'

export default class AdPortal {
  constructor(options) {
		const t = this
		t.options = options
		t.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
		t.isIOS = (/iPad|iPhone|iPod/.test(navigator.platform) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) && !window.MSStream
		t.isPlaying = false
		t.isParallax = false

		t.container = options.dom
    t.width = t.container.offsetWidth
    t.height = t.container.offsetHeight

		t.aspect = t.width / t.height

		t.mouseX = 0
		t.mouseY = 0

		t.windowHalfX = t.width / 2;
		t.windowHalfY = t.height / 2;

		if(t.isMobile) {
			const startButton = document.getElementById('start')
			startButton.classList.remove('hidden')
			startButton.addEventListener( 'click', function () {
				startButton.remove()

				t.isPlaying = false
				t.renderer.clear()
				t.renderer.dispose()
				t.container.innerHTML = ''

				t.isParallax = true

				t.init()
			} )
		} else {
			document.addEventListener( 'mousemove', (e)=> {
				t.mouseX = ( e.clientX - t.windowHalfX )
				t.mouseY = ( e.clientY - t.windowHalfY )
			} )
		}

		t.debug =  document.getElementById('debug')
		this.loadModel()
  }

	loadModel() {
		const t = this

		const loader = new GLTFLoader().setPath('models/gltf/')
		loader.load('MaterialsVariantsShoe.gltf',
			async (gltf) => {
				const scale = 5
				gltf.scene.scale.set(scale, scale, scale)
				t.model = gltf

				gltf.scene.traverse( function( node ) {
					if ( node.isMesh ) {
						node.castShadow = true
						node.receiveShadow = true
					}
				})

				// center gltf
				const box = new THREE.Box3().setFromObject( gltf.scene );
        // const size = box.getSize( new THREE.Vector3() ).length();
        const center = box.getCenter( new THREE.Vector3() );
				gltf.scene.position.x += ( gltf.scene.position.x - center.x );
        gltf.scene.position.y += ( gltf.scene.position.y - center.y );
        gltf.scene.position.z += ( gltf.scene.position.z - center.z );

				t.exportUSDZ(gltf)

				t.init()
			},
			(xhr) => {
				console.log((xhr.loaded / xhr.total * 100 ) + '% loaded')
			},
			(error) => {
				console.log(error)
			}
		)
  }

	init() {
		const t = this
		t.scene = new THREE.Scene()
		t.scene.receiveShadow = true
		// this.scene.fog = new THREE.Fog(this.options.bgColor, this.options.near, 88)
    // this.scene.background = new THREE.Color(this.options.bgColor)

    t.renderer = new THREE.WebGLRenderer()
    // t.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    t.renderer.setPixelRatio(Math.min(2, t.isMobile ? window.devicePixelRatio : 1))
    t.renderer.setSize(t.width, t.height)
    t.renderer.setClearColor(t.options.bgColor, 1)

    t.renderer.shadowMap.enabled = true
		t.renderer.shadowMap.type = THREE.PCFSoftShadowMap

		t.renderer.toneMappingExposure = 1
		t.renderer.gammaOutput = true
		t.renderer.toneMapping = THREE.ACESFilmicToneMapping
		t.renderer.outputEncoding = THREE.sRGBEncoding

    t.container.appendChild(t.renderer.domElement)

    t.camera = new THREE.PerspectiveCamera( t.options.fov, t.aspect, t.options.near, t.options.far )

    t.camera.position.set(0, 0, 1)
		t.camera.lookAt(0,0,0)

		// t.oControls = new OrbitControls(t.camera, t.renderer.domElement)

		if(t.isMobile && t.isParallax) {
			t.rotation = new DeviceOrientationControls(new THREE.PerspectiveCamera())
		}

		t.environment = new RoomEnvironment()
		t.pmremGenerator = new THREE.PMREMGenerator( t.renderer )
		t.scene.environment = t.pmremGenerator.fromScene( t.environment ).texture

    t.time = 0
    t.isPlaying = true

		this.createPortal()

		t.render()

    window.addEventListener("resize", t.resize.bind(t))
    t.resize()

		if(t.isIOS) document.getElementById('usdzCta').classList.remove('hidden')

    // this.settings()
	}

	async exportUSDZ (gltf) {
		const exporter = new USDZExporter()
		const arraybuffer = await exporter.parse( gltf.scene )
		const blob = new Blob( [ arraybuffer ], { type: 'application/octet-stream' } )

		const link = document.getElementById( 'usdz' )
		link.href = URL.createObjectURL( blob )
	}

  settings() {
    this.settings = {
      progress: 0,
    }
    this.gui = new dat.GUI()
    this.gui.add(this.settings, "progress", 0, 1, 0.01)
  }

	createPortal() {
		const t = this
		const w = t.width
		const h = t.height

		t.portalRT = new THREE.WebGLRenderTarget(t.width, t.height)
		t.portalScene = new THREE.Scene()
		t.portalScene.receiveShadow = true
		t.portalScene.background = t.options.bgColor

		t.portalCam = new THREE.PerspectiveCamera( t.options.fov, t.aspect, t.options.near, t.options.far )

    t.portalCam.position.set(0, 0, 2)
		t.portalCam.lookAt(t.portalScene.position)

		const size = 2
		const geometry = new THREE.BoxGeometry( size, size, size * 2.5 )
		const material = new THREE.MeshStandardMaterial( { color: 0x333333 } )
		material.side = THREE.BackSide

		const cube = new THREE.Mesh( geometry, material )
		cube.receiveShadow = true
		t.portalScene.add( cube )

		const ambientLight = new THREE.AmbientLight( 0xffffff, 0.8 )
		ambientLight.name = 'AmbientLight'
		t.portalScene.add( ambientLight )

		const pointLight = new THREE.PointLight( 0xffffff, 0.6 )
		pointLight.name = 'PointLight'
		pointLight.position.set( 0.8, 0.5, 1.8 )
		pointLight.castShadow = true

		pointLight.shadow.radius = 10
		t.portalScene.add( pointLight )

		// const sphereSize = 0.2
		// const pointLightHelper = new THREE.PointLightHelper( pointLight, sphereSize )
		// t.portalScene.add( pointLightHelper )

		if(t.model) t.portalScene.add(t.model.scene)

		t.pw = t.aspect > 1 ? 1 : 1 / t.aspect
		t.ph = t.aspect > 1 ? 1 / t.aspect : 1
		t.ang_rad = t.camera.fov * Math.PI / 180
		t.fov_y = t.camera.position.z * Math.tan(t.ang_rad / 2) * 2

		// const pGeometry = new THREE.PlaneGeometry(t.fov_y * t.aspect, t.fov_y, 32, 32)
		// const pGeometry = new THREE.PlaneGeometry(t.visibleWidthAtZDepth(0, t.camera), t.visibleHeightAtZDepth(0, t.camera), 32, 32)
		const pGeometry = new THREE.PlaneGeometry(1, 1, 32, 32)
		const pMaterial = new THREE.MeshStandardMaterial({
			map: t.portalRT.texture,
			side: THREE.DoubleSide
		})

		t.portalPlane = new THREE.Mesh( pGeometry, pMaterial )
		t.portalPlane.scale.set(t.visibleWidthAtZDepth(0, t.camera), t.visibleHeightAtZDepth(0, t.camera), 1)
		t.scene.add(t.portalPlane)
	}

  stop() {
    this.isPlaying = false;
  }

  play() {
    if(!this.isPlaying){
      this.render()
      this.isPlaying = true;
    }
  }

	resize() {
    this.width = this.container.offsetWidth
    this.height = this.container.offsetHeight

		this.aspect = this.width / this.height

    this.renderer.setSize(this.width, this.height)

		this.portalCam.aspect = this.aspect
		this.portalCam.updateProjectionMatrix()

    this.camera.aspect = this.aspect
    this.camera.updateProjectionMatrix()

		this.portalPlane.scale.set(this.visibleWidthAtZDepth(0, this.camera), this.visibleHeightAtZDepth(0, this.camera), 1)
  }

	updateUserCam() {
		if(this.isMobile) {
			if (!this.rotation) return

			this.rotation.update()

			if (!this.rotation.deviceOrientation) return

			const { beta, gamma } = this.rotation.deviceOrientation
			this.debug.innerHTML = `orientattion: ${beta}, ${gamma}, ${this.rotation}`

			if (!beta || !gamma) return

			this.camera.lookAt(0, 0, 0)

			this.camera.position.x = -gamma / 90
			// this.camera.position.y = beta / 90
			this.camera.position.z = 1 - 0.5 * Math.min(Math.abs(this.camera.position.x) + Math.abs(this.camera.position.y), 1)
		} else {
			// this.camera.position.x = this.mouseX / this.windowHalfX
			this.camera.position.x += ( (this.mouseX / this.windowHalfX) - this.camera.position.x ) * .05
			// this.camera.position.z = 1 - 0.5 * Math.min(Math.abs(this.camera.position.x) + Math.abs(this.camera.position.y), 1)
			this.camera.lookAt(0, 0, 0)
		}
	}

	updatePortal() {
		this.renderer.setRenderTarget(this.portalRT)
		this.renderer.clear()

		this.renderer.render(this.portalScene, this.portalCam)

		this.renderer.setRenderTarget(null)
		this.renderer.clear()
	}

  render() {
    if (!this.isPlaying) return

		this.updateUserCam()

		this.updatePortal()
    this.renderer.render(this.scene, this.camera)

		requestAnimationFrame(this.render.bind(this))
  }

	// https://discourse.threejs.org/t/functions-to-calculate-the-visible-width-height-at-a-given-z-depth-from-a-perspective-camera/269
	visibleHeightAtZDepth( depth, camera ) {
		// compensate for cameras not positioned at z=0
		const cameraOffset = camera.position.z
		if ( depth < cameraOffset ) depth -= cameraOffset
		else depth += cameraOffset

		// vertical fov in radians
		const vFOV = camera.fov * Math.PI / 180;

		// Math.abs to ensure the result is always positive
		return 2 * Math.tan( vFOV / 2 ) * Math.abs( depth )
	}

	visibleWidthAtZDepth( depth, camera ) {
		const height = this.visibleHeightAtZDepth( depth, camera )
		return height * camera.aspect
	}
}

new AdPortal({
	dom: document.getElementById("app"),
	near: 0.1,
	far: 100,
	portalWidth: 1/2,
	portalHeight: 1/2,
	bgColor: new THREE.Color(0xffffff),
	fov: 70
})
