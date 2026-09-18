import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * Dados dos territórios.
 * markerStyle controla somente aparência.
 * status review: estágio institucional requer validação; não exibir ao público.
 * Novos pontos podem ser incluídos aqui sem alterar a construção do planeta.
 */
const LAB_NODES = [
  {
    id: 'bh',
    city: 'Belo Horizonte',
    role: 'Território',
    latitude: -19.9167,
    longitude: -43.9345,
    markerStyle: 'amber',
    status: 'review',
    href: 'territorios.html#belo-horizonte'
  },
  {
    id: 'goiania',
    city: 'Goiânia',
    role: 'Território',
    latitude: -16.6869,
    longitude: -49.2648,
    markerStyle: 'red',
    status: 'review',
    href: 'territorios.html#goiania'
  },
  {
    id: 'anapolis',
    city: 'Anápolis',
    role: 'Território',
    latitude: -16.3281,
    longitude: -48.953,
    markerStyle: 'red',
    status: 'review',
    href: 'territorios.html#anapolis'
  },
  {
    id: 'lisboa',
    city: 'Lisboa',
    role: 'Território',
    latitude: 38.7223,
    longitude: -9.1393,
    markerStyle: 'green',
    status: 'review',
    href: 'territorios.html#lisboa'
  },
  {
    id: 'sao-miguel',
    city: 'São Miguel · Açores',
    role: 'Território de interesse · Portugal',
    latitude: 37.78,
    longitude: -25.5,
    markerStyle: 'blue',
    status: 'interest',
    href: 'territorios.html#sao-miguel'
  },
  {
    id: 'berlim',
    city: 'Berlim',
    role: 'Ponto de articulação · Alemanha',
    latitude: 52.52,
    longitude: 13.405,
    markerStyle: 'blue',
    status: 'review',
    href: 'territorios.html#berlim'
  }
];

const CONFIG = {
  earthRadius: 1.42,
  markerRadius: 1.46,
  initialView: {
    centerLongitude: -20,
    tilt: -0.055,
    desktopCameraZ: 5.15,
    mobileCameraZ: 5.2
  },
  controls: {
    minDistance: 3.8,
    maxDistance: 6.1,
    autoRotateSpeed: 0.14,
    resumeDelay: 2600
  }
};

/**
 * PLACEHOLDER CARTOGRÁFICO
 * Contornos deliberadamente simplificados, sem valor geográfico de precisão.
 * Substituir futuramente por GeoJSON verificado em assets/cartografia/.
 * Cada par está no formato [longitude, latitude].
 */
const CARTOGRAPHY_PLACEHOLDER = [
  {
    name: 'south-america',
    coordinates: [
      [-81, 12], [-75, 10], [-70, 11], [-62, 10], [-55, 7], [-50, 3],
      [-45, -1], [-39, -4], [-35, -7], [-37, -13], [-39, -18], [-44, -23],
      [-49, -29], [-54, -34], [-58, -39], [-63, -47], [-67, -55], [-72, -51],
      [-74, -43], [-72, -34], [-70, -26], [-75, -18], [-78, -10], [-80, -2],
      [-78, 5], [-81, 12]
    ]
  },
  {
    name: 'africa',
    coordinates: [
      [-17, 37], [-5, 36], [9, 37], [20, 32], [31, 31], [34, 25], [43, 12],
      [50, 2], [44, -12], [35, -23], [27, -34], [18, -35], [10, -29], [3, -18],
      [-8, -7], [-17, 5], [-16, 15], [-11, 22], [-17, 29], [-17, 37]
    ]
  },
  {
    name: 'europe',
    coordinates: [
      [-10, 36], [-10, 43], [-6, 48], [-9, 54], [-5, 58], [2, 61], [10, 58],
      [19, 60], [28, 56], [31, 49], [28, 43], [19, 40], [12, 37], [4, 43],
      [-1, 44], [-6, 42], [-10, 36]
    ]
  },
  {
    name: 'north-america-atlantic',
    coordinates: [
      [-81, 9], [-84, 19], [-81, 26], [-76, 35], [-70, 42], [-60, 47], [-55, 53],
      [-61, 59], [-67, 66], [-55, 72], [-42, 70], [-52, 59], [-58, 51], [-65, 45],
      [-72, 40], [-79, 32], [-87, 22], [-81, 9]
    ]
  },
  {
    name: 'greenland',
    coordinates: [
      [-54, 59], [-46, 61], [-34, 68], [-21, 76], [-30, 83], [-46, 84],
      [-61, 77], [-68, 68], [-54, 59]
    ]
  }
];

