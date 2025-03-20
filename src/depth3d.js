import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls';
import { ImageFilters } from './imagefilters.js';
import { pane, tab, tweakpaneInit } from './tweakpaneMenu.js'
const { ipcRenderer } = require('electron');

let width = window.innerWidth;
let height = window.innerHeight;

const threeCanvas = document.getElementsByClassName('canvas-area__three')[0];

THREE.Cache.enabled = false;

//Camera
const fov = 80;
const aspect = 1;
const near = 0.1;
const far = 100;
const camera = new THREE.PerspectiveCamera(fov, width / height, near, far);
camera.position.z = 3.5;

//OrbitControls
const controls = new OrbitControls(camera, threeCanvas);
controls.enablePan = true;
controls.enableZoom = true;
controls.enableDamping = true;
controls.minPolarAngle = 0.8;
controls.maxPolarAngle = 2.4;
controls.dampingFactor = 0.07;
controls.rotateSpeed = 0.15;

//Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: threeCanvas,
  alpha: false,
  antialias: true,
  preserveDrawingBuffer: false,
});

renderer.physicallyCorrectLights = true;
// renderer.toneMapping = THREE.ACESFilmicToneMapping;
// THREE.ColorManagement.legacyMode = true;
// renderer.outputEncoding = THREE.sRGBEncoding;

window.addEventListener('resize', resizeCanvasToDisplaySize, false);

const scene = new THREE.Scene();

let planeMesh;

class Light {
  static isLightShow = false;
  static _clock = new THREE.Clock();
  static dirLight1 = new THREE.DirectionalLight('white', 1.5);
  static dirLight2 = new THREE.DirectionalLight('white', 1.5);
  static spotLight = new THREE.SpotLight(0xffffff, 1.0);

  static createBasicLight() {
    Light.dirLight1.position.set(3, 0, 5);
    Light.dirLight1.name = 'dirLight1';
    // Light.dirLight1.castShadow = true;
    Light.dirLight1.shadow.bias = -0.0001;
    Light.dirLight1.shadow.mapSize.width = 4096;
    Light.dirLight1.shadow.mapSize.height = 4096;
    scene.add(Light.dirLight1);

    Light.dirLight2.position.set(-3, 0, 5);
    Light.dirLight2.name = 'dirLight2';
    // Light.dirLight2.castShadow = true;
    Light.dirLight2.shadow.bias = -0.0001;
    Light.dirLight2.shadow.mapSize.width = 4096;
    Light.dirLight2.shadow.mapSize.height = 4096;
    scene.add(Light.dirLight2);

    Light.spotLight.position.set(0, 0, 4);
    Light.spotLight.name = 'spotLight';
    // Light.spotLight.castShadow = true;
    Light.spotLight.shadow.mapSize.width = 4096;
    Light.spotLight.shadow.mapSize.height = 4096;
    Light.spotLight.shadow.camera.near = 1;
    Light.spotLight.shadow.camera.far = 4000;
    Light.spotLight.shadow.camera.fov = 45;
    scene.add(Light.spotLight);
  }

