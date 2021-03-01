import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { USDZExporter } from 'three/examples/jsm/exporters/USDZExporter.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

import fragment from '../assets/shaders/fragment.glsl'
import vertex from '../assets/shaders/vertex.glsl'

import * as dat from 'dat.gui'
import gsap from 'gsap'

export default class AdPortal {
  constructor(options) {
		this.options = options

    this.scene = new THREE.Scene()
		this.scene.fog = new THREE.Fog(options.bgColor, options.near, 88)
    this.scene.background = new THREE.Color(options.bgColor)

    this.container = options.dom
    this.width = this.container.offsetWidth
    this.height = this.container.offsetHeight
    this.renderer = new THREE.WebGLRenderer()
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(this.width, this.height)
    this.renderer.setClearColor(options.bgColor, 1)

		this.renderer.toneMapping = THREE.ACESFilmicToneMapping
		this.renderer.toneMappingExposure = 1
		this.renderer.outputEncoding = THREE.sRGBEncoding

    this.container.appendChild(this.renderer.domElement)

    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.001,
      1000
    )

    this.camera.position.set(0, 0, 3)

		this.environment = new RoomEnvironment()
		this.pmremGenerator = new THREE.PMREMGenerator( this.renderer )
		this.scene.environment = this.pmremGenerator.fromScene( this.environment ).texture

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.time = 0

    this.isPlaying = true

    this.addObjects()

    window.addEventListener("resize", this.resize.bind(this))
    this.resize()
    // this.settings()
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

  addObjects() {
		const t = this

		const loader = new GLTFLoader().setPath( 'models/gltf/' )
		loader.load('MaterialsVariantsShoe.gltf',
			async (gltf) => {
				const scale = 8
				gltf.scene.scale.set( scale, scale, scale )
				t.gltf = gltf
				t.scene.add(gltf.scene)
				t.render()

				t.exportUSDZ(gltf)
			},
			(xhr) => {
				console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
			},
			(error) => {
				console.log(error)
			}
		)

		this.addStage()
		this.addLights()
  }

	async exportUSDZ (gltf) {
		const exporter = new USDZExporter()
		const arraybuffer = await exporter.parse( gltf.scene )
		const blob = new Blob( [ arraybuffer ], { type: 'application/octet-stream' } )

		const link = document.getElementById( 'usdz' )
		link.href = URL.createObjectURL( blob )
	}

	addStage() {

	}

	addLights() {
		// ---------------------------------------------------------------------
		// Ambient light
		// ---------------------------------------------------------------------
		const ambientLight = new THREE.AmbientLight( 0xffffff, 0.2 )
		ambientLight.name = 'AmbientLight'
		this.scene.add( ambientLight )

		// ---------------------------------------------------------------------
		// DirectLight
		// ---------------------------------------------------------------------
		const dirLight = new THREE.DirectionalLight( 0xffffff, 1 )
		dirLight.target.position.set( 0, 0, - 1 )
		dirLight.add( dirLight.target )
		dirLight.lookAt( - 1, - 1, 0 )
		dirLight.name = 'DirectionalLight'
		this.scene.add( dirLight )
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

  render() {
    if (!this.isPlaying) return;

    requestAnimationFrame(this.render.bind(this));
    this.renderer.render(this.scene, this.camera);
  }
}

new AdPortal({
	dom: document.getElementById("app"),
	near: 0.1,
	portalWidth: 1/2,
	portalHeight: 1/2,
	bgColor: new THREE.Color(0xffffff)
})