// Contornos esquemáticos das nove ilhas, em [longitude, latitude].
// Mesma convenção provisória dos continentes; não são limites de precisão.
const AZORES_ISLANDS = [
  { name: 'sao-miguel', coordinates: [[-25.86, 37.88], [-25.72, 37.91], [-25.52, 37.83], [-25.15, 37.86], [-25.13, 37.75], [-25.48, 37.70], [-25.75, 37.74], [-25.86, 37.88]] },
  { name: 'santa-maria', coordinates: [[-25.17, 37.00], [-25.02, 37.02], [-24.97, 36.94], [-25.13, 36.93], [-25.17, 37.00]] },
  { name: 'terceira', coordinates: [[-27.38, 38.77], [-27.22, 38.81], [-27.04, 38.74], [-27.10, 38.65], [-27.31, 38.66], [-27.38, 38.77]] },
  { name: 'graciosa', coordinates: [[-28.07, 39.09], [-28.02, 39.13], [-27.95, 39.08], [-27.97, 39.02], [-28.07, 39.09]] },
  { name: 'sao-jorge', coordinates: [[-28.32, 38.75], [-28.22, 38.76], [-27.74, 38.56], [-27.81, 38.54], [-28.32, 38.75]] },
  { name: 'pico', coordinates: [[-28.55, 38.53], [-28.40, 38.56], [-28.03, 38.43], [-28.16, 38.39], [-28.48, 38.42], [-28.55, 38.53]] },
  { name: 'faial', coordinates: [[-28.84, 38.60], [-28.71, 38.64], [-28.60, 38.59], [-28.65, 38.52], [-28.80, 38.54], [-28.84, 38.60]] },
  { name: 'flores', coordinates: [[-31.27, 39.51], [-31.18, 39.52], [-31.13, 39.39], [-31.24, 39.36], [-31.27, 39.51]] },
  { name: 'corvo', coordinates: [[-31.13, 39.71], [-31.09, 39.73], [-31.08, 39.68], [-31.12, 39.67], [-31.13, 39.71]] }
];

const COUNTRY_HIGHLIGHTS = [
  {
    name: 'brasil',
    coordinates: [
      [-73, -7], [-70, 2], [-60, 5], [-51, 4], [-43, -2], [-35, -7], [-38, -15],
      [-41, -22], [-49, -29], [-57, -31], [-58, -24], [-64, -20], [-67, -10], [-73, -7]
    ]
  },
  {
    name: 'portugal',
    coordinates: [
      [-9.5, 42], [-8, 42], [-7, 39.5], [-7.3, 37], [-9.3, 37], [-9.5, 42]
    ]
  }
];

/**
 * Conexões editoriais entre os territórios.
 * `intensity` regula apenas densidade visual, nunca hierarquia institucional.
 */
const LAB_CONNECTIONS = [
  { from: 'bh', to: 'lisboa', type: 'international', intensity: 1, height: 0.62 },
  { from: 'bh', to: 'sao-miguel', type: 'international', intensity: 0.75, height: 0.55 },
  { from: 'bh', to: 'berlim', type: 'international', intensity: 0.75, height: 0.72 },
  { from: 'sao-miguel', to: 'lisboa', type: 'regional', intensity: 0.6, height: 0.13 },
  { from: 'lisboa', to: 'berlim', type: 'regional', intensity: 0.6, height: 0.18 },
  { from: 'goiania', to: 'bh', type: 'regional', intensity: 0.65, height: 0.11 },
  { from: 'anapolis', to: 'bh', type: 'regional', intensity: 0.55, height: 0.09 }
];

/**
 * Controles centrais da malha relacional.
 * Alterar estes valores é suficiente para tornar a rede mais densa ou discreta.
 */
const ROUTE_STYLE = {
  mobileBreakpoint: 768,
  copies: {
    international: { desktop: 6, mobile: 4 },
    regional: { desktop: 4, mobile: 3 }
  },
  segments: {
    international: { desktop: 92, mobile: 64 },
    regional: { desktop: 42, mobile: 30 }
  },
  spread: {
    international: 0.095,
    regional: 0.026
  },
  opacity: {
    main: 0.68,
    secondary: 0.42,
    field: 0.2,
    breathingFloor: 0.06
  },
  flow: {
    counts: {
      international: { desktop: 7, mobile: 4 },
      regional: { desktop: 3, mobile: 2 }
    },
    minSpeed: 0.035,
    maxSpeed: 0.11,
    pauseFraction: { min: 0.08, max: 0.26 },
    pointSize: { desktop: 0.017, mobile: 0.015 }
  },
  mobileDashScale: 0.78,
  dashPatterns: [
    { name: 'continuous', dash: 0.03, gap: 0.02 },
    { name: 'breathing', dash: 0.055, gap: 0.045 },
    { name: 'fragmented', dash: 0.015, gap: 0.07 }
  ],
  colors: [0xffab3b, 0x3889c8, 0x4eb300, 0xef386c]
};

const state = {
  canvas: null,
  scene: null,
  camera: null,
  renderer: null,
  controls: null,
  earthRoot: null,
  interactiveMeshes: [],
  markerStates: [],
  routeGroup: null,
  routeLineStates: [],
  routeFlowStates: [],
  routeFlowPoints: null,
  routeDensity: null,
  routeStaticRendered: false,
  lastFrameTime: 0,
  hoveredMarker: null,
  hoveredHitTarget: null,
  pointer: new THREE.Vector2(4, 4),
  raycaster: new THREE.Raycaster(),
  interactionActive: false,
  externallyPaused: false,
  resumeAt: 0,
  autoRotateFactor: 0,
  pointerDown: null,
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
};