  static createLightShow(mesh) {
    const sphere = new THREE.SphereGeometry(0.02, 32, 16);
    const light1 = new THREE.PointLight(0xff0040, 3, 0);
    light1.add(new THREE.Mesh(sphere, new THREE.MeshBasicMaterial({ color: 0xff0040 })));
    mesh.add(light1);
    const light2 = new THREE.PointLight(0x0040ff, 3, 0);
    light2.add(new THREE.Mesh(sphere, new THREE.MeshBasicMaterial({ color: 0x0040ff })));
    mesh.add(light2);
    const light3 = new THREE.PointLight(0x80ff80, 3, 0);
    light3.add(new THREE.Mesh(sphere, new THREE.MeshBasicMaterial({ color: 0x80ff80 })));
    mesh.add(light3);
    const light4 = new THREE.PointLight(0xffaa00, 3, 0);
    light4.add(new THREE.Mesh(sphere, new THREE.MeshBasicMaterial({ color: 0xffaa00 })));
    mesh.add(light4);
    this.dirLight1.intensity = 0.0;
    this.dirLight2.intensity = 0.0;
    this.spotLight.intensity = 0.0;
    pane.refresh();
    Light._animateLightSphere(mesh);
  }
  static _animateLightSphere(mesh) {
    if (Light.isLightShow) {
      const time = Light._clock.getElapsedTime();
      mesh.children[0].position.x = Math.sin(time * 1.3) * 2;
      mesh.children[0].position.y = Math.cos(time * 1.1) * 3;
      mesh.children[0].position.z = 3 + (Math.cos(time * 0.9) * 0.5);
      mesh.children[1].position.x = Math.cos(time * 0.9) * 3;
      mesh.children[1].position.y = Math.sin(time * 1.1) * 3;
      mesh.children[1].position.z = 3 + (Math.sin(time * 1.3) * 0.5);
      mesh.children[2].position.x = Math.sin(time * 1.3) * 2;
      mesh.children[2].position.y = Math.cos(time * 0.9) * 2;
      mesh.children[2].position.z = 3 + (Math.sin(time * 1.1) * 0.5);
      mesh.children[3].position.x = Math.sin(time * 0.9) * 2;
      mesh.children[3].position.y = Math.cos(time * 1.3) * 3;
      mesh.children[3].position.z = 3 + (Math.sin(time * 1.1) * 0.5);
      requestAnimationFrame(() => {
        Light._animateLightSphere(mesh);
      });
    }
    else {
      mesh.remove(mesh.children[0], mesh.children[1], mesh.children[2], mesh.children[3]);
      Light.dirLight1.intensity = 1.5;
      Light.dirLight2.intensity = 1.5;
      Light.spotLight.intensity = 1.0;
      pane.refresh();
    }
  }
}

class PlaneMesh {
  constructor(widthSegments = 256, heightSegments = 256) {
    this.widthSegments = widthSegments;
    this.heightSegments = heightSegments;
    this.images = new Images();
    this.material = new THREE.MeshStandardMaterial({
      map: null,
      normalMap: null,
      normalScale: new THREE.Vector2(1.0, 1.0),
      roughness: 2,
      displacementMap: null,
      displacementScale: 0,
      displacementBias: 0.15,
      fog: false,
      flatShading: false,
      side: THREE.FrontSide,
      wireframe: false,
    });
    this.geometry = new THREE.PlaneGeometry(this.images.depthMapWidth, this.images.depthMapHeight, this.widthSegments, this.heightSegments);
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.displacement = new DepthMapDisplacement(this);
    this.grayscaleDisplacement = new GrayscaleDisplacement(this);
    this.depthMapEditor = new DepthMapEditor(this);
    this.animation = new Animation(this);
    this.export = new Export(this);
    this.vertexCount = 0;
    this.triangleCount = 0;
  }

  updateGeometry() {
    this.heightSegments = this.widthSegments;
    this.mesh.geometry = new THREE.PlaneGeometry(this.images.depthMapWidth, this.images.depthMapHeight  , this.widthSegments, this.heightSegments);
    this.geometry = this.mesh.geometry;
    this.updateStats();
  }
  resetMaterial() {
    this.material.map = this.images.threeAlbedoMap;
    // this.material.roughnessMap = this.images.threeHeightMap;
    this.material.normalMap = this.images.threeNormalMap;
    this.material.displacementMap = this.images.threeDepthMap;
    this.displacement.HTMLDepthMap = this.images.HTMLImageDepthMap;
    this.grayscaleDisplacement.HTMLDepthMap = this.images.HTMLImageDepthMap;
    this.depthMapEditor.HTMLDepthMap = this.images.HTMLImageDepthMap;
    this.material.needsUpdate = true;
  }
  updateStats() {
    this.vertexCount = this.mesh.geometry.attributes.position.count;
    this.triangleCount = this.mesh.geometry.index.count / 3;
  }
}

