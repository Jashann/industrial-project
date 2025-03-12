/**
 * Road, marker and polygon handling for the Traffic Safety Planner application
 */

/**
 * Global variables used by road and marker functions
 */
// Flag to indicate if the polygon options modal is open
var polygonModalOpen = false;

// Variables for road area drawing
var roadDrawingMode = false;
var currentRoadPoints = [];
var currentRoadLayer = null;
var roadDirection = 0; // degrees (0 = North, 90 = East, etc.)
var definedRoadArea = null; // To store the defined road area
var roadCoordinates = []; // Store the road coordinates for path calculation

// Lane information variables
var roadLanes = 2; // Default to 2 lanes
var laneMarkers = [];

// Variables for polygon drawing
var polygonDrawingMode = false;
var currentPolygonPoints = [];
var currentPolygonLayer = null;
var drawnPolygons = []; // Array to hold all finished polygon layers

// Global array to store all markers
var allMarkers = [];

/**
 * Creates a marker that shows its popup on hover and, on click, prompts the user for an action.
 * The marker is added to the global allMarkers array.
 * 
 * @param {number} lat - Latitude for the marker
 * @param {number} lon - Longitude for the marker
 * @param {string} popupContent - Content for the marker's popup
 * @returns {L.Marker} The created marker
 */
function createInteractiveMarker(lat, lon, popupContent) {
  var marker = L.marker([lat, lon], { draggable: false }).addTo(map);
  marker.bindPopup(popupContent);
  allMarkers.push(marker);

  // Show popup on hover.
  marker.on("mouseover", function () {
    marker.openPopup();
  });
  marker.on("mouseout", function () {
    marker.closePopup();
  });

  // On click, prompt for marker actions.
  marker.on("click", async function (e) {
    if (marker.dragging && marker.dragging.enabled()) return;
    const action = await customChoice("What would you like to do?");
    if (action === "drag") {
      marker.dragging.enable();
      alert(
        "You can now drag the marker. Once you finish dragging, it will automatically stop."
      );
      marker.once("dragend", function (e) {
        marker.dragging.disable();
        const newLatLng = marker.getLatLng();
        marker.setPopupContent(
          "Pin dropped at: " +
            newLatLng.lat.toFixed(5) +
            ", " +
            newLatLng.lng.toFixed(5)
        );
      });
    } else if (action === "delete") {
      const confirmDelete = await customConfirm(
        "Are you sure you want to delete this marker?"
      );
      if (confirmDelete) {
        map.removeLayer(marker);
        allMarkers = allMarkers.filter((m) => m !== marker);
      }
    } else if (action === "rename") {
      let newName = await customRename(marker.getPopup().getContent());
      if (newName) {
        marker.setPopupContent(newName);
      }
    }
  });
  return marker;
}

/**
 * Function to place a marker only if it's inside the road area
 * 
 * @param {number} lat - Latitude for the marker
 * @param {number} lon - Longitude for the marker
 * @param {string} label - Label/content for the marker
 * @returns {boolean} True if marker was placed, false otherwise
 */
function placeMarkerIfInRoad(lat, lon, label) {
  if (!definedRoadArea) {
    createInteractiveMarker(lat, lon, label);
    return true;
  }
  
  // Check if the marker position is inside the road area
  if (isPointInPolygon({lat, lng: lon}, definedRoadArea)) {
    createInteractiveMarker(lat, lon, label);
    return true;
  }
  
  return false; // Marker was not placed because it's outside the road
}

/**
 * Start road drawing mode
 */
function startRoadDrawing() {
  // Exit polygon drawing mode if active
  if (polygonDrawingMode) {
    polygonDrawingMode = false;
    document.getElementById("finish-area-btn").style.display = "none";
  }
  
  // Start road drawing mode
  roadDrawingMode = true;
  currentRoadPoints = [];
  
  // Remove existing road layer if there is one
  if (currentRoadLayer) {
    map.removeLayer(currentRoadLayer);
    currentRoadLayer = null;
  }
  
  // If there's a defined road area, remove it
  if (definedRoadArea) {
    map.removeLayer(definedRoadArea);
    definedRoadArea = null;
  }
  
  document.getElementById("define-road-btn").style.display = "none";
  document.getElementById("finish-road-btn").style.display = "inline-flex";
  
  alert(`Road definition mode activated for a ${roadLanes}-lane road. Click on the map to add points defining the road area boundary. Click 'Set Road' when finished.`);
}

/**
 * Start polygon drawing mode for construction area
 */
function startPolygonDrawing() {
  polygonDrawingMode = true;
  currentPolygonPoints = [];
  
  if (currentPolygonLayer) {
    map.removeLayer(currentPolygonLayer);
    currentPolygonLayer = null;
  }
  
  alert(
    "Polygon drawing mode activated. Click on the map to add polygon vertices. When finished, click the 'Finish Area' button."
  );
  
  document.getElementById("finish-area-btn").style.display = "inline-flex";
}

/**
 * Analyze a location name to determine the road type
 * 
 * @param {string} locationName - Name/description of the location
 * @returns {string} Road type ("highway", "arterial", "collector", or "residential")
 */
