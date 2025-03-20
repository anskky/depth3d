import { Pane } from 'tweakpane';

export let pane = new Pane({
	title: 'Parameters',
	container: document.querySelector('.canvas-area__tweakpane'),
});

export let tab = pane.addTab({
	pages: [
		{ title: 'Displacement method' },
		{ title: 'Depth map editor' }
	],
});

export function tweakpaneInit(planeMesh, Light) {
  tab.pages[1].addBinding(planeMesh.depthMapEditor, 'gamma', {
    label: 'Gamma',
    min: 0,
    max: 2,
  }).on('change', () => {
    planeMesh.depthMapEditor.setFilters();
  });

  tab.pages[1].addBinding(planeMesh.depthMapEditor, 'blur', {
    label: 'Gaussian blur',
    min: 0,
    max: 30,
  }).on('change', () => {
    planeMesh.depthMapEditor.setFilters();
  });

  tab.pages[1].addBinding(planeMesh.depthMapEditor, 'contrast', {
    label: 'Contrast',
    min: 0,
    max: 200,
  }).on('change', () => {
    planeMesh.depthMapEditor.setFilters();
  });

  const resetDepthMapButton = tab.pages[1].addButton({
    title: 'Reset',
  }).on('click', () => {
    planeMesh.depthMapEditor.resetToDefault();
  });

  tab.pages[0].addBinding(planeMesh.displacement, 'displacementScale', {
    label: 'Depth intensity',
    min: -3,
    max: 3,
  }).on('change', () => {
    handleDisplacementChange(planeMesh);
  });

  tab.pages[0].addBinding(planeMesh.grayscaleDisplacement, 'grayscaleDisplacementScale', {
    label: 'Grayscale displacement intensity',
    min: -3,
    max: 3,
    disabled: false,
  }).on('change', () => {
    handleGrayscaleDisplacementChange(planeMesh);
  });

  tab.pages[0].addBinding(planeMesh.mesh.material.normalScale, 'x', {
    label: 'Normal map intensity',
    min: 0,
    max: 5,
  }).on('change', () => {
    handleNormalMapChange(planeMesh);
  });

  tab.pages[0].addBinding(planeMesh.mesh.material, 'roughness', {
    label: 'Roughness map intensity',
    min: 0,
    max: 2,
  }).on('change', () => {
    handleRoughnessChange(planeMesh);
  });

  tab.pages[0].addBinding(planeMesh, 'widthSegments', {
    label: 'Resolution',
    step: 2,
    min: 2,
    max: 512,
  }).on('change', () => {
    planeMesh.updateGeometry();
  });

  const sizeFolder = tab.pages[0].addFolder({
    title: 'Size',
    expanded: true,
  });

  sizeFolder.addBinding(planeMesh.mesh.scale, 'x', {
    label: 'Horizontal size',
    min: 0.0,
    max: 2,
  });

  sizeFolder.addBinding(planeMesh.mesh.scale, 'y', {
    label: 'Vertical size',
    min: 0.0,
    max: 2,
  });

  const lightingFolder = tab.pages[0].addFolder({
    title: 'Light',
    expanded: true,
  });

  lightingFolder.addBinding(Light.dirLight1, 'intensity', {
    label: 'Directional light 1',
    min: 0.0,
    max: 2,
  });

  lightingFolder.addBinding(Light.dirLight2, 'intensity', {
    label: 'Directional light 2',
    min: 0.0,
    max: 2,
  });

  lightingFolder.addBinding(Light.spotLight, 'intensity', {
    label: 'Spot light',
    min: 0.0,
    max: 3,
  });

  lightingFolder.addBinding(Light, 'isLightShow', {
    label: 'Light show',
  }).on('change', () => {
    Light.createLightShow(planeMesh.mesh);
  });

  tab.pages[0].addBinding(planeMesh.mesh.material, 'wireframe', {
    label: 'Wireframe'
  }).on('change', () => {
    handleWireframeChange(planeMesh);
  });

  tab.pages[0].addBinding(planeMesh.animation, 'isInAndOutDisplacementAnimation', {
    label: 'Animate'
  }).on('change', () => {
    planeMesh.animation.inAndOutDisplacementAnimation();
  });

  const statsFolder = tab.pages[0].addFolder({
    title: 'Stats',
    expanded: true,
  });

  statsFolder.addBinding(planeMesh, 'vertexCount', {
    label: 'Vertices',
    format: (v) => v.toFixed(0),
    readonly: true,
  });

  statsFolder.addBinding(planeMesh, 'triangleCount', {
    label: 'Triangles',
    format: (v) => v.toFixed(0),
    readonly: true,
  });

  const exportFolder = tab.pages[0].addFolder({
    title: 'Export 3D model',
    expanded: true,
  });

  exportFolder.addBlade({
    view: 'list',
    label: 'Format',
    options: [
      { text: 'glTF', value: 'glTF' },
      { text: 'GLB', value: 'GLB' },
      { text: 'STL', value: 'STL' },
      { text: 'OBJ', value: 'OBJ' },
    ],
    value: 'glTF',
  })

  exportFolder.addButton({
    title: 'Export',
  }).on('click', () => {
    handleExport(planeMesh, exportFolder.children[0].value);
  });

  const resetButton = tab.pages[0].addButton({
    title: 'Reset',
  }).on('click', () => {
    resetToDefault(planeMesh, Light);
  });

  const div = document.getElementsByClassName('tp-tbiv_b');
  div[0].id = 'displacementMethodMode';
  div[1].id = 'depthMapEditorMode';

  document.getElementById('displacementMethodMode').onclick = () => {
    planeMesh.depthMapEditor.displacementMethodMode();
  };

  document.getElementById('depthMapEditorMode').onclick = () => {
    planeMesh.depthMapEditor.depthMapEditorMode();
  };
}

