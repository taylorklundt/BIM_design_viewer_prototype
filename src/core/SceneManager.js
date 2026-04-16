import * as THREE from 'three';

export class SceneManager {
  constructor(container) {
    this.container = container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.animationId = null;
    this.resizeObserver = null;

    this.init();
  }

  init() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    // Create camera
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    this.camera.position.set(20, 20, 20);
    this.camera.lookAt(0, 0, 0);

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.container.appendChild(this.renderer.domElement);

    // Add lights
    this.setupLights();

    // Add grid helper
    this.setupGrid();

    // Handle resize
    this.setupResizeObserver();

    // Start render loop
    this.animate();
  }

  setupLights() {
    // Ambient light for general illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // Directional light for shadows and definition
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    // Reduce shadow acne shimmer on coplanar/near-coplanar BIM surfaces.
    directionalLight.shadow.bias = -0.0002;
    directionalLight.shadow.normalBias = 0.03;
    this.scene.add(directionalLight);

    // Hemisphere light for natural sky lighting
    const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x362d26, 0.3);
    this.scene.add(hemisphereLight);
  }

  setupGrid() {
    const gridHelper = new THREE.GridHelper(100, 100, 0x444444, 0x333333);
    gridHelper.position.y = 0;
    this.scene.add(gridHelper);
    this.gridHelper = gridHelper;
  }

  setupResizeObserver() {
    this.resizeObserver = new ResizeObserver(() => {
      this.resize();
    });
    this.resizeObserver.observe(this.container);
  }

  setCamera(camera) {
    this.camera = camera;
  }

  resize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    if (this.camera.isPerspectiveCamera) {
      this.camera.aspect = width / height;
    } else if (this.camera.isOrthographicCamera) {
      const aspect = width / height;
      const frustumHeight = this.camera.top - this.camera.bottom;
      this.camera.left = -(frustumHeight * aspect) / 2;
      this.camera.right = (frustumHeight * aspect) / 2;
    }

    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    this.renderer.render(this.scene, this.camera);
  }

  add(object) {
    this.scene.add(object);
  }

  remove(object) {
    this.scene.remove(object);
  }

  getScene() {
    return this.scene;
  }

  getCamera() {
    return this.camera;
  }

  getRenderer() {
    return this.renderer;
  }

  getDomElement() {
    return this.renderer.domElement;
  }

  setBackground(color) {
    this.scene.background = new THREE.Color(color);
  }

  showGrid(visible) {
    if (this.gridHelper) {
      this.gridHelper.visible = visible;
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    // Dispose of Three.js objects
    this.scene.traverse((object) => {
      if (object.geometry) {
        object.geometry.dispose();
      }
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });

    this.renderer.dispose();

    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