function initScene() {
  state.canvas = document.querySelector('#lab-earth');
  if (!state.canvas) return;

  state.scene = new THREE.Scene();
  state.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);

  try {
    state.renderer = new THREE.WebGLRenderer({
      canvas: state.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
  } catch (error) {
    showWebGLError(error);
    return;
  }

  state.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  state.renderer.setClearColor(0x000000, 0);
  state.renderer.outputColorSpace = THREE.SRGBColorSpace;

  const ambient = new THREE.AmbientLight(0xfff8ed, 1.25);
  const keyLight = new THREE.DirectionalLight(0xffab3b, 1.6);
  keyLight.position.set(-3, 2.5, 4);
  const softLight = new THREE.DirectionalLight(0x3889c8, 0.65);
  softLight.position.set(3, -1, 2);
  state.scene.add(ambient, keyLight, softLight);

  createEarth();
  createGeographicGrid();
  createCartography();
  createNodes();
  createRoutes();
  setupControls();
  setupInteraction();
  handleResize();
  state.controls.update();
  state.renderer.render(state.scene, state.camera);

  window.addEventListener('resize', handleResize, { passive: true });
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('lab-earth-pause', pauseExternalInteraction);
  window.addEventListener('lab-earth-resume', resumeExternalInteraction);
  document.querySelector('.loading-state')?.remove();
  const flowTypes = state.routeFlowStates.reduce((totals, flow) => {
    totals[flow.behavior] = (totals[flow.behavior] ?? 0) + 1;
    return totals;
  }, {});
  window.dispatchEvent(new CustomEvent('lab-earth-ready', {
    detail: {
      nodes: LAB_NODES.length,
      connections: LAB_CONNECTIONS.length,
      routeLines: state.routeLineStates.length,
      routeSignals: state.routeFlowStates.length,
      flowTypes,
      routeDensity: state.routeDensity,
      renderer: 'webgl'
    }
  }));
  animate();
}

function createEarth() {
  state.earthRoot = new THREE.Group();
  state.earthRoot.name = 'earth-root';
  state.earthRoot.rotation.y = THREE.MathUtils.degToRad(-CONFIG.initialView.centerLongitude);
  state.earthRoot.rotation.x = CONFIG.initialView.tilt;
  state.scene.add(state.earthRoot);

  const geometry = new THREE.SphereGeometry(CONFIG.earthRadius, 64, 48);
  const material = new THREE.MeshStandardMaterial({
    color: 0x033a64,
    roughness: 0.96,
    metalness: 0,
    transparent: false
  });
  const ocean = new THREE.Mesh(geometry, material);
  ocean.name = 'ocean';
  state.earthRoot.add(ocean);

  const observationRing = new THREE.Mesh(
    new THREE.RingGeometry(CONFIG.earthRadius + 0.11, CONFIG.earthRadius + 0.115, 128),
    new THREE.MeshBasicMaterial({
      color: 0xffab3b,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  observationRing.rotation.x = Math.PI / 2.35;
  observationRing.rotation.z = -0.14;
  observationRing.name = 'observation-ring';
  state.earthRoot.add(observationRing);
}

function createGeographicGrid() {
  const radius = CONFIG.earthRadius + 0.008;
  const material = new THREE.LineBasicMaterial({
    color: 0x3889c8,
    transparent: true,
    opacity: 0.16,
    depthWrite: false
  });
  const equatorMaterial = new THREE.LineBasicMaterial({
    color: 0xffab3b,
    transparent: true,
    opacity: 0.24,
    depthWrite: false
  });

  for (let latitude = -60; latitude <= 60; latitude += 15) {
    const points = [];
    for (let longitude = -180; longitude <= 180; longitude += 3) {
      points.push(latLonToVector3(latitude, longitude, radius));
    }
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      latitude === 0 ? equatorMaterial : material
    );
    line.name = `latitude-${latitude}`;
    state.earthRoot.add(line);
  }

  for (let longitude = -180; longitude < 180; longitude += 15) {
    const points = [];
    for (let latitude = -84; latitude <= 84; latitude += 3) {
      points.push(latLonToVector3(latitude, longitude, radius));
    }
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      material
    );
    line.name = `longitude-${longitude}`;
    state.earthRoot.add(line);
  }
}

function createCartography() {
  const continentMaterial = new THREE.LineBasicMaterial({
    color: 0xffab3b,
    transparent: true,
    opacity: 0.72,
    depthWrite: false
  });
  const countryMaterial = new THREE.LineBasicMaterial({
    color: 0x61df00,
    transparent: true,
    opacity: 0.95,
    depthWrite: false
  });

  CARTOGRAPHY_PLACEHOLDER.forEach((shape) => {
    const line = createCartographicLine(shape.coordinates, CONFIG.earthRadius + 0.017, continentMaterial);
    line.name = `placeholder-${shape.name}`;
    state.earthRoot.add(line);
  });

  COUNTRY_HIGHLIGHTS.forEach((shape) => {
    const line = createCartographicLine(shape.coordinates, CONFIG.earthRadius + 0.024, countryMaterial);
    line.name = `highlight-${shape.name}`;
    state.earthRoot.add(line);
  });

  AZORES_ISLANDS.forEach((island) => {
    const line = createCartographicLine(island.coordinates, CONFIG.earthRadius + 0.024, countryMaterial);
    line.name = `highlight-acores-${island.name}`;
    state.earthRoot.add(line);
  });
}

function createCartographicLine(coordinates, radius, material) {
  const points = [];
  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const [startLongitude, startLatitude] = coordinates[index];
    const [endLongitude, endLatitude] = coordinates[index + 1];
    const subdivisions = Math.max(2, Math.ceil(Math.hypot(
      endLongitude - startLongitude,
      endLatitude - startLatitude
    ) / 2.5));

    for (let step = 0; step < subdivisions; step += 1) {
      const progress = step / subdivisions;
      const latitude = THREE.MathUtils.lerp(startLatitude, endLatitude, progress);
      const longitude = THREE.MathUtils.lerp(startLongitude, endLongitude, progress);
      points.push(latLonToVector3(latitude, longitude, radius));
    }
  }

  const [lastLongitude, lastLatitude] = coordinates.at(-1);
  points.push(latLonToVector3(lastLatitude, lastLongitude, radius));
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);
}

