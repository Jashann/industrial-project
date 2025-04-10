/**
 * Main entry point for the Traffic Safety Planner application
 * Initializes the map and sets up event handlers
 */

// Initialize the map
var map = L.map("map", { preferCanvas: true }).setView([49.8033, -97.0823], 16);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
  maxNativeZoom: 19,
  maxZoom: 22
}).addTo(map);

// Optional: Load additional GeoJSON data if available
fetch("my_plan_latlon.geojson")
  .then((response) => response.json())
  .then((data) => {
    L.geoJSON(data, {
      onEachFeature: function (feature, layer) {
        if (feature.properties && feature.properties.label) {
          layer.bindPopup(feature.properties.label);
        }
      },
    }).addTo(map);
  })
  .catch(err => {
    console.log("GeoJSON data not found or error loading:", err);
  });

// Event listeners for buttons
document.addEventListener('DOMContentLoaded', function() {
  
  // Search button
  document.getElementById("search-btn").addEventListener("click", function () {
    const query = document.getElementById("location-input").value;
    if (query) {
      performSearch(query);
      document.getElementById("suggestions").style.display = "none";
    }
  });
  
  // Download map button
  // Download map button
document.getElementById("download-btn").addEventListener("click", function() {
  // Change button text/style to indicate processing
  const originalButtonContent = this.innerHTML;
  this.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon><span>Processing...</span>';
  this.style.opacity = '0.7';
  this.disabled = true;

  // Short delay to allow the UI update to render
  setTimeout(() => {
    // Use leaflet-image to capture the map with all its layers
    leafletImage(map, function(err, canvas) {
      // Restore the button's original state
      const downloadBtn = document.getElementById("download-btn");
      downloadBtn.innerHTML = originalButtonContent;
      downloadBtn.style.opacity = '1';
      downloadBtn.disabled = false;
      
      if (err) {
        console.error("Error generating map image:", err);
        alert("Could not capture the map. Please try again.");
        return;
      }
      
      try {
        // Generate a timestamp for the filename
        const now = new Date();
        const timestamp = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
        
        // Convert canvas to image data
        const imgData = canvas.toDataURL("image/png");
        
        // Create a link element and trigger download
        const link = document.createElement("a");
        link.download = `traffic_plan_${timestamp}.png`;
        link.href = imgData;
        
        // Use the FileSaver approach for better browser compatibility
        // Create a blob from the image data
        const blob = dataURLToBlob(imgData);
        
        // Use saveAs if available, otherwise fall back to the link method
        if (window.saveAs) {
          window.saveAs(blob, link.download);
        } else {
          // For browsers without saveAs, use URL.createObjectURL
          link.href = URL.createObjectURL(blob);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
        }
        
        console.log("Map image download initiated");
      } catch (error) {
        console.error("Error in download process:", error);
        alert("An error occurred while downloading the map. Please try again.");
      }
    });
  }, 100);
});

/**
 * Helper function to convert data URL to Blob
 * @param {string} dataURL - The data URL (base64 encoded image)
 * @returns {Blob} - The image as a Blob object
 */
function dataURLToBlob(dataURL) {
  // Convert base64 to raw binary data held in a string
  const byteString = atob(dataURL.split(',')[1]);
  
  // Get MIME type
  const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
  
  // Create an array buffer view of the binary data
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const intArray = new Uint8Array(arrayBuffer);
  
  // Fill the array with byte codes
  for (let i = 0; i < byteString.length; i++) {
    intArray[i] = byteString.charCodeAt(i);
  }
  
  // Create and return the blob
  return new Blob([arrayBuffer], {type: mimeString});
}
  
  // Export state button
  document.getElementById("export-btn").addEventListener("click", exportState);
  
  // Import state button
  document.getElementById("import-btn").addEventListener("click", function () {
    document.getElementById("import-input").click();
  });
  
  // Import file input change
  document.getElementById("import-input").addEventListener("change", function (e) {
    importState(e.target.files[0]);
  });
  
  // Define work area button
  document.getElementById("define-workarea-btn").addEventListener("click", function() {
    // Start work area definition (using work-area-manager.js)
    if (typeof startWorkAreaDefinition === 'function') {
      startWorkAreaDefinition();
    } else {
      console.error("startWorkAreaDefinition function not found. Make sure work-area-manager.js is loaded.");
    }
  });
  
  // Select area button
  document.getElementById("select-area-btn").addEventListener("click", function () {
    // Check if we have a defined road area
    if (!definedRoadArea) {
      customConfirm("No road area defined yet. It's recommended to define a road area first. Do you want to define a road area now?").then(function(result) {
        if (result) {
          startRoadDrawing();
        } else {
          startPolygonDrawing();
        }
      });
    } else {
      startPolygonDrawing();
    }
  });

  /**
 * Prompts the user to select a road type
 * @returns {Promise<string>} A promise that resolves to the selected road type
 */
function promptForRoadType() {
  return new Promise((resolve) => {
    // Create a custom modal for road type selection
    const modal = document.createElement('div');
    modal.className = 'custom-modal';
    modal.style.display = 'flex';
    
    modal.innerHTML = `
      <div class="custom-modal-content">
        <h3>Select Road Type</h3>
        <p>Please select the type of road for proper traffic control placement:</p>
        
        <div style="margin: 20px 0; text-align: left;">
          <div style="margin-bottom: 10px;">
            <input type="radio" id="road-regional" name="roadType" value="regional" checked>
            <label for="road-regional" style="margin-left: 8px; font-weight: bold;">Regional Street</label>
            <p style="margin: 5px 0 0 24px; font-size: 12px; color: #666;">
              Higher traffic volume, typically multiple lanes
            </p>
          </div>
          
          <div style="margin-bottom: 10px;">
            <input type="radio" id="road-residential" name="roadType" value="residential">
            <label for="road-residential" style="margin-left: 8px; font-weight: bold;">Residential/Non-Regional</label>
            <p style="margin: 5px 0 0 24px; font-size: 12px; color: #666;">
              Lower traffic volume, typically fewer lanes
            </p>
          </div>
          
          <div style="margin-bottom: 10px;">
            <input type="radio" id="road-collector" name="roadType" value="collector">
            <label for="road-collector" style="margin-left: 8px; font-weight: bold;">Collector Street</label>
            <p style="margin: 5px 0 0 24px; font-size: 12px; color: #666;">
              Medium traffic volume, connects local streets to arterials
            </p>
          </div>
        </div>
        
        <div class="custom-modal-buttons">
          <button id="road-type-confirm" style="background: linear-gradient(135deg, #28a745, #218838); color: white;">
            <ion-icon name="checkmark-outline"></ion-icon> Confirm
          </button>
          <button id="road-type-cancel" style="background: linear-gradient(135deg, #6c757d, #5a6268); color: white;">
            <ion-icon name="close-outline"></ion-icon> Cancel
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event handlers for buttons
    document.getElementById('road-type-confirm').addEventListener('click', () => {
      const selected = document.querySelector('input[name="roadType"]:checked');
      const roadType = selected ? selected.value : 'residential';
      document.body.removeChild(modal);
      resolve(roadType);
    });
    
    document.getElementById('road-type-cancel').addEventListener('click', () => {
      document.body.removeChild(modal);
      resolve('residential'); // Default to residential if cancelled
    });
  });
}
  
  // Finish area button
  document.getElementById("finish-area-btn").addEventListener("click", async function () {
    if (currentPolygonLayer) {
      // Add the polygon to the drawn polygons array
      drawnPolygons.push(currentPolygonLayer);
      
      // Get road type - you might want to ask the user or determine from the map
      const roadType = await promptForRoadType(); // You'd need to create this function
      
      // Plan the construction zone with the new function
      aiPlanConstructionZone(currentPolygonLayer, roadType);
      
      // Reset drawing state
      polygonDrawingMode = false;
      document.getElementById("select-area-btn").style.display = "block";
      document.getElementById("finish-area-btn").style.display = "none";
      currentPolygonPoints = [];
      currentPolygonLayer = null;
    }
<<<<<<< HEAD
    polygonDrawingMode = false;
    this.style.display = "none";
    const finishedPolygon = currentPolygonLayer;
    
    // Add click handler for the polygon
    finishedPolygon.on("click", function (e) {
      showPolygonOptionsModal(finishedPolygon);
    });
    
    // Add to the drawn polygons array
    drawnPolygons.push(finishedPolygon);
    
    // First, prompt for road type selection
    const roadTypes = Object.keys(REGULATIONS.roadTypes);
    let roadTypePrompt = "Select road type:\n";
    roadTypes.forEach((type, index) => {
      roadTypePrompt += `${index + 1}. ${type} (${REGULATIONS.roadTypes[type].speedLimit} km/h)\n`;
    });
    
    const roadTypeIndex = parseInt(prompt(roadTypePrompt, "1")) - 1;
    const selectedRoadType = roadTypes[roadTypeIndex >= 0 && roadTypeIndex < roadTypes.length ? roadTypeIndex : 0];
    
    // Simplified work zone selection
    const selectedWorkZoneType = "TC2"; // Default to TC-2 Roadwork
    
    // Place 3 points in a straight line along the road direction
    const createdMarkers = aiPlanConstructionZone(finishedPolygon, selectedRoadType, selectedWorkZoneType);
    
    // Create a bounding group of all elements and fit the map to it
    const allElements = [finishedPolygon, ...createdMarkers];
    const group = L.featureGroup(allElements);
    map.fitBounds(group.getBounds().pad(0.2));
    
    alert(`Created ${createdMarkers.length} points along the road direction.`);
    
    /* Original AI-assisted planning code commented out
    // Ask user if they want AI-assisted planning
    const useAI = await customConfirm("Do you want to use AI to automatically plan the construction zone layout?");
    
    if (useAI) {
      // First, prompt for road type selection
      const roadTypes = Object.keys(REGULATIONS.roadTypes);
      let roadTypePrompt = "Select road type:\n";
      roadTypes.forEach((type, index) => {
        roadTypePrompt += `${index + 1}. ${type} (${REGULATIONS.roadTypes[type].speedLimit} km/h)\n`;
      });
      
      const roadTypeIndex = parseInt(prompt(roadTypePrompt, "1")) - 1;
      const selectedRoadType = roadTypes[roadTypeIndex >= 0 && roadTypeIndex < roadTypes.length ? roadTypeIndex : 0];
      
      // Then, prompt for work zone type selection
      const workZoneTypes = Object.keys(REGULATIONS.workZoneTypes);
      let workZonePrompt = "Select work zone type:\n";
      workZoneTypes.forEach((type, index) => {
        workZonePrompt += `${index + 1}. ${REGULATIONS.workZoneTypes[type].name} - ${REGULATIONS.workZoneTypes[type].description}\n`;
      });
      
      const workZoneIndex = parseInt(prompt(workZonePrompt, "1")) - 1;
      const selectedWorkZoneType = workZoneTypes[workZoneIndex >= 0 && workZoneIndex < workZoneTypes.length ? workZoneIndex : 0];
      
      // Perform AI-based planning based on selected options
      const createdMarkers = aiPlanConstructionZone(finishedPolygon, selectedRoadType, selectedWorkZoneType);
      
      // Create a bounding group of all elements and fit the map to it
      const allElements = [finishedPolygon, ...createdMarkers];
      const group = L.featureGroup(allElements);
      map.fitBounds(group.getBounds().pad(0.2));
      
      alert(`AI planning complete! Created ${createdMarkers.length} traffic control elements for a ${selectedRoadType} road with ${REGULATIONS.workZoneTypes[selectedWorkZoneType].name} configuration.`);
    } else {
      alert("Construction area created. Click on it to view options.");
    }
    */
    
    // Reset polygon drawing state
    currentPolygonPoints = [];
    currentPolygonLayer = null;
=======
>>>>>>> 7278a29f85ead7763534383d909501db280ad458
  });
  
  // AI Check button
  document.getElementById("ai-check-btn").addEventListener("click", async function() {
    // Run compliance check
    const compliance = checkCompliance();
    
    if (compliance.isCompliant) {
      alert("AI Check Complete: Your traffic control plan complies with Winnipeg regulations!");
    } else {
      // Call AI recommendations function
      await aiRecommendFixes(compliance.issues);
    }
  });
  
  // Location input with debounce search for suggestions
  const locationInput = document.getElementById("location-input");
  locationInput.addEventListener(
    "input",
    debounce(function (e) {
      fetchSuggestions(e.target.value);
    }, 300)
  );
});

// Global variables for item placement
var placementModeActive = false;
var selectedItemType = null;
var selectedItemName = null;
var selectedItemIcon = null;

// Map click event handler
map.on("click", async function (e) {
  // Map click handler in main.js
  
  // If the polygon options modal is open, do nothing.
  if (polygonModalOpen) return;
  
  // If road drawing mode is active, add points to road polygon
  if (roadDrawingMode) {
    currentRoadPoints.push(e.latlng);
    
    // Add a visual marker for the point
    L.circleMarker(e.latlng, {radius: 5, color: 'blue'}).addTo(map);
    
    // Update the polygon as points are added
    if (currentRoadPoints.length > 1) {
      if (currentRoadLayer) {
        currentRoadLayer.setLatLngs(currentRoadPoints);
      } else {
        // Create the polygon and add it to the map
        currentRoadLayer = L.polygon(currentRoadPoints, { 
          color: 'blue', 
          fillOpacity: 0.2, 
          weight: 2 
        }).addTo(map);
      }
    }
    
    return; // Skip marker confirmation when drawing road
  }
  
  // If polygon drawing mode is active, add point to current polygon.
  if (polygonDrawingMode) {
    currentPolygonPoints.push(e.latlng);
    if (currentPolygonLayer) {
      currentPolygonLayer.setLatLngs(currentPolygonPoints);
    } else {
      currentPolygonLayer = L.polygon(currentPolygonPoints, { color: "red" }).addTo(map);
    }
    return; // Skip marker confirmation when drawing polygon.
  }
  
  // If placement mode is active, place the selected item
  if (placementModeActive && selectedItemIcon) {
    const lat = e.latlng.lat;
    const lon = e.latlng.lng;
    
    // Check if inside road area (if defined)
    if (definedRoadArea && !isPointInPolygon({lat, lng: lon}, definedRoadArea)) {
      alert("Cannot place item outside the defined road area. Please place items within the road boundaries.");
      return;
    }
    
    // Create marker with the selected icon
    createInteractiveMarker(
      lat,
      lon,
      selectedItemName,
      selectedItemIcon
    ).openPopup();
    
    return;
  }
  
  // Skip the "add pin" functionality - we now use the item menu instead
  return;
});

/**
 * Fetch suggestions for location search
 * @param {string} query - Search query
 */
function fetchSuggestions(query) {
  const suggestionsDiv = document.getElementById("suggestions");
  
  if (query.length < 3) {
    suggestionsDiv.style.display = "none";
    return;
  }
  
  fetch(
    "https://nominatim.openstreetmap.org/search?format=json&countrycodes=ca&q=" +
      encodeURIComponent(query)
  )
    .then((response) => response.json())
    .then((data) => {
      suggestionsDiv.innerHTML = "";
      if (data && data.length > 0) {
        suggestionsDiv.style.display = "block";
        data.forEach(function (item) {
          const suggestionItem = document.createElement("div");
          suggestionItem.className = "suggestion-item";
          suggestionItem.textContent = item.display_name;
          suggestionItem.addEventListener("click", async function () {
            document.getElementById("location-input").value = "";
            suggestionsDiv.style.display = "none";
            const lat = parseFloat(item.lat);
            const lon = parseFloat(item.lon);
            
            // Move map to the location
            map.setView([lat, lon], 16);
            
            // AI analysis of the location
            const analyzedRoadType = analyzeLocation(item.display_name);
            const analyzedWorkZoneType = determineWorkZoneType(item.display_name);
            
            // Ask if the user wants to designate this area as a construction zone.
            const designate = await customConfirm(
              `AI Analysis: ${item.display_name} appears to be a ${analyzedRoadType} road.\n\nDo you want to designate this area as a construction zone?`
            );
            
            if (!designate) {
              L.popup()
                .setLatLng([lat, lon])
                .setContent("Location: " + item.display_name)
                .openOn(map);
              return;
            }
            
            // For road direction, check if we have a defined road area
            let useRoadDirection = roadDirection;
            
            // If we don't have a defined road direction, prompt the user to define a road area first
            if (!definedRoadArea) {
              const defineRoad = await customConfirm("For optimal placement of traffic control elements, would you like to define the road area first?");
              
              if (defineRoad) {
                // Ask for lane count before starting road drawing
                roadLanes = await promptForLaneCount();
                startRoadDrawing();
                return; // Exit this flow and let the road drawing mode take over
              } else {
                // Use a default bearing if the user doesn't want to define a road
                useRoadDirection = 45; // Default 45 degrees (NE)
              }
            }
            
            // Create construction zone polygon
            const constructionZone = createConstructionZonePolygon(lat, lon, analyzedRoadType, useRoadDirection);
            constructionZone.addTo(map);
            
            // Add click handler for the polygon
            constructionZone.on("click", function(e) {
              showPolygonOptionsModal(constructionZone);
            });
            
            // Add to the drawn polygons array
            drawnPolygons.push(constructionZone);
            
            // Place 3 points in a straight line along the road direction
            const createdMarkers = aiPlanConstructionZone(constructionZone, analyzedRoadType, analyzedWorkZoneType);
            
            // Create a bounding group of all elements and fit the map to it
            const allElements = [constructionZone, ...createdMarkers];
            const group = L.featureGroup(allElements);
            map.fitBounds(group.getBounds().pad(0.2));
            
            alert(`Created ${createdMarkers.length} points along the road direction.`);
            
            /* Original AI-based planning code commented out
            // Ask if user wants AI to plan the construction zone
            const useAI = await customConfirm(
              `AI suggests a ${analyzedWorkZoneType} configuration for this location.\n\nDo you want to use AI to automatically plan the construction zone layout?`
            );
            
            if (useAI) {
              // Perform AI-based planning
              const createdMarkers = aiPlanConstructionZone(constructionZone, analyzedRoadType, analyzedWorkZoneType);
              
              // Create a bounding group of all elements and fit the map to it
              const allElements = [constructionZone, ...createdMarkers];
              const group = L.featureGroup(allElements);
              map.fitBounds(group.getBounds().pad(0.2));
              
              alert(`AI planning complete! Created ${createdMarkers.length} traffic control elements for a ${analyzedRoadType} road with ${REGULATIONS.workZoneTypes[analyzedWorkZoneType].name} configuration.`);
            } else {
              // Just show the basic construction zone marker
              const mainMarker = createInteractiveMarker(
                lat,
                lon,
                `Designated Construction Zone – ${REGULATIONS.workZoneTypes[analyzedWorkZoneType].name}`
              );
              mainMarker.openPopup();
            }
            */
          });
          suggestionsDiv.appendChild(suggestionItem);
        });
      } else {
        suggestionsDiv.style.display = "none";
      }
    })
    .catch((err) => console.error(err));
}

/**
 * Perform a search and add markers with AI analysis
 * @param {string} query - Search query
 */
async function performSearch(query) {
  try {
    const response = await fetch(
      "https://nominatim.openstreetmap.org/search?format=json&countrycodes=ca&q=" +
        encodeURIComponent(query)
    );
    const data = await response.json();
    if (data && data.length > 0) {
      const centerResult = data[0];
      const centerLat = parseFloat(centerResult.lat);
      const centerLon = parseFloat(centerResult.lon);
      
      // Move map to the location
      map.setView([centerLat, centerLon], 16);
      
      // AI analysis of the location
      const analyzedRoadType = analyzeLocation(centerResult.display_name);
      const analyzedWorkZoneType = determineWorkZoneType(query);
      const designate = await customConfirm(
        `AI Analysis: ${centerResult.display_name} appears to be a ${analyzedRoadType} road.\n\nDo you want to designate this area as a construction zone?`
      );
      
      if (!designate) {
        L.popup()
          .setLatLng([centerLat, centerLon])
          .setContent("Location: " + centerResult.display_name)
          .openOn(map);
        return;
      }
      
      // For road direction, check if we have a defined road area
      let useRoadDirection = roadDirection;
      
      // If we don't have a defined road direction, prompt the user to define a road area first
      if (!definedRoadArea) {
        const defineRoad = await customConfirm("For optimal placement of traffic control elements, would you like to define the road area first?");
        
        if (defineRoad) {
          // Ask for lane count before starting road drawing
          roadLanes = await promptForLaneCount();
          startRoadDrawing();
          return; // Exit this flow and let the road drawing mode take over
        } else {
          // Use a default bearing if the user doesn't want to define a road
          useRoadDirection = 45; // Default 45 degrees (NE)
        }
      }
      
      // Create construction zone polygon
      const constructionZone = createConstructionZonePolygon(centerLat, centerLon, analyzedRoadType, useRoadDirection);
      constructionZone.addTo(map);
      
      // Add click handler for the polygon
      constructionZone.on("click", function(e) {
        showPolygonOptionsModal(constructionZone);
      });
      
      // Add to the drawn polygons array
      drawnPolygons.push(constructionZone);
      
      // Place 3 points in a straight line along the road direction
      const createdMarkers = aiPlanConstructionZone(constructionZone, analyzedRoadType, analyzedWorkZoneType);
      
      // Create a bounding group of all elements and fit the map to it
      const allElements = [constructionZone, ...createdMarkers];
      const group = L.featureGroup(allElements);
      map.fitBounds(group.getBounds().pad(0.2));
      
      alert(`Created ${createdMarkers.length} points along the road direction.`);
      
      /* Original AI-based planning code commented out
      // Ask if user wants AI to plan the construction zone
      const useAI = await customConfirm(
        `AI suggests a ${analyzedWorkZoneType} configuration for this location.\n\nDo you want to use AI to automatically plan the construction zone layout?`
      );
      
      if (useAI) {
        // Perform AI-based planning
        const createdMarkers = aiPlanConstructionZone(constructionZone, analyzedRoadType, analyzedWorkZoneType);
        
        // Create a bounding group of all elements and fit the map to it
        const allElements = [constructionZone, ...createdMarkers];
        const group = L.featureGroup(allElements);
        map.fitBounds(group.getBounds().pad(0.2));
        
        alert(`AI planning complete! Created ${createdMarkers.length} traffic control elements for a ${analyzedRoadType} road with ${REGULATIONS.workZoneTypes[analyzedWorkZoneType].name} configuration.`);
      } else {
        // Just show the basic construction zone marker
        const mainMarker = createInteractiveMarker(
          centerLat,
          centerLon,
          `Designated Construction Zone – ${REGULATIONS.workZoneTypes[analyzedWorkZoneType].name}`
        );
        mainMarker.openPopup();
      }
      */
    } else {
      alert("Location not found!");
    }
  } catch (err) {
    console.error(err);
    alert("Error occurred while searching for location.");
  }
}

/**
 * Export the current state of the map to a JSON file
 */
/**
 * Export the current state of the map to a JSON file
 */
function exportState() {
  // Run compliance check before exporting
  const compliance = checkCompliance();
  
  // Create comprehensive state data object
  const stateData = {
    // Map info
    mapCenter: map.getCenter(),
    mapZoom: map.getZoom(),
    
    // Basic markers and polygons
    markers: [],
    polygons: [],
    
    // Specialized traffic control elements
    trafficControl: {
      signs: [],
      cones: [],
      barricades: [],
      barrels: [],
      arrowBoards: [],
      flagpersons: [],
      delineators: []
    },
    
    // Road definition data
    road: {
      defined: definedRoadArea ? true : false,
      coordinates: roadCoordinates,
      lanes: roadLanes,
      direction: roadDirection
    },
    
    // Compliance info
    compliance: compliance
  };

  // Export all markers
  allMarkers.forEach(function (marker) {
    const latlng = marker.getLatLng();
    const content = marker.getPopup() ? marker.getPopup().getContent() : "";
    
    // Extract device type information if available
    const deviceType = marker.options && marker.options.deviceType ? marker.options.deviceType : "generic";
    const category = getMarkerCategory(marker);
    
    const markerData = {
      lat: latlng.lat,
      lng: latlng.lng,
      popupContent: content,
      deviceType: deviceType,
      category: category,
      draggable: marker.options && marker.options.draggable
    };
    
    // Add to appropriate collection
    if (category !== "generic" && stateData.trafficControl[category]) {
      stateData.trafficControl[category].push(markerData);
    } else {
      stateData.markers.push(markerData);
    }
  });

  // Export drawn polygons
  drawnPolygons.forEach(function (polygon) {
    const latlngs = polygon.getLatLngs()[0]; // Assuming first ring
    const coords = latlngs.map(function (latlng) {
      return { lat: latlng.lat, lng: latlng.lng };
    });
    
    // Extract style information
    const style = {
      color: polygon.options.color || "red",
      weight: polygon.options.weight || 3,
      opacity: polygon.options.opacity || 1,
      fillOpacity: polygon.options.fillOpacity || 0.2
    };
    
    stateData.polygons.push({
      coordinates: coords,
      style: style,
      isRoad: polygon === definedRoadArea
    });
  });

  // Export road area if defined
  if (definedRoadArea) {
    const roadLatlngs = definedRoadArea.getLatLngs()[0];
    stateData.road.coordinates = roadLatlngs.map(latlng => ({ lat: latlng.lat, lng: latlng.lng }));
  }

  // Convert to JSON and download
  const dataStr = JSON.stringify(stateData, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  
  // Include date in filename
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  a.download = `traffic_plan_${dateStr}.json`;
  
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  // Show success message with compliance info
  if (!compliance.isCompliant) {
    alert(`Plan exported with ${compliance.issues.length} compliance issues.\n\nNote: Your traffic control plan has issues that need to be addressed.`);
  } else {
    alert("Plan exported successfully! Your traffic control plan complies with Winnipeg regulations.");
  }
}

/**
 * Helper function to determine the category of a marker
 * @param {L.Marker} marker - The marker to check
 * @returns {string} Category of the marker
 */
function getMarkerCategory(marker) {
  // Check if the marker has a popup with content that indicates its type
  if (marker.getPopup()) {
    const content = marker.getPopup().getContent();
    
    if (content.includes("TC-") || content.includes("RB-")) return "signs";
    if (content.includes("Cone") || content.includes("cone")) return "cones";
    if (content.includes("Barrel") || content.includes("barrel")) return "barrels";
    if (content.includes("Barricade") || content.includes("barricade")) return "barricades";
    if (content.includes("Arrow Board")) return "arrowBoards";
    if (content.includes("Flagperson")) return "flagpersons";
    if (content.includes("Delineator")) return "delineators";
  }
  
  // Check if the marker has a deviceType property
  if (marker.options && marker.options.deviceType) {
    const type = marker.options.deviceType;
    if (type.includes("TC-") || type.includes("RB-")) return "signs";
    if (type === "cone") return "cones";
    if (type === "barrel") return "barrels";
    if (type === "barricade") return "barricades";
    if (type === "arrowBoard" || type === "flashingArrowL") return "arrowBoards";
    if (type === "flagperson") return "flagpersons";
    if (type === "delineator") return "delineators";
  }
  
  // Default to generic
  return "generic";
}

/**
 * Import state from a JSON file
 * @param {File} file - The file to import
 */
function importState(file) {
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      // Parse state data
      const stateData = JSON.parse(e.target.result);
      
      // Clear current state
      clearCurrentState();
      
      // Set map view if data is available
      if (stateData.mapCenter && stateData.mapZoom) {
        map.setView([stateData.mapCenter.lat, stateData.mapCenter.lng], stateData.mapZoom);
      }
      
      // Restore road definition if it exists
      if (stateData.road && stateData.road.defined && stateData.road.coordinates && stateData.road.coordinates.length > 0) {
        restoreRoadDefinition(stateData.road);
      }
      
      // Restore polygons
      if (stateData.polygons && stateData.polygons.length > 0) {
        stateData.polygons.forEach(function (polyData) {
          const polygon = L.polygon(polyData.coordinates, polyData.style || { color: "red" }).addTo(map);
          
          // Check if this is the road polygon
          if (polyData.isRoad) {
            definedRoadArea = polygon;
            polygon.setStyle({color: '#0d9488', fillOpacity: 0.3, weight: 3});
          } else {
            // Add click listener for construction area options
            polygon.on("click", function (e) {
              showPolygonOptionsModal(polygon);
            });
            drawnPolygons.push(polygon);
          }
        });
      }
      
      // Restore basic markers first
      if (stateData.markers && stateData.markers.length > 0) {
        stateData.markers.forEach(function (markerData) {
          createInteractiveMarker(markerData.lat, markerData.lng, markerData.popupContent);
        });
      }
      
      // Restore traffic control elements
      if (stateData.trafficControl) {
        // Process signs
        if (stateData.trafficControl.signs && stateData.trafficControl.signs.length > 0) {
          stateData.trafficControl.signs.forEach(function (signData) {
            createTrafficControlDevice(signData.lat, signData.lng, signData.deviceType, signData.popupContent, "signs");
          });
        }
        
        // Process cones
        if (stateData.trafficControl.cones && stateData.trafficControl.cones.length > 0) {
          stateData.trafficControl.cones.forEach(function (coneData) {
            createTrafficControlDevice(coneData.lat, coneData.lng, "cone", coneData.popupContent, "cones");
          });
        }
        
        // Process barricades
        if (stateData.trafficControl.barricades && stateData.trafficControl.barricades.length > 0) {
          stateData.trafficControl.barricades.forEach(function (barricadeData) {
            createTrafficControlDevice(barricadeData.lat, barricadeData.lng, "barricade", barricadeData.popupContent, "barricades");
          });
        }
        
        // Process barrels
        if (stateData.trafficControl.barrels && stateData.trafficControl.barrels.length > 0) {
          stateData.trafficControl.barrels.forEach(function (barrelData) {
            createTrafficControlDevice(barrelData.lat, barrelData.lng, "barrel", barrelData.popupContent, "barrels");
          });
        }
        
        // Process arrow boards
        if (stateData.trafficControl.arrowBoards && stateData.trafficControl.arrowBoards.length > 0) {
          stateData.trafficControl.arrowBoards.forEach(function (arrowData) {
            createTrafficControlDevice(arrowData.lat, arrowData.lng, arrowData.deviceType || "arrowBoard", arrowData.popupContent, "arrowBoards");
          });
        }
        
        // Process flagpersons
        if (stateData.trafficControl.flagpersons && stateData.trafficControl.flagpersons.length > 0) {
          stateData.trafficControl.flagpersons.forEach(function (flagData) {
            createTrafficControlDevice(flagData.lat, flagData.lng, "flagperson", flagData.popupContent, "flagpersons");
          });
        }
        
        // Process delineators
        if (stateData.trafficControl.delineators && stateData.trafficControl.delineators.length > 0) {
          stateData.trafficControl.delineators.forEach(function (delineatorData) {
            createTrafficControlDevice(delineatorData.lat, delineatorData.lng, "delineator", delineatorData.popupContent, "delineators");
          });
        }
      }
      
      // Show success message
      alert("Traffic plan imported successfully!");
      
      // Show compliance status if available
      if (stateData.compliance) {
        if (!stateData.compliance.isCompliant) {
          setTimeout(() => {
            alert(`Note: The imported plan has ${stateData.compliance.issues.length} compliance issues that need to be addressed.`);
          }, 500);
        }
      }
      
    } catch (err) {
      console.error("Error importing state:", err);
      alert("Error loading state file: " + err.message);
    }
  };
  
  reader.readAsText(file);
}

/**
 * Clear the current state of the application
 */
function clearCurrentState() {
  // Remove all markers
  allMarkers.forEach(function (marker) {
    map.removeLayer(marker);
  });
  allMarkers = [];
  
  // Remove all polygons
  drawnPolygons.forEach(function (polygon) {
    map.removeLayer(polygon);
  });
  drawnPolygons = [];
  
  // Reset road definition
  if (definedRoadArea) {
    map.removeLayer(definedRoadArea);
    definedRoadArea = null;
  }
  roadCoordinates = [];
  roadDirection = 0;
  roadLanes = 2; // Default to 2 lanes
  
  // Reset traffic control elements
  Object.keys(trafficControlElements).forEach(category => {
    trafficControlElements[category].forEach(element => {
      if (map.hasLayer(element)) {
        map.removeLayer(element);
      }
    });
    trafficControlElements[category] = [];
  });
  
  // Reset drawing modes
  polygonDrawingMode = false;
  roadDrawingMode = false;
  currentPolygonPoints = [];
  currentPolygonLayer = null;
  currentRoadPoints = [];
  currentRoadLayer = null;
  
  // Reset UI buttons
  document.getElementById("finish-area-btn").style.display = "none";
  document.getElementById("select-area-btn").style.display = "block";
  document.getElementById("finish-road-btn").style.display = "none";
  document.getElementById("define-road-btn").style.display = "inline-flex";
}

/**
 * Restore road definition from imported state
 * @param {Object} roadData - Road definition data from state file
 */
function restoreRoadDefinition(roadData) {
  // Create road area from coordinates
  if (roadData.coordinates && roadData.coordinates.length > 0) {
    definedRoadArea = L.polygon(roadData.coordinates, {
      color: '#0d9488', 
      fillOpacity: 0.3, 
      weight: 3
    }).addTo(map);
    
    // Set road properties
    roadDirection = roadData.direction || 0;
    roadLanes = roadData.lanes || 2;
    roadCoordinates = roadData.coordinates;
    
    // Add a label to the road including lane count
    const center = definedRoadArea.getBounds().getCenter();
    L.marker(center, {
      icon: L.divIcon({
        className: 'road-label',
        html: `<div style="background: rgba(255,255,255,0.7); padding: 3px; border-radius: 3px; color: #0d9488; font-weight: bold;">
                ${roadLanes}-Lane Road | Direction: ${roadDirection}°
               </div>`,
        iconSize: [150, 20],
        iconAnchor: [75, 10]
      })
    }).addTo(map);
  }
}