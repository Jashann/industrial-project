/**
 * Visualization utilities for the Traffic Safety Planner application
 */

/**
 * Global container for visualization elements
 */
var vizElements = {
  vectors: [],   // Direction vectors (road direction, sign placement, etc.)
  edges: [],     // Edge vectors of the work zone
  signPaths: [], // Paths from start point to each sign location
  labels: [],    // Text labels for vectors, signs, etc.
  markers: []    // Inside/outside markers and other markers
};


/**
 * Clear all visualization elements
 */
function clearVizElements() {
  Object.keys(vizElements).forEach(key => {
    vizElements[key].forEach(elem => {
      if (elem) {
        map.removeLayer(elem);
      }
    });
    vizElements[key] = [];
  });
}

/**
 * Create an arrow for vector visualization
 * @param {number} startLat - Start latitude
 * @param {number} startLng - Start longitude
 * @param {Object} vector - Vector with x and y components
 * @param {number} length - Length of the vector
 * @param {string} color - Color of the vector
 * @param {string} name - Name of the vector for labeling
 * @param {string} type - Type of vector ('vector' or 'edge')
 * @returns {Object} Created arrow elements (line, arrowhead, label)
 */
function createArrow(startLat, startLng, vector, length, color, name, type = 'vector') {
  // Calculate the end point based on the vector direction
  const endLat = startLat + vector.y * length;
  const endLng = startLng + vector.x * length;
  
  // Create the line
  const line = L.polyline([
    [startLat, startLng],
    [endLat, endLng]
  ], {color: color, weight: 4}).addTo(map);
  
  // Create arrowhead
  const headLength = length * 0.2;
  const headAngle = Math.atan2(vector.y, vector.x);
  
  // Calculate arrowhead points
  const head1Lat = endLat - headLength * Math.cos(headAngle - Math.PI/6);
  const head1Lng = endLng - headLength * Math.sin(headAngle - Math.PI/6);
  
  const head2Lat = endLat - headLength * Math.cos(headAngle + Math.PI/6);
  const head2Lng = endLng - headLength * Math.sin(headAngle + Math.PI/6);
  
  // Draw arrowhead as a polygon
  const arrowhead = L.polygon([
    [endLat, endLng],
    [head1Lat, head1Lng],
    [head2Lat, head2Lng]
  ], {color: color, fillColor: color, fillOpacity: 1}).addTo(map);
  
  // Add label
  const label = L.marker([startLat, startLng], {
    icon: L.divIcon({
      className: 'vector-label',
      html: `<div style="background: rgba(255,255,255,0.8); padding: 3px; border-radius: 3px; color: ${color}; font-weight: bold;">${name}</div>`,
      iconSize: [150, 20],
      iconAnchor: [0, 10]
    })
  }).addTo(map);
  
  // Store created elements in the appropriate arrays for toggling visibility
  if (type === 'vector') {
    vizElements.vectors.push(line);
    vizElements.vectors.push(arrowhead);
    vizElements.labels.push(label);
  } else if (type === 'edge') {
    vizElements.edges.push(line);
    vizElements.edges.push(arrowhead);
    vizElements.labels.push(label);
  }
  
  return {line, arrowhead, label};
}

// Export all visualization functions if in a module environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    vizElements,
    initVizControls,
    clearVizElements,
    createArrow
  };
}