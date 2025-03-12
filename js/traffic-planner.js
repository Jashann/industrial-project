/**
 * AI Traffic Safety Planner - Core AI algorithms for planning construction zones
 */

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
    arterial: {
      speedLimit: 80, // km/h
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
 * Check traffic control plan compliance with regulations
 * 
 * @returns {Object} Object with isCompliant flag and array of issues
 */
function checkCompliance() {
  if (drawnPolygons.length === 0) {
    alert("You need to create a construction zone first.");
    return {
      isCompliant: false,
      issues: ["No construction zone defined"]
    };
  }
  
  // Issues array to track compliance problems
  const issues = [];
  let markerTypes = {};
  
  // Count different marker types
  allMarkers.forEach(marker => {
    const content = marker.getPopup() ? marker.getPopup().getContent() : "";
    const type = content.split(' ')[0]; // Simplified - just get first word
    markerTypes[type] = (markerTypes[type] || 0) + 1;
  });
  
  // Check if there are any markers at all
  if (allMarkers.length === 0) {
    issues.push("No traffic control elements placed");
  }
  
  // Check if construction zone has all required signs
  // For simplicity, we'll look for specific keywords in marker popup content
  const requiredSigns = ["Construction", "Roadwork", "End"];
  requiredSigns.forEach(sign => {
    const found = allMarkers.some(marker => {
      const content = marker.getPopup() ? marker.getPopup().getContent() : "";
      return content.includes(sign);
    });
    
    if (!found) {
      issues.push(`Missing required sign: ${sign}`);
    }
  });
  
  // Check cones/pylons placement
  if (!markerTypes["Traffic"] || markerTypes["Traffic"] < 4) {
    issues.push("Insufficient traffic cones/pylons (minimum 4 required)");
  }
  
  // Check channelization barrels
  if (!markerTypes["Channelization"] || markerTypes["Channelization"] < 1) {
    issues.push("Missing channelization barrels");
  }
  
  return {
    isCompliant: issues.length === 0,
    issues: issues
  };
}

/**
 * Provide AI recommendations for fixing compliance issues
 * 
 * @param {Array} issues - Array of compliance issues
 * @returns {Promise<void>}
 */
async function aiRecommendFixes(issues) {
  if (issues.length === 0) return;
  
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
  if (bearing === 0 && polygonPoints.length > 1) {
    bearing = calculateBearing(
      polygonPoints[0].lat, 
      polygonPoints[0].lng, 
      polygonPoints[1].lat, 
      polygonPoints[1].lng
    );
  }
  
  // Get appropriate regulations for the work zone and road type
  const zoneConfig = REGULATIONS.workZoneTypes[workZoneType];
  const roadConfig = REGULATIONS.roadTypes[roadType];
  
  // Arrays to track markers
  const newMarkers = [];
  const placedMarkers = [];
  
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
  
  // Update the allMarkers array with placed markers
  window.allMarkers = window.allMarkers.concat(placedMarkers);
  
  // Return the array of created markers
  return newMarkers;
}

// Export all functions if in a module environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    REGULATIONS,
    checkCompliance,
    aiRecommendFixes,
    aiPlanConstructionZone
  };
}