class Animation {
  constructor(mesh) {
    this._mesh = mesh.mesh;
    this._displacement = mesh.displacement;
    this.isInAndOutDisplacementAnimation = false;
    this._inAndOutDisplacementAnimationDirection = 0;
    this._clock = new THREE.Clock();
    this._displacementLerp = 0;
  }

  inAndOutDisplacementAnimation() {
    const time = this._clock.getElapsedTime();
    this._mesh.rotation.y = Math.cos(time) * 0.08;
    this._mesh.position.x = Math.sin(time) * 0.16;
    this._mesh.rotation.x = Math.sin(time) * 0.08;
    this._mesh.position.z = Math.cos(time) * 0.20;
    if (this._displacement.displacementScale >= 1.40) {
      this._inAndOutDisplacementAnimationDirection = 0;
    }
    if (this._displacement.displacementScale <= 0.10) {
      this._inAndOutDisplacementAnimationDirection = 1.5;
    }
    this._displacement.displacementScale = this.lerp(this._mesh.material.displacementScale, this._inAndOutDisplacementAnimationDirection, 0.02);
    pane.refresh();
    if (this.isInAndOutDisplacementAnimation === true) {
      requestAnimationFrame(() => {
        this.inAndOutDisplacementAnimation();
      })
    }
  }
  appearanceDisplacementAnimation() {
    this._displacementLerp = this.lerp(this._displacementLerp, 1.51, 0.085);
    this._displacement.displacementScale = this._displacementLerp;
    pane.refresh();
    if (this._displacement.displacementScale <= 1.5) {
      requestAnimationFrame(() => {
        this.appearanceDisplacementAnimation();
      })
    }
  }
  setZPositionToZero() {
    this._mesh.position.z = this.lerp(this._mesh.position.z, 0.01, 0.1);
    if (this._mesh.position.z <= 0) {
      requestAnimationFrame(() => {
        this.setZPositionToZero();
      });
    }
  }
  lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
  }
}

class ImageImporter {
  static imgPath = null;
  static async getImgPath() {
    return new Promise((resolve, reject) => {
      ipcRenderer.send('get-user-images-path');
      ipcRenderer.on('user-images-path', (event, message) => {
        resolve(message);
      });
    });
  }
  static import(imgPath) {
    return new Promise((resolve, reject) => {
      const HTMLImage = new Image();
      HTMLImage.src = `${imgPath}?t=${new Date().getTime()}`; // Append timestamp to prevent caching
      HTMLImage.onload = () => {
        const threeImage = new THREE.Texture(HTMLImage);
        resolve({ HTMLImage: HTMLImage, threeImage: threeImage });
      }
      HTMLImage.onerror = () => {
        reject(new Error(`Failed to load the image at path: ${imgPath}`));
      }
    });
  }
}

class Images {  
  constructor() {
    this._threeAlbedoMap;
    this._threeDepthMap;
    this._threeNormalMap;
    this._threeHeightMap;
    this.HTMLImageAlbedoMap;
    this.HTMLImageDepthMap;
    this.HTMLImageNormalMap;
    this.HTMLImageHeightMap;
    this.depthMapWidth = 0;
    this.depthMapHeight = 0;
  }

