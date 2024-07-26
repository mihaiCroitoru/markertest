import * as THREE from "three";
import { ARButton } from "three/addons/webxr/ARButton.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

let camera, canvas, scene, renderer;
let mesh, mesh2;
let modelsPath = ["./backpack.glb", "./scissors.glb"];
let controller1, controller2;
let controllerGrip1, controllerGrip2;
let raycaster;
let tracked = false;

const intersected = [];
const tempMatrix = new THREE.Matrix4();

let controls, group;

setupMobileDebug();

function setupMobileDebug() {
	// for image tracking we need a mobile debug console as it only works on android
	// This library is very big so only use it while debugging - just comment it out when your app is done
	const containerEl = document.getElementById("console-ui");
	// eruda.init({
	// 	container: containerEl,
	// });
	// const devToolEl = containerEl.shadowRoot.querySelector(".eruda-dev-tools");
	// devToolEl.style.height = "40%"; // control the height of the dev tool panel
}

// function onSelectStart(event) {
// 	const controller = event.target;
// 	const intersections = getIntersections(controller);
// 	console.error("intersection on select start:", intersections);
// 	if (intersections.length > 0) {
// 		const intersection = intersections[0];
// 		const object = intersection.object;
// 		object.material.emissive.b = 1;
// 		controller.attach(object);
// 		controller.userData.selected = object;
// 	}
// 	debugger;
// 	controller.userData.targetRayMode = event.data.targetRayMode;
// }

// function onSelectEnd(event) {
// 	const controller = event.target;
// 	if (controller.userData.selected !== undefined) {
// 		const intersections = getIntersections(controller);
// 		if (intersections.length > 0) {
// 			console.log("drop with intersection");
// 		}
// 		const object = controller.userData.selected;
// 		object.material.emissive.b = 0;
// 		group.attach(object);
// 		controller.userData.selected = undefined;
// 	}
// }

// function getIntersections(controller) {
// 	controller.updateMatrixWorld();
// 	tempMatrix.identity().extractRotation(controller.matrixWorld);
// 	raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
// 	raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
// 	return raycaster.intersectObjects(group.children, false);
// }

// function intersectObjects(controller) {
// 	if (controller.userData.selected !== undefined) return;
// 	const line = controller.getObjectByName("line");
// 	const intersections = getIntersections(controller);
// 	if (intersections.length > 0) {
// 		const intersection = intersections[0];
// 		const object = intersection.object;
// 		intersected.push(object);
// 		line.scale.z = intersection.distance;
// 	} else {
// 		line.scale.z = 5;
// 	}
// }

// function cleanIntersected() {
// 	while (intersected.length) {
// 		const object = intersected.pop();
// 		object.material.emissive.r = 0;
// 	}
// }

init();
animate();

