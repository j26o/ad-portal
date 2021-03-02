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
		// this.scene.fog = new THREE.Fog(this.options.bgColor, this.options.near, 88)
    // this.scene.background = new THREE.Color(this.options.bgColor)

    t.container = t.options.dom
    t.width = t.container.offsetWidth
    t.height = t.container.offsetHeight
    t.renderer = new THREE.WebGLRenderer()
    t.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    t.renderer.setSize(t.width, t.height)
    t.renderer.setClearColor(t.options.bgColor, 1)

		// t.renderer.gammaOutput = true;
    t.renderer.shadowMap.enabled = true
		t.renderer.shadowMap.type = THREE.PCFSoftShadowMap
		// t.renderer.toneMapping = THREE.ACESFilmicToneMapping
		// t.renderer.toneMappingExposure = 1
		// t.renderer.outputEncoding = THREE.sRGBEncoding

    t.container.appendChild(t.renderer.domElement)

    t.camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, t.options.near, 100 )

    t.camera.position.set(0, 0, 3)
		t.camera.lookAt(0,0,0)

		t.oControls = new OrbitControls(t.camera, t.renderer.domElement)

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

  resize() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
  }

	createPortal() {
		const t = this
		// const w = window.innerWidth
		// const h = window.innerHeight
		const w = 1024
		const h = 1024

		t.portalRT = new THREE.WebGLRenderTarget(w, h)
		t.portalScene = new THREE.Scene()
		t.portalScene.background = t.options.bgColor

		t.portalCam = new THREE.PerspectiveCamera( 70, w / h, t.options.near, 100 )

    t.portalCam.position.set(0, 0, 3)
		t.portalCam.lookAt(0,0,0)

		const size = 2
		const geometry = new THREE.BoxGeometry( size, size, size*2.5 )
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

		const pGeometry = new THREE.PlaneGeometry(1,1,16,16)
		const pMaterial = new THREE.MeshStandardMaterial({
			map: t.portalRT.texture,
			side: THREE.DoubleSide
		})

		t.portalPlane = new THREE.Mesh( pGeometry, pMaterial )
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

	updateUserCamM() {
		if (!this.rotation) return

    this.rotation.update()

    if (!this.rotation.deviceOrientation) return

    const { beta, gamma } = this.rotation.deviceOrientation
		this.debug.innerHTML = `orientattion: ${beta}, ${gamma}, ${this.rotation}`

    if (!beta || !gamma) return

		this.camera.lookAt(0, 0, 0)

    this.camera.position.x = -gamma / 90
    this.camera.position.y = beta / 90
    this.camera.position.z = 1 - 0.5 * Math.min(Math.abs(this.camera.position.x) + Math.abs(this.camera.position.y), 1)
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

		if(this.isMobile) this.updateUserCamM()

		this.updatePortal()
    this.renderer.render(this.scene, this.camera)

		requestAnimationFrame(this.render.bind(this))
  }
}

new AdPortal({
	dom: document.getElementById("app"),
	near: 0.1,
	portalWidth: 1/2,
	portalHeight: 1/2,
	bgColor: new THREE.Color(0xffffff)
})