function createNodes() {
  const markerColors = {
    amber: 0xffab3b,
    red: 0xe30041,
    green: 0x61df00,
    blue: 0x3889c8
  };

  LAB_NODES.forEach((node, index) => {
    const position = latLonToVector3(node.latitude, node.longitude, CONFIG.markerRadius);
    const normal = position.clone().normalize();
    const marker = new THREE.Group();
    marker.position.copy(position);
    marker.userData = {
      node,
      nodeId: node.id,
      city: node.city,
      role: node.role,
      href: node.href,
      targetScale: 1
    };

    const color = markerColors[node.markerStyle] ?? markerColors.blue;
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(node.markerStyle === 'amber' ? 0.032 : 0.025, 18, 14),
      new THREE.MeshBasicMaterial({ color })
    );
    dot.name = `node-dot-${node.id}`;
    marker.add(dot);

    const ringMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.049, 0.059, 32),
      ringMaterial
    );
    ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    marker.add(ring);

    const pulse = new THREE.Mesh(
      new THREE.RingGeometry(0.071, 0.074, 36),
      ringMaterial.clone()
    );
    pulse.material.opacity = 0.26;
    pulse.quaternion.copy(ring.quaternion);
    marker.add(pulse);

    const hitRadius = window.matchMedia('(max-width: 767px)').matches ? 0.13 : 0.09;
    const hitTarget = new THREE.Mesh(
      new THREE.SphereGeometry(hitRadius, 12, 10),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    hitTarget.userData = {
      node,
      marker,
      nodeId: node.id,
      city: node.city,
      role: node.role,
      href: node.href
    };
    marker.add(hitTarget);

    state.interactiveMeshes.push(hitTarget);
    state.markerStates.push({ marker, pulse, phase: index * 1.35 });
    state.earthRoot.add(marker);
  });
}

function createRoutes(compact = window.innerWidth < ROUTE_STYLE.mobileBreakpoint) {
  disposeConnectionNetwork();
  state.routeDensity = compact ? 'mobile' : 'desktop';
  state.routeStaticRendered = false;
  state.routeGroup = new THREE.Group();
  state.routeGroup.name = 'reciprocal-connection-network';
  state.earthRoot.add(state.routeGroup);

  const nodeById = new Map(LAB_NODES.map((node) => [node.id, node]));
  LAB_CONNECTIONS.forEach((connection, connectionIndex) => {
    createConnectionFamily(connection, connectionIndex, nodeById, compact);
  });

  createRoutePointCloud(compact);
  updateRouteFlows(0, 0, true);
}

function disposeConnectionNetwork() {
  if (state.routeGroup) {
    state.routeGroup.traverse((object) => {
      object.geometry?.dispose();
      if (Array.isArray(object.material)) {
        object.material.forEach((material) => material.dispose());
      } else {
        object.material?.dispose();
      }
    });
    state.earthRoot.remove(state.routeGroup);
  }

  state.routeGroup = null;
  state.routeLineStates = [];
  state.routeFlowStates = [];
  state.routeFlowPoints = null;
}

function createConnectionFamily(connection, connectionIndex, nodeById, compact) {
  const startNode = nodeById.get(connection.from);
  const endNode = nodeById.get(connection.to);
  if (!startNode || !endNode) return;

  const start = latLonToVector3(startNode.latitude, startNode.longitude, CONFIG.markerRadius);
  const end = latLonToVector3(endNode.latitude, endNode.longitude, CONFIG.markerRadius);
  const mode = compact ? 'mobile' : 'desktop';
  const total = ROUTE_STYLE.copies[connection.type][mode];
  const segments = ROUTE_STYLE.segments[connection.type][mode];
  const primaryIndex = Math.floor((total - 1) / 2);
  const curves = [];

  for (let index = 0; index < total; index += 1) {
    const curve = createRouteVariant(start, end, index, total, connection, connectionIndex);
    const hierarchyDistance = Math.abs(index - primaryIndex);
    const hierarchy = hierarchyDistance === 0
      ? 'main'
      : hierarchyDistance === 1
        ? 'secondary'
        : 'field';
    const patternIndex = hierarchy === 'main' ? 0 : (index + connectionIndex) % ROUTE_STYLE.dashPatterns.length;
    const colorIndex = (index * 2 + connectionIndex) % ROUTE_STYLE.colors.length;
    const intensityFactor = THREE.MathUtils.lerp(0.72, 1, connection.intensity);
    const style = {
      hierarchy,
      pattern: ROUTE_STYLE.dashPatterns[patternIndex],
      dashScale: compact ? ROUTE_STYLE.mobileDashScale : 1,
      color: ROUTE_STYLE.colors[colorIndex],
      opacity: ROUTE_STYLE.opacity[hierarchy] * intensityFactor,
      dashDirection: (index + connectionIndex) % 2 === 0 ? 1 : -1,
      dashSpeed: THREE.MathUtils.lerp(0.012, 0.034, deterministicValue(connectionIndex * 97 + index * 13 + 4)),
      breathPhase: deterministicValue(connectionIndex * 71 + index * 19 + 8) * Math.PI * 2,
      breathSpeed: THREE.MathUtils.lerp(0.34, 0.62, deterministicValue(connectionIndex * 43 + index * 29 + 2))
    };

    const lineState = createDashedRoute(
      curve,
      segments,
      style,
      `route-${connection.from}-${connection.to}-${index + 1}`
    );
    state.routeGroup.add(lineState.line);
    state.routeLineStates.push(lineState);
    curves.push(curve);
  }

  createRouteFlows(curves, connection, connectionIndex, compact);
}