  async importADNH(isUser = false) {
    if (isUser && !ImageImporter.imgPath) {
      ImageImporter.imgPath = await ImageImporter.getImgPath();
    }
    try {
      const [
        albedoImageResult,
        depthImageResult,
        normalImageResult,
        heightImageResult
      ] = await Promise.all([
        ImageImporter.import(`${isUser ? `${ImageImporter.imgPath}` : 'default_maps'}/input_image`),
        ImageImporter.import(`${isUser ? `${ImageImporter.imgPath}` : 'default_maps'}/depth_map`),
        ImageImporter.import(`${isUser ? `${ImageImporter.imgPath}` : 'default_maps'}/normal_map`),
        ImageImporter.import(`${isUser ? `${ImageImporter.imgPath}` : 'default_maps'}/height_map`),
      ]);
      this.HTMLImageAlbedoMap = albedoImageResult.HTMLImage;
      this.threeAlbedoMap = albedoImageResult.threeImage;
      this.HTMLImageDepthMap = depthImageResult.HTMLImage;
      this.threeDepthMap = depthImageResult.threeImage;
      this.HTMLImageNormalMap = normalImageResult.HTMLImage;
      this.threeNormalMap = normalImageResult.threeImage;
      this.HTMLImageHeightMap = heightImageResult.HTMLImage;
      this.threeHeightMap = heightImageResult.threeImage;
    }
    catch (error) {
      throw error;
    }
  }
  get threeAlbedoMap() {
    return this._threeAlbedoMap;
  }
  set threeAlbedoMap(image) {
    image.anisotropy = renderer.capabilities.getMaxAnisotropy();
    image.colorSpace = THREE.SRGBColorSpace;
    image.needsUpdate = true;
    this._threeAlbedoMap = image;
  }
  get threeDepthMap() {
    return this._threeDepthMap;
  }
  set threeDepthMap(image) {
    image.anisotropy = renderer.capabilities.getMaxAnisotropy();
    image.needsUpdate = true;
    this._threeDepthMap = image;
    this.depthMapWidth = (2 * (this._threeDepthMap.image.width / this._threeDepthMap.image.height)) + 1;
    this.depthMapHeight = ((2 * (this._threeDepthMap.image.width / this._threeDepthMap.image.height)) / (this._threeDepthMap.image.width / this._threeDepthMap.image.height) + 1);
  }
  get threeNormalMap() {
    return this._threeNormalMap;
  }
  set threeNormalMap(image) {
    image.anisotropy = renderer.capabilities.getMaxAnisotropy();
    image.needsUpdate = true;
    this._threeNormalMap = image;
  }
  get threeHeightMap() {
    return this._threeHeightMap;
  }
  set threeHeightMap(image) {
    image.anisotropy = renderer.capabilities.getMaxAnisotropy();
    image.needsUpdate = true;
    this._threeHeightMap = image;
  }
}

class DepthMapDisplacement {
  constructor(mesh) {
    this._mesh = mesh.mesh;
    this.HTMLDepthMap = mesh.images.HTMLDepthMap;
    this._canvasDepthMap = document.createElement('canvas');
    this._context = this._canvasDepthMap.getContext('2d', {
      alpha: false,
      depth: false,
      antialias: false,
      preserveDrawingBuffer: false,
      premultipliedAlpha: false,
      willReadFrequently: true
    });
    this.displacementScale = 0;
  }
  createDepthMapCanvas() {
    this._canvasDepthMap.id = 'depthMapCanvas';
    this._canvasDepthMap.hidden = true;
    this._canvasDepthMap.width = this.HTMLDepthMap.width;
    this._canvasDepthMap.height = this.HTMLDepthMap.height;
    document.body.appendChild(this._canvasDepthMap);
    this._context.translate(this._canvasDepthMap.width / 2, this._canvasDepthMap.height / 2);
    this._context.scale(-1, 1);
    this._context.rotate(Math.PI);
    this._context.translate(-this._canvasDepthMap.width / 2, -this._canvasDepthMap.height / 2);
    this._context.drawImage(this.HTMLDepthMap, -1, 0, this._canvasDepthMap.width, this._canvasDepthMap.height);
  }
  applyToMesh() {
    const uvs = this._mesh.geometry.attributes.uv.array;
    const positions = this._mesh.geometry.attributes.position.array;
    const normals = this._mesh.geometry.attributes.normal.array;
    const position = new THREE.Vector3();
    const normal = new THREE.Vector3();
    const uv = new THREE.Vector2();
    const buffer = this._context.getImageData(-1, -1, this.HTMLDepthMap.width, this.HTMLDepthMap.height).data;

    for (let index = 0; index < positions.length; index += 3) {
      position.fromArray(positions, index);
      normal.fromArray(normals, index);
      uv.fromArray(uvs, (index / 3) * 2);
      const u = ((Math.abs(uv.x) * this.HTMLDepthMap.width) % this.HTMLDepthMap.width) | 0;
      const v = ((Math.abs(uv.y) * this.HTMLDepthMap.height) % this.HTMLDepthMap.height) | 0;
      const pos = (u + v * this.HTMLDepthMap.width) * 4;
      const r = buffer[pos] / 255.0;
      const g = buffer[pos + 1] / 255.0;
      const b = buffer[pos + 2] / 255.0;
      const gradient = r * 0.333 + g * 0.333 + b * 0.333;
      normal.multiplyScalar(0 + (this._mesh.material.displacementScale - 0) * gradient);
      position.add(normal).toArray(positions, index);
    }
  }
  saveToImageBlob(mimeType = 'image/png') {
    return new Promise((resolve, reject) => {
      this._context.save();
      this._context.translate(this._canvasDepthMap.width / 2, this._canvasDepthMap.height / 2);
      this._context.scale(-1, 1);
      this._context.rotate(Math.PI);
      this._context.drawImage(this.HTMLDepthMap, -this._canvasDepthMap.width / 2, -this._canvasDepthMap.height / 2);
      this._context.restore();
      this._canvasDepthMap.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      }, mimeType);
    });
  }
}

