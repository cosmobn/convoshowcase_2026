/** Page-wide WebGL space: stars, drifting solids and planet COSMO behind every screen. */
const YELLOW = 0xFCD00F;

export function mountSpace(motion) {
  let cleanup = () => {};
  import('./vendor/three.min.js').then(THREE => {
    // Without WebGL the CSS starfield and the SVG planet stay in place.
    try { cleanup = build(THREE, motion); } catch { document.querySelector('.space-backdrop')?.remove(); document.documentElement.classList.remove('has-space3d'); }
  }).catch(() => {});
  return { dispose() { cleanup(); cleanup = () => {}; } };
}

function canvasTexture(THREE, width, height, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  paint(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function glowTexture(THREE) {
  return canvasTexture(THREE, 64, 64, (context, size) => {
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, '#FFFFFFFF'); gradient.addColorStop(.25, '#FFFFFFAA'); gradient.addColorStop(1, '#FFFFFF00');
    context.fillStyle = gradient; context.fillRect(0, 0, size, size);
  });
}

// An equirectangular surface: soft cloud bands, a few craters and the COSMO name twice around the equator.
function surfaceTexture(THREE) {
  return canvasTexture(THREE, 1024, 512, (context, width, height) => {
    const base = context.createLinearGradient(0, 0, 0, height);
    base.addColorStop(0, '#4A5AA6'); base.addColorStop(.5, '#2D3A7C'); base.addColorStop(1, '#18224F');
    context.fillStyle = base; context.fillRect(0, 0, width, height);
    for (const [y, h, color] of [[70, 26, '#8C9BD633'], [132, 18, '#1E285955'], [188, 34, '#6F82D02E'], [318, 30, '#1E285966'], [372, 22, '#8C9BD626'], [430, 28, '#1E285955']]) {
      context.fillStyle = color;
      context.beginPath();
      for (let x = 0; x <= width; x += 16) context.lineTo(x, y + Math.sin(x / 70) * 6);
      for (let x = width; x >= 0; x -= 16) context.lineTo(x, y + h + Math.sin(x / 90 + 1) * 6);
      context.fill();
    }
    context.fillStyle = '#FFFFFF12';
    for (const [x, y, r] of [[140, 110, 16], [610, 380, 12], [860, 150, 20], [380, 420, 9], [930, 330, 10]]) { context.beginPath(); context.arc(x, y, r, 0, Math.PI * 2); context.fill(); }
  });
}

function nameTexture(THREE) {
  return canvasTexture(THREE, 1024, 512, (context, width, height) => {
    context.fillStyle = '#000'; context.fillRect(0, 0, width, height);
    context.fillStyle = '#FCD00F'; context.font = '800 62px "Segoe UI", system-ui, sans-serif';
    context.textAlign = 'center'; context.textBaseline = 'middle';
    if ('letterSpacing' in context) context.letterSpacing = '14px';
    for (const x of [width * .25, width * .75]) context.fillText('COSMO', x, height / 2 + 4);
  });
}

function build(THREE, motion) {
  const canvas = document.createElement('canvas');
  canvas.className = 'space-backdrop';
  canvas.setAttribute('aria-hidden', 'true');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  document.body.prepend(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 16);
  const disposables = [];
  const keep = item => { disposables.push(item); return item; };
  const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
  const glow = keep(glowTexture(THREE));

  const starCount = 900;
  const starPositions = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);
  const palette = [new THREE.Color(0xFFFFFF), new THREE.Color(0xBFCBFF), new THREE.Color(YELLOW)];
  for (let i = 0; i < starCount; i++) {
    starPositions.set([(Math.random() - .5) * 40, (Math.random() - .5) * 26, 3 - Math.random() * 24], i * 3);
    const color = palette[i % 9 === 0 ? 2 : i % 3 === 0 ? 1 : 0];
    starColors.set([color.r, color.g, color.b], i * 3);
  }
  const starGeometry = keep(new THREE.BufferGeometry());
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
  const stars = new THREE.Points(starGeometry, keep(new THREE.PointsMaterial({ size: .16, map: glow, vertexColors: true, opacity: .7, ...additive })));
  scene.add(stars);

  const shapes = new THREE.Group();
  scene.add(shapes);
  const blueEdges = keep(new THREE.LineBasicMaterial({ color: 0x8C9BD6, transparent: true, opacity: .18 }));
  const goldEdges = keep(new THREE.LineBasicMaterial({ color: YELLOW, transparent: true, opacity: .26 }));
  for (const [geometry, material, x, y, z, scale] of [
    [new THREE.IcosahedronGeometry(1, 0), blueEdges, -13, 6.4, -9, 1.4],
    [new THREE.OctahedronGeometry(1, 0), goldEdges, -1.6, -4.6, -5, .5],
    [new THREE.IcosahedronGeometry(1, 1), blueEdges, -12.5, -5.8, -11, 1.7],
    [new THREE.OctahedronGeometry(1, 0), blueEdges, -4.2, 4.6, -6, .7],
    [new THREE.IcosahedronGeometry(1, 0), goldEdges, 10.5, -5.2, -8, .9],
  ]) {
    const mesh = new THREE.LineSegments(keep(new THREE.EdgesGeometry(geometry)), material);
    geometry.dispose();
    mesh.position.set(x, y, z);
    mesh.scale.setScalar(scale);
    mesh.userData = { y, spin: .12 + Math.random() * .18 };
    shapes.add(mesh);
  }

  // Planet COSMO is modelled at radius 1 and scaled to the .flow-planet element on screen.
  const planet = new THREE.Group();
  scene.add(planet);
  scene.add(new THREE.AmbientLight(0xC7D0FF, 1.1));
  const sun = new THREE.DirectionalLight(0xFFFFFF, 2.4);
  sun.position.set(-4, 5, 7);
  scene.add(sun);
  const atmosphere = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: glow, color: 0x7186E8, opacity: .45, ...additive })));
  atmosphere.scale.setScalar(3.3);
  const globe = new THREE.Mesh(keep(new THREE.SphereGeometry(1, 64, 48)), keep(new THREE.MeshLambertMaterial({ map: keep(surfaceTexture(THREE)), emissive: 0xFFFFFF, emissiveMap: keep(nameTexture(THREE)), emissiveIntensity: .95 })));
  const spin = new THREE.Group();
  spin.rotation.z = .3;
  spin.add(globe);
  // The main orbit is a true circle, tilted only slightly so it reads as circular around the planet.
  const orbit = new THREE.Group();
  orbit.rotation.set(.5, 0, -.35);
  orbit.add(new THREE.Mesh(keep(new THREE.TorusGeometry(1.6, .016, 8, 180)), keep(new THREE.MeshBasicMaterial({ color: YELLOW, opacity: .75, ...additive }))));
  const moon = new THREE.Mesh(keep(new THREE.SphereGeometry(.13, 24, 16)), keep(new THREE.MeshBasicMaterial({ color: YELLOW })));
  const moonGlow = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: glow, color: YELLOW, opacity: .8, ...additive })));
  moonGlow.scale.setScalar(.7);
  moon.add(moonGlow);
  orbit.add(moon);
  // A fainter, steeper orbit carries a small satellite in the other direction, passing behind the planet.
  const outer = new THREE.Group();
  outer.rotation.set(1.2, .5, .2);
  outer.add(new THREE.Mesh(keep(new THREE.TorusGeometry(1.32, .008, 8, 180)), keep(new THREE.MeshBasicMaterial({ color: 0xBFCBFF, opacity: .35, ...additive }))));
  const satellite = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: glow, color: 0xFFFFFF, opacity: .95, transparent: true, depthWrite: false })));
  satellite.scale.setScalar(.26);
  outer.add(satellite);
  planet.add(atmosphere, spin, orbit, outer);

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = event => { pointer.tx = event.clientX / innerWidth - .5; pointer.ty = event.clientY / innerHeight - .5; };
  let size = { width: 0, height: 0 };
  function resize() {
    const width = innerWidth, height = innerHeight;
    if (width === size.width && height === size.height) return;
    size = { width, height };
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  // Follow whichever planet placeholder is laid out on the current screen.
  function placePlanet() {
    const anchor = [...document.querySelectorAll('.flow-planet')].find(element => element.getClientRects().length);
    if (!anchor) { planet.visible = false; return 'none'; }
    const rect = anchor.getBoundingClientRect();
    const unit = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / size.height;
    planet.visible = true;
    planet.position.set((rect.left + rect.width / 2 - size.width / 2) * unit, (size.height / 2 - rect.top - rect.height / 2) * unit, 0);
    planet.scale.setScalar(rect.width * .27 * unit);
    return `${Math.round(rect.left)},${Math.round(rect.top)},${Math.round(rect.width)}`;
  }

  function draw(t) {
    pointer.x += (pointer.tx - pointer.x) * .05;
    pointer.y += (pointer.ty - pointer.y) * .05;
    stars.rotation.set(Math.sin(t * .05) * .03 + pointer.y * .06, t * .012 + pointer.x * .1, 0);
    shapes.rotation.set(pointer.y * .12, pointer.x * .18, 0);
    shapes.children.forEach((mesh, i) => {
      mesh.rotation.set(t * mesh.userData.spin, t * mesh.userData.spin * .7, 0);
      mesh.position.y = mesh.userData.y + Math.sin(t * .6 + i * 1.7) * .3;
    });
    globe.rotation.y = t * .25 - 1.2;
    const angle = t * .7;
    moon.position.set(Math.cos(angle) * 1.6, Math.sin(angle) * 1.6, 0);
    const back = -t * .9 + 1;
    satellite.position.set(Math.cos(back) * 1.32, Math.sin(back) * 1.32, 0);
    renderer.render(scene, camera);
  }

  let frame = 0, last = '', still = 0;
  function tick(now) {
    frame = requestAnimationFrame(tick);
    if (document.hidden) return;
    resize();
    const placed = placePlanet();
    // With motion off the scene holds still and only redraws when the layout moves.
    if (motion?.enabled === false) { if (placed !== last || size.width !== still) { last = placed; still = size.width; draw(0); } return; }
    last = placed;
    draw(now / 1000);
  }
  resize();
  placePlanet();
  draw(0);
  document.documentElement.classList.add('has-space3d');
  frame = requestAnimationFrame(tick);
  addEventListener('pointermove', onPointer, { passive: true });
  const redraw = () => { last = ''; };
  document.addEventListener('pathfinder-motion-change', redraw);
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); cancelAnimationFrame(frame); document.documentElement.classList.remove('has-space3d'); });

  return () => {
    cancelAnimationFrame(frame);
    removeEventListener('pointermove', onPointer);
    document.removeEventListener('pathfinder-motion-change', redraw);
    for (const item of disposables) item.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
    document.documentElement.classList.remove('has-space3d');
  };
}