// Helper Functions
function handleDisplacementChange(planeMesh) {
  if (planeMesh.grayscaleDisplacement.isGrayscaleDisplacement) {
    planeMesh.updateGeometry();
    if (planeMesh.depthMapEditor.depthMap) {
      planeMesh.material.displacementMap = planeMesh.depthMapEditor.depthMap;
    } else {
      planeMesh.mesh.material.displacementMap = planeMesh.images.threeDepthMap;
    }
    planeMesh.grayscaleDisplacement.isGrayscaleDisplacement = false;
    planeMesh.grayscaleDisplacement.grayscaleDisplacementScale = 0;
  }
  planeMesh.mesh.material.displacementScale = planeMesh.displacement.displacementScale;
  pane.refresh();
}

function handleGrayscaleDisplacementChange(planeMesh) {
  if (!planeMesh.grayscaleDisplacement.isGrayscaleDisplacement) {
    planeMesh.displacement.createDepthMapCanvas();
    planeMesh.displacement.applyToMesh();
    planeMesh.mesh.material.displacementMap = planeMesh.images.threeHeightMap;
    planeMesh.mesh.geometry.attributes.position.needsUpdate = true;
    planeMesh.grayscaleDisplacement.isGrayscaleDisplacement = true;
    pane.refresh();
  }
  planeMesh.mesh.material.displacementScale = planeMesh.grayscaleDisplacement.grayscaleDisplacementScale;
}

function handleNormalMapChange(planeMesh) {
  planeMesh.mesh.material.normalScale.y = planeMesh.mesh.material.normalScale.x;
  if (planeMesh.mesh.material.normalMap !== planeMesh.images.threeNormalMap) {
    planeMesh.mesh.material.normalMap = planeMesh.images.threeNormalMap;
  }
}

function handleRoughnessChange(planeMesh) {
  if (planeMesh.mesh.material.roughness === 2) {
    planeMesh.mesh.material.roughnessMap = null;
    planeMesh.mesh.material.needsUpdate = true;
  } else {
    planeMesh.mesh.material.roughnessMap = planeMesh.images.threeHeightMap;
    planeMesh.mesh.material.needsUpdate = true;
  }
}

function handleWireframeChange(planeMesh) {
  if (planeMesh.mesh.material.wireframe === true) {
    planeMesh.mesh.material.transparent = true;
  } else {
    planeMesh.mesh.material.transparent = false;
  }
}

function handleExport(planeMesh, format) {
  switch (format) {
    case 'glTF':
      planeMesh.export.GLTFExport(false);
      break;
    case 'GLB':
      planeMesh.export.GLTFExport(true);
      break;
    case 'STL':
      planeMesh.export.STLExport();
      break;
    case 'OBJ':
      planeMesh.export.OBJExport();
      break;
    default:
      break;
  }
}

function resetToDefault(planeMesh, Light) {
  planeMesh.heightSegments = 256;
  planeMesh.widthSegments = 256;
  planeMesh.grayscaleDisplacement.isGrayscaleDisplacement = false;
  planeMesh.animation.isInAndOutDisplacementAnimation = false;
  planeMesh.displacement.displacementScale = 1.5;
  planeMesh.grayscaleDisplacement.grayscaleDisplacementScale = 0;
  planeMesh.mesh.material.displacementScale = 1.5;
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
}