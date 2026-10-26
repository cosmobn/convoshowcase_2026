/** Optional WebGL journey path for the welcome card; space3d.js draws the stars behind it. */
const YELLOW = 0xFCD00F;
const MILESTONES = [0.24, 0.46, 0.68];
const TRAVEL_SECONDS = 4.4;
const CYCLE_SECONDS = 6.4;

export function mountHero3d(card, motion) {
  let disposed = false;
  let cleanup = () => {};
  if (card) import('./vendor/three.min.js').then(THREE => {
    if (disposed) return;
    // Without WebGL the flat CSS scene simply stays in place.
    try { cleanup = build(THREE, card, motion); } catch { card.querySelector(':scope > .flow-welcome-3d')?.remove(); card.classList.remove('has-3d'); }
  }).catch(() => {});
  return { dispose() { disposed = true; cleanup(); cleanup = () => {}; } };
}

function glowTexture(THREE) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, '#FFFFFFFF'); gradient.addColorStop(.25, '#FFFFFFAA'); gradient.addColorStop(1, '#FFFFFF00');
  context.fillStyle = gradient; context.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function milestoneTexture(THREE, label) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d');
  context.beginPath(); context.arc(64, 64, 54, 0, Math.PI * 2);
  context.fillStyle = '#253263'; context.fill();
  context.lineWidth = 6; context.strokeStyle = '#FCD00F99'; context.stroke();
  context.fillStyle = '#F5DA62'; context.font = '800 40px system-ui, sans-serif';
  context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(label, 64, 67);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function build(THREE, card, motion) {
  const canvas = document.createElement('canvas');
  canvas.className = 'flow-welcome-3d';
  canvas.setAttribute('aria-hidden', 'true');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  card.prepend(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 16);
  const disposables = [];
  const keep = item => { disposables.push(item); return item; };
  const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
  const glow = keep(glowTexture(THREE));

  // The journey path is rebuilt from the HTML portraits so it always meets their feet.
  const journey = new THREE.Group();
  scene.add(journey);
  const tubeMaterial = keep(new THREE.MeshBasicMaterial({ color: YELLOW, opacity: .5, ...additive }));
  const haloMaterial = keep(new THREE.MeshBasicMaterial({ color: YELLOW, opacity: .1, ...additive }));
  const startPadMaterial = keep(new THREE.MeshBasicMaterial({ color: 0xFFFFFF, opacity: .08, side: THREE.DoubleSide, ...additive }));
  const goalPadMaterial = keep(new THREE.MeshBasicMaterial({ color: YELLOW, opacity: .2, side: THREE.DoubleSide, ...additive }));
  const orbitMaterial = keep(new THREE.MeshBasicMaterial({ color: YELLOW, opacity: .2, ...additive }));
  const flowMaterial = keep(new THREE.PointsMaterial({ color: 0xFFE680, size: .12, map: glow, opacity: .85, ...additive }));
  const orb = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: glow, color: 0xFFF1A8, ...additive })));
  const trail = Array.from({ length: 14 }, (_, i) => new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: glow, color: YELLOW, opacity: .5 * (1 - i / 14), ...additive }))));
  const milestones = MILESTONES.map((_, i) => new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: keep(milestoneTexture(THREE, String(i + 1).padStart(2, '0'))), transparent: true, depthWrite: false }))));
  const flowCount = 34;
  const flowGeometry = keep(new THREE.BufferGeometry());
  flowGeometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(flowCount * 3), 3));
  const flow = new THREE.Points(flowGeometry, flowMaterial);
  const orbits = [0, 1].map(() => new THREE.Mesh(undefined, orbitMaterial));
  let curve = null;
  let goalPad = null;
  let layoutGeometries = [];
  let orbScale = .9;

  function layout() {
    const width = card.clientWidth, height = card.clientHeight;
    if (!width || !height) return false;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const viewHeight = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const unit = viewHeight / height;
    // Layout offsets ignore the portraits' entrance animation, unlike getBoundingClientRect.
    const place = element => {
      if (!element) return null;
      let left = 0, top = 0;
      for (let node = element; node && node !== card; node = node.offsetParent) { left += node.offsetLeft; top += node.offsetTop; }
      return { left, top, width: element.offsetWidth, height: element.offsetHeight, bottom: top + element.offsetHeight };
    };
    const feet = rect => rect && new THREE.Vector3((rect.left + rect.width / 2 - width / 2) * unit, (height / 2 - (rect.bottom - 4)) * unit, 0);
    const goalRect = place(card.querySelector('.flow-portrait-future'));
    const start = feet(place(card.querySelector('.flow-portrait-start'))), goal = feet(goalRect);
    if (!start || !goal || !goalRect) return false;

    journey.clear();
    for (const geometry of layoutGeometries) geometry.dispose();
    const span = goal.clone().sub(start);
    // Narrow cards arch upward so the path clears the labels under the portraits.
    const wide = camera.aspect > 1.2;
    curve = new THREE.CatmullRomCurve3([
      start,
      start.clone().addScaledVector(span, .3).add(new THREE.Vector3(0, span.length() * (wide ? -.1 : .12), 1.6)),
      start.clone().addScaledVector(span, .68).add(new THREE.Vector3(0, span.length() * (wide ? -.02 : .08), 1.2)),
      goal,
    ]);
    const thickness = Math.max(.025, unit * 1.6);
    const tube = new THREE.TubeGeometry(curve, 120, thickness, 8, false);
    const halo = new THREE.TubeGeometry(curve, 120, thickness * 4, 8, false);
    const portraitWidth = goalRect.width * unit;
    const startPad = new THREE.RingGeometry(portraitWidth * .3, portraitWidth * .42, 48);
    const goalPadGeometry = new THREE.RingGeometry(portraitWidth * .32, portraitWidth * .46, 64);
    const orbitGeometry = new THREE.TorusGeometry(goalRect.height * unit * .36, thickness * .45, 8, 120);
    layoutGeometries = [tube, halo, startPad, goalPadGeometry, orbitGeometry];

    journey.add(new THREE.Mesh(halo, haloMaterial), new THREE.Mesh(tube, tubeMaterial), flow, ...trail, orb);
    const startMesh = new THREE.Mesh(startPad, startPadMaterial);
    startMesh.position.copy(start); startMesh.rotation.x = -Math.PI / 2.3;
    goalPad = new THREE.Mesh(goalPadGeometry, goalPadMaterial);
    goalPad.position.copy(goal); goalPad.rotation.x = -Math.PI / 2.3;
    journey.add(startMesh, goalPad);
    const orbitCenter = goal.clone().add(new THREE.Vector3(0, goalRect.height * unit * .5, -.5));
    orbits.forEach((orbit, i) => { orbit.geometry = orbitGeometry; orbit.position.copy(orbitCenter); orbit.rotation.set(Math.PI / 2.2 + i * .25, i * .5, 0); journey.add(orbit); });
    const markerSize = Math.max(.42, unit * 24);
    milestones.forEach((marker, i) => { marker.position.copy(curve.getPointAt(MILESTONES[i])).add(new THREE.Vector3(0, 0, .05)); marker.scale.setScalar(markerSize); marker.userData.size = markerSize; journey.add(marker); });
    orbScale = Math.max(.7, unit * 46);
    return true;
  }

  function draw(seconds) {
    const live = seconds !== null;
    const t = live ? seconds : 0;
    if (curve) {
      // Static frames show the light already arrived at the future self.
      const progress = live ? Math.min(1, (t % CYCLE_SECONDS) / TRAVEL_SECONDS) : 1;
      const eased = progress < .5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
      orb.position.copy(curve.getPointAt(eased));
      orb.scale.setScalar(orbScale * (1 + Math.sin(t * 6) * .08));
      trail.forEach((sprite, i) => {
        sprite.position.copy(curve.getPointAt(Math.max(0, eased - (i + 1) * .011)));
        sprite.scale.setScalar(orbScale * .55 * (1 - i / 16));
        sprite.visible = live && eased > (i + 1) * .011 && eased < 1;
      });
      const positions = flowGeometry.attributes.position;
      for (let i = 0; i < flowCount; i++) positions.setXYZ(i, ...curve.getPointAt((i / flowCount + t * .045) % 1).toArray());
      positions.needsUpdate = true;
      milestones.forEach((marker, i) => marker.scale.setScalar(marker.userData.size * (1 + .45 * Math.max(0, 1 - Math.abs(eased - MILESTONES[i]) * 10))));
      const arrival = !live ? .6 : progress < 1 ? Math.max(0, (progress - .85) / .15) : Math.max(0, 1 - (t % CYCLE_SECONDS - TRAVEL_SECONDS) / 1.6);
      goalPadMaterial.opacity = .2 + arrival * .35;
      goalPad.scale.setScalar(1 + arrival * .12);
      orbits[0].rotation.z = t * .35;
      orbits[1].rotation.z = -t * .25;
    }
    renderer.render(scene, camera);
  }

  let frame = 0, visible = true, laidOut = false;
  const running = () => motion?.enabled !== false && visible && !document.hidden;
  function tick(now) {
    frame = 0;
    draw(now / 1000);
    if (running()) frame = requestAnimationFrame(tick);
  }
  function sync() {
    if (!laidOut) return;
    if (running()) { if (!frame) frame = requestAnimationFrame(tick); return; }
    cancelAnimationFrame(frame); frame = 0;
    if (motion?.enabled === false) draw(null);
  }
  function relayout() {
    laidOut = layout();
    if (!laidOut) return;
    card.classList.add('has-3d');
    if (!frame) draw(running() ? performance.now() / 1000 : null);
    sync();
  }

  const resize = new ResizeObserver(relayout);
  resize.observe(card);
  const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
  intersection.observe(card);
  document.addEventListener('visibilitychange', sync);
  document.addEventListener('pathfinder-motion-change', sync);
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); cancelAnimationFrame(frame); frame = 0; laidOut = false; card.classList.remove('has-3d'); });

  return () => {
    cancelAnimationFrame(frame);
    resize.disconnect(); intersection.disconnect();
    document.removeEventListener('visibilitychange', sync);
    document.removeEventListener('pathfinder-motion-change', sync);
    for (const geometry of layoutGeometries) geometry.dispose();
    for (const item of disposables) item.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
    card.classList.remove('has-3d');
  };
}
