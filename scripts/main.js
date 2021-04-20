let camera, scene, renderer;
const originalBoxSize = 3;

const startPos = -5;

let stack = [];
const boxHeight = 0.5;

const init = () => {
  scene = new THREE.Scene();

  addLayer(0, 0, originalBoxSize, originalBoxSize);
  addLayer(startPos, 0, originalBoxSize, originalBoxSize);

  // Set up lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
  directionalLight.position.set(10, 20, 0);
  scene.add(directionalLight);

  const width = 10;
  const height = width * (window.innerWidth / window.innerHeight);
  camera = new THREE.OrthographicCamera(
    -width / 2,
    width / 2,
    height / 2,
    -height / 2,
    1,
    100
  );
  camera.position.set(4, 4, 4);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);

  document.body.appendChild(renderer.domElement);

  window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;

    camera.updateProjectionMatrix();
  });

  renderer.render(scene, camera);
};
window.addEventListener("load", init);

const addLayer = (x, z, width, depth, direction) => {
  const y = boxHeight * stack.length;

  const layer = generateBox(x, y, z, width, depth);
  layer.direction = direction;

  stack.push(layer);
};

const generateBox = (x, y, z, width, depth) => {
  const geometry = new THREE.BoxGeometry(width, boxHeight, depth);

  const color = new THREE.Color(`hsl(${30 + stack.length * 4}, 100%, 50%)`);
  const material = new THREE.MeshLambertMaterial({ color });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);

  scene.add(mesh);

  return {
    threejs: mesh,
    width,
    depth,
  };
};

let gameStarted = false;

window.addEventListener("keydown", () => {
  if (!gameStarted) {
    renderer.setAnimationLoop(animation);
    gameStarted = true;
  } else {
    const topLayer = stack[stack.length - 1];
    const direction = topLayer.direction;

    const nextX = direction === "x" ? 0 : startPos;
    const nextZ = direction === "z" ? 0 : startPos;

    const newWidth = originalBoxSize;
    const newDepth = originalBoxSize;
    const nextDirection = direction === "x" ? "z" : "x";

    addLayer(nextX, nextZ, newWidth, newDepth, nextDirection);
  }
});

const animation = () => {
  const speed = 0.15;
  const topLayer = stack[stack.length - 1];
  topLayer.threejs.position[topLayer.direction] += speed;

  if (camera.position.y < boxHeight * (stack.length - 2) + 4) {
    camera.position.y += speed;
  }

  renderer.render(scene, camera);
};