class GrayscaleDisplacement extends DepthMapDisplacement {
  constructor(mesh) {
    super(mesh);
    this.isGrayscaleDisplacement = false;
    this.grayscaleDisplacementScale = 0;
  }
}

class DepthMapEditor {
  constructor(mesh) {
    this._mesh = mesh;
    this.HTMLDepthMap = mesh.images.HTMLImageDepthMap;
    this.depthMap = null;
    this._canvasDepthMap = document.createElement('canvas');
    this._context = this._canvasDepthMap.getContext('2d', {
      alpha: false,
      depth: false,
      antialias: false,
      preserveDrawingBuffer: false,
      premultipliedAlpha: false,
      willReadFrequently: true
    });
    this.contrast = 100;
    this.blur = 1;
    this.gamma = 1;
  }
  _createDepthmapEditorCanvas() {
    this._canvasDepthMap.id = 'depthMapEditorCanvas';
    this._canvasDepthMap.hidden = true;
    document.body.appendChild(this._canvasDepthMap);
    // this.canvasDepthMap = document.getElementById('depthMapEditorCanvas');
    // planeMesh.depthMapEditor.appendChild(this.canvasDepthMap);
    this._context = this._canvasDepthMap.getContext('2d', { alpha: false, depth: false, antialias: false, preserveDrawingBuffer: true, premultipliedAlpha: false, willReadFrequently: true });
    this._canvasDepthMap.width = this.HTMLDepthMap.width / 5;
    this._canvasDepthMap.height = this.HTMLDepthMap.height / 5;
    this._context.translate(this._canvasDepthMap.width / 2, this._canvasDepthMap.height / 2);
    this._context.scale(1, 1);
    this._context.translate(-this._canvasDepthMap.width / 2, -this._canvasDepthMap.height / 2);
    this._context.drawImage(this.HTMLDepthMap, -1, 0, this._canvasDepthMap.width, this._canvasDepthMap.height);
  }
  displacementMethodMode() {
    const dataURL = this._canvasDepthMap.toDataURL();
    const img = new Image();
    img.src = dataURL;
    img.onload = () => {
      this._mesh.displacement.HTMLDepthMap = img;
    };
    this._mesh.material.map = planeMesh.images.threeAlbedoMap;
    this._mesh.material.flatShading = false;
    this._mesh.material.needsUpdate = true;
  }
  depthMapEditorMode() {
    this.depthMap ? this._mesh.material.map = this.depthMap : this._mesh.material.map = this._mesh.images.threeDepthMap;
    this._mesh.material.flatShading = true;
    this._mesh.material.needsUpdate = true;
    if (this._mesh.grayscaleDisplacement.isGrayscaleDisplacement) {
      this._mesh.updateGeometry();
      this.depthMap ? this._mesh.material.displacementMap = this.depthMap : this._mesh.material.displacementMap = this._mesh.images.threeDepthMap;
      this._mesh.material.displacementScale = this._mesh.displacement.displacementScale;
      this._mesh.grayscaleDisplacement.isGrayscaleDisplacement = false;
    }
    if (document.getElementById('depthMapEditorCanvas') === null) {
      this._createDepthmapEditorCanvas();
    }
  }
  setFilters() {
    this._context.drawImage(this.HTMLDepthMap, 0, 0, this._canvasDepthMap.width, this._canvasDepthMap.height);
    this._context.filter = `contrast(${this.contrast}%) blur(${this.blur}px)`;
    const imageData = this._context.getImageData(0, 0, this._canvasDepthMap.width, this._canvasDepthMap.height);
    const filtered = ImageFilters.Gamma(imageData, this.gamma.toFixed(2));
    this._context.putImageData(filtered, 0, 0);
    this.updateDisplacement();
  }
  updateDisplacement() {
    const newDisplacement = new THREE.CanvasTexture(this._canvasDepthMap);
    newDisplacement.anisotropy = renderer.capabilities.getMaxAnisotropy();
    this._mesh.material.displacementMap = newDisplacement;
    this._mesh.material.map = newDisplacement;
    this.depthMap = newDisplacement;
  }
  resetToDefault() {
    this.contrast = 100;
    this.blur = 1;
    this.gamma = 1;
    this.setFilters();
    pane.refresh();
  }
}

