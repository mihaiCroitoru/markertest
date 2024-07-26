// Import necessary libraries
import * as THREE from "three";
import { ARButton } from "ar-js-org/AR.js";

// Define a function to handle image marker detection
function onMarkerDetected(event) {
	// Get the detected marker's ID and display it in the question text element
	const markerId = event.detail.markerId;
	document.getElementById("question").value = `Did you spot the ${markerId}?`;

	// Add an event listener to the answer buttons that will trigger when clicked
	document.getElementById("answer1").addEventListener("click", (e) => {
		console.log(`User chose Answer 1`);
	});
	document.getElementById("answer2").addEventListener("click", (e) => {
		console.log(`User chose Answer 2`);
	});
	document.getElementById("answer3").addEventListener("click", (e) => {
		console.log(`User chose Answer 3`);
	});
}

// Add an event listener to the AR.js detection API
ARButton.addEventListener("markerDetected", onMarkerDetected);
