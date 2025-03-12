/**
 * Search and location processing functions for the Traffic Safety Planner application
 */

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
            handleLocationSelection(item);
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
 * Handle location selection from suggestion list or search
 * @param {Object} location - Location object with lat, lon, and display_name
 */
async function handleLocationSelection(location) {
  const lat = parseFloat(location.lat);
  const lon = parseFloat(location.lon);
  
  // Move map to the location
  map.setView([lat, lon], 16);
  
  // AI analysis of the location
  const analyzedRoadType = analyzeLocation(location.display_name);
  const analyzedWorkZoneType = determineWorkZoneType(location.display_name);
  
  // Ask if the user wants to designate this area as a construction zone.
  const designate = await customConfirm(
    `AI Analysis: ${location.display_name} appears to be a ${analyzedRoadType} road.\n\nDo you want to designate this area as a construction zone?`
  );
  
  if (!designate) {
    L.popup()
      .setLatLng([lat, lon])
      .setContent("Location: " + location.display_name)
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
      handleLocationSelection(centerResult);
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

// Export functions if in a module environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    fetchSuggestions,
    handleLocationSelection,
    performSearch,
    exportState,
    importState
  };
}