async function init() {
	canvas = document.querySelector("canvas.webgl");

	scene = new THREE.Scene();

	camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 40);

	controls = new OrbitControls(camera, canvas);
	controls.target.set(0, 1.6, 0);
	controls.update();

	group = new THREE.Group();
	scene.add(group);

	renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	renderer.shadowMap.enabled = true;
	renderer.xr.enabled = true;

	const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
	light.position.set(0.5, 1, 0.25);
	scene.add(light);

	const loader = new GLTFLoader();
	loader.load(modelsPath[0], (gltf) => {
		mesh = gltf.scene;
		mesh.visible = false;
		mesh.matrixAutoUpdate = false;
		//mesh.scale.set(new THREE.Vector3( 0.1, 0.1, 0.1 ));
		scene.add(mesh);
		group.add(mesh);
	});
	// loader.load(
	//   modelsPath[1],
	//   (gltf) => {
	//    mesh2 = gltf.scene;
	//    mesh2.visible = false;
	//    mesh2.matrixAutoUpdate = false;
	//    //mesh2.scale.set(new THREE.Vector3( 0.1, 0.1, 0.1 ));
	//    scene.add(mesh2);
	//    group.add(mesh2);
	//   },
	// );

	for (let i = 0; i < 3; i++) {
		const obj = new THREE.BoxGeometry(0.2, 0.2).translate(0, 0.1, 0);
		const material = new THREE.MeshPhongMaterial({ color: 0xffffff * Math.random() });
		const model = new THREE.Mesh(obj, material);
		model.position.x = Math.random() * 4 - 2;
		model.position.y = Math.random() * 2;
		model.position.z = Math.random() * 4 - 2;

		model.rotation.x = Math.random() * 2 * Math.PI;
		model.rotation.y = Math.random() * 2 * Math.PI;
		model.rotation.z = Math.random() * 2 * Math.PI;

		model.scale.setScalar(Math.random() + 0.5);

		model.castShadow = true;
		model.receiveShadow = true;
		model.scale.y = Math.random() * 2 + 1;
		console.log("model", model.position);
		//group.add(model)
	}

	// setup the image targets
	const img = document.getElementById("img");
	const imgBitmap = await createImageBitmap(img);

	const qr = document.getElementById("qr");
	const qrBitmap = await createImageBitmap(qr);

	//more on image-tracking feature: https://github.com/immersive-web/marker-tracking/blob/main/explainer.md
	const button = ARButton.createButton(renderer, {
		requiredFeatures: ["image-tracking"], // notice a new required feature
		trackedImages: [
			{
				image: imgBitmap, // tell webxr this is the image target we want to track
				widthInMeters: 0.5, // in meters what the size of the PRINTED image in the real world
			},
			{
				image: qrBitmap, // tell webxr this is the image target we want to track
				widthInMeters: 1.5, // in meters what the size of the PRINTED image in the real world
			},
		],
		//this is for the mobile debug
		optionalFeatures: ["dom-overlay", "dom-overlay-for-handheld-ar"],
		domOverlay: {
			root: document.body,
		},
	});
	document.body.appendChild(button);

	// controllers
	controller1 = renderer.xr.getController(0);
	controller1.addEventListener("selectstart", onSelectStart);
	controller1.addEventListener("selectend", onSelectEnd);
	scene.add(controller1);

	controller2 = renderer.xr.getController(1);
	controller2.addEventListener("selectstart", onSelectStart);
	controller2.addEventListener("selectend", onSelectEnd);
	scene.add(controller2);

	const controllerModelFactory = new XRControllerModelFactory();

	controllerGrip1 = renderer.xr.getControllerGrip(0);
	controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
	scene.add(controllerGrip1);

	controllerGrip2 = renderer.xr.getControllerGrip(1);
	controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
	scene.add(controllerGrip2);

	const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);

	const line = new THREE.Line(geometry);
	line.name = "line";
	line.scale.z = 5;

	controller1.add(line.clone());
	controller2.add(line.clone());

	raycaster = new THREE.Raycaster();

	window.addEventListener("resize", onWindowResize, false);
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

function animate() {
	renderer.setAnimationLoop(render);
}

function render(timestamp, frame) {
	// console.log(mesh, mesh2);
	cleanIntersected();

	intersectObjects(controller1);
	intersectObjects(controller2);

	if (frame) {
		const results = frame.getImageTrackingResults(); //checking if there are any images we track

		//if we have more than one image the results are an array
		for (const result of results) {
			// The result's index is the image's position in the trackedImages array specified at session creation
			const imageIndex = result.index;

			// Get the pose of the image relative to a reference space.
			const referenceSpace = renderer.xr.getReferenceSpace();
			const pose = frame.getPose(result.imageSpace, referenceSpace);

			//checking the state of the tracking
			const state = result.trackingState;
			//console.log(state);

			if (state == "tracked") {
				// update the mesh when the image target is found
				if (imageIndex === 0) {
					if (!tracked) {
						// tracked = true;
						mesh.visible = true;
						mesh.matrix.fromArray(pose.transform.matrix);
						console.log("position: ", mesh.position);
						setTimeout(() => (tracked = true), 500);
					}
				} else {
					mesh2.visible = true;
					mesh2.matrix.fromArray(pose.transform.matrix);
				}
			} else if (state == "emulated") {
				if (imageIndex === 0) {
					mesh.visible = false;
				} else {
					mesh2.visible = false;
				}
			}
		}
	}
	renderer.render(scene, camera);
}
