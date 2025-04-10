/**
 * Utilities and helper functions for the Traffic Safety Planner application
 */

/**
 * Convert meters to lat/lon degrees (approximate)
 * @param {number} meters - Distance in meters to convert
 * @param {number} latitude - Reference latitude for the conversion
 * @returns {Object} Object containing latDegrees and lonDegrees
 */
function metersToLatLon(meters, latitude) {
  // At equator, 1 degree = 111,319.9 meters
  // For longitude, need to take into account the latitude
  const latDegrees = meters / 111319.9;
  const lonDegrees = meters / (111319.9 * Math.cos(latitude * Math.PI / 180));
  return { latDegrees, lonDegrees };
}

/**
 * Calculate distance between two lat/lon points in meters (Haversine formula)
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c;
}

/**
 * Calculate point at a given distance and bearing from start point
 * @param {number} startLat - Starting latitude
 * @param {number} startLon - Starting longitude
 * @param {number} distance - Distance in meters
 * @param {number} bearing - Bearing in degrees (0° = North, 90° = East, etc.)
 * @returns {Object} Object with lat and lng of destination point
 */
function calculateDestination(startLat, startLon, distance, bearing) {
  const R = 6371e3; // Earth's radius in meters
  const δ = distance / R; // Angular distance
  const θ = bearing * Math.PI / 180; // Bearing in radians
  
  const φ1 = startLat * Math.PI / 180; // Convert to radians
  const λ1 = startLon * Math.PI / 180;
  
  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) +
    Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
  );
  
  const λ2 = λ1 + Math.atan2(
    Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
    Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
  );
  
  // Convert back to degrees
  const destLat = φ2 * 180 / Math.PI;
  const destLon = λ2 * 180 / Math.PI;
  
  return { lat: destLat, lng: destLon };
}

/**
 * Calculate bearing between two points
 * @param {number} startLat - Starting latitude
 * @param {number} startLon - Starting longitude
 * @param {number} endLat - Ending latitude
 * @param {number} endLon - Ending longitude
 * @returns {number} Bearing in degrees (0-360)
 */
function calculateBearing(startLat, startLon, endLat, endLon) {
  const φ1 = startLat * Math.PI / 180;
  const φ2 = endLat * Math.PI / 180;
  const Δλ = (endLon - startLon) * Math.PI / 180;
  
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) -
           Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  
  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  bearing = (bearing + 360) % 360; // Normalize to 0-360
  
  return bearing;
}

/**
 * Check if a point is inside a polygon
 * @param {Object} point - Point with lat and lng properties
 * @param {L.Polygon} polygon - Leaflet polygon object
 * @param {boolean} visualize - Whether to visualize the test
 * @returns {boolean} True if point is inside polygon
 */
function isPointInPolygon(point, polygon, visualize = false) {
  const latlngs = polygon.getLatLngs()[0];
  let inside = false;
  
  for (let i = 0, j = latlngs.length - 1; i < latlngs.length; j = i++) {
    const xi = latlngs[i].lat, yi = latlngs[i].lng;
    const xj = latlngs[j].lat, yj = latlngs[j].lng;
    
    const intersect = ((yi > point.lng) !== (yj > point.lng)) &&
                      (point.lat < (xj - xi) * (point.lng - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  
  // Optionally visualize the point we're checking if the visualization control exists and is checked
  if (visualize && document.getElementById('show-in-out-markers') && 
      document.getElementById('show-in-out-markers').checked) {
    const color = inside ? 'green' : 'red';
    const circleRadius = 3;
    
    const pointMarker = L.circle([point.lat, point.lng], {
      color: color,
      fillColor: color,
      fillOpacity: 0.7,
      radius: circleRadius
    }).addTo(map).bindTooltip(inside ? "Inside" : "Outside");
    
    // Store the marker if we have a global visualization elements object
    if (window.vizElements && window.vizElements.markers) {
      window.vizElements.markers.push(pointMarker);
    }
    
    // Highlight the polygon we're checking against
    const originalStyle = {
      color: polygon === window.definedRoadArea ? 'blue' : 'red',
      weight: 2,
      opacity: 1
    };
    
    polygon.setStyle({
      color: 'yellow',
      weight: 3,
      opacity: 0.7,
      fillOpacity: 0.2
    });
    
    // Reset style after 1.5 seconds
    setTimeout(() => {
      polygon.setStyle(originalStyle);
    }, 1500);
  }
  
  return inside;
}

/**
 * Debounce function to limit rapid calls to a function (e.g., API calls during typing)
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

// Export all utility functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    metersToLatLon,
    calculateDistance,
    calculateDestination,
    calculateBearing,
    isPointInPolygon,
    debounce
  };
}