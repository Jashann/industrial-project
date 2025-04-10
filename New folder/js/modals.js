/**
 * Modal dialogs for the Traffic Safety Planner application
 */

/**
 * Custom confirmation dialog (Yes/No)
 * @param {string} message - Message to display in the dialog
 * @returns {Promise<boolean>} Promise that resolves to true (yes) or false (no)
 */
function customConfirm(message) {
  return new Promise((resolve) => {
    const modal = document.getElementById("custom-confirm-modal");
    const messageElement = document.getElementById("custom-confirm-message");
    const yesButton = document.getElementById("custom-confirm-yes");
    const noButton = document.getElementById("custom-confirm-no");

    messageElement.textContent = message;
    modal.style.display = "flex";

    function cleanUp() {
      modal.style.display = "none";
      yesButton.removeEventListener("click", onYes);
      noButton.removeEventListener("click", onNo);
    }
    
    function onYes() {
      cleanUp();
      resolve(true);
    }
    
    function onNo() {
      cleanUp();
      resolve(false);
    }

    yesButton.addEventListener("click", onYes);
    noButton.addEventListener("click", onNo);
  });
}

/**
 * Custom choice dialog for marker actions (Drag/Delete/Cancel/Rename)
 * @param {string} message - Message to display in the dialog
 * @returns {Promise<string>} Promise that resolves to "drag", "delete", "rename" or "cancel"
 */
function customChoice(message) {
  return new Promise((resolve) => {
    const modal = document.getElementById("custom-choice-modal");
    const messageElement = document.getElementById("custom-choice-message");
    const dragButton = document.getElementById("action-drag");
    const deleteButton = document.getElementById("action-delete");
    const renameButton = document.getElementById("action-rename");
    const cancelButton = document.getElementById("action-cancel");

    messageElement.textContent = message;
    modal.style.display = "flex";

    function cleanUp() {
      modal.style.display = "none";
      dragButton.removeEventListener("click", onDrag);
      deleteButton.removeEventListener("click", onDelete);
      renameButton.removeEventListener("click", onRename);
      cancelButton.removeEventListener("click", onCancel);
    }
    
    function onDrag() {
      cleanUp();
      resolve("drag");
    }
    
    function onDelete() {
      cleanUp();
      resolve("delete");
    }
    
    function onRename() {
      cleanUp();
      resolve("rename");
    }
    
    function onCancel() {
      cleanUp();
      resolve("cancel");
    }

    dragButton.addEventListener("click", onDrag);
    deleteButton.addEventListener("click", onDelete);
    renameButton.addEventListener("click", onRename);
    cancelButton.addEventListener("click", onCancel);
  });
}

/**
 * Custom rename dialog using a custom modal
 * @param {string} currentName - Current name to show in input field
 * @returns {Promise<string|null>} Promise that resolves to new name or null if canceled
 */
function customRename(currentName) {
  return new Promise((resolve) => {
    const modal = document.getElementById("custom-rename-modal");
    const input = document.getElementById("custom-rename-input");
    const saveButton = document.getElementById("custom-rename-save");
    const cancelButton = document.getElementById("custom-rename-cancel");

    input.value = currentName;
    modal.style.display = "flex";

    function cleanUp() {
      modal.style.display = "none";
      saveButton.removeEventListener("click", onSave);
      cancelButton.removeEventListener("click", onCancel);
    }
    
    function onSave() {
      cleanUp();
      resolve(input.value);
    }
    
    function onCancel() {
      cleanUp();
      resolve(null);
    }
    
    saveButton.addEventListener("click", onSave);
    cancelButton.addEventListener("click", onCancel);
  });
}

/**
 * Shows polygon options using the polygon modal
 * @param {L.Polygon} polygon - The polygon to show options for
 */