function analyzeLocation(locationName) {
  // This is a simplistic analysis based on keywords - in a real AI implementation
  // this would use more sophisticated NLP or API calls to determine road classification
  const locationLower = locationName.toLowerCase();
  
  // Check for road type keywords
  if (locationLower.includes("highway") || locationLower.includes("freeway") || 
      locationLower.includes("expressway") || locationLower.includes("trans-canada")) {
    return "highway";
  } else if (locationLower.includes("ave") || locationLower.includes("boulevard") || 
             locationLower.includes("main street") || locationLower.includes("route")) {
    return "arterial";
  } else if (locationLower.includes("road") || locationLower.includes("drive") || 
             locationLower.includes("way") || locationLower.includes("street")) {
    return "collector";
  } else {
    return "residential"; // Default
  }
}

/**
 * Determine appropriate work zone type based on location analysis
 * 
 * @param {string} locationName - Name/description of the location
 * @returns {string} Work zone type ("TC2", "TC3", or "TC7")
 */
function determineWorkZoneType(locationName) {
  // Again, simplistic keyword-based analysis
  const locationLower = locationName.toLowerCase();
  
  if (locationLower.includes("construction") || locationLower.includes("build")) {
    return "TC3"; // Work Area for extended construction
  } else if (locationLower.includes("lane") || locationLower.includes("traffic") ||
            locationLower.includes("closed")) {
    return "TC7"; // Lane Closure
  } else {
    return "TC2"; // Default - Short duration roadwork
  }
}

/**
 * Create a construction zone polygon programmatically
 * 
 * @param {number} centerLat - Center latitude for the construction zone
 * @param {number} centerLon - Center longitude for the construction zone
 * @param {string} roadType - Type of road ("highway", "arterial", "collector", "residential")
 * @param {number} bearing - Road direction in degrees (0 = North, 90 = East, etc.)
 * @returns {L.Polygon} Polygon representing the construction zone
 */
function createConstructionZonePolygon(centerLat, centerLon, roadType, bearing = 0) {
  // Size of construction zone based on road type
  let zoneLength, zoneWidth;
  
  switch(roadType) {
    case "highway":
      zoneLength = 200;
      zoneWidth = 30;
      break;
    case "arterial":
      zoneLength = 100;
      zoneWidth = 20;
      break;
    case "collector":
      zoneLength = 75;
      zoneWidth = 15;
      break;
    default: // residential
      zoneLength = 50;
      zoneWidth = 10;
      break;
  }
  
  // Convert meters to lat/lon approximations
  const conversion = metersToLatLon(1, centerLat);
  
  // Create points for a rectangle aligned with the road
  // We'll use bearing to align it with the road direction
  const points = [];
  
  // Calculate corner points
  const halfLength = zoneLength / 2;
  const halfWidth = zoneWidth / 2;
  
  // Road direction is bearing, so rectangle sides are at bearing and bearing+90
  const pt1 = calculateDestination(centerLat, centerLon, halfLength, bearing);
  pt1.lat = calculateDestination(pt1.lat, pt1.lng, halfWidth, (bearing + 90) % 360).lat;
  pt1.lng = calculateDestination(pt1.lat, pt1.lng, halfWidth, (bearing + 90) % 360).lng;
  
  const pt2 = calculateDestination(centerLat, centerLon, halfLength, bearing);
  pt2.lat = calculateDestination(pt2.lat, pt2.lng, halfWidth, (bearing + 270) % 360).lat;
  pt2.lng = calculateDestination(pt2.lat, pt2.lng, halfWidth, (bearing + 270) % 360).lng;
  
  const pt3 = calculateDestination(centerLat, centerLon, halfLength, (bearing + 180) % 360);
  pt3.lat = calculateDestination(pt3.lat, pt3.lng, halfWidth, (bearing + 270) % 360).lat;
  pt3.lng = calculateDestination(pt3.lat, pt3.lng, halfWidth, (bearing + 270) % 360).lng;
  
  const pt4 = calculateDestination(centerLat, centerLon, halfLength, (bearing + 180) % 360);
  pt4.lat = calculateDestination(pt4.lat, pt4.lng, halfWidth, (bearing + 90) % 360).lat;
  pt4.lng = calculateDestination(pt4.lat, pt4.lng, halfWidth, (bearing + 90) % 360).lng;
  
  points.push(pt1, pt2, pt3, pt4);
  
  // Create and return the polygon
  return L.polygon(points, { color: "red" });
}

// Export all functions if in a module environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    // Global variables
    polygonModalOpen,
    roadDrawingMode,
    currentRoadPoints,
    currentRoadLayer,
    roadDirection,
    definedRoadArea,
    roadCoordinates,
    roadLanes,
    laneMarkers,
    polygonDrawingMode,
    currentPolygonPoints,
    currentPolygonLayer,
    drawnPolygons,
    allMarkers,
    
    // Functions
    createInteractiveMarker,
    placeMarkerIfInRoad,
    startRoadDrawing,
    startPolygonDrawing,
    analyzeLocation,
    determineWorkZoneType,
    createConstructionZonePolygon
  };
}