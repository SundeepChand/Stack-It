let camera, scene, renderer;
let world;
const originalBoxSize = 3;

const startPos = -5;

let stack = [],
  overhangs = [];
const boxHeight = 0.5;

const init = () => {
  // Set up cannon.js
  world = new CANNON.World();
  world.gravity.set(0, -10, 0);
  world.broadphase = new CANNON.NaiveBroadphase();
  world.solver.iterations = 40;

  // Set up three.js
  scene = new THREE.Scene();

  addLayer(0, 0, originalBoxSize, originalBoxSize, "z");
  addLayer(startPos, 0, originalBoxSize, originalBoxSize, "x");

  // Set up lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
  directionalLight.position.set(10, 20, 0);
  scene.add(directionalLight);

  const width = 10;
  const height = width * (window.innerHeight / window.innerWidth);
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

const addLayer = (x, z, width, depth, direction) => {
  const y = boxHeight * stack.length;

  const layer = generateBox(x, y, z, width, depth, false);
  layer.direction = direction;

  stack.push(layer);
};

const addOverHang = (x, z, width, depth) => {
  const y = boxHeight * (stack.length - 1);
  const overhang = generateBox(x, y, z, width, depth, true);
  overhangs.push(overhang);
};

const generateBox = (x, y, z, width, depth, falls) => {
  const geometry = new THREE.BoxGeometry(width, boxHeight, depth);

  const color = new THREE.Color(`hsl(${30 + stack.length * 4}, 100%, 50%)`);
  const material = new THREE.MeshLambertMaterial({ color });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);

  scene.add(mesh);

  // Add to CannonJS
  const shape = new CANNON.Box(
    new CANNON.Vec3(width / 2, boxHeight / 2, depth / 2)
  );
  let mass = falls ? 5 : 0;
  const body = new CANNON.Body({ mass, shape });
  body.position.set(x, y, z);
  world.addBody(body);

  return {
    threejs: mesh,
    cannonjs: body,
    width,
    depth,
  };
};

const cutBox = (
  previousLayer,
  topLayer,
  direction,
  delta,
  overHangSize,
  size,
  overlap
) => {
  // Cut the box into 2 parts
  topLayer.threejs.scale[direction] = overlap / size;
  topLayer.threejs.position[direction] =
    previousLayer.threejs.position[direction] + delta / 2;

  // Update metedata
  topLayer.width = direction === "x" ? overlap : topLayer.width;
  topLayer.depth = direction === "z" ? overlap : topLayer.depth;

  // Update the cannonjs model of the box
  topLayer.cannonjs.position[direction] = topLayer.threejs.position[direction];

  // Replace the shape to a smaller one
  const shape = new CANNON.Box(
    new CANNON.Vec3(topLayer.width / 2, boxHeight / 2, topLayer.depth / 2)
  );
  topLayer.cannonjs.shapes = [];
  topLayer.cannonjs.addShape(shape);

  // add the overhang
  const newOverHangPos =
    topLayer.threejs.position[direction] +
    (Math.sign(delta) * (overlap + overHangSize)) / 2;
  const overHangX =
    direction === "x" ? newOverHangPos : topLayer.threejs.position["x"];
  const overHangZ =
    direction === "z" ? newOverHangPos : topLayer.threejs.position["z"];
  const overHangWidth = direction === "x" ? overHangSize : topLayer.width;
  const overHangDepth = direction === "z" ? overHangSize : topLayer.depth;
  addOverHang(overHangX, overHangZ, overHangWidth, overHangDepth);
};

const animation = () => {
  const speed = 0.15;
  const topLayer = stack[stack.length - 1];

  topLayer.threejs.position[topLayer.direction] += speed;
  topLayer.cannonjs.position[topLayer.direction] += speed;

  if (camera.position.y < boxHeight * (stack.length - 2) + 4) {
    camera.position.y += speed;
  }

  updatePhysics();
  renderer.render(scene, camera);
};

const updatePhysics = () => {
  world.step(1 / 60);

  overhangs.forEach((element) => {
    element.threejs.position.copy(element.cannonjs.position);
    element.threejs.quaternion.copy(element.cannonjs.quaternion);
  });
};

let gameStarted = false;

window.addEventListener("load", init);
window.addEventListener("click", () => {
  if (!gameStarted) {
    renderer.setAnimationLoop(animation);
    gameStarted = true;
  } else {
    const topLayer = stack[stack.length - 1];
    const previousLayer = stack[stack.length - 2];

    const direction = topLayer.direction;

    const delta =
      topLayer.threejs.position[direction] -
      previousLayer.threejs.position[direction];

    const overHangSize = Math.abs(delta);

    const size = direction === "x" ? topLayer.width : topLayer.depth;

    const overlap = size - overHangSize;

    if (overlap > 0) {
      cutBox(
        previousLayer,
        topLayer,
        direction,
        delta,
        overHangSize,
        size,
        overlap
      );

      // Add a new layer of box
      const nextX = direction === "x" ? topLayer.threejs.position.x : startPos;
      const nextZ = direction === "z" ? topLayer.threejs.position.z : startPos;

      const newWidth = direction === "x" ? overlap : topLayer.width;
      const newDepth = direction === "z" ? overlap : topLayer.depth;
      const nextDirection = direction === "x" ? "z" : "x";

      addLayer(nextX, nextZ, newWidth, newDepth, nextDirection);
    } else {
      console.log("Game over");
    }
  }
});
