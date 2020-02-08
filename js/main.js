class RainSimulation {
	constructor() {
		const canvas = document.createElement( 'canvas' );
		const context = canvas.getContext( 'webgl2', {
			alpha: true,
			depth: true,
		});
		this.renderer = new THREE.WebGLRenderer({ canvas, context });

		this.scene = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
		this.camera.position.z = 20;
		this.controls = new THREE.OrbitControls( this.camera, this.renderer.domElement );

		this.initialize();
	}

	initialize() {
		document.body.appendChild( this.renderer.domElement );

		this.resize();
		window.onresize = this.resize.bind(this);


		const axesHelper = new THREE.AxesHelper( 5 );
		axesHelper.position.y = 1;
		this.scene.add( axesHelper );


		const pointLight1 = new THREE.PointLight(0xaaaaaa, 1, 20);
		pointLight1.position.set( 0, 10, 0 );
		this.scene.add( pointLight1 );

		const pointLight2 = new THREE.PointLight(0xaaaaaa, 1, 20);
		pointLight2.position.set( 0, -10, 0 );
		this.scene.add( pointLight2 );


		const directionalLightTarget = new THREE.Object3D();
		directionalLightTarget.position.set(2, -2, 0);
		this.scene.add(directionalLightTarget);


		const lightDirectional = new THREE.DirectionalLight(0xffffff, 1.0);
		lightDirectional.position.set(20, 20, 10);
		lightDirectional.target = directionalLightTarget;
		this.scene.add( lightDirectional );



		this.floorGeometry = new THREE.PlaneGeometry( 20, 20, 1, 1 );
		this.floorMaterial = new THREE.MeshStandardMaterial({
			depthTest: true,
			color: 0xaaaaaa,
			side: THREE.DoubleSide,
			name: "Floor Material"
		});
		this.floorMesh = new THREE.Mesh(this.floorGeometry, this.floorMaterial);
		this.floorMesh.rotation.x = -Math.PI / 2.0;
		this.floorMesh.position.y = -1;
		this.scene.add(this.floorMesh);



		this.WATER_WIDTH = 200;
		this.WATER_HEIGHT = 200;
		this.waterGeometry = new THREE.PlaneGeometry(20, 20, this.WATER_WIDTH, this.WATER_HEIGHT);
		this.waterVerticesPrev = Array.from(this.waterGeometry.vertices);
		this.waterVerticesNext = Array.from(this.waterGeometry.vertices);
		this.waterMaterial = new THREE.MeshStandardMaterial({
			depthTest: true,
			color: 0x9999ff,
			opacity: 0.9,
			transparent: true,
			side: THREE.DoubleSide,
			name: "Water Surface Material"
		});
		this.waterMesh = new THREE.Mesh(this.waterGeometry, this.waterMaterial);
		this.waterMesh.rotation.x = -Math.PI / 2.0;
		this.waterMesh.position.y = 1;
		this.scene.add(this.waterMesh);


		this.scene.fog = new THREE.FogExp2(0xaaaaaa, 0.05);


		const SPACING = 0.4;
		const WAVE_SPEED = 2;
		const VISCOSITY = 1;

		const TIME_CONDITION = (VISCOSITY + Math.sqrt(VISCOSITY * VISCOSITY + (32.0 * WAVE_SPEED * WAVE_SPEED / SPACING * SPACING))) / (8.0 * WAVE_SPEED * WAVE_SPEED / SPACING * SPACING);
		const TIME_STEP = 0.22 * TIME_CONDITION;
		const D = VISCOSITY * TIME_STEP + 2.0;

		this.C1 = (4.0 - (8.0 * WAVE_SPEED * WAVE_SPEED * TIME_STEP * TIME_STEP / (SPACING * SPACING))) / D;
		this.C2 = (VISCOSITY * TIME_STEP - 2.0) / D;
		this.C3 = (2.0 * WAVE_SPEED * WAVE_SPEED * TIME_STEP * TIME_STEP / (SPACING * SPACING)) / D;

		console.log("[RainSimulation] Initialized");
	}

	resize() {
		const w = window.innerWidth;
		const h = window.innerHeight;
		this.camera.aspect = w / h;
		this.camera.updateProjectionMatrix();
		this.controls.update();
		this.renderer.setSize(w, h);
		console.log(`[RainSimulation] Window Resized (${w}x${h}).`);

	}

	seedWaterSurface() {
		const RIPPLE_HEIGHT = 1;

		let vertices = this.waterGeometry.vertices;

		const idx = THREE.MathUtils.randInt(0, this.WATER_WIDTH - 1) * this.WATER_WIDTH + THREE.MathUtils.randInt(0, this.WATER_HEIGHT - 1);
		vertices[idx].z += RIPPLE_HEIGHT;

		this.waterGeometry.verticesNeedUpdate = true;
	}

	indexFrom(x, z) {
		const i = (x + this.WATER_WIDTH) % this.WATER_WIDTH;
		const j = (z + this.WATER_HEIGHT) % this.WATER_HEIGHT;
		return i * this.WATER_WIDTH + j;
	};


	updateWaterSurface() {
		const computeNext = (next, now, prev, x, z) => {
			const index0 = this.indexFrom(x + 0, z + 0);
			const index1 = this.indexFrom(x + 1, z + 0);
			const index2 = this.indexFrom(x - 1, z + 0);
			const index3 = this.indexFrom(x + 0, z + 1);
			const index4 = this.indexFrom(x + 0, z - 1);
			next[index0].z = this.C1 * now[index0].z +
			                 this.C2 * prev[index0].z +
							 this.C3 * (now[index1].z + now[index2].z + now[index3].z + now[index4].z);
		};
		const verticesNow = this.waterGeometry.vertices;

		for (let x = 0; x < this.WATER_WIDTH; x += 1) {
			for (let z = 0; z < this.WATER_HEIGHT; z += 1) {
				computeNext(this.waterVerticesNext, verticesNow, this.waterVerticesPrev, x, z);
			}
		}

		this.waterVerticesPrev = Array.from(verticesNow);
		this.waterGeometry.vertices = Array.from(this.waterVerticesNext);
		this.waterGeometry.computeVertexNormals();
		this.waterGeometry.verticesNeedUpdate = true;

	}



	render() {
		this.seedWaterSurface();
		this.updateWaterSurface();

		this.controls.update();
		this.renderer.render( this.scene, this.camera );
	}

	run() {
		const app = this;
		const renderFrame = () => {
			app.render();
			requestAnimationFrame(renderFrame);
		};
		renderFrame();
	}
}


const app = new RainSimulation();
app.run();