class Export {
  constructor(mesh) {
    this._mesh = mesh;
  }
  async GLTFExport(binary = false) {
    this._mesh.displacement.createDepthMapCanvas();
    this._mesh.displacement.applyToMesh();
    const { GLTFExporter } = await import('./Exporters/GLTFExporter.js');
    const { jszip } = await import('./jszip.js');
    const imageBlob = await this._mesh.displacement.saveToImageBlob();
    const exporter = new GLTFExporter();
    exporter.parse(scene, (gltf) => {
      const GLTFJson = JSON.stringify(gltf);
      const GLTFBlobMesh = new Blob([GLTFJson], { type: 'application/json' });
      const depthMapBlob = new Blob([imageBlob], { type: 'image/png;charset=utf-8' });
      const zip = new JSZip();
      //glTF format if not binary else GLB
      zip.file(!binary ? "mesh.glTF" : "mesh.glb", GLTFBlobMesh);
      zip.file("depthmap.png", depthMapBlob);
      zip.generateAsync({ type: 'blob' }).then((blob) => {
        const element = document.createElement("a");
        element.href = URL.createObjectURL(blob);
        element.download = !binary ? "mesh_glTF.zip" : "mesh_glb.zip";
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
      })
    }, { binary });
  }
  async STLExport() {
    this._mesh.displacement.createDepthMapCanvas();
    this._mesh.displacement.applyToMesh();
    const { STLExporter } = await import('./Exporters/STLExporter.js');
    const { jszip } = await import('./jszip.js');
    const imageBlob = await this._mesh.displacement.saveToImageBlob();
    const exporter = new STLExporter();
    const parsedMesh = exporter.parse(this._mesh.mesh, { binary: true });
    const STLBlobMesh = new Blob([parsedMesh], { type: 'application/octet-stream' });
    const depthMapBlob = new Blob([imageBlob], { type: 'image/png;charset=utf-8' });
    const zip = new JSZip();
    zip.file("mesh.stl", STLBlobMesh);
    zip.file("depthmap.png", depthMapBlob);
    zip.generateAsync({ type: 'blob' }).then((blob) => {
      const element = document.createElement("a");
      element.href = URL.createObjectURL(blob);
      element.download = "mesh_stl.zip";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    })
  }
  async OBJExport() {
    this._mesh.displacement.createDepthMapCanvas();
    this._mesh.displacement.applyToMesh();
    const { OBJExporter } = await import('./Exporters/OBJExporter.js');
    const { jszip } = await import('./jszip.js');
    const imageBlob = await this._mesh.displacement.saveToImageBlob();
    const exporter = new OBJExporter();
    const parsedMesh = exporter.parse(this._mesh.mesh);
    const OBJBlobMesh = new Blob([parsedMesh], { type: 'application/octet-stream' });
    const depthMapBlob = new Blob([imageBlob], { type: 'image/png;charset=utf-8' });
    const zip = new JSZip();
    zip.file("mesh.obj", OBJBlobMesh);
    zip.file("depthmap.png", depthMapBlob);
    zip.generateAsync({ type: 'blob' }).then((blob) => {
      const element = document.createElement("a");
      element.href = URL.createObjectURL(blob);
      element.download = "mesh_obj.zip";
      document.body.appendChild(element);
      element.click()
      document.body.removeChild(element);
    });
  }
}

