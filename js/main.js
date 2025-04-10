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
  document.getElementById("download-btn").addEventListener("click", function () {
    leafletImage(map, function (err, canvas) {
      if (err) {
        console.error(err);
        alert("Error generating map image.");
        return;
      }
      var imgData = canvas.toDataURL("image/png");
      var link = document.createElement("a");
      link.href = imgData;
      link.download = "map.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  });
  
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
  
  // Finish area button
  document.getElementById("finish-area-btn").addEventListener("click", async function () {
    if (currentPolygonPoints.length < 3) {
      alert("A polygon requires at least 3 points.");
      return;
    }
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
function exportState() {
  // Run compliance check before exporting
  const compliance = checkCompliance();
  
  var stateData = {
    markers: [],
    polygons: [],
    compliance: compliance
  };

  // Export markers.
  allMarkers.forEach(function (marker) {
    var latlng = marker.getLatLng();
    var content = marker.getPopup() ? marker.getPopup().getContent() : "";
    stateData.markers.push({
      lat: latlng.lat,
      lng: latlng.lng,
      popupContent: content
    });
  });

  // Export drawn polygons.
  drawnPolygons.forEach(function (polygon) {
    var latlngs = polygon.getLatLngs()[0]; // Assuming first ring.
    var coords = latlngs.map(function (latlng) {
      return { lat: latlng.lat, lng: latlng.lng };
    });
    stateData.polygons.push({
      coordinates: coords
    });
  });

  var dataStr = JSON.stringify(stateData, null, 2);
  var blob = new Blob([dataStr], { type: "application/json" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "map_state.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  // Display compliance report
  if (!compliance.isCompliant) {
    alert(`Compliance Warning: Your traffic control plan has ${compliance.issues.length} issues that need to be addressed:\n\n` + 
          compliance.issues.join('\n'));
  } else {
    alert("Compliance Check: Your traffic control plan complies with Winnipeg regulations.");
  }
}

/**
 * Import state from a JSON file
 * @param {File} file - The file to import
 */
function importState(file) {
  if (!file) return;
  
  var reader = new FileReader();
  reader.onload = function (e) {
    try {
      var stateData = JSON.parse(e.target.result);

      // Remove current markers.
      allMarkers.forEach(function (marker) {
        map.removeLayer(marker);
      });
      allMarkers = [];

      // Remove current polygons.
      drawnPolygons.forEach(function (polygon) {
        map.removeLayer(polygon);
      });
      drawnPolygons = [];

      // Re-add markers.
      if (stateData.markers) {
        stateData.markers.forEach(function (data) {
          createInteractiveMarker(data.lat, data.lng, data.popupContent);
        });
      }

      // Re-add polygons.
      if (stateData.polygons) {
        stateData.polygons.forEach(function (polygonData) {
          var polygon = L.polygon(polygonData.coordinates, { color: "red" }).addTo(map);
          // Add click listener to re-enable options.
          polygon.on("click", function (e) {
            showPolygonOptionsModal(polygon);
          });
          drawnPolygons.push(polygon);
        });
      }
    } catch (err) {
      alert("Error loading state file: " + err);
    }
  };
  reader.readAsText(file);
}