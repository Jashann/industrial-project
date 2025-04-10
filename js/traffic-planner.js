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

<<<<<<< HEAD
/**
 * Provide AI recommendations for fixing compliance issues
 * 
 * @param {Array} issues - Array of compliance issues
 * @returns {Promise<void>}
 */
async function aiRecommendFixes(issues) {
  if (issues.length === 0) return;
  
  // This function is commented out to disable AI recommendations
  alert("Compliance check complete. Please manually add required traffic control elements.");
  return;
  
  /* Original AI recommendation code commented out
  let recommendations = [];
  
  // Generate recommendations based on issue type
  issues.forEach(issue => {
    if (issue.includes("Missing required sign")) {
      const signType = issue.split(": ")[1];
      recommendations.push(`Add ${signType} sign at appropriate distance from work zone`);
    } 
    else if (issue.includes("Insufficient traffic cones")) {
      recommendations.push("Add more traffic cones around the perimeter of work zone (minimum 4)");
    }
    else if (issue.includes("Missing channelization barrels")) {
      recommendations.push("Add channelization barrels at corners of work zone");
    }
    else if (issue.includes("No construction zone")) {
      recommendations.push("Create a construction zone by using the 'Select Area' button");
    }
    else if (issue.includes("No traffic control elements")) {
      recommendations.push("Add traffic control elements using AI-assisted planning");
    }
  });
  
  // Ask user if they want AI to automatically fix the issues
  const autoFix = await customConfirm(
    `AI Recommendations:\n\n${recommendations.join('\n')}\n\nWould you like AI to automatically fix these issues?`
  );
  
  if (autoFix) {
    // For illustration, let's implement a basic auto-fix for some common issues
    
    // If no construction zone, we can't do much else
    if (issues.includes("No construction zone defined")) {
      alert("Please create a construction zone first using the 'Select Area' button.");
      return;
    }
    
    // If no markers or missing specific elements, use aiPlanConstructionZone to regenerate all elements
    if (allMarkers.length === 0 || 
        issues.some(i => i.includes("Missing required sign") || 
                         i.includes("Insufficient traffic cones") || 
                         i.includes("Missing channelization"))) {
      
      // Get the first construction zone polygon
      const constructionZone = drawnPolygons[0];
      
      // Determine road type (simplified - in real implementation, would analyze map data)
      const roadType = "residential";
      
      // Perform AI-based planning
      const createdMarkers = aiPlanConstructionZone(constructionZone, roadType, "TC2");
      
      // Create a bounding group of all elements and fit the map to it
      const allElements = [constructionZone, ...createdMarkers];
      const group = L.featureGroup(allElements);
      map.fitBounds(group.getBounds().pad(0.2));
      
      alert(`AI auto-fix complete! Added ${createdMarkers.length} traffic control elements.`);
    }
  }
  */
}

/**
 * Function to try placing a marker only if inside road area
 * Helper function for aiPlanConstructionZone
 * 
 * @param {number} lat - Latitude for marker
 * @param {number} lng - Longitude for marker 
 * @param {string} label - Label/content for marker
 * @param {Array} placedMarkers - Array to add placed markers to
 * @param {Array} newMarkers - Array to add new markers to
 * @returns {L.Marker|null} The created marker or null if not placed
 */
function tryPlaceMarker(lat, lng, label, placedMarkers, newMarkers) {
  // Check if inside the road area if one is defined
  if (window.definedRoadArea) {
    // Use the visualize parameter to debug placement issues
    const pointIsInRoad = isPointInPolygon({lat, lng}, window.definedRoadArea, true);
    
    if (pointIsInRoad) {
      const marker = createInteractiveMarker(lat, lng, label);
      placedMarkers.push(marker);
      return marker;
    }
    // Add a debug message when a marker can't be placed
    console.log(`Can't place ${label} at [${lat}, ${lng}] - outside road area`);
    return null;
  } else {
    // If no road area defined, place marker without restrictions
    const marker = createInteractiveMarker(lat, lng, label);
    placedMarkers.push(marker);
    return marker;
  }
}

/**
 * Automatically plan a construction zone based on AI analysis
 * 
 * @param {L.Polygon} polygon - The work zone polygon
 * @param {string} roadType - Type of road (residential, collector, arterial, highway)
 * @param {string} workZoneType - Type of work zone (TC2, TC3, TC7)
 * @returns {Array} Array of created markers
 */
function aiPlanConstructionZone(polygon, roadType = "residential", workZoneType = "TC2") {
  // Get the polygon bounds to find its center
  const bounds = polygon.getBounds();
  const center = bounds.getCenter();
  
  // Get the corners of the work area (polygon)
  const polygonPoints = polygon.getLatLngs()[0];
  
  // Use the road direction if defined
  let bearing = window.roadDirection;
  // if (bearing === 0 && polygonPoints.length > 1) {
  //   bearing = calculateBearing(
  //     polygonPoints[0].lat, 
  //     polygonPoints[0].lng, 
  //     polygonPoints[1].lat, 
  //     polygonPoints[1].lng
  //   );
  // }
  
  // Arrays to track markers
  const newMarkers = [];
  const placedMarkers = [];
  
  // Create a vector for the road direction
  // Adjust bearing so 0 degrees is straight right (east) along the x-axis
  // In standard bearing, 0° is north, 90° is east - we need to adjust this
  directionalVectors = [];
  for (let i = 0; i < 10; i++) {
    const bearingRad = (-(i*45) * Math.PI) / 180;
    const directionVector = {
      x: Math.cos(bearingRad),
      y: Math.sin(bearingRad)  // Note: We use sin for y to follow right-hand coordinate system
    };
    
    directionalVectors.push(directionVector);
  }

  // Place 3 points in a straight line in the direction of the road
  const spacing = 0.0007; // Spacing between points (adjust as needed)
  for (let j = 0; j < 10; j++) {
    for (let i = 0; i < 10; i++) {
      // Calculate position for each point
      const pointLat = center.lat + (directionVectors[j].y * spacing * i);
      const pointLng = center.lng + (directionVectors[j].x * spacing * i);
      
      // Create a marker
      const pointMarker = createInteractiveMarker(
        pointLat, 
        pointLng, 
        `Road Point ${i+1}`
      );
      
      placedMarkers.push(pointMarker);
      newMarkers.push(pointMarker);
    }
  }
  
  // Update the allMarkers array with placed markers
  window.allMarkers = window.allMarkers.concat(placedMarkers);
  
  // Return the array of created markers
  return newMarkers;
  
  // Original AI fill feature commented out below
  /*
  // Get appropriate regulations for the work zone and road type
  const zoneConfig = REGULATIONS.workZoneTypes[workZoneType];
  const roadConfig = REGULATIONS.roadTypes[roadType];
  
  // Use vector-based approach for sign placement
  console.log("Using vector-based approach for sign placement");
  
  // 1. Create a vector from the direction specified by the user
  // Convert degrees to radians for calculations
  // In mapping, 0° is north, 90° is east, etc., but in vector math:
  // - x increases to the east (90°)
  // - y increases to the north (0°)
  const bearingRad = (bearing * Math.PI) / 180;
  const v1 = {
    // For a bearing angle, x is sin(angle) and y is cos(angle)
    // But we need to negate y because map coordinates increase southward
    x: Math.sin(bearingRad),
    y: -Math.cos(bearingRad)  // Negative because y increases southward on maps
  };
  
  // 2. Analyze the work zone polygon to find the edge that best aligns with the road direction
  // Extract actual corner points from the polygon
  const corners = polygonPoints;
  
  // Need at least 3 points to form a polygon
  if (corners.length < 3) {
    console.error("Work zone doesn't have enough points");
    
    // Add label at center and return
    const mainMarker = tryPlaceMarker(
      center.lat, center.lng, 
      `Work Zone (${window.roadLanes} lanes) - Need more points`,
      placedMarkers,
      newMarkers
    );
    if (mainMarker) newMarkers.push(mainMarker);
    
    return newMarkers;
  }
  
  // 3. Compute vectors between adjacent corners
  const vectors = [];
  for (let i = 0; i < corners.length; i++) {
    const p1 = corners[i];
    const p2 = corners[(i + 1) % corners.length];
    
    // Create a vector from p1 to p2
    const vector = {
      p1: p1,
      p2: p2,
      dx: p2.lng - p1.lng,
      dy: p2.lat - p1.lat
    };
    
    // Normalize the vector
    const length = Math.sqrt(vector.dx * vector.dx + vector.dy * vector.dy);
    vector.dx = vector.dx / length;
    vector.dy = vector.dy / length;
    
    vectors.push(vector);
  }
  
  // 4. Find the vector that best aligns with v1 using dot product (cosine similarity)
  let bestAlignment = -Infinity;
  let bestVector = null;
  let bestVectorIndex = -1;
  
  vectors.forEach((vector, index) => {
    // Calculate dot product (v1 • v2)
    const dotProduct = (v1.x * vector.dx) + (v1.y * vector.dy);
    
    // We actually want the vector aligned with or opposite to v1
    const alignment = Math.abs(dotProduct);
    
    if (alignment > bestAlignment) {
      bestAlignment = alignment;
      bestVector = vector;
      bestVectorIndex = index;
    }
  });
  
  // Marker to show the work area
  const workZoneMarker = tryPlaceMarker(
    center.lat, center.lng, 
    `Work Zone (${roadConfig.speedLimit} km/h, ${window.roadLanes} lanes)`,
    placedMarkers,
    newMarkers
  );
  if (workZoneMarker) newMarkers.push(workZoneMarker);
  
  // If we found a well-aligned vector
  if (bestVector) {
    // Determine the actual direction of traffic based on the sign convention
    // dot product > 0 means vectors point in similar direction
    const dotProduct = (v1.x * bestVector.dx) + (v1.y * bestVector.dy);
    
    // Determine the starting point for sign placement
    // We'll use the second point (p2) of the best vector as our reference
    const startPoint = bestVector.p2;
    
    // Calculate perpendicular vector for sign placement
    // Make sure it points toward the road area (not away from it)
    const perpVector1 = {
      x: -bestVector.dy, // Perpendicular option 1: (-dy, dx)
      y: bestVector.dx
    };
    
    const perpVector2 = {
      x: bestVector.dy, // Perpendicular option 2: (dy, -dx)
      y: -bestVector.dx
    };
    
    // Test points in both directions to see which is more likely to be in the road
    const testDist = 0.0005; // Small test distance
    const testPoint1 = {
      lat: startPoint.lat + perpVector1.y * testDist,
      lng: startPoint.lng + perpVector1.x * testDist
    };
    
    const testPoint2 = {
      lat: startPoint.lat + perpVector2.y * testDist,
      lng: startPoint.lng + perpVector2.x * testDist
    };
    
    // Determine which perpendicular vector to use
    let perpVector = perpVector1;
    
    // If we have a road area, check which point is inside it
    if (window.definedRoadArea) {
      const isPoint1InRoad = isPointInPolygon(testPoint1, window.definedRoadArea);
      const isPoint2InRoad = isPointInPolygon(testPoint2, window.definedRoadArea);
      
      // If one point is in the road and the other isn't, choose the one in the road
      if (isPoint1InRoad && !isPoint2InRoad) {
        perpVector = perpVector1;
        console.log("Using perpendicular vector 1 (inside road)");
      } else if (!isPoint1InRoad && isPoint2InRoad) {
        perpVector = perpVector2;
        console.log("Using perpendicular vector 2 (inside road)");
      } else {
        // If both or neither are in the road, use dot product with road direction
        // to determine which is more aligned with the intended direction
        const dot1 = (perpVector1.x * v1.x) + (perpVector1.y * v1.y);
        const dot2 = (perpVector2.x * v1.x) + (perpVector2.y * v1.y);
        
        if (Math.abs(dot1) < Math.abs(dot2)) {
          perpVector = perpVector1;
          console.log("Using perpendicular vector 1 (better aligned)");
        } else {
          perpVector = perpVector2;
          console.log("Using perpendicular vector 2 (better aligned)");
        }
      }
    }
    
    // Calculate the sign direction
    const signDirRad = Math.atan2(perpVector.y, perpVector.x);
    const signDirDeg = (signDirRad * 180 / Math.PI + 360) % 360;
    
    // Calculate the spacing between signs (evenly spaced)
    const totalSignDistance = 150; // Place signs over 150 meters
    const numSigns = 4; // Four signs to place: TC-63, RB-25L, TC-5R, TC-2
    const signSpacing = totalSignDistance / (numSigns - 1);
    
    // Sign placements in the specified order
    const signs = [
      { name: "TC-63", label: "Channelization Barrel", distance: 0 },
      { name: "RB-25L", label: "Keep Left Sign", distance: signSpacing },
      { name: "TC-5R", label: "Barricade - Right Corner", distance: signSpacing * 2 },
      { name: "TC-2", label: "Roadwork Sign", distance: signSpacing * 3 }
    ];
    
    // Place each sign
    signs.forEach((sign, index) => {
      const signPoint = calculateDestination(
        startPoint.lat, startPoint.lng,
        sign.distance, signDirDeg
      );
      
      const signMarker = tryPlaceMarker(
        signPoint.lat, signPoint.lng,
        `${sign.name} - ${sign.label} (${Math.round(sign.distance)}m)`,
        placedMarkers,
        newMarkers
      );
      
      if (signMarker) newMarkers.push(signMarker);
    });
    
    // Place markers at each corner of the work zone for clarity
    corners.forEach((corner, index) => {
      const cornerMarker = tryPlaceMarker(
        corner.lat, corner.lng,
        `Corner ${index + 1}${index === bestVectorIndex ? " (Start)" : ""}`,
        placedMarkers,
        newMarkers
      );
      
      if (cornerMarker) newMarkers.push(cornerMarker);
    });
    
    // Add additional cones around the work zone perimeter
    const coneSpacing = zoneConfig.coneSpacing;
    
    // Place cones around the construction zone perimeter
    for (let i = 0; i < polygonPoints.length; i++) {
      const p1 = polygonPoints[i];
      const p2 = polygonPoints[(i + 1) % polygonPoints.length];
      
      // Calculate distance between points
      const segmentDistance = calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);
      const segmentBearing = calculateBearing(p1.lat, p1.lng, p2.lat, p2.lng);
      
      // Determine number of cones for this segment
      const numCones = Math.max(1, Math.floor(segmentDistance / coneSpacing));
      
      // Place cones along the segment
      for (let j = 0; j <= numCones; j++) {
        // Skip the start point of segments after the first to avoid duplicates
        if (j === 0 && i > 0) continue;
        
        const distance = j * (segmentDistance / numCones);
        const conePoint = calculateDestination(p1.lat, p1.lng, distance, segmentBearing);
        
        const coneMarker = tryPlaceMarker(
          conePoint.lat, 
          conePoint.lng, 
          "Traffic Cone",
          placedMarkers,
          newMarkers
        );
        
        if (coneMarker) {
          newMarkers.push(coneMarker);
        }
      }
    }
  }
  */
}

=======
>>>>>>> 7278a29f85ead7763534383d909501db280ad458
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