function createRouteVariant(start, end, index, total, connection, connectionIndex) {
  const startNormal = start.clone().normalize();
  const endNormal = end.clone().normalize();
  const halfRange = Math.max((total - 1) / 2, 1);
  const relativeIndex = (index - (total - 1) / 2) / halfRange;
  const heightNoise = deterministicValue(connectionIndex * 101 + index * 17 + 1);
  const lateralNoise = deterministicValue(connectionIndex * 89 + index * 23 + 7) - 0.5;
  const tensionNoise = deterministicValue(connectionIndex * 67 + index * 31 + 5) - 0.5;
  const middleProgress = 0.5 + tensionNoise * 0.09;
  const height = connection.height * THREE.MathUtils.lerp(0.88, 1.13, heightNoise);
  const midpoint = startNormal
    .clone()
    .lerp(endNormal, middleProgress)
    .normalize()
    .multiplyScalar(CONFIG.earthRadius + height);

  const lateral = startNormal.clone().cross(endNormal);
  if (lateral.lengthSq() < 0.000001) lateral.cross(new THREE.Vector3(0, 1, 0));
  lateral.normalize();
  const spread = ROUTE_STYLE.spread[connection.type] * (relativeIndex + lateralNoise * 0.24);
  midpoint.addScaledVector(lateral, spread);

  return new THREE.QuadraticBezierCurve3(start, midpoint, end);
}

function createDashedRoute(curve, segments, style, name) {
  const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(segments));
  const material = new THREE.LineDashedMaterial({
    color: style.color,
    transparent: true,
    opacity: style.opacity,
    dashSize: style.pattern.dash,
    gapSize: style.pattern.gap,
    scale: style.dashScale,
    depthWrite: false
  });
  const line = new THREE.Line(geometry, material);
  line.computeLineDistances();
  line.name = name;
  line.renderOrder = 3;

  const distanceAttribute = line.geometry.getAttribute('lineDistance');
  distanceAttribute.setUsage(THREE.DynamicDrawUsage);

  return {
    line,
    material,
    distanceAttribute,
    baseDistances: Float32Array.from(distanceAttribute.array),
    baseOpacity: style.opacity,
    hierarchy: style.hierarchy,
    dashDirection: style.dashDirection,
    dashSpeed: style.dashSpeed,
    dashPhase: 0,
    breathPhase: style.breathPhase,
    breathSpeed: style.breathSpeed
  };
}

function createRouteFlows(curves, connection, connectionIndex, compact) {
  const mode = compact ? 'mobile' : 'desktop';
  const count = ROUTE_STYLE.flow.counts[connection.type][mode];

  for (let index = 0; index < count; index += 1) {
    const seed = connectionIndex * 131 + index * 37;
    const behavior = index % 3 === 0 ? 'forward' : index % 3 === 1 ? 'reverse' : 'oscillating';
    const rangeStart = THREE.MathUtils.lerp(0.1, 0.42, deterministicValue(seed + 11));
    const rangeLength = THREE.MathUtils.lerp(0.24, 0.42, deterministicValue(seed + 17));

    state.routeFlowStates.push({
      curve: curves[index % curves.length],
      behavior,
      direction: behavior === 'reverse' ? -1 : 1,
      phase: deterministicValue(seed + 3),
      speed: THREE.MathUtils.lerp(
        ROUTE_STYLE.flow.minSpeed,
        ROUTE_STYLE.flow.maxSpeed,
        deterministicValue(seed + 5)
      ),
      pause: THREE.MathUtils.lerp(
        ROUTE_STYLE.flow.pauseFraction.min,
        ROUTE_STYLE.flow.pauseFraction.max,
        deterministicValue(seed + 29)
      ),
      rangeStart,
      rangeEnd: Math.min(0.9, rangeStart + rangeLength),
      breathPhase: deterministicValue(seed + 19) * Math.PI * 2,
      breathSpeed: THREE.MathUtils.lerp(0.36, 0.78, deterministicValue(seed + 23)),
      visibilityFloor: index === 0 ? 0.26 : 0.025,
      color: new THREE.Color(ROUTE_STYLE.colors[(index + connectionIndex) % ROUTE_STYLE.colors.length])
    });
  }
}

function createRoutePointCloud(compact) {
  const count = state.routeFlowStates.length;
  const geometry = new THREE.BufferGeometry();
  const positions = new THREE.BufferAttribute(new Float32Array(count * 3), 3);
  const colors = new THREE.BufferAttribute(new Float32Array(count * 3), 3);
  positions.setUsage(THREE.DynamicDrawUsage);
  colors.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', positions);
  geometry.setAttribute('color', colors);

  const material = new THREE.PointsMaterial({
    size: ROUTE_STYLE.flow.pointSize[compact ? 'mobile' : 'desktop'],
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
    depthWrite: false
  });
  state.routeFlowPoints = new THREE.Points(geometry, material);
  state.routeFlowPoints.name = 'reciprocal-route-signals';
  state.routeFlowPoints.renderOrder = 4;
  state.routeGroup.add(state.routeFlowPoints);
}

function deterministicValue(seed) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function setupControls() {
  state.controls = new OrbitControls(state.camera, state.renderer.domElement);
  state.controls.enableDamping = true;
  state.controls.dampingFactor = 0.055;
  state.controls.enablePan = false;
  state.controls.enableZoom = true;
  state.controls.minDistance = CONFIG.controls.minDistance;
  state.controls.maxDistance = CONFIG.controls.maxDistance;
  state.controls.rotateSpeed = 0.34;
  state.controls.zoomSpeed = 0.48;
  state.controls.autoRotate = false;
  state.controls.autoRotateSpeed = 0;

  state.controls.addEventListener('start', () => {
    state.interactionActive = true;
    state.autoRotateFactor = 0;
    state.controls.autoRotate = false;
  });

  state.controls.addEventListener('end', () => {
    state.interactionActive = false;
    state.resumeAt = performance.now() + CONFIG.controls.resumeDelay;
  });
}

function setupInteraction() {
  const canvas = state.renderer.domElement;

  canvas.addEventListener('pointermove', (event) => {
    updatePointer(event);
    updateHoveredNode(event);
  }, { passive: true });

  canvas.addEventListener('pointerleave', () => {
    state.pointer.set(4, 4);
    clearHoveredNode();
  });

  canvas.addEventListener('pointerdown', (event) => {
    state.pointerDown = { x: event.clientX, y: event.clientY };
    updatePointer(event);
    updateHoveredNode(event);
  });

  canvas.addEventListener('pointercancel', () => {
    state.pointerDown = null;
  });

  canvas.addEventListener('pointerup', (event) => {
    const pointerDown = state.pointerDown;
    state.pointerDown = null;
    if (!pointerDown) return;
    const movement = Math.hypot(
      event.clientX - pointerDown.x,
      event.clientY - pointerDown.y
    );
    if (movement >= 7) return;

    updatePointer(event);
    updateHoveredNode(event);
    const selectedObject = state.hoveredHitTarget;
    if (selectedObject?.userData.href) {
      selectNode(selectedObject.userData.node, selectedObject.userData.href);
    }
  });
}