export async function reload(isUser) {
  await planeMesh.images.importADNH(isUser);
  renderer.renderLists.dispose();
  planeMesh.mesh.material.dispose();
  planeMesh.mesh.geometry.dispose();
  planeMesh.heightSegments = 256;
  planeMesh.widthSegments = 256;
  planeMesh.animation.isInAndOutDisplacementAnimation = false;
  planeMesh.displacement.displacementScale = 0;
  planeMesh.grayscaleDisplacement.isGrayscaleDisplacement = false;
  planeMesh.grayscaleDisplacement.grayscaleDisplacementScale = 0;
  planeMesh.mesh.position.z = -2;
  planeMesh.mesh.material.displacementScale = 0;
  planeMesh.mesh.material.roughness = 2;
  planeMesh.mesh.material.wireframe = false;
  planeMesh.mesh.material.normalScale.x = 1;
  planeMesh.mesh.material.normalScale.y = 1;
  planeMesh.mesh.scale.x = 1;
  planeMesh.mesh.scale.y = 1;
  Light.isLightShow = false;
  Light.dirLight1.intensity = 1.5;
  Light.dirLight2.intensity = 1.5;
  Light.spotLight.intensity = 1.0;
  planeMesh.updateGeometry();
  planeMesh.resetMaterial();
  planeMesh.mesh.material.needsUpdate = true;
  tab.pages[0].children[10].children[0].value = 'glTF';
  pane.refresh();
  camera.position.setFromMatrixPosition(camera.matrixWorld);
  planeMesh.animation.appearanceDisplacementAnimation();
  planeMesh.animation.setZPositionToZero();
}

function recalculateWidthAndHeight() {
  width = window.innerWidth;
  height = window.innerHeight;
}

export function setBodyBackgroundColor() {
  scene.background = new THREE.Color(getComputedStyle(document.body).backgroundColor);
}

function resizeCanvasToDisplaySize() {
  recalculateWidthAndHeight();
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function renderFrame() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(renderFrame);
}

async function main() {
  setBodyBackgroundColor();
  Light.createBasicLight();
  planeMesh = new PlaneMesh(256, 256);
  await planeMesh.images.importADNH();
  scene.add(planeMesh.mesh);
  planeMesh.mesh.position.z = -2;
  planeMesh.updateGeometry();
  planeMesh.resetMaterial();
  camera.position.setFromMatrixPosition(camera.matrixWorld);
  tweakpaneInit(planeMesh, Light);
  planeMesh.animation.appearanceDisplacementAnimation();
  planeMesh.animation.setZPositionToZero();
  resizeCanvasToDisplaySize();
  requestAnimationFrame(renderFrame);
}
main()