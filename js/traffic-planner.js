/**
 * AI Traffic Safety Planner - Core AI algorithms for planning construction zones
 * Handles placement of various traffic control devices according to Winnipeg regulations
 */

// Global container to track all traffic control elements
const trafficControlElements = {
  signs: [],
  cones: [],
  barricades: [],
  barrels: [],
  arrowBoards: [],
  flagpersons: [],
  delineators: []
};

// Define custom icons for different traffic control objects
const tcIcons = {
  // Warning signs (TC series)
  "TC-1": L.divIcon({
    className: 'tc-sign',
    html: `<div style="background-color: orange; border: 2px solid black; color: black; width: 35px; height: 35px; display: flex; justify-content: center; align-items: center; font-weight: bold; border-radius: 3px;">TC-1</div>`,
    iconSize: [39, 39],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  }),
  "TC-2": L.divIcon({
    className: 'tc-sign',
    html: `<div style="background-color: orange; border: 2px solid black; color: black; width: 35px; height: 35px; display: flex; justify-content: center; align-items: center; font-weight: bold; border-radius: 3px;">TC-2</div>`,
    iconSize: [39, 39],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  }),
  "TC-5": L.divIcon({
    className: 'tc-sign',
    html: `<div style="background-color: orange; border: 2px solid black; color: black; width: 35px; height: 35px; display: flex; justify-content: center; align-items: center; font-weight: bold; border-radius: 3px;">TC-5</div>`,
    iconSize: [39, 39],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  }),
  
  // Regulatory signs (RB series)
  "RB-1": L.divIcon({
    className: 'rb-sign',
    html: `<div style="background-color: white; border: 2px solid red; color: red; width: 35px; height: 35px; display: flex; justify-content: center; align-items: center; font-weight: bold; border-radius: 18px;">STOP</div>`,
    iconSize: [39, 39],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  }),
  "RB-25": L.divIcon({
    className: 'rb-sign',
    html: `<div style="background-color: white; border: 2px solid black; color: black; width: 35px; height: 35px; display: flex; justify-content: center; align-items: center; font-weight: bold; border-radius: 3px;">➡️</div>`,
    iconSize: [39, 39],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  }),
  "RB-31": L.divIcon({
    className: 'rb-sign',
    html: `<div style="background-color: white; border: 2px solid red; color: red; width: 35px; height: 35px; display: flex; justify-content: center; align-items: center; font-weight: bold; border-radius: 18px;">⛔</div>`,
    iconSize: [39, 39],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  }),
  
  // Traffic control devices
  "cone": L.divIcon({
    className: 'tc-cone',
    html: `<div style="width: 0; height: 0; border-left: 7px solid transparent; border-right: 7px solid transparent; border-bottom: 15px solid orange;"></div>`,
    iconSize: [15, 15],
    iconAnchor: [7, 15],
    popupAnchor: [0, -15]
  }),
  "barrel": L.divIcon({
    className: 'tc-barrel',
    html: `<div style="width: 20px; height: 22px; background: repeating-linear-gradient(0deg, orange, orange 5px, #fff 5px, #fff 10px); border-radius: 10px;"></div>`,
    iconSize: [20, 22],
    iconAnchor: [10, 22],
    popupAnchor: [0, -22]
  }),
  "barricade": L.divIcon({
    className: 'tc-barricade',
    html: `<div style="width: 30px; height: 15px; background: repeating-linear-gradient(45deg, orange, orange 5px, black 5px, black 10px); border: 1px solid black;"></div>`,
    iconSize: [32, 17],
    iconAnchor: [16, 8],
    popupAnchor: [0, -8]
  }),
  "arrowBoard": L.divIcon({
    className: 'tc-arrow-board',
    html: `<div style="width: 40px; height: 25px; background: black; border: 1px solid #333; display: flex; justify-content: center; align-items: center; color: yellow; font-size: 18px;">→</div>`,
    iconSize: [42, 27],
    iconAnchor: [21, 13],
    popupAnchor: [0, -13]
  }),
  "flashingArrowL": L.divIcon({
    className: 'tc-arrow-board',
    html: `<div style="width: 40px; height: 25px; background: black; border: 1px solid #333; display: flex; justify-content: center; align-items: center; color: yellow; font-size: 18px;">←</div>`,
    iconSize: [42, 27],
    iconAnchor: [21, 13],
    popupAnchor: [0, -13]
  }),
  "flagperson": L.divIcon({
    className: 'tc-flagperson',
    html: `<div style="width: 20px; height: 30px; background-color: yellow; border: 1px solid black; display: flex; justify-content: center; align-items: center; font-weight: bold; font-size: 11px;">FP</div>`,
    iconSize: [22, 32],
    iconAnchor: [11, 32],
    popupAnchor: [0, -32]
  }),
  "delineator": L.divIcon({
    className: 'tc-delineator',
    html: `<div style="width: 10px; height: 20px; background-color: orange; border: 1px solid black;"></div>`,
    iconSize: [12, 22],
    iconAnchor: [6, 22],
    popupAnchor: [0, -22]
  })
};

/**
 * Creates a traffic control device marker
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {string} type - Type of device (e.g., "TC-2", "cone", etc.)
 * @param {string} tooltip - Tooltip text
 * @param {string} category - Category for organization (signs, cones, etc.)
 * @returns {L.Marker} The created marker
 */
function createTrafficControlDevice(lat, lng, type, tooltip, category = "signs") {
  // Create the marker with the appropriate icon
  const marker = L.marker([lat, lng], {
    icon: tcIcons[type] || L.divIcon({
      className: 'tc-default',
      html: `<div style="background-color: #ff8800; width: 20px; height: 20px; border-radius: 10px; border: 1px solid black;"></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    }),
    draggable: true, // Make devices draggable for fine-tuning
    deviceType: type
  }).addTo(map);
  
  // Add tooltip and popup
  marker.bindTooltip(tooltip);
  marker.bindPopup(`<b>${type}</b><br>${tooltip}`);
  
  // Track the marker in the global array and by category
  allMarkers.push(marker);
  
  // Add to the appropriate category in trafficControlElements
  if (trafficControlElements[category]) {
    trafficControlElements[category].push(marker);
  }
  
  return marker;
}

/**
 * Places traffic control devices according to Winnipeg Manual regulations
 * @param {Object} polygon - The construction zone polygon
 * @param {String} roadType - Type of road (e.g., "regional", "residential", "collector")
 * @param {Number} speedLimit - Speed limit in km/h (50, 60, 70, 80, 90)
 * @param {Number} lanesClosed - Number of lanes closed
 * @param {Number} roadDirection - Direction of road in degrees
 */
function placeTrafficControlDevices(polygon, roadType, speedLimit, lanesClosed = 1, roadDirection = 0) {
  // Clear existing traffic control elements if needed
  clearTrafficControlElements();
  
  if (!polygon || !roadType || !speedLimit) {
    console.error("Missing required parameters for traffic control device placement");
    return [];
  }

  // Get polygon bounds to calculate work zone dimensions
  const bounds = polygon.getBounds();
  const center = bounds.getCenter();
  const northEast = bounds.getNorthEast();
  const southWest = bounds.getSouthWest();
  
  // Determine the approach and departure points
  const roadDirectionRad = roadDirection * Math.PI / 180;
  const approachDirection = (roadDirection + 180) % 360;
  
  // Calculate approach and departure points using the road direction
  const approachPoint = calculateDestination(
    center.lat, center.lng,
    200, // Start well outside the work zone
    approachDirection
  );
  
  const departurePoint = calculateDestination(
    center.lat, center.lng,
    200, 
    roadDirection
  );
  
  // Determine configuration parameters based on road type and speed
  let taperLength, coneSpacing, advanceWarningDistance, bufferZone;
  
  if (roadType === "regional" || speedLimit > 60) {
    // High-speed configuration
    taperLength = speedLimit; // 1m per km/h of speed limit
    coneSpacing = Math.max(8, taperLength / 12); // min 12 cones per taper
    advanceWarningDistance = 150; // 150m warning distance
    bufferZone = 30; // 30m buffer zone
  } else if (roadType === "collector" || speedLimit === 60) {
    // Medium-speed configuration
    taperLength = Math.max(60, speedLimit * 0.8); // 0.8m per km/h of speed
    coneSpacing = Math.max(6, taperLength / 10); // min 10 cones per taper
    advanceWarningDistance = 100; // 100m warning distance
    bufferZone = 20; // 20m buffer zone
  } else {
    // Low-speed configuration (residential)
    taperLength = Math.max(30, speedLimit * 0.6); // 0.6m per km/h of speed
    coneSpacing = Math.max(5, taperLength / 8); // min 8 cones per taper
    advanceWarningDistance = 75; // 75m warning distance 
    bufferZone = 15; // 15m buffer zone
  }

  // Store all created markers
  const placedMarkers = [];
  
  // 1. PLACE ADVANCE WARNING SIGNS
  // ==================================

  // TC-1 (Construction Ahead) at furthest distance
  const tc1Point = calculateDestination(
    approachPoint.lat, approachPoint.lng,
    advanceWarningDistance * 2,
    roadDirection // Toward the work zone
  );
  
  const tc1Sign = createTrafficControlDevice(
    tc1Point.lat, tc1Point.lng,
    "TC-1",
    "TC-1: Construction Ahead",
    "signs"
  );
  placedMarkers.push(tc1Sign);

  // TC-2 (Roadwork Ahead) at mid distance
  const tc2Point = calculateDestination(
    approachPoint.lat, approachPoint.lng,
    advanceWarningDistance,
    roadDirection
  );
  
  const tc2Sign = createTrafficControlDevice(
    tc2Point.lat, tc2Point.lng,
    "TC-2",
    "TC-2: Roadwork Ahead",
    "signs"
  );
  placedMarkers.push(tc2Sign);

  // TC-5 (Lane Ends) for higher speed roads
  if (speedLimit >= 60 || roadType === "regional") {
    const tc5Point = calculateDestination(
      approachPoint.lat, approachPoint.lng,
      advanceWarningDistance * 1.5,
      roadDirection
    );
    
    const tc5Sign = createTrafficControlDevice(
      tc5Point.lat, tc5Point.lng,
      "TC-5",
      "TC-5: Lane Ends",
      "signs"
    );
    placedMarkers.push(tc5Sign);
  }

  // Keep Right sign before the taper
  const rb25Point = calculateDestination(
    approachPoint.lat, approachPoint.lng,
    advanceWarningDistance * 0.5,
    roadDirection
  );
  
  const rb25Sign = createTrafficControlDevice(
    rb25Point.lat, rb25Point.lng,
    "RB-25",
    "RB-25: Keep Right",
    "signs"
  );
  placedMarkers.push(rb25Sign);

  // 2. PLACE TAPER CONES/BARRELS
  // ===============================
  
  // Calculate the taper start point
  const taperStartPoint = calculateDestination(
    approachPoint.lat, approachPoint.lng,
    advanceWarningDistance * 0.3, // Just past the RB-25 sign
    roadDirection
  );
  
  // Place channelization devices along the taper
  const numTaperDevices = Math.ceil(taperLength / coneSpacing);
  const taperOffsetBearing = (roadDirection + 90) % 360; // Perpendicular to road
  const laneWidth = 3.7 * lanesClosed; // Typical lane width is 3.7m
  
  // Create the taper with barrels at start and end, cones in between
  for (let i = 0; i < numTaperDevices; i++) {
    // Calculate position along the taper
    const distanceAlongTaper = (i / (numTaperDevices - 1)) * taperLength;
    const offsetDistance = (i / (numTaperDevices - 1)) * laneWidth;
    
    // Position along the road
    const devicePoint = calculateDestination(
      taperStartPoint.lat, taperStartPoint.lng,
      distanceAlongTaper,
      roadDirection
    );
    
    // Offset perpendicular to road
    const offsetPoint = calculateDestination(
      devicePoint.lat, devicePoint.lng,
      offsetDistance,
      taperOffsetBearing
    );
    
    // Place appropriate device based on position
    let deviceType, deviceTooltip, deviceCategory;
    
    if (i === 0 || i === numTaperDevices - 1) {
      // Use barrels at start and end points
      deviceType = "barrel";
      deviceTooltip = "Channelization Barrel";
      deviceCategory = "barrels";
    } else {
      // Use cones for intermediate points
      deviceType = "cone";
      deviceTooltip = "Traffic Cone";
      deviceCategory = "cones";
    }
    
    const taperDevice = createTrafficControlDevice(
      offsetPoint.lat, offsetPoint.lng,
      deviceType,
      deviceTooltip,
      deviceCategory
    );
    placedMarkers.push(taperDevice);
  }

  // 3. PLACE ARROW BOARD
  // =======================
  
  // Place arrow board at the start of the taper for high-speed roads
  if (speedLimit >= 60 || roadType === "regional") {
    const arrowBoardPoint = calculateDestination(
      taperStartPoint.lat, taperStartPoint.lng,
      taperLength * 0.3, // 1/3 along the taper
      roadDirection
    );
    
    // Offset to the right
    const arrowBoardOffset = calculateDestination(
      arrowBoardPoint.lat, arrowBoardPoint.lng,
      laneWidth * 0.5, // Half lane width
      taperOffsetBearing
    );
    
    const arrowBoard = createTrafficControlDevice(
      arrowBoardOffset.lat, arrowBoardOffset.lng,
      "arrowBoard",
      "Flashing Arrow Board",
      "arrowBoards"
    );
    placedMarkers.push(arrowBoard);
  }

  // 4. PLACE WORK ZONE DELINEATION
  // ===============================
  
  // Get the polygon points
  const polyPoints = polygon.getLatLngs()[0];
  const polyLength = polyPoints.length;
  
  // Add delineators around the work zone (construction area)
  // We'll place delineators more densely along the side closest to traffic
  for (let i = 0; i < polyLength; i++) {
    const currentPoint = polyPoints[i];
    const nextPoint = polyPoints[(i+1) % polyLength];
    
    // Calculate distance and bearing between these two points
    const segmentDistance = calculateDistance(
      currentPoint.lat, currentPoint.lng,
      nextPoint.lat, nextPoint.lng
    );
    
    const segmentBearing = calculateBearing(
      currentPoint.lat, currentPoint.lng,
      nextPoint.lat, nextPoint.lng
    );
    
    // Calculate number of delineators for this segment
    // Use closer spacing for segments facing traffic
    const bearingDiff = Math.abs(((segmentBearing - roadDirection) + 180) % 360 - 180);
    const isFacingTraffic = bearingDiff < 45 || bearingDiff > 135;
    
    // Delineator spacing depends on whether this segment faces traffic
    const delineatorSpacing = isFacingTraffic ? 5 : 10; // meters
    const numDelineators = Math.max(2, Math.floor(segmentDistance / delineatorSpacing));
    
    // Place delineators along this segment
    for (let j = 0; j <= numDelineators; j++) {
      // Skip endpoints to avoid duplicate delineators where segments meet
      if ((j === 0 || j === numDelineators) && j !== 1) continue;
      
      const ratio = j / numDelineators;
      const delineatorLat = currentPoint.lat + ratio * (nextPoint.lat - currentPoint.lat);
      const delineatorLng = currentPoint.lng + ratio * (nextPoint.lng - currentPoint.lng);
      
      // Create the delineator
      const delineator = createTrafficControlDevice(
        delineatorLat, delineatorLng,
        "delineator",
        "Work Area Delineator",
        "delineators"
      );
      placedMarkers.push(delineator);
    }
  }
  
  // 5. PLACE END WORK ZONE DEVICES
  // ===============================
  
  // Calculate end of work zone
  const workZoneEndPoint = calculateDestination(
    departurePoint.lat, departurePoint.lng,
    50, // 50m past the work zone
    approachDirection // Back toward the approach
  );
  
  // RB-31 (End Construction) sign
  const endSign = createTrafficControlDevice(
    workZoneEndPoint.lat, workZoneEndPoint.lng,
    "RB-31",
    "RB-31: End Construction Zone",
    "signs"
  );
  placedMarkers.push(endSign);
  
  // Add flagperson(s) if required by the speed or road type
  if (speedLimit >= 70 || roadType === "regional") {
    // Place flagperson at start of work zone
    const flagpersonPoint = calculateDestination(
      taperStartPoint.lat, taperStartPoint.lng,
      taperLength + 10, // Just past the taper
      roadDirection
    );
    
    // Offset to the right side of the lane
    const flagpersonOffset = calculateDestination(
      flagpersonPoint.lat, flagpersonPoint.lng,
      laneWidth * 0.7, // 70% of lane width
      taperOffsetBearing
    );
    
    const flagperson = createTrafficControlDevice(
      flagpersonOffset.lat, flagpersonOffset.lng,
      "flagperson",
      "Flagperson",
      "flagpersons"
    );
    placedMarkers.push(flagperson);
  }

  console.log(`Placed ${placedMarkers.length} traffic control devices for ${roadType} road with ${speedLimit} km/h speed limit`);
  return placedMarkers;
}

/**
 * Clears all traffic control elements from the map
 */
function clearTrafficControlElements() {
  // Remove elements by category
  Object.keys(trafficControlElements).forEach(category => {
    trafficControlElements[category].forEach(marker => {
      if (marker && map) {
        map.removeLayer(marker);
        // Also remove from allMarkers
        const index = allMarkers.indexOf(marker);
        if (index !== -1) {
          allMarkers.splice(index, 1);
        }
      }
    });
    trafficControlElements[category] = [];
  });
}

/**
 * Main function to automatically plan a construction zone layout
 * @param {L.Polygon} polygon - The work zone polygon
 * @param {string} roadType - Type of road ("regional", "collector", "residential")
 * @param {string} workZoneType - Type of work zone configuration
 * @returns {Array} Array of created markers
 */
function aiPlanConstructionZone(polygon, roadType = "residential", workZoneType = "TC2") {
  if (!polygon) {
    console.error("No polygon provided for construction zone planning");
    return [];
  }
  
  // Determine speed limit based on road type
  let speedLimit;
  switch(roadType.toLowerCase()) {
    case "regional":
      speedLimit = 70;
      break;
    case "collector":
      speedLimit = 60;
      break;
    default: // residential or other
      speedLimit = 50;
      break;
  }
  
  // Get road direction from your existing road direction variable
  const direction = window.roadDirection || 0;
  
  // Determine lanes closed based on work zone type
  let lanesClosed = 1; // Default
  if (workZoneType === "TC7") {
    lanesClosed = 2; // Full lane closure
  }
  
  // Place traffic control devices
  const placedMarkers = placeTrafficControlDevices(
    polygon, 
    roadType, 
    speedLimit, 
    lanesClosed, 
    direction
  );
  
  // Show success message
  if (placedMarkers.length > 0) {
    alert(`Construction zone layout complete with ${placedMarkers.length} traffic control devices according to Winnipeg regulations for a ${roadType} road.`);
  }
  
  return placedMarkers;
}

// Traffic control regulations based on Winnipeg manual
const REGULATIONS = {
  workZoneTypes: {
    TC2: {
      name: "TC-2 Roadwork",
      description: "Short duration work zone",
      requiredSigns: ["TC-1", "TC-2", "TC-4"],
      coneSpacing: 5, // meters
      advanceWarningDistance: 100 // meters
    },
    TC3: {
      name: "TC-3 Work Area",
      description: "Extended duration work zone",
      requiredSigns: ["TC-1", "TC-3", "TC-4", "TC-36"],
      coneSpacing: 3, // meters
      advanceWarningDistance: 150 // meters
    },
    TC7: {
      name: "TC-7 Lane Closure",
      description: "Lane closure configuration",
      requiredSigns: ["TC-1", "TC-2", "TC-7", "TC-4"],
      coneSpacing: 2, // meters
      advanceWarningDistance: 200 // meters
    }
  },
  signs: {
    "TC-1": {
      name: "Construction Ahead",
      distance: 150 // meters from work zone
    },
    "TC-2": {
      name: "Roadwork",
      distance: 100 // meters from work zone
    },
    "TC-3": {
      name: "Work Area",
      distance: 75 // meters from work zone
    },
    "TC-4": {
      name: "End Construction",
      distance: 50 // meters after work zone
    },
    "TC-7": {
      name: "Lane Closed",
      distance: 75 // meters from work zone
    },
    "TC-36": {
      name: "Keep Right",
      distance: 10 // meters from work zone
    },
    "TC-63": {
      name: "Channelization Barrel",
      spacing: 5 // meters
    }
  },
  roadTypes: {
    residential: {
      speedLimit: 50, // km/h
      bufferZone: 15, // meters
      signageMultiplier: 1
    },
    collector: {
      speedLimit: 60, // km/h
      bufferZone: 20, // meters
      signageMultiplier: 1.2
    },
    regional: {
      speedLimit: 70, // km/h
      bufferZone: 30, // meters
      signageMultiplier: 1.5
    },
    highway: {
      speedLimit: 100, // km/h
      bufferZone: 50, // meters
      signageMultiplier: 2
    }
  }
};

/**
 * Checks if traffic control plan complies with Winnipeg regulations
 * @returns {Object} Compliance status and issues
 */
function checkCompliance() {
  if (drawnPolygons.length === 0) {
    return {
      isCompliant: false,
      issues: ["No construction zone defined"]
    };
  }
  
  // Issues array to track compliance problems
  const issues = [];
  
  // Count devices by type
  const deviceCount = {};
  
  // Map marker popup content to device types
  allMarkers.forEach(marker => {
    if (marker && marker.getPopup) {
      const content = marker.getPopup() ? marker.getPopup().getContent() : "";
      // Extract device type from popup content
      let deviceType = "unknown";
      
      if (content.includes("TC-1")) deviceType = "TC-1";
      else if (content.includes("TC-2")) deviceType = "TC-2";
      else if (content.includes("TC-5")) deviceType = "TC-5";
      else if (content.includes("RB-25")) deviceType = "RB-25";
      else if (content.includes("RB-31")) deviceType = "RB-31";
      else if (content.includes("Cone")) deviceType = "cone";
      else if (content.includes("Barrel")) deviceType = "barrel";
      else if (content.includes("Arrow Board")) deviceType = "arrowBoard";
      else if (content.includes("Flagperson")) deviceType = "flagperson";
      else if (content.includes("Delineator")) deviceType = "delineator";
      
      deviceCount[deviceType] = (deviceCount[deviceType] || 0) + 1;
    }
  });
  
  // Check if there are any markers at all
  if (allMarkers.length === 0) {
    issues.push("No traffic control elements placed");
  }
  
  // Check for minimum required signs
  if (!deviceCount["TC-1"] || deviceCount["TC-1"] < 1) {
    issues.push("Missing TC-1 (Construction Ahead) warning sign");
  }
  
  if (!deviceCount["TC-2"] || deviceCount["TC-2"] < 1) {
    issues.push("Missing TC-2 (Roadwork) warning sign");
  }
  
  // Check for appropriate end sign
  if (!deviceCount["RB-31"] || deviceCount["RB-31"] < 1) {
    issues.push("Missing RB-31 (End Construction) sign");
  }
  
  // Check cones/pylons placement
  if ((!deviceCount["cone"] || deviceCount["cone"] < 4) && 
      (!deviceCount["barrel"] || deviceCount["barrel"] < 2)) {
    issues.push("Insufficient traffic cones/barrels for proper taper");
  }
  
  return {
    isCompliant: issues.length === 0,
    issues: issues
  };
}

// Export all functions if in a module environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    trafficControlElements,
    tcIcons,
    createTrafficControlDevice,
    placeTrafficControlDevices,
    clearTrafficControlElements,
    aiPlanConstructionZone,
    REGULATIONS,
    checkCompliance
  };
}