function showPolygonOptionsModal(polygon) {
  // Get the polygon's coordinates (using first ring)
  let latlngs = polygon.getLatLngs();
  let coords = latlngs[0].map(function (latlng) {
    return { lat: latlng.lat, lng: latlng.lng };
  });
  let coordsJSON = JSON.stringify(coords, null, 2);
  
  var modal = document.getElementById("polygon-options-modal");
  modal.style.display = "flex";
  window.polygonModalOpen = true;

  document.getElementById("polygon-unselect-btn").onclick = function (e) {
    e.stopPropagation();
    // Remove the polygon from the map
    map.removeLayer(polygon);
    // Update the drawnPolygons array
    window.drawnPolygons = window.drawnPolygons.filter(function (p) {
      return p !== polygon;
    });
    modal.style.display = "none";
    window.polygonModalOpen = false;
  };
  
  document.getElementById("polygon-copy-btn").onclick = function (e) {
    e.stopPropagation();
    navigator.clipboard.writeText(coordsJSON).then(function () {
      alert("Coordinates copied to clipboard.");
      modal.style.display = "none";
      window.polygonModalOpen = false;
    }, function (err) {
      alert("Failed to copy: " + err);
      modal.style.display = "none";
      window.polygonModalOpen = false;
    });
  };
  
  document.getElementById("polygon-view-btn").onclick = function (e) {
    e.stopPropagation();
    alert("Polygon Coordinates:\n" + coordsJSON);
    modal.style.display = "none";
    window.polygonModalOpen = false;
  };
}

/**
 * Open the road direction selection modal
 * @param {number} initialDirection - Initial direction in degrees (0-359)
 * @returns {Promise<number|null>} Promise that resolves to direction in degrees or null if canceled
 */
function openRoadDirectionModal(initialDirection = 0) {
  return new Promise((resolve) => {
    const modal = document.getElementById("road-direction-modal");
    const slider = document.getElementById("direction-slider");
    const directionValue = document.getElementById("direction-value");
    const directionArrow = document.getElementById("direction-arrow");
    const saveButton = document.getElementById("road-direction-save");
    const cancelButton = document.getElementById("road-direction-cancel");
    
    // Set initial direction if provided
    if (initialDirection !== 0) {
      // Normalize to 0-359 range
      initialDirection = Math.round(initialDirection) % 360;
      if (initialDirection < 0) initialDirection += 360;
      
      slider.value = initialDirection;
      directionValue.textContent = initialDirection + "°";
      directionArrow.style.transform = `rotate(${initialDirection}deg)`;
    }
    
    // Update direction display when slider is moved
    slider.oninput = function() {
      const direction = parseInt(this.value);
      directionValue.textContent = direction + "°";
      directionArrow.style.transform = `rotate(${direction}deg)`;
    };
    
    modal.style.display = "flex";
    
    function cleanUp() {
      modal.style.display = "none";
      saveButton.removeEventListener("click", onSave);
      cancelButton.removeEventListener("click", onCancel);
    }
    
    function onSave() {
      cleanUp();
      resolve(parseInt(slider.value));
    }
    
    function onCancel() {
      cleanUp();
      resolve(null);
    }
    
    saveButton.addEventListener("click", onSave);
    cancelButton.addEventListener("click", onCancel);
  });
}

/**
 * Prompt for lane count using built-in browser prompt
 * @returns {Promise<number>} Promise that resolves to number of lanes
 */
function promptForLaneCount() {
  return new Promise((resolve) => {
    const laneCount = prompt("How many lanes does this road have? (total in both directions)", "2");
    
    // Parse and validate lane count (must be a positive integer)
    const numLanes = parseInt(laneCount);
    if (!isNaN(numLanes) && numLanes > 0) {
      resolve(numLanes);
    } else {
      alert("Please enter a valid number of lanes (positive integer).");
      resolve(2); // Default to 2 lanes if invalid input
    }
  });
}

// Export all modal functions if in a module environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    customConfirm,
    customChoice,
    customRename,
    showPolygonOptionsModal,
    openRoadDirectionModal,
    promptForLaneCount
  };
}