function updatePointer(event) {
  const rect = state.renderer.domElement.getBoundingClientRect();
  state.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  state.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function updateHoveredNode(event) {
  state.raycaster.setFromCamera(state.pointer, state.camera);
  const intersections = state.raycaster.intersectObjects(state.interactiveMeshes, false);
  const visibleIntersection = intersections.find((intersection) => isMarkerFacingCamera(intersection.object));
  const nextHitTarget = visibleIntersection?.object ?? null;
  const nextMarker = nextHitTarget?.userData.marker ?? null;

  if (nextMarker !== state.hoveredMarker) {
    if (state.hoveredMarker) state.hoveredMarker.userData.targetScale = 1;
    state.hoveredMarker = nextMarker;
    state.hoveredHitTarget = nextHitTarget;
    if (state.hoveredMarker) state.hoveredMarker.userData.targetScale = 1.38;
  }

  if (state.hoveredMarker) {
    showTooltip(state.hoveredMarker.userData.node, event.clientX, event.clientY);
    state.canvas.style.cursor = 'pointer';
  } else {
    clearHoveredNode();
  }
}

function isMarkerFacingCamera(hitTarget) {
  const worldPosition = new THREE.Vector3();
  hitTarget.getWorldPosition(worldPosition);
  const rootPosition = new THREE.Vector3();
  state.earthRoot.getWorldPosition(rootPosition);
  const surfaceNormal = worldPosition.clone().sub(rootPosition).normalize();
  const toCamera = state.camera.position.clone().sub(worldPosition).normalize();
  return surfaceNormal.dot(toCamera) > 0.05;
}

function clearHoveredNode() {
  if (state.hoveredMarker) state.hoveredMarker.userData.targetScale = 1;
  state.hoveredMarker = null;
  state.hoveredHitTarget = null;
  state.canvas.style.cursor = 'default';
  const tooltip = document.querySelector('#node-tooltip');
  tooltip?.classList.remove('is-visible');
  tooltip?.setAttribute('aria-hidden', 'true');
}

function showTooltip(node, pointerX, pointerY) {
  const tooltip = document.querySelector('#node-tooltip');
  if (!tooltip) return;
  const coordinate = node.coordinateLabel || `${formatCoordinate(node.latitude, 'N', 'S')} · ${formatCoordinate(node.longitude, 'E', 'W')}`;
  tooltip.querySelector('.tooltip-coordinate').textContent = coordinate;
  tooltip.querySelector('strong').textContent = node.coordinateLabel ? node.city.toUpperCase() : node.city;
  tooltip.querySelector('p').textContent = node.role || '';
  tooltip.querySelector('p').hidden = !node.role;
  tooltip.querySelector('.tooltip-action').style.display = node.href ? '' : 'none';

  const maxX = window.innerWidth - Math.min(230, window.innerWidth - 24);
  const maxY = window.innerHeight - 150;
  tooltip.style.left = `${Math.max(8, Math.min(pointerX, maxX))}px`;
  tooltip.style.top = `${Math.max(8, Math.min(pointerY, maxY))}px`;
  tooltip.classList.add('is-visible');
  tooltip.setAttribute('aria-hidden', 'false');
}

function selectNode(node, href) {
  console.info('[Laboratório] Território selecionado:', {
    id: node.id,
    city: node.city,
    role: node.role,
    latitude: node.latitude,
    longitude: node.longitude
  });

  state.canvas.dispatchEvent(new CustomEvent('lab:nodeselect', {
    detail: { ...node }
  }));

  if (href) window.location.assign(window.publicLanguageUrl ? window.publicLanguageUrl(href) : href);
}

function handleResize() {
  const canvasRect = state.canvas.getBoundingClientRect();
  const width = Math.max(Math.round(canvasRect.width), 1);
  const height = Math.max(Math.round(canvasRect.height), 1);
  const mobile = width <= 900;
  const narrow = width <= 520;
  const compactRoutes = width < ROUTE_STYLE.mobileBreakpoint;

  if (state.routeGroup && state.routeDensity !== (compactRoutes ? 'mobile' : 'desktop')) {
    createRoutes(compactRoutes);
  }

  state.renderer.setSize(width, height, false);
  state.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  state.camera.aspect = width / height;
  state.camera.updateProjectionMatrix();

  const targetX = mobile ? 0 : Math.min(0.78, width / 2100);
  const targetY = narrow ? -0.42 : mobile ? -0.28 : -0.02;
  const cameraZ = mobile ? CONFIG.initialView.mobileCameraZ : CONFIG.initialView.desktopCameraZ;

  state.earthRoot.position.set(targetX, targetY, 0);
  state.controls.target.set(targetX, targetY, 0);
  state.camera.position.set(targetX, targetY + 0.06, cameraZ);
  state.camera.lookAt(state.controls.target);
  state.controls.update();
}

function handleVisibilityChange() {
  if (document.hidden) {
    state.controls.autoRotate = false;
  } else {
    state.resumeAt = performance.now() + 1000;
  }
}

function pauseExternalInteraction() {
  state.externallyPaused = true;
  state.controls.enabled = false;
  state.controls.autoRotate = false;
  state.autoRotateFactor = 0;
  clearHoveredNode();
}

function resumeExternalInteraction() {
  state.externallyPaused = false;
  state.controls.enabled = true;
  state.resumeAt = performance.now() + 800;
}

function animate(time = 0) {
  requestAnimationFrame(animate);

  if (document.hidden) {
    state.lastFrameTime = time;
    return;
  }

  const delta = state.lastFrameTime
    ? Math.min((time - state.lastFrameTime) / 1000, 0.05)
    : 0;
  state.lastFrameTime = time;

  updateAutoRotation(time);
  updateMarkers(time);
  updateRouteFlows(delta, time * 0.001);
  state.controls.update();
  state.renderer.render(state.scene, state.camera);
}

function updateAutoRotation(time) {
  if (state.reducedMotion || state.interactionActive || state.externallyPaused || document.hidden || time < state.resumeAt) {
    state.controls.autoRotate = false;
    state.autoRotateFactor = Math.max(0, state.autoRotateFactor - 0.03);
    return;
  }

  state.autoRotateFactor = Math.min(1, state.autoRotateFactor + 0.006);
  state.controls.autoRotate = true;
  state.controls.autoRotateSpeed = CONFIG.controls.autoRotateSpeed * state.autoRotateFactor;
}

function updateMarkers(time) {
  state.markerStates.forEach(({ marker, pulse, phase }) => {
    const target = marker.userData.targetScale ?? 1;
    const nextScale = THREE.MathUtils.lerp(marker.scale.x, target, 0.12);
    marker.scale.setScalar(nextScale);

    if (!state.reducedMotion) {
      const pulseProgress = (Math.sin(time * 0.0022 + phase) + 1) / 2;
      pulse.scale.setScalar(0.92 + pulseProgress * 0.55);
      pulse.material.opacity = 0.1 + (1 - pulseProgress) * 0.22;
    }
  });
}

function updateRouteFlows(delta, elapsed, force = false) {
  if (!state.routeFlowPoints) return;
  if (state.externallyPaused && !force) return;
  if (state.reducedMotion && state.routeStaticRendered && !force) return;

  state.routeLineStates.forEach((lineState) => {
    if (state.reducedMotion) {
      lineState.material.opacity = lineState.baseOpacity;
      return;
    }

    const dashCycle = lineState.material.dashSize + lineState.material.gapSize;
    lineState.dashPhase = (
      lineState.dashPhase
      + delta * lineState.dashSpeed * lineState.dashDirection
      + dashCycle
    ) % dashCycle;

    const distances = lineState.distanceAttribute.array;
    for (let index = 0; index < distances.length; index += 1) {
      distances[index] = lineState.baseDistances[index] + lineState.dashPhase;
    }
    lineState.distanceAttribute.needsUpdate = true;

    const wave = (Math.sin(elapsed * lineState.breathSpeed + lineState.breathPhase) + 1) / 2;
    const hierarchyFloor = lineState.hierarchy === 'main'
      ? 0.58
      : lineState.hierarchy === 'secondary'
        ? 0.18
        : ROUTE_STYLE.opacity.breathingFloor;
    const breath = hierarchyFloor + (1 - hierarchyFloor) * THREE.MathUtils.smoothstep(
      Math.pow(wave, 1.45),
      0.08,
      0.92
    );
    lineState.material.opacity = lineState.baseOpacity * breath;
  });

  const positionAttribute = state.routeFlowPoints.geometry.getAttribute('position');
  const colorAttribute = state.routeFlowPoints.geometry.getAttribute('color');
  const positions = positionAttribute.array;
  const colors = colorAttribute.array;

  state.routeFlowStates.forEach((flow, index) => {
    const progress = resolveFlowProgress(flow, state.reducedMotion ? 0 : elapsed);
    const point = flow.curve.getPoint(progress);
    const offset = index * 3;
    positions[offset] = point.x;
    positions[offset + 1] = point.y;
    positions[offset + 2] = point.z;

    const visibilityWave = state.reducedMotion
      ? 0.72
      : (Math.sin(elapsed * flow.breathSpeed + flow.breathPhase) + 1) / 2;
    const presence = state.reducedMotion ? 1 : resolveFlowPresence(flow, elapsed);
    const visibility = flow.visibilityFloor + (1 - flow.visibilityFloor) * presence * THREE.MathUtils.smoothstep(
      Math.pow(visibilityWave, 1.7),
      0.14,
      0.82
    );
    const brightness = 0.08 + visibility * 0.92;
    colors[offset] = flow.color.r * brightness;
    colors[offset + 1] = flow.color.g * brightness;
    colors[offset + 2] = flow.color.b * brightness;
  });

  positionAttribute.needsUpdate = true;
  colorAttribute.needsUpdate = true;
  if (force) state.routeFlowPoints.geometry.computeBoundingSphere();
  if (state.reducedMotion) state.routeStaticRendered = true;
}

function resolveFlowProgress(flow, elapsed) {
  const cycle = (elapsed * flow.speed + flow.phase) % 1;
  const travelWindow = 1 - flow.pause;
  const travelProgress = Math.min(cycle / travelWindow, 1);
  if (flow.behavior === 'oscillating') {
    const oscillation = (1 - Math.cos(travelProgress * Math.PI * 2)) / 2;
    return THREE.MathUtils.lerp(flow.rangeStart, flow.rangeEnd, oscillation);
  }
  return flow.direction < 0 ? 1 - travelProgress : travelProgress;
}

function resolveFlowPresence(flow, elapsed) {
  const cycle = (elapsed * flow.speed + flow.phase) % 1;
  const travelWindow = 1 - flow.pause;
  const fadeDuration = Math.min(0.055, travelWindow * 0.12);
  const fadeIn = THREE.MathUtils.smoothstep(cycle, 0, fadeDuration);
  const fadeOut = 1 - THREE.MathUtils.smoothstep(
    cycle,
    travelWindow - fadeDuration,
    travelWindow
  );
  return fadeIn * fadeOut;
}

function latLonToVector3(latitude, longitude, radius = CONFIG.earthRadius) {
  const latitudeRadians = THREE.MathUtils.degToRad(latitude);
  const longitudeRadians = THREE.MathUtils.degToRad(longitude);
  const cosLatitude = Math.cos(latitudeRadians);

  return new THREE.Vector3(
    radius * cosLatitude * Math.sin(longitudeRadians),
    radius * Math.sin(latitudeRadians),
    radius * cosLatitude * Math.cos(longitudeRadians)
  );
}

function formatCoordinate(value, positiveSuffix, negativeSuffix) {
  const absolute = Math.abs(value);
  const degrees = Math.floor(absolute);
  const minutes = Math.round((absolute - degrees) * 60);
  return `${degrees}°${String(minutes).padStart(2, '0')}′${value >= 0 ? positiveSuffix : negativeSuffix}`;
}

function showWebGLError(error) {
  console.error('[Laboratório] Não foi possível iniciar WebGL.', error);
  window.dispatchEvent(new CustomEvent('lab-earth-error', { detail: error }));
  const loading = document.querySelector('.loading-state');
  if (loading) {
    loading.querySelector('p').textContent = 'WebGL indisponível neste navegador';
    loading.querySelector('span').style.animation = 'none';
  }
}

try {
  initScene();
} catch (error) {
  showWebGLError(error);
}

export { LAB_NODES, LAB_CONNECTIONS, ROUTE_STYLE, CONFIG, latLonToVector3 };
