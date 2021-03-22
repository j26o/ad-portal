import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { USDZExporter } from 'three/examples/jsm/exporters/USDZExporter.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { DeviceOrientationControls } from 'three/examples/jsm/controls/DeviceOrientationControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'


// import imagesLoaded from 'imagesloaded'
// import fragment from '../assets/shaders/fragment.glsl'
// import vertex from '../assets/shaders/vertex.glsl'

import * as dat from 'dat.gui'
// import gsap from 'gsap'

export default class AdPortal {
  constructor(options) {
		const t = this
		t.options = options
		t.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
		t.isIOS = (/iPad|iPhone|iPod/.test(navigator.platform) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) && !window.MSStream

		t.isAndroid = /android/i.test(navigator.userAgent)

		t.isPlaying = false
		t.isParallax = false

		t.container = options.dom
    t.width = t.container.offsetWidth
    t.height = t.container.offsetHeight

		t.aspect = t.width / t.height

		t.mouse = {
			dx: 0,
			dy: 0,
			cx: 0,
			cy: 0,
			deltaX: 0,
			deltaY: 0
		}

		t.mouseDown = false

		t.windowHalfX = t.width / 2
		t.windowHalfY = t.height / 2

		t.clock = new THREE.Clock()

		t.postprocessing = {}

		if(t.isMobile) {
			t.startButton = document.getElementById('start')
			t.startButton.addEventListener( 'click', function () {
				t.startButton.remove()

				t.isPlaying = false
				t.renderer.clear()
				t.renderer.dispose()
				t.container.innerHTML = ''

				t.isParallax = true

				t.mtouch = document.getElementById('mtouch')
				t.mtouch.classList.remove('hidden')

				t.mtouch.addEventListener('touchstart', function (e) {
					t.mouseDown = true

					t.mouse.cx = e.changedTouches[0].pageX
					t.mouse.cy = e.changedTouches[0].pageY
				}, true)

				t.mtouch.addEventListener('touchend', function (e) {
					e.preventDefault()
					t.mouseDown = false
				}, true)

				t.mtouch.addEventListener( 'touchmove', (e)=> {
					if(e.changedTouches[0]) {
						t.mouse.deltaX = e.changedTouches[0].pageX - t.mouse.cx
						t.mouse.deltaY = e.changedTouches[0].pageY - t.mouse.cy
						t.mouse.cx = e.changedTouches[0].pageX
						t.mouse.cy = e.changedTouches[0].pageY
					}

				}, true )

				t.init()
			} )
		}

		// t.debug =  document.getElementById('debug')
		t.loadAssets()
  }

	init() {
		const t = this
		t.scene = new THREE.Scene()
		// t.scene.receiveShadow = true
		// this.scene.fog = new THREE.Fog(this.options.bgColor, this.options.near, 88)
    // this.scene.background = new THREE.Color(this.options.bgColor)

    t.renderer = new THREE.WebGLRenderer()
    // t.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    t.renderer.setPixelRatio(Math.min(2, t.isMobile ? window.devicePixelRatio : 1))
    t.renderer.setSize(t.width, t.height)
    t.renderer.setClearColor(t.options.bgColor, 1)

    t.renderer.shadowMap.enabled = true
		t.renderer.shadowMap.type = THREE.PCFSoftShadowMap
		// t.renderer.gammaOutput = true

		t.renderer.toneMapping = THREE.ACESFilmicToneMapping
		// t.renderer.toneMapping = THREE.CineonToneMapping
		t.renderer.outputEncoding = THREE.sRGBEncoding
		t.renderer.toneMappingExposure = 1

    t.container.appendChild(t.renderer.domElement)

    t.camera = new THREE.PerspectiveCamera( t.options.fov, t.aspect, t.options.near, t.options.far )
    t.cameraStatic = new THREE.PerspectiveCamera( t.options.fov, t.aspect, t.options.near, t.options.far )

    t.camera.position.set(0, 0, 1)
    t.cameraStatic.position.set(0, 0, 1)
		t.camera.lookAt(0,0,0)
		t.cameraStatic.lookAt(0,0,0)

		// t.oControls = new OrbitControls(t.camera, t.renderer.domElement)

		if(t.isMobile && t.isParallax) {
			t.rotation = new DeviceOrientationControls( new THREE.PerspectiveCamera() )
		}

		t.environment = new RoomEnvironment()
		t.pmremGenerator = new THREE.PMREMGenerator( t.renderer )
		t.scene.environment = t.pmremGenerator.fromScene( t.environment ).texture

    t.isPlaying = true

		this.createPortal()
		this.initPostprocessing()

		t.render()

		window.addEventListener("resize", t.resize.bind(t))
    t.resize()

		if( t.isIOS && t.type == 'gltf' ) document.getElementById('usdzCta').classList.remove('hidden')
		if( t.isMobile ) t.startButton.classList.remove('hidden')
		document.getElementById('buy').classList.remove('hidden')
		document.getElementById('loading').remove()

		t.info = document.getElementById('info')
		t.modal = document.getElementById('modal')

		t.info.classList.remove('hidden')

		t.addListeners()

		if( t.isAndroid ) this.createAndroidAR()

    // this.settings()
	}

	addListeners() {
		const t = this

		t.info.addEventListener('click', ()=>{
			t.modal.classList.toggle('show')
		})

		if(!t.isMobile) {
			t.renderer.domElement.addEventListener( 'mousemove', (e)=> {
				t.mouse.dx = ( e.clientX - t.windowHalfX )
				t.mouse.dy = ( e.clientY - t.windowHalfY )

				t.mouse.deltaX = e.clientX - t.mouse.cx
				t.mouse.deltaY = e.clientY - t.mouse.cy
				t.mouse.cx = e.clientX
				t.mouse.cy = e.clientY
			} )

			// https://uxdesign.cc/implementing-a-custom-drag-event-function-in-javascript-and-three-js-dc79ee545d85
			t.renderer.domElement.addEventListener('mousedown', function (e) {
				e.preventDefault()
				t.mouseDown = true
				t.mouse.cx = e.clientX
				t.mouse.cy = e.clientY
			}, false)

			t.renderer.domElement.addEventListener('mouseup', function (e) {
				e.preventDefault()
				t.mouseDown = false
			}, false)
		}

	}

	loadAssets() {
		const t = this

		t.type = document.getElementById('app').dataset.type
		t.file = document.getElementById('app').dataset.file
		t.map = document.getElementById('app').dataset.map

		t.manager = new THREE.LoadingManager()

		if(t.type == 'gltf') t.load3D()

		if(t.type == 'poster') t.loadPoster()
  }

	load3D() {
		const t = this

		const loader = new GLTFLoader().setPath(t.options.gltfPath)
		loader.load(t.file,
			async (gltf) => {
				const scale = t.options.mScale
				gltf.scene.scale.set(scale, scale, scale)
				t.model = gltf.scene

				gltf.scene.traverse( function( node ) {
					if ( node.isMesh ) {
						node.castShadow = true
						// node.receiveShadow = true
					}
				})

				// center gltf
				const box = new THREE.Box3().setFromObject( gltf.scene )
				// const size = box.getSize( new THREE.Vector3() ).length();
				const center = box.getCenter( new THREE.Vector3() )
				gltf.scene.position.x += ( gltf.scene.position.x - center.x )
				gltf.scene.position.y += ( gltf.scene.position.y - center.y )
				gltf.scene.position.z += ( gltf.scene.position.z - center.z )

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

	async loadPoster() {
		const t = this
		const promises = [
			t.loadTexture(`${t.options.imgPath}${t.file}`)
		]

		if(t.map) promises.push(t.loadTexture(`${t.options.imgPath}${t.map}`))

		await Promise.all(promises).then((result) => {
			t.texture = result[0]
			t.textureMap = result[1]

			t.texture.needsUpdate = true
			t.textureMap.needsUpdate = true
		})

		t.material = new THREE.MeshStandardMaterial({
			map: t.texture,
			metalness: 0.1,
			roughness: 1,
			displacementMap: t.textureMap,
			displacementScale: t.options.displacementScale,
			displacementBias: 0
		})

		t.aspect = t.texture.image.height/t.texture.image.width

		// https://github.com/akella/fake3d
		// https://fulmicoton.com/posts/wiggle/
		// https://codepen.io/robin-dela/pen/vaQQNL

		// if(t.map) {
		// 	t.material.onBeforeCompile = function (shader) {
		// 		shader.uniforms.u_time = { value: 0 }
		// 		shader.uniforms.u_texture = { value: t.texture }
		// 		shader.uniforms.u_textureMap = { value: t.textureMap }
		// 		shader.uniforms.u_mouse = { value: new THREE.Vector2(0,0) }
		// 		shader.uniforms.u_aspect =  {value: t.aspect }

		// 		console.log(t.aspect)

		// 		shader.vertexShader = 'uniform float u_aspect;\nuniform float u_time;\nvarying vec2 v_uv;\nuniform vec2 u_mouse;\nuniform sampler2D u_textureMap;\n' + shader.vertexShader
		// 		// shader.vertexShader = shader.vertexShader.replace('vViewPosition = - mvPosition.xyz;',
		// 		// 	`
		// 		// 	float XtoZ = 1.11146; // tan( 1.0144686 / 2.0 ) * 2.0;
		// 		// 	float YtoZ = 0.83359; // tan( 0.7898090 / 2.0 ) * 2.0;

		// 		// 	vec4 color = texture2D( u_textureMap, vUv );
		// 		// 	float depth = ( color.r + color.g + color.b ) / 3.0;
		// 		// 	float z = ( 1.0 - depth ) * (5. - 1.) + 1.;

		// 		// 	vec4 pos = vec4(
		// 		// 		mvPosition.x * z * XtoZ,
		// 		// 		mvPosition.y * z * YtoZ,
		// 		// 		- z + 0.01,
		// 		// 		1.0);

		// 		// 	// gl_PointSize = pointSize;
		// 		// 	// gl_Position = projectionMatrix * modelViewMatrix * pos;

		// 		// 	vViewPosition = - mvPosition.xyz*color.r;
		// 		// 	`)

		// 			// console.log(shader.vertexShader)

		// 			shader.fragmentShader = 'uniform float u_aspect;\nuniform float u_time;\nuniform sampler2D u_texture;\nuniform sampler2D u_textureMap;\nuniform vec2 u_mouse;\nvarying vec2 v_uv;\n' + shader.fragmentShader

		// 			shader.fragmentShader = shader.fragmentShader.replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );',
		// 			`
		// 				vec4 depth = texture2D(u_textureMap, vUv);
		// 				vec4 color = vec4(outgoingLight, diffuseColor.a);

		// 				vec2 nUv = vUv + (u_mouse * u_aspect * 0.1 * depth.r);

		// 				vec4 nColor = texture2D(u_texture, nUv);
		// 				gl_FragColor = color;
		// 			`
		// 		)

		// 		t.material = shader
		// 	}
		// }

		const geometry = new THREE.PlaneGeometry(1, t.aspect, 32, 32)
		t.model = new THREE.Mesh( geometry, t.material )

		t.init()
	}

	loadTexture(url) {
		return new Promise(resolve => {
			new THREE.TextureLoader().load(url, resolve)
		})
	}

	initPostprocessing() {
		const renderPass = new RenderPass( this.scene, this.cameraStatic )

		const pixelRatio = this.renderer.getPixelRatio()
		this.fxaaPass = new ShaderPass( FXAAShader )
		this.fxaaPass.material.uniforms[ 'resolution' ].value.x = 1 / ( this.container.offsetWidth * pixelRatio )
		this.fxaaPass.material.uniforms[ 'resolution' ].value.y = 1 / ( this.container.offsetHeight * pixelRatio )

		this.bloomPass = new UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), 1.5, 0.4, 0.85 )
		this.bloomPass.threshold = this.options.bloomThreshold
		this.bloomPass.strength = this.options.bloomStrength
		this.bloomPass.radius = this.options.bloomRadius

		this.composer = new EffectComposer( this.renderer )

		this.composer.addPass( renderPass )
		this.composer.addPass( this.fxaaPass )
		this.composer.addPass( this.bloomPass )

		this.postprocessing.composer = this.composer

	}

	async exportUSDZ (gltf) {
		const exporter = new USDZExporter()
		const arraybuffer = await exporter.parse( gltf.scene )
		const blob = new Blob( [ arraybuffer ], { type: 'application/octet-stream' } )

		const link = document.getElementById( 'usdz' )
		link.href = URL.createObjectURL( blob )
	}

	createAndroidAR() {
		// https://developers.google.com/ar/develop/java/scene-viewer?authuser=2#supported_use_cases
		const asset = `${window.location.href}${this.options.path}${this.options.product}`
		console.log(asset)

		const fallbackUrl = `https://arvr.google.com/scene-viewer?file=${asset}&link=https%3A%2F%2Fgoogle.com&title=${this.options.title}`

		const sceneViewerUrl = `intent://arvr.google.com/scene-viewer/1.0?file=${asset}&title=${this.options.title}#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;S.browser_fallback_url=${fallbackUrl};end;`

		var a = document.createElement('a')
		a.appendChild( document.createTextNode('View in your space') )
		a.href = sceneViewerUrl
		a.classList.add('ar-btn')
		a.classList.add('android')
		document.body.appendChild(a)
	}

	createPortal() {
		const t = this
		const w = t.width
		const h = t.height

		t.portalRT = new THREE.WebGLRenderTarget(t.width, t.height)
		t.portalRT.texture.generateMipmaps = false
		t.portalScene = new THREE.Scene()
		// t.portalScene.receiveShadow = true
		// t.portalScene.background = t.options.bgColor

		t.portalCam = new THREE.PerspectiveCamera( t.options.fov, t.aspect, t.options.near, t.options.far )

    t.portalCam.position.set(0, 0, 2)
		t.portalCam.lookAt(t.portalScene.position)

		t.objects = new THREE.Group()

		const size = 2
		const geometry = new THREE.BoxGeometry( size, size, size * 2.5 )
		const material = new THREE.MeshStandardMaterial( { color: 0x333333 } )
		material.side = THREE.BackSide
		material.roughness = 0.8
		material.metalness = 0.2

		const cube = new THREE.Mesh( geometry, material )
		cube.receiveShadow = true

		t.objects.add( cube )

		if(t.model) {
			if(t.isMobile) {
				const scale = t.options.mScale * 0.8
				t.model.scale.set(scale, scale, scale)
				t.model.position.z = t.model.position.z - 0.08

				if(t.type == 'poster') {
					const ms = 0.5
					t.model.scale.set(scale*ms, scale*ms, scale*ms)
					// t.model.position.z = t.model.position.z - 0.2
				}
			}else {
				t.model.position.z = t.type == 'gltf' ? t.model.position.z + 0.6 : t.options.p1pos.z + 0.6
			}

			t.objects.add( t.model )
		}

		t.addLighting()

		t.objects.position.z = -0.5
		t.portalScene.add(t.objects)

		const pGeometry = new THREE.PlaneGeometry(1, 1, 32, 32)
		const pMaterial = new THREE.MeshStandardMaterial({
			map: t.portalRT.texture,
			side: THREE.DoubleSide
		})

		t.portal = new THREE.Mesh( pGeometry, pMaterial )
		t.portal.scale.set(t.visibleWidthAtZDepth(0, t.camera), t.visibleHeightAtZDepth(0, t.camera), 1)
		t.scene.add(t.portal)
	}

	addLighting() {
		const t = this

		t.options.p1pos = t.type == 'gltf' ? new THREE.Vector3(0.5, 1, 0) : new THREE.Vector3(0, 0, 0)
		t.options.pointLightIntensity = t.type == 'gltf' ? 0.4 : 1
		t.options.pointLight2Intensity = t.type == 'gltf' ? 0.6 : 0

		t.ambientLight = new THREE.AmbientLight( 0xffffff, this.options.ambientLightIntensity )
		t.objects.add( t.ambientLight )

		t.pointLight = new THREE.PointLight( 0x888888, t.options.pointLightIntensity )
		t.pointLight.position.copy(t.options.p1pos)
		t.pointLight.castShadow = false
		t.pointLight.shadow.radius = 8
		t.objects.add( t.pointLight )

		t.pointLight2 = new THREE.PointLight( 0xffffff, t.options.pointLight2Intensity )
		t.pointLight2.name = 'PointLight2'
		t.pointLight2.position.set( -0.5, 0.4, 1 )
		t.pointLight2.castShadow = false
		t.objects.add( t.pointLight2 )

		t.spotLight
		t.spotLight = new THREE.SpotLight( 0xffffff, t.options.spotLightIntensity )
		t.spotLight.position.set( 0, 0.2, 2 )

		t.spotLight.castShadow = true
		t.spotLight.shadow.radius = 8

		t.spotLight.angle = t.options.spotLightAngle
		t.spotLight.penumbra = t.options.spotLightPenumbra
		t.spotLight.decay = t.options.spotLightDecay
		t.spotLight.distance = t.options.spotLightDistance

		t.spotLight.shadow.mapSize.width = 512
		t.spotLight.shadow.mapSize.height = 512

		t.spotLight.shadow.camera.near = t.options.spotLightNear
		t.spotLight.shadow.camera.far = t.options.spotLightFar
		t.spotLight.shadow.camera.fov = t.options.spotLightFov

		t.objects.add( t.spotLight )

		// t.lightHelper = new THREE.SpotLightHelper( t.spotLight )
		// t.objects.add( t.lightHelper )

		// const sphereSize = 0.2
		// const pointLightHelper = new THREE.PointLightHelper( t.pointLight, sphereSize )
		// t.objects.add( pointLightHelper )
		// const pointLightHelper2 = new THREE.PointLightHelper( t.pointLight2, sphereSize )
		// t.objects.add( pointLightHelper2 )
	}

	settings() {
		const t = this
    t.gui = new dat.GUI()

		const bloom = t.gui.addFolder('Bloom')

		bloom.add( t.options, 'bloomThreshold', 0.0, 1.0 ).step( 0.01 ).onChange( function ( value ) {
			t.bloomPass.threshold = Number( value )
		})
		bloom.add( t.options, 'bloomStrength', 0.0, 3.0 ).step( 0.01 ).onChange( function ( value ) {
			t.bloomPass.strength = Number( value )
		})
		bloom.add( t.options, 'bloomRadius', 0.0, 1.0 ).step( 0.01 ).onChange( function ( value ) {
			t.bloomPass.radius = Number( value )
		})

		const al = t.gui.addFolder('Ambient Light')
		al.add( t.options, 'ambientLightIntensity', 0.0, 2.0 ).step( 0.01 ).onChange( function ( value ) {
			t.ambientLight.intensity = Number( value )
		})

		const pl1 = t.gui.addFolder('Point Light 1')
		pl1.add( t.options, 'pointLightIntensity', 0.0, 2.0 ).step( 0.01 ).onChange( function ( value ) {
			t.pointLight.intensity = Number( value )
		})
		pl1.add( t.options.p1pos, 'x', -2.0, 2.0 ).step( 0.01 ).onChange( function ( value ) {
			t.pointLight.position.x = Number( value )
		})
		pl1.add( t.options.p1pos, 'y', 0.0, 2.0 ).step( 0.01 ).onChange( function ( value ) {
			t.pointLight.position.y = Number( value )
		})
		pl1.add( t.options.p1pos, 'z', -2.0, 2.0 ).step( 0.01 ).onChange( function ( value ) {
			t.pointLight.position.z = Number( value )
		})

		const pl2 = t.gui.addFolder('Point Light 2')
		pl2.add( t.options, 'pointLight2Intensity', 0.0, 2.0 ).step( 0.01 ).onChange( function ( value ) {
			t.pointLight2.intensity = Number( value )
		})
		pl2.add( t.options.p2pos, 'x', -2.0, 2.0 ).step( 0.01 ).onChange( function ( value ) {
			t.pointLight2.position.x = Number( value )
		})
		pl2.add( t.options.p2pos, 'y', -2.0, 2.0 ).step( 0.01 ).onChange( function ( value ) {
			t.pointLight2.position.y = Number( value )
		})
		pl2.add( t.options.p2pos, 'z', -2.0, 2.0 ).step( 0.01 ).onChange( function ( value ) {
			t.pointLight2.position.z = Number( value )
		})

		const spot = t.gui.addFolder('Spot Light')
		spot.add( t.options, 'spotLightIntensity', 0.0, 2.0 ).step( 0.01 ).onChange( function ( value ) {
			t.spotLight.intensity = Number( value )
		})
		spot.add( t.options, 'spotLightNear', 0.0, 3.0 ).step( 0.01 ).onChange( function ( value ) {
			t.spotLight.shadow.camera.near = Number( value )
		})
		spot.add( t.options, 'spotLightFar', 0.0, 3.0 ).step( 0.01 ).onChange( function ( value ) {
			t.spotLight.shadow.camera.far = Number( value )
		})
		spot.add( t.options, 'spotLightFov', 0.0, 3.0 ).step( 0.01 ).onChange( function ( value ) {
			t.spotLight.shadow.camera.fov = Number( value )
		})
		spot.add( t.options, 'spotLightAngle', 0, Math.PI / 3 ).step( 0.01 ).onChange( function ( value ) {
			t.spotLight.angle = Number( value )
		})
		spot.add( t.options, 'spotLightDistance', 0, 100 ).onChange( function ( value ) {
			t.spotLight.distance = Number( value )
		})
		spot.add( t.options, 'spotLightPenumbra', 0.0, 1.0 ).step( 0.01 ).onChange( function ( value ) {
			t.spotLight.shadow.penumbra = Number( value )
		})
		spot.add( t.options, 'spotLightDecay', 0.0, 2.0 ).step( 0.01 ).onChange( function ( value ) {
			t.spotLight.decay = Number( value )
		})
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
		const t = this
    t.width = t.container.offsetWidth
    t.height = t.container.offsetHeight

		t.aspect = t.width / t.height

    t.renderer.setSize(t.width, t.height)

		t.portalCam.aspect = t.aspect
		t.portalCam.updateProjectionMatrix()

    t.camera.aspect = t.aspect
    t.camera.updateProjectionMatrix()

    t.cameraStatic.aspect = t.aspect
    t.cameraStatic.updateProjectionMatrix()

		t.portal.scale.set(t.visibleWidthAtZDepth(0, t.camera), t.visibleHeightAtZDepth(0, t.camera), 1)

		const pixelRatio = t.renderer.getPixelRatio()
		t.fxaaPass.material.uniforms[ 'resolution' ].value.x = 1 / ( t.container.offsetWidth * pixelRatio )
		t.fxaaPass.material.uniforms[ 'resolution' ].value.y = 1 / ( t.container.offsetHeight * pixelRatio )
		t.postprocessing.composer.setSize( t.width, t.height )
  }

	rotateModel() {
		if(!this.mouseDown) return
		if(!this.model) return
		if(this.type == 'gltf') {
			this.model.rotation.y += this.mouse.deltaX / 100
			this.model.rotation.x += this.mouse.deltaY / 100
		} else return
		// this.model.rotation.y += this.mouse.deltaX / 100
		// 	this.model.rotation.x += this.mouse.deltaY / 100
	}

	updateUserCam() {
		const t = this
		if(t.isMobile) {
			if(t.mouseDown) return
			if(!t.rotation) return

			t.rotation.update()

			if(!t.rotation.deviceOrientation) return

			const { beta, gamma } = t.rotation.deviceOrientation
			// this.debug.innerHTML = `orientattion: ${beta}, ${gamma}, ${this.rotation}`

			if(!beta || !gamma) return

			t.camera.lookAt(0, 0, 0)

			t.camera.position.x = -gamma / 90
			t.camera.position.y = beta / 90

			// this.camera.position.z = 1 - 0.5 * Math.min(Math.abs(this.camera.position.x) + Math.abs(this.camera.position.y), 1)
		} else {
			t.camera.lookAt(0, 0, 0)

			// this.camera.position.x = this.mouseX / this.windowHalfX
			t.camera.position.x += ( (t.mouse.dx / t.windowHalfX) * 0.3 - t.camera.position.x ) * .05
			t.camera.position.y -= ( (t.mouse.dy / t.windowHalfY) * 0.3 + t.camera.position.y ) * .05

			if (t.map && t.material.uniforms) {
				let timer = t.clock.getElapsedTime()
				t.material.uniforms.u_time.value = timer
				t.material.uniforms.u_mouse.value.x = t.camera.position.x
				t.material.uniforms.u_mouse.value.y = t.camera.position.y
			}

			// this.camera.position.z = 1 - 0.5 * Math.min(Math.abs(this.camera.position.x) + Math.abs(this.camera.position.y), 1)
		}
	}

	updatePortalCam() {
		// https://jsantell.com/portals-with-asymmetric-projection/
		const t = this
		t.portalCam.position.copy(t.camera.position)
		t.portalCam.quaternion.copy(t.portal.quaternion)

		const portalPosition = new THREE.Vector3().copy(t.portal.position)
		const portalHalfWidth = t.portal.scale.x / 2
		const portalHalfHeight = t.portal.scale.y / 2

		t.portalCam.updateMatrixWorld()
		t.portalCam.worldToLocal(portalPosition)

		const left = portalPosition.x - portalHalfWidth
		const right = portalPosition.x + portalHalfWidth
		const top = portalPosition.y + portalHalfHeight
		const bottom = portalPosition.y - portalHalfHeight

		const distance = Math.abs(portalPosition.z)
		const scale = t.options.near / distance

		const scaledLeft = left * scale
		const scaledRight = right * scale
		const scaledTop = top * scale
		const scaledBottom = bottom * scale

		t.portalCam.projectionMatrix.makePerspective(scaledLeft, scaledRight, scaledTop, scaledBottom, t.options.near, 10)
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

		this.rotateModel()

		this.updateUserCam()
		this.updatePortalCam()

		this.updatePortal()
    // this.renderer.render(this.scene, this.cameraStatic)
		this.postprocessing.composer.render()

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
	bgColor: new THREE.Color(0xffffff),
	fov: 70,
	mScale: 4,
	title: 'My Product',
	gltfPath: 'models/gltf/',
	imgPath: 'img/',
	displacementScale: 0.25,
	posterScale: 1.5,
	exposure: 1,
	bloomThreshold: 0.08,
	bloomStrength: 0.2,
	bloomRadius: 0.2,
	ambientLightIntensity: 0.08,
	pointLightIntensity: 0.4,
	pointLight2Intensity: 0.6,
	spotLightIntensity: 0.2,
	spotLightNear: 0.5,
	spotLightFar: 2,
	spotLightFov: 1.5,
	spotLightAngle: 0.8,
	spotLightDistance: 8,
	spotLightPenumbra: 0.3,
	spotLightDecay: 0.5,
	p1pos: new THREE.Vector3(0,0,0),
	p2pos: new THREE.Vector3(-0.5, 0.4, 1)
})
