/**
 * Item Placement Module - Handles the placement of road signs and markers
 */

// Array of available items with their names and icons
const availableItems = [
  { id: 'traffic_cone', name: 'Traffic Cone', icon: 'assets/traffic_cone.png' },
  { id: 'tall_cone', name: 'Tall Cone', icon: 'assets/tall_cone.png' },
  { id: 'channelization_barrel', name: 'Channelization Barrel', icon: 'assets/channelization_barrel.png' },
  { id: 'warning_sign', name: 'Warning Sign', icon: 'assets/warning_sign.png' },
  { id: 'warning_flags', name: 'Warning Flags', icon: 'assets/warning_flags.png' },
  { id: 'reflectorized_barricade', name: 'Reflectorized Barricade', icon: 'assets/reflectorized_barricade.png' },
  { id: 'directional_regulatory_sign', name: 'Directional Sign', icon: 'assets/directional_regulatory_sign.png' },
  { id: 'bi-directional_regulator_sign', name: 'Bi-directional Sign', icon: 'assets/bi-directional_regulator_sign.png' },
  { id: 'delineator', name: 'Delineator', icon: 'assets/delineator.png' },
  { id: 'chevron', name: 'Chevron', icon: 'assets/chevron.png' },
  { id: 'flag_person', name: 'Flag Person', icon: 'assets/flag_person.png' },
  { id: 'surveyor', name: 'Surveyor', icon: 'assets/surveyor.png' },
  { id: 'construction_marker', name: 'Construction Marker', icon: 'assets/construction_marker.png' },
  { id: 'traffic_control_device_left', name: 'Traffic Control (Left)', icon: 'assets/traffic_control_device_left.png' },
  { id: 'traffic_control_device_right', name: 'Traffic Control (Right)', icon: 'assets/traffic_control_device_right.png' },
  { id: 'point_tool', name: 'Point Tool', icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0OCA0OCIgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4Ij48Y2lyY2xlIGN4PSIyNCIgY3k9IjI0IiByPSIxMCIgZmlsbD0iIzJlODZjMSIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjIiLz48L3N2Zz4=' },
  { id: 'eraser', name: 'Eraser Tool', icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0OCA0OCIgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAiIHN0cm9rZS13aWR0aD0iMiI+PHBhdGggZD0iTTM2LjQgMTcuNUwxOC4xIDM1LjdMMTAuNyAyOC4zTDI5IDEwTDM2LjQgMTcuNVoiIGZpbGw9IiNmZjYzNDciIHN0cm9rZT0iIzAwMCIvPjxwYXRoIGQ9Ik05LjQgMzIuM0w3LjIgMzQuNUw3IDM4TDEwLjMgMzguMkwxMi43IDM1LjgiIHN0cm9rZT0iIzAwMCIvPjwvc3ZnPg==' },
  { id: 'line_tool', name: 'Line Tool', icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0OCA0OCIgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAiIHN0cm9rZS13aWR0aD0iMiI+PHBhdGggZD0iTTYgNDJMNDIgNiIgc3Ryb2tlPSIjMDAwIi8+PGNpcmNsZSBjeD0iNiIgY3k9IjQyIiByPSI0IiBmaWxsPSIjNGNhZjUwIi8+PGNpcmNsZSBjeD0iNDIiIGN5PSI2IiByPSI0IiBmaWxsPSIjNGNhZjUwIi8+PC9zdmc+' }
];

/**
 * Initialize the item selection menu with all available traffic control items
 */
function initItemSelectionMenu() {
  const itemGrid = document.getElementById('item-grid');
  const itemMenu = document.getElementById('item-selection-menu');
  
  // Initially hide the menu
  itemMenu.style.display = 'none';
  
  // Create item cards for each available item
  availableItems.forEach(item => {
    const itemCard = document.createElement('div');
    itemCard.className = 'item-card';
    itemCard.dataset.id = item.id;
    
    const itemImage = document.createElement('img');
    itemImage.src = item.icon;
    itemImage.alt = item.name;
    itemImage.className = 'item-image';
    
    const itemName = document.createElement('div');
    itemName.className = 'item-name';
    itemName.textContent = item.name;
    
    itemCard.appendChild(itemImage);
    itemCard.appendChild(itemName);
    
    // Add click event to select this item
    itemCard.addEventListener('click', () => selectItem(item));
    
    itemGrid.appendChild(itemCard);
  });
}

// Global variables for advanced features
let eraserMode = false;
let lineDrawingMode = false;
let lineEditMode = false;
let lineStartPoint = null;
let currentLine = null;
let currentLineDistance = null;
let segmentDistance = 10; // Default segment distance in meters
window.points = []; // Stores all points for interaction (defined globally for access in road-markers.js)
let draggingMarker = null;
window.pointToolActive = false; // Flag for point tool mode

// Store lines for customization
let lines = [];
let selectedLine = null;

// Line handle elements
let startHandle = null;
let endHandle = null;
let middleHandle = null;

/**
 * Select an item for placement on the map
 * @param {Object} item - The item to select
 */
function selectItem(item) {
  // Clear previous selection
  const allCards = document.querySelectorAll('.item-card');
  allCards.forEach(card => card.classList.remove('selected'));
  
  // Mark this item as selected
  const selectedCard = document.querySelector(`.item-card[data-id="${item.id}"]`);
  if (selectedCard) {
    selectedCard.classList.add('selected');
  }
  
  // Deactivate all special modes
  deactivateAllModes();
  
  // Set selected item or activate special tool
  if (item.id === 'eraser') {
    // Activate eraser mode
    eraserMode = true;
    window.placementModeActive = false;
    document.getElementById('map').style.cursor = 'url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0Ij48cGF0aCBkPSJNMTggNS42TDEwLjY1IDEyLjk1TDcuMDUgOS4zNUwxNC40IDJMMTggNS42Wk0xOSA0LjZMTTIuOCAxNS42TDkuMDUgOS4zNUwxMi42NSAxMi45NUw2LjQgMTkuMkwxLjk1IDE5Ljk1TDIuOCAxNS42WiIgZmlsbD0icmVkIi8+PC9zdmc+), auto';
    
    // Disable map dragging completely when in eraser mode
    map.dragging.disable();
    
    // Show instructions
    alert(`Eraser Tool activated. Hold right-click and drag to erase items along your cursor path.`);
  } else if (item.id === 'line_tool') {
    // Activate line drawing mode
    lineDrawingMode = true;
    window.placementModeActive = false;
    document.getElementById('map').style.cursor = 'crosshair';
    
    // Disable map dragging for line tool
    map.dragging.disable();
    
    // Show instructions
    alert(`Line Tool activated. Click to start a line, drag to extend, release to finish.`);
  } else if (item.id === 'point_tool') {
    // Activate point placement mode
    window.pointToolActive = true;
    window.placementModeActive = false;
    document.getElementById('map').style.cursor = 'crosshair';
    
    // Show instructions
    alert(`Point Tool activated. Click on any line to place a point on it. Points can only be placed on lines. Click on existing points to delete them.`);
  } else {
    // Regular item placement mode
    window.selectedItemType = item.id;
    window.selectedItemName = item.name;
    window.selectedItemIcon = item.icon;
    window.placementModeActive = true;
    window.pointToolActive = false;
    document.getElementById('map').style.cursor = 'crosshair';
    
    // Show instructions
    alert(`${item.name} selected. Click on the map or any point to place it. Click on an existing item to remove it.`);
  }
}

/**
 * Deactivate all special modes
 */
function deactivateAllModes() {
  // Reset all mode flags
  eraserMode = false;
  lineDrawingMode = false;
  lineEditMode = false;
  window.placementModeActive = false;
  window.pointToolActive = false;
  
  // Reset temporary data
  lineStartPoint = null;
  
  // Remove any temporary drawing elements
  if (currentLine) {
    map.removeLayer(currentLine);
    currentLine = null;
  }
  
  if (currentLineDistance) {
    map.removeLayer(currentLineDistance);
    currentLineDistance = null;
  }
  
  // Remove line handles
  removeLineHandles();
  
  // Re-enable map dragging
  map.dragging.enable();
  
  // Reset cursor
  document.getElementById('map').style.cursor = '';
}

/**
 * Remove line edit handles
 */
function removeLineHandles() {
  if (startHandle) {
    map.removeLayer(startHandle);
    startHandle = null;
  }
  
  if (endHandle) {
    map.removeLayer(endHandle);
    endHandle = null;
  }
  
  if (middleHandle) {
    map.removeLayer(middleHandle);
    middleHandle = null;
  }
}

/**
 * Toggle the item selection menu visibility
 */
function toggleItemMenu() {
  const itemMenu = document.getElementById('item-selection-menu');
  
  if (itemMenu.style.display === 'none' || !itemMenu.style.display) {
    itemMenu.style.display = 'block';
  } else {
    itemMenu.style.display = 'none';
    // Exit placement mode when hiding menu
    exitPlacementMode();
  }
}

/**
 * Calculate distance between two points in meters
 * @param {L.LatLng} point1 - First point
 * @param {L.LatLng} point2 - Second point
 * @returns {number} Distance in meters
 */
function calculateDistanceInMeters(point1, point2) {
  return point1.distanceTo(point2);
}

/**
 * Find closest marker to a point within a given range
 * @param {L.LatLng} point - The reference point
 * @param {number} range - The maximum distance to consider in pixels
 * @returns {L.Marker|null} The closest marker or null if none found
 */
function findClosestMarker(point, range = 20) {
  let closestMarker = null;
  let minDistance = Infinity;
  
  window.allMarkers.forEach(marker => {
    const markerPoint = map.latLngToContainerPoint(marker.getLatLng());
    const clickPoint = map.latLngToContainerPoint(point);
    
    const dx = markerPoint.x - clickPoint.x;
    const dy = markerPoint.y - clickPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < range && distance < minDistance) {
      minDistance = distance;
      closestMarker = marker;
    }
  });
  
  return closestMarker;
}

/**
 * Get the closest point to the given latlng
 * @param {L.LatLng} latlng - Location to check
 * @param {number} threshold - Maximum distance in pixels to consider
 * @returns {Object|null} Point object or null if no close point
 */
function getClosestPoint(latlng, threshold = 20) {
  const clickPoint = map.latLngToContainerPoint(latlng);
  let closestPoint = null;
  let minDistance = Infinity;
  
  // Check all points
  points.forEach(point => {
    const pointOnScreen = map.latLngToContainerPoint(point.latlng);
    const dx = pointOnScreen.x - clickPoint.x;
    const dy = pointOnScreen.y - clickPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < threshold && distance < minDistance) {
      minDistance = distance;
      closestPoint = point;
    }
  });
  
  return closestPoint;
}

/**
 * Create a segment point that can be clicked to place items
 * @param {L.LatLng} latlng - Location for the point
 * @param {string} label - Label for the point
 * @returns {Object} Point object
 */
function createSegmentPoint(latlng, label) {
  // Create a visual marker
  const pointMarker = L.circleMarker(latlng, {
    radius: 5,
    color: '#1e88e5',
    fillColor: '#1e88e5',
    fillOpacity: 0.7,
    weight: 2
  }).addTo(map);
  
  // Create a label
  const pointLabel = L.marker(latlng, {
    icon: L.divIcon({
      className: 'distance-label',
      html: `<div style="background: rgba(255,255,255,0.7); padding: 2px 4px; border-radius: 2px; font-size: 10px; width: max-content;">${label}</div>`,
      iconSize: [60, 20],
      iconAnchor: [30, -5]
    })
  }).addTo(map);
  
  // Store the point reference
  const point = {
    id: 'point_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    latlng: latlng,
    marker: pointMarker,
    label: pointLabel
  };
  
  // Add click handler to the marker - prioritize item placement over line selection
  pointMarker.on('click contextmenu', function(e) {
    // Stop propagation to prevent line selection
    e.originalEvent.preventDefault();
    e.originalEvent.stopPropagation();
    
    // Point clicked handler
    
    // If point tool is active, delete the point when clicked
    if (window.pointToolActive) {
      // Remove from map
      map.removeLayer(pointMarker);
      map.removeLayer(pointLabel);
      
      // Remove from global points array
      window.points = window.points.filter(p => p.id !== point.id);
      
      // Also remove from parent line's points array if it exists
      for (const line of lines) {
        if (line.points) {
          line.points = line.points.filter(p => p.id !== point.id);
        }
      }
      
      // Add a visual delete effect
      const deleteEffect = L.circleMarker(point.latlng, {
        radius: 10,
        color: '#ef4444',
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.3,
        className: 'snap-effect'
      }).addTo(map);
      
      // Remove the effect after animation completes
      setTimeout(() => {
        map.removeLayer(deleteEffect);
      }, 800);
      
      // Provide feedback
      document.getElementById('map').style.cursor = '';
      
      return false;
    }
    
    // Get current item selection state (will use saved state if it exists)
    const currentIcon = window.selectedItemIcon;
    const currentName = window.selectedItemName;
    const currentType = window.selectedItemType;
    
    // Check if we have an item selected (either in active or saved state)
    if (currentIcon && currentName) {
      createInteractiveMarker(
        latlng.lat,
        latlng.lng,
        currentName,
        currentIcon
      );
      return false;
    }
  });
  
  // Change cursor when hovering over the point
  pointMarker.on('mouseover', function() {
    // Show appropriate cursor based on mode
    if (window.pointToolActive) {
      // Show delete cursor when point tool is active (indicates deletion)
      // This is a more noticeable trash can icon with red background
      document.getElementById('map').style.cursor = 'url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0Ij48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMiIgZmlsbD0iI2ZmZTJlMiIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIiBmaWxsPSIjZmVjYWNhIi8+PHBhdGggZD0iTTE5IDRoLTMuNWwtMS0xaC01bC0xIDFINHYyaDE2VjR6IiBmaWxsPSIjZWY0NDQ0Ii8+PHBhdGggZD0iTTYgMTljMCAxLjEuOSAyIDIgMmg4YzEuMSAwIDItLjkgMi0yVjdINnYxMnoiIGZpbGw9IiNlZjQ0NDQiLz48L3N2Zz4=), auto';
      
      // Add a slight pulse animation to the point marker when hovered to indicate it can be deleted
      pointMarker.setStyle({
        fillColor: '#ef4444',
        radius: 6,
        fillOpacity: 0.8
      });
    } else if (window.placementModeActive || window.selectedItemIcon) {
      // Show pointer cursor for placement
      document.getElementById('map').style.cursor = 'pointer';
    }
  });
  
  pointMarker.on('mouseout', function() {
    // Reset cursor only if not in any special mode
    if (!eraserMode && !lineDrawingMode && !lineEditMode) {
      if (window.pointToolActive) {
        // Keep crosshair for point tool
        document.getElementById('map').style.cursor = 'crosshair';
        
        // Reset point style
        pointMarker.setStyle({
          fillColor: '#1e88e5',
          radius: 5,
          fillOpacity: 0.7
        });
      } else if (window.selectedItemIcon) {
        // If an item is selected but we're not in an explicit mode, keep the crosshair
        document.getElementById('map').style.cursor = 'crosshair';
      } else {
        document.getElementById('map').style.cursor = '';
      }
    }
  });
  
  // Store in points array for later reference
  points.push(point);
  
  return point;
}

/**
 * Exit item placement mode
 */
function exitPlacementMode() {
  window.placementModeActive = false;
  window.pointToolActive = false;
  window.selectedItemType = null;
  window.selectedItemName = null;
  window.selectedItemIcon = null;
  
  // Deactivate all special modes
  deactivateAllModes();
  
  // Reset cursor
  document.getElementById('map').style.cursor = '';
  
  // Clear selection
  const allCards = document.querySelectorAll('.item-card');
  allCards.forEach(card => card.classList.remove('selected'));
}

/**
 * Select a line for customization
 * @param {Object} line - Line object to select
 */
function selectLine(line) {
  // Deselect any previously selected line
  if (selectedLine) {
    selectedLine.polyline.setStyle({ color: '#3b82f6', weight: 3 });
  }
  
  // Remove any existing line handles
  removeLineHandles();
  
  // Set as selected line
  selectedLine = line;
  
  // Highlight the selected line
  line.polyline.setStyle({ color: '#f59e0b', weight: 4 });
  
  // Show the customization panel
  const linePanel = document.getElementById('line-panel');
  linePanel.style.display = 'block';
  
  // Update distance in the panel
  document.getElementById('line-distance').value = `${Math.round(line.distance * 10) / 10} meters`;
  
  // Update segment distance value in the input
  document.getElementById('segment-distance').value = segmentDistance;
  
  // Create handles for editing
  createLineHandles(line);
}

/**
 * Create line edit handles
 * @param {Object} line - Line object to create handles for
 */
function createLineHandles(line) {
  // Create handle for start point
  startHandle = L.circleMarker(line.startPoint, {
    radius: 8,
    color: 'white',
    fillColor: '#3b82f6',
    fillOpacity: 1,
    weight: 2,
    className: 'line-handle start-handle'
  }).addTo(map);
  
  // Create handle for end point
  endHandle = L.circleMarker(line.endPoint, {
    radius: 8,
    color: 'white',
    fillColor: '#3b82f6',
    fillOpacity: 1,
    weight: 2,
    className: 'line-handle end-handle'
  }).addTo(map);
  
  // Create handle for middle point (for moving the whole line)
  const midPoint = L.latLng(
    (line.startPoint.lat + line.endPoint.lat) / 2,
    (line.startPoint.lng + line.endPoint.lng) / 2
  );
  
  middleHandle = L.circleMarker(midPoint, {
    radius: 8,
    color: 'white',
    fillColor: '#f59e0b',
    fillOpacity: 1,
    weight: 2,
    className: 'line-handle middle-handle'
  }).addTo(map);
  
  // Make line itself draggable too (handles will be updated accordingly)
  line.polyline.on('mousedown', function(e) {
    if (lineEditMode) {
      e.originalEvent.preventDefault();
      e.originalEvent.stopPropagation();
      
      // Simulate clicking the middle handle
      const middlePoint = L.latLng(
        (line.startPoint.lat + line.endPoint.lat) / 2,
        (line.startPoint.lng + line.endPoint.lng) / 2
      );
      
      const dragStartPos = e.latlng;
      
      // Track drag movement
      const moveHandler = function(moveEvent) {
        const dx = moveEvent.latlng.lng - dragStartPos.lng;
        const dy = moveEvent.latlng.lat - dragStartPos.lat;
        
        // Update position
        const newStartPoint = L.latLng(
          line.startPoint.lat + dy,
          line.startPoint.lng + dx
        );
        
        const newEndPoint = L.latLng(
          line.endPoint.lat + dy,
          line.endPoint.lng + dx
        );
        
        // Update line points
        line.startPoint = newStartPoint;
        line.endPoint = newEndPoint;
        line.polyline.setLatLngs([newStartPoint, newEndPoint]);
        
        // Update handles if they exist
        if (startHandle) startHandle.setLatLng(newStartPoint);
        if (endHandle) endHandle.setLatLng(newEndPoint);
        if (middleHandle) {
          const newMidPoint = L.latLng(
            (newStartPoint.lat + newEndPoint.lat) / 2,
            (newStartPoint.lng + newEndPoint.lng) / 2
          );
          middleHandle.setLatLng(newMidPoint);
        }
        
        // Update the distance label
        if (line.distanceLabel) {
          const newLabelPoint = L.latLng(
            (newStartPoint.lat + newEndPoint.lat) / 2,
            (newStartPoint.lng + newEndPoint.lng) / 2
          );
          line.distanceLabel.setLatLng(newLabelPoint);
        }
        
        // Update drag start position for next move
        dragStartPos = moveEvent.latlng;
      };
      
      // Handle mouseup to stop dragging
      const upHandler = function(upEvent) {
        map.off('mousemove', moveHandler);
        document.removeEventListener('mouseup', upHandler);
      };
      
      // Attach event handlers
      map.on('mousemove', moveHandler);
      document.addEventListener('mouseup', upHandler);
    }
  });
  
  // Add drag functionality to the handles when in edit mode
  startHandle.handle = 'start';
  endHandle.handle = 'end';
  middleHandle.handle = 'middle';
}

/**
 * Segment a line with markers at regular intervals
 * @param {Object} line - Line object to segment
 * @param {number} distance - Distance between segments in meters
 */
function segmentLine(line, distance) {
  // Remove any existing segments and points
  if (line.segmented) {
    line.segments.forEach(segment => map.removeLayer(segment));
    line.points.forEach(point => {
      map.removeLayer(point.marker);
      map.removeLayer(point.label);
    });
    
    line.segments = [];
    line.points = [];
  }
  
  // Calculate number of segments
  const lineDistance = line.distance;
  const numSegments = Math.max(1, Math.round(lineDistance / distance));
  
  // Create points and segments
  for (let i = 0; i <= numSegments; i++) {
    const ratio = i / numSegments;
    const lat = line.startPoint.lat + (line.endPoint.lat - line.startPoint.lat) * ratio;
    const lng = line.startPoint.lng + (line.endPoint.lng - line.startPoint.lng) * ratio;
    const point = L.latLng(lat, lng);
    
    // Create a point marker
    const pointMarker = L.circleMarker(point, {
      radius: 5,
      color: '#1e88e5',
      fillColor: '#1e88e5',
      fillOpacity: 0.7,
      weight: 2
    }).addTo(map);
    
    // Create a label
    const label = i === 0 ? 'Start' : (i === numSegments ? 'End' : `${Math.round(i * distance * 10) / 10} m`);
    const pointLabel = L.marker(point, {
      icon: L.divIcon({
        className: 'distance-label',
        html: `<div style="background: rgba(255,255,255,0.7); padding: 2px 4px; border-radius: 2px; font-size: 10px; width: max-content;">${label}</div>`,
        iconSize: [60, 20],
        iconAnchor: [30, -5]
      })
    }).addTo(map);
    
    // Add click handler to the marker for item placement - handle both left and right clicks
    pointMarker.on('click contextmenu', function(e) {
      e.originalEvent.preventDefault();
      e.originalEvent.stopPropagation();
      
      // Place markers if item is selected (regardless of explicit placement mode)
      // Get the current selected item (in case we're in a suspended state)
      const currentIcon = window.selectedItemIcon;
      const currentName = window.selectedItemName;
      
      if (currentIcon) {
        createInteractiveMarker(
          point.lat,
          point.lng,
          currentName,
          currentIcon
        );
        return false;
      }
      
      // If no item is selected and not in point tool mode, select the parent line
      if (!window.selectedItemIcon && !window.pointToolActive) {
        selectLine(line);
      }
      
      return false;
    });
    
    // Change cursor on hover
    pointMarker.on('mouseover', function() {
      document.getElementById('map').style.cursor = 'pointer';
    });
    
    pointMarker.on('mouseout', function() {
      // Don't reset cursor if we're in a special mode
      if (!eraserMode && !lineDrawingMode && !lineEditMode) {
        document.getElementById('map').style.cursor = '';
      }
    });
    
    // Store the point
    line.points.push({
      latlng: point,
      marker: pointMarker,
      label: pointLabel
    });
    
    // Add a line segment to the next point if not the last point
    if (i < numSegments) {
      const nextRatio = (i + 1) / numSegments;
      const nextLat = line.startPoint.lat + (line.endPoint.lat - line.startPoint.lat) * nextRatio;
      const nextLng = line.startPoint.lng + (line.endPoint.lng - line.startPoint.lng) * nextRatio;
      
      const segment = L.polyline([
        [lat, lng],
        [nextLat, nextLng]
      ], {
        color: '#1e88e5',
        weight: 2,
        dashArray: '5, 5'
      }).addTo(map);
      
      line.segments.push(segment);
    }
  }
  
  // Mark line as segmented
  line.segmented = true;
  
  // Store segment distance
  line.segmentDistance = distance;
  
  // Add the points to global points array for interaction
  line.points.forEach(point => {
    window.points.push(point);
  });
}

/**
 * Toggle line edit mode
 * @param {Object} line - Line to edit
 */
function toggleLineEditMode(line) {
  lineEditMode = !lineEditMode;
  
  // Update the button appearance
  const editButton = document.getElementById('edit-line-btn');
  
  if (lineEditMode) {
    // Change button appearance
    editButton.textContent = 'Editing...';
    editButton.style.background = '#6b7280'; // Gray color
    
    // Disable map navigation during edit mode
    map.dragging.disable();
    map.scrollWheelZoom.disable();
    
    // Store line reference
    const lineObj = line || selectedLine;
    
    if (!lineObj) return;
    
    // Change line style to indicate it's being edited
    lineObj.polyline.setStyle({
      color: '#f97316', // Orange to indicate editing
      weight: 4,
      dashArray: '5, 5'
    });
    
    // Add editing class if possible
    try {
      if (lineObj.polyline._path) {
        lineObj.polyline._path.classList.add('editing-line');
      }
    } catch (e) {
      console.log("Cannot add class to path:", e);
    }
    
    // Make line draggable more like markers
    lineObj.polyline.dragging = {
      enable: function() {
        // Already enabled by our direct method
      },
      disable: function() {
        lineObj.polyline.off('mousedown');
      }
    };
    
    // Setup line dragging using a similar approach to marker dragging
    lineObj.polyline.on('mousedown', function(e) {
      // Only handle if in edit mode
      if (!lineEditMode) return;
      
      e.originalEvent.preventDefault();
      e.originalEvent.stopPropagation();
      
      // Flag to track dragging
      lineObj.polyline._isDragging = true;
      
      // Store original positions
      lineObj.polyline._originalStartPoint = L.latLng(lineObj.startPoint.lat, lineObj.startPoint.lng);
      lineObj.polyline._originalEndPoint = L.latLng(lineObj.endPoint.lat, lineObj.endPoint.lng);
      lineObj.polyline._dragStartPos = map.mouseEventToContainerPoint(e.originalEvent);
      
      // Create a "ghost" line to show the original position
      lineObj.polyline._ghostLine = L.polyline([
        lineObj.polyline._originalStartPoint,
        lineObj.polyline._originalEndPoint
      ], {
        color: '#9ca3af',
        weight: 2,
        opacity: 0.6,
        dashArray: '4, 4'
      }).addTo(map);
      
      document.getElementById('map').style.cursor = 'move';
      
      // Handle mouse movement - similar to marker drag
      const moveHandler = function(moveEvent) {
        if (!lineObj.polyline._isDragging) return;
        
        // Get current mouse position in pixels
        const currentMousePoint = map.mouseEventToContainerPoint(moveEvent.originalEvent);
        
        // Calculate pixel offset from drag start
        const dx = currentMousePoint.x - lineObj.polyline._dragStartPos.x;
        const dy = currentMousePoint.y - lineObj.polyline._dragStartPos.y;
        
        // Convert pixel offset to lat/lng offset
        const startPointPixel = map.latLngToContainerPoint(lineObj.polyline._originalStartPoint);
        const endPointPixel = map.latLngToContainerPoint(lineObj.polyline._originalEndPoint);
        
        // Apply offset to get new pixel coordinates
        const newStartPixel = L.point(startPointPixel.x + dx, startPointPixel.y + dy);
        const newEndPixel = L.point(endPointPixel.x + dx, endPointPixel.y + dy);
        
        // Convert back to latlng
        const newStartPoint = map.containerPointToLatLng(newStartPixel);
        const newEndPoint = map.containerPointToLatLng(newEndPixel);
        
        // Update line points
        lineObj.startPoint = newStartPoint;
        lineObj.endPoint = newEndPoint;
        lineObj.polyline.setLatLngs([newStartPoint, newEndPoint]);
        
        // Update handles
        if (startHandle) startHandle.setLatLng(newStartPoint);
        if (endHandle) endHandle.setLatLng(newEndPoint);
        if (middleHandle) {
          const newMidPoint = L.latLng(
            (newStartPoint.lat + newEndPoint.lat) / 2,
            (newStartPoint.lng + newEndPoint.lng) / 2
          );
          middleHandle.setLatLng(newMidPoint);
        }
        
        // Update distance label
        if (lineObj.distanceLabel) {
          const newLabelPoint = L.latLng(
            (newStartPoint.lat + newEndPoint.lat) / 2,
            (newStartPoint.lng + newEndPoint.lng) / 2
          );
          lineObj.distanceLabel.setLatLng(newLabelPoint);
        }
        
        // Update distance display
        lineObj.distance = calculateDistanceInMeters(lineObj.startPoint, lineObj.endPoint);
        document.getElementById('line-distance').value = `${Math.round(lineObj.distance * 10) / 10} meters`;
      };
      
      // Handle mouseup to stop dragging
      const upHandler = function() {
        lineObj.polyline._isDragging = false;
        document.getElementById('map').style.cursor = '';
        
        // Remove the ghost line
        if (lineObj.polyline._ghostLine) {
          map.removeLayer(lineObj.polyline._ghostLine);
          lineObj.polyline._ghostLine = null;
        }
        
        document.removeEventListener('mousemove', moveHandler);
        document.removeEventListener('mouseup', upHandler);
      };
      
      // Attach event handlers to document for better dragging
      document.addEventListener('mousemove', moveHandler);
      document.addEventListener('mouseup', upHandler);
    });
    
    // Enable dragging on handles
    if (startHandle) {
      // Use the direct event approach with pixel calculations
      startHandle.on('mousedown', function(e) {
        if (!lineEditMode) return;
        
        e.originalEvent.preventDefault();
        e.originalEvent.stopPropagation();
        
        let currentSnappedPoint = null;
        
        // Start position for the drag
        startHandle._isDragging = true;
        startHandle._originalLatLng = L.latLng(lineObj.startPoint.lat, lineObj.startPoint.lng);
        startHandle._dragStartPos = map.mouseEventToContainerPoint(e.originalEvent);
        
        // Create a temporary label for showing distance change
        startHandle._distanceLabel = L.marker(startHandle._originalLatLng, {
          icon: L.divIcon({
            className: 'drag-distance-label',
            html: '<div style="background: rgba(0,0,0,0.7); color: white; padding: 2px 5px; border-radius: 3px; font-size: 11px;">0 m</div>',
            iconSize: [80, 20],
            iconAnchor: [40, 0]
          })
        }).addTo(map);
        
        document.getElementById('map').style.cursor = 'move';
        
        const moveHandler = function(moveEvent) {
          if (!startHandle._isDragging) return;
          
          // Calculate pixel offset from drag start
          const currentMousePoint = map.mouseEventToContainerPoint(moveEvent.originalEvent);
          const dx = currentMousePoint.x - startHandle._dragStartPos.x;
          const dy = currentMousePoint.y - startHandle._dragStartPos.y;
          
          // Convert original position to pixels
          const originalPixelPos = map.latLngToContainerPoint(startHandle._originalLatLng);
          
          // Apply offset to get new pixel position
          const newPixelPos = L.point(originalPixelPos.x + dx, originalPixelPos.y + dy);
          
          // Convert back to LatLng
          const newLatLng = map.containerPointToLatLng(newPixelPos);
          
          // Check for nearby points to snap to
          const closestPoint = getClosestPoint(newLatLng, 20);
          
          // If found a point to snap to, use its position instead
          if (closestPoint) {
            // Update line start point to snap to the point
            lineObj.startPoint = closestPoint.latlng;
            startHandle.setLatLng(closestPoint.latlng);
            
            // Clear previous highlighting
            if (currentSnappedPoint && currentSnappedPoint !== closestPoint) {
              currentSnappedPoint.marker.setStyle({
                fillColor: '#1e88e5',
                radius: 5
              });
            }
            
            // Highlight the target point
            closestPoint.marker.setStyle({
              fillColor: '#ff4081',
              radius: 8
            });
            
            // Add snap effect animation
            if (currentSnappedPoint !== closestPoint) {
              const snapEffect = L.circleMarker(closestPoint.latlng, {
                radius: 14,
                color: '#ff4081',
                weight: 3,
                opacity: 0.7,
                fillOpacity: 0.1
              }).addTo(map);
              
              // Animate the snap effect
              let counter = 0;
              const animateSnap = setInterval(() => {
                counter++;
                snapEffect.setRadius(14 - counter);
                snapEffect.setStyle({
                  opacity: 0.7 - (counter * 0.08)
                });
                
                if (counter >= 8) {
                  clearInterval(animateSnap);
                  map.removeLayer(snapEffect);
                }
              }, 50);
            }
            
            currentSnappedPoint = closestPoint;
          } else {
            // If not snapping, update normally
            lineObj.startPoint = newLatLng;
            startHandle.setLatLng(newLatLng);
            
            // Clear any previous snap highlighting
            if (currentSnappedPoint) {
              currentSnappedPoint.marker.setStyle({
                fillColor: '#1e88e5',
                radius: 5
              });
              currentSnappedPoint = null;
            }
          }
          
          // Update line path
          lineObj.polyline.setLatLngs([lineObj.startPoint, lineObj.endPoint]);
          
          // Update the middle handle
          const midPoint = L.latLng(
            (lineObj.startPoint.lat + lineObj.endPoint.lat) / 2,
            (lineObj.startPoint.lng + lineObj.endPoint.lng) / 2
          );
          middleHandle.setLatLng(midPoint);
          
          // Update the distance
          lineObj.distance = calculateDistanceInMeters(lineObj.startPoint, lineObj.endPoint);
          
          // Update the distance label
          const labelPoint = L.latLng(
            (lineObj.startPoint.lat + lineObj.endPoint.lat) / 2,
            (lineObj.startPoint.lng + lineObj.endPoint.lng) / 2
          );
          lineObj.distanceLabel.setLatLng(labelPoint);
          lineObj.distanceLabel.setIcon(L.divIcon({
            className: 'distance-label',
            html: `<div style="background: rgba(255,255,255,0.7); padding: 3px 6px; border-radius: 3px; font-weight: bold;">${Math.round(lineObj.distance * 10) / 10} m</div>`,
            iconSize: [80, 20],
            iconAnchor: [40, 10]
          }));
          
          // Update line panel distance
          document.getElementById('line-distance').value = `${Math.round(lineObj.distance * 10) / 10} meters`;
        };
        
        const upHandler = function() {
          startHandle._isDragging = false;
          document.getElementById('map').style.cursor = '';
          
          // Remove the distance change label
          if (startHandle._distanceLabel) {
            map.removeLayer(startHandle._distanceLabel);
            startHandle._distanceLabel = null;
          }
          
          document.removeEventListener('mousemove', moveHandler);
          document.removeEventListener('mouseup', upHandler);
          
          // Reset snapped point highlight if needed
          if (currentSnappedPoint) {
            // Keep the snapped point highlighted but smaller
            currentSnappedPoint.marker.setStyle({
              fillColor: '#ff4081',
              radius: 6
            });
          }
        };
        
        // Attach event handlers to document for better dragging
        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('mouseup', upHandler);
      });
    }
    
    if (endHandle) {
      // Use the direct event approach instead of built-in dragging
      endHandle.on('mousedown', function(e) {
        if (!lineEditMode) return;
        
        e.originalEvent.preventDefault();
        e.originalEvent.stopPropagation();
        
        let currentSnappedPoint = null;
        document.getElementById('map').style.cursor = 'move';
        
        const moveHandler = function(moveEvent) {
          // Get mouse position
          const mouseLatLng = moveEvent.latlng;
          
          // Check for nearby points to snap to
          const closestPoint = getClosestPoint(mouseLatLng, 20);
          
          // If found a point to snap to, use its position instead
          if (closestPoint) {
            // Update line end point to snap to the point
            lineObj.endPoint = closestPoint.latlng;
            endHandle.setLatLng(closestPoint.latlng);
            
            // Clear previous highlighting
            if (currentSnappedPoint && currentSnappedPoint !== closestPoint) {
              currentSnappedPoint.marker.setStyle({
                fillColor: '#1e88e5',
                radius: 5
              });
            }
            
            // Highlight the target point
            closestPoint.marker.setStyle({
              fillColor: '#ff4081',
              radius: 8
            });
            
            // Add snap effect animation
            if (currentSnappedPoint !== closestPoint) {
              const snapEffect = L.circleMarker(closestPoint.latlng, {
                radius: 14,
                color: '#ff4081',
                weight: 3,
                opacity: 0.7,
                fillOpacity: 0.1
              }).addTo(map);
              
              // Animate the snap effect
              let counter = 0;
              const animateSnap = setInterval(() => {
                counter++;
                snapEffect.setRadius(14 - counter);
                snapEffect.setStyle({
                  opacity: 0.7 - (counter * 0.08)
                });
                
                if (counter >= 8) {
                  clearInterval(animateSnap);
                  map.removeLayer(snapEffect);
                }
              }, 50);
            }
            
            currentSnappedPoint = closestPoint;
          } else {
            // If not snapping, update normally
            lineObj.endPoint = mouseLatLng;
            endHandle.setLatLng(mouseLatLng);
            
            // Clear any previous snap highlighting
            if (currentSnappedPoint) {
              currentSnappedPoint.marker.setStyle({
                fillColor: '#1e88e5',
                radius: 5
              });
              currentSnappedPoint = null;
            }
          }
          
          // Update line path
          lineObj.polyline.setLatLngs([lineObj.startPoint, lineObj.endPoint]);
          
          // Update the middle handle
          const midPoint = L.latLng(
            (lineObj.startPoint.lat + lineObj.endPoint.lat) / 2,
            (lineObj.startPoint.lng + lineObj.endPoint.lng) / 2
          );
          middleHandle.setLatLng(midPoint);
          
          // Update the distance
          lineObj.distance = calculateDistanceInMeters(lineObj.startPoint, lineObj.endPoint);
          
          // Update the distance label
          const labelPoint = L.latLng(
            (lineObj.startPoint.lat + lineObj.endPoint.lat) / 2,
            (lineObj.startPoint.lng + lineObj.endPoint.lng) / 2
          );
          lineObj.distanceLabel.setLatLng(labelPoint);
          lineObj.distanceLabel.setIcon(L.divIcon({
            className: 'distance-label',
            html: `<div style="background: rgba(255,255,255,0.7); padding: 3px 6px; border-radius: 3px; font-weight: bold;">${Math.round(lineObj.distance * 10) / 10} m</div>`,
            iconSize: [80, 20],
            iconAnchor: [40, 10]
          }));
          
          // Update line panel distance
          document.getElementById('line-distance').value = `${Math.round(lineObj.distance * 10) / 10} meters`;
        };
        
        const upHandler = function() {
          map.off('mousemove', moveHandler);
          document.removeEventListener('mouseup', upHandler);
          document.getElementById('map').style.cursor = '';
          
          // Reset snapped point highlight if needed
          if (currentSnappedPoint) {
            // Keep the snapped point highlighted but smaller
            currentSnappedPoint.marker.setStyle({
              fillColor: '#ff4081',
              radius: 6
            });
          }
        };
        
        // Attach event handlers
        map.on('mousemove', moveHandler);
        document.addEventListener('mouseup', upHandler);
      });
    }
    
    if (middleHandle) {
      // Use direct event handling approach
      middleHandle.on('mousedown', function(e) {
        if (!lineEditMode) return;
        
        e.originalEvent.preventDefault();
        e.originalEvent.stopPropagation();
        
        // Store initial positions when starting to drag
        const initialMousePos = e.latlng;
        const initialStartPoint = L.latLng(lineObj.startPoint.lat, lineObj.startPoint.lng);
        const initialEndPoint = L.latLng(lineObj.endPoint.lat, lineObj.endPoint.lng);
        
        document.getElementById('map').style.cursor = 'move';
        
        const moveHandler = function(moveEvent) {
          // Calculate offset from starting position
          const newMousePos = moveEvent.latlng;
          const latOffset = newMousePos.lat - initialMousePos.lat;
          const lngOffset = newMousePos.lng - initialMousePos.lng;
          
          // Apply offset to original positions
          const newStartPoint = L.latLng(
            initialStartPoint.lat + latOffset,
            initialStartPoint.lng + lngOffset
          );
          
          const newEndPoint = L.latLng(
            initialEndPoint.lat + latOffset,
            initialEndPoint.lng + lngOffset
          );
          
          // Update line points
          lineObj.startPoint = newStartPoint;
          lineObj.endPoint = newEndPoint;
          lineObj.polyline.setLatLngs([newStartPoint, newEndPoint]);
          
          // Update all handles
          startHandle.setLatLng(newStartPoint);
          endHandle.setLatLng(newEndPoint);
          middleHandle.setLatLng(moveEvent.latlng);
          
          // Update the distance label
          lineObj.distanceLabel.setLatLng(moveEvent.latlng);
          
          // Update distance display
          lineObj.distance = calculateDistanceInMeters(lineObj.startPoint, lineObj.endPoint);
          document.getElementById('line-distance').value = `${Math.round(lineObj.distance * 10) / 10} meters`;
        };
        
        const upHandler = function() {
          map.off('mousemove', moveHandler);
          document.removeEventListener('mouseup', upHandler);
          document.getElementById('map').style.cursor = '';
        };
        
        // Attach event handlers
        map.on('mousemove', moveHandler);
        document.addEventListener('mouseup', upHandler);
      });
    }
  } else {
    // Change button appearance back
    editButton.textContent = 'Edit Line';
    editButton.style.background = 'linear-gradient(135deg, #059669, #10b981)'; // Green color
    
    // Re-enable map navigation
    map.dragging.enable();
    map.scrollWheelZoom.enable();
    
    // Exit edit mode
    const lineObj = selectedLine;
    if (!lineObj) return;
    
    // Reset line style
    lineObj.polyline.setStyle({
      color: '#3b82f6', // Back to blue
      weight: 3,
      dashArray: null
    });
    
    // Remove editing class if possible
    try {
      if (lineObj.polyline._path) {
        lineObj.polyline._path.classList.remove('editing-line');
      }
    } catch (e) {
      console.log("Cannot remove class from path:", e);
    }
    
    // Remove all drag handlers
    lineObj.polyline.off('mousedown');
    
    // Disable handle dragging
    if (startHandle) {
      startHandle.dragging.disable();
      startHandle.off('dragstart');
      startHandle.off('drag');
      startHandle.off('dragend');
    }
    
    if (endHandle) {
      endHandle.dragging.disable();
      endHandle.off('dragstart');
      endHandle.off('drag');
      endHandle.off('dragend');
    }
    
    if (middleHandle) {
      middleHandle.dragging.disable();
      middleHandle.off('dragstart');
      middleHandle.off('drag');
      middleHandle.off('dragend');
    }
    
    // If line is segmented, reapply segmentation with new dimensions
    if (selectedLine && selectedLine.segmented) {
      segmentLine(selectedLine, selectedLine.segmentDistance);
    }
  }
}

/**
 * Delete the selected line
 */
function deleteLine() {
  if (!selectedLine) return;
  
  // Remove the line from the map
  map.removeLayer(selectedLine.polyline);
  map.removeLayer(selectedLine.distanceLabel);
  
  // Remove any segments and points
  if (selectedLine.segmented) {
    selectedLine.segments.forEach(segment => map.removeLayer(segment));
    selectedLine.points.forEach(point => {
      map.removeLayer(point.marker);
      map.removeLayer(point.label);
      // Remove from global points array
      window.points = window.points.filter(p => p.id !== point.id);
    });
  }
  
  // Remove handles
  removeLineHandles();
  
  // Remove from lines array
  lines = lines.filter(l => l.id !== selectedLine.id);
  
  // Hide the customization panel
  document.getElementById('line-panel').style.display = 'none';
  
  // Reset selected line
  selectedLine = null;
}

// Initialize the module on page load
document.addEventListener('DOMContentLoaded', function() {
  initItemSelectionMenu();
  
  // Create a toggle button for the item menu
  const mapContainer = document.getElementById('map');
  const menuButton = document.createElement('button');
  menuButton.innerHTML = '<ion-icon name="add-circle-outline"></ion-icon><span>Items</span>';
  menuButton.className = 'flex-center';
  menuButton.id = 'toggle-items-btn';
  menuButton.style.position = 'fixed';
  menuButton.style.bottom = '20px';
  menuButton.style.left = '20px';
  menuButton.style.zIndex = '1000';
  menuButton.style.background = 'linear-gradient(135deg, #1e40af, #3b82f6)';
  menuButton.style.padding = '10px 15px';
  menuButton.style.borderRadius = '8px';
  menuButton.style.color = 'white';
  
  // Add click handler to toggle menu
  menuButton.addEventListener('click', toggleItemMenu);
  
  // Add button to the document
  document.body.appendChild(menuButton);
  
  // Line panel button handlers
  document.getElementById('apply-segment-btn').addEventListener('click', function() {
    if (!selectedLine) return;
    
    const segDistInput = document.getElementById('segment-distance');
    const distance = parseFloat(segDistInput.value);
    
    if (isNaN(distance) || distance <= 0) {
      alert('Please enter a valid segment distance (greater than 0)');
      return;
    }
    
    // Update the global segment distance for future lines
    segmentDistance = distance;
    
    // Segment the selected line
    segmentLine(selectedLine, distance);
  });
  
  document.getElementById('edit-line-btn').addEventListener('click', function() {
    toggleLineEditMode();
  });
  
  document.getElementById('delete-line-btn').addEventListener('click', function() {
    deleteLine();
  });
  
  // Map mouse events for drawing lines and eraser
  const mapEl = document.getElementById('map');
  
  // Mouse down handler
  mapEl.addEventListener('mousedown', function(e) {
    // We don't need the mouse down handler for the eraser anymore
    // as it works continuously when the mode is active
    
    // Left mouse button for drawing lines
    if (e.button === 0 && lineDrawingMode) {
      // First check if we're near an existing point - to connect lines
      const clickLatLng = map.mouseEventToLatLng(e);
      const nearbyPoint = getClosestPoint(clickLatLng, 20);
      
      if (nearbyPoint) {
        // Prevent default browser behavior to avoid map dragging during line drawing
        e.preventDefault();
        e.stopPropagation();
        
        // Disable map dragging temporarily
        map.dragging.disable();
        
        // Start line from the existing point
        lineStartPoint = nearbyPoint.latlng;
        
        // Create a new polyline
        currentLine = L.polyline([nearbyPoint.latlng, nearbyPoint.latlng], {
          color: '#4caf50',
          weight: 3
        }).addTo(map);
        
        // Create a label for showing distance
        currentLineDistance = L.marker(nearbyPoint.latlng, {
          icon: L.divIcon({
            className: 'distance-label',
            html: '<div style="background: rgba(255,255,255,0.7); padding: 3px 6px; border-radius: 3px; font-weight: bold;">0 m</div>',
            iconSize: [80, 20],
            iconAnchor: [40, 10]
          })
        }).addTo(map);
        
        // Set flag for mousemove handling
        mapEl.setAttribute('data-drawing', 'true');
        
        // Highlight the point we're starting from
        nearbyPoint.marker.setStyle({
          fillColor: '#ff4081',
          radius: 8
        });
        
        return;
      }
      
      // If not near a point, check if we're close to an existing line
      let nearExistingLine = false;
      
      for (const line of lines) {
        const linePoints = line.polyline.getLatLngs();
        const p1 = map.latLngToContainerPoint(linePoints[0]);
        const p2 = map.latLngToContainerPoint(linePoints[1]);
        const clickPoint = map.latLngToContainerPoint(clickLatLng);
        
        // Calculate distance from click to line segment
        const distance = distanceToLineSegment(p1.x, p1.y, p2.x, p2.y, clickPoint.x, clickPoint.y);
        
        // If distance is less than 15 pixels, select the line instead of starting a new one
        if (distance < 15) {
          // Prevent default action
          e.preventDefault();
          e.stopPropagation();
          
          // Select the line
          selectLine(line);
          
          // Set flag to indicate we're near a line
          nearExistingLine = true;
          break;
        }
      }
      
      // Only start drawing a new line if not near an existing one
      if (!nearExistingLine) {
        // Prevent default browser behavior to avoid map dragging during line drawing
        e.preventDefault();
        e.stopPropagation();
        
        // Disable map dragging temporarily
        map.dragging.disable();
        
        // Get coordinates where mouse was pressed
        const point = clickLatLng;
        lineStartPoint = point;
        
        // Create a new polyline
        currentLine = L.polyline([point, point], {
          color: '#4caf50',
          weight: 3
        }).addTo(map);
        
        // Create a label for showing distance
        currentLineDistance = L.marker(point, {
          icon: L.divIcon({
            className: 'distance-label',
            html: '<div style="background: rgba(255,255,255,0.7); padding: 3px 6px; border-radius: 3px; font-weight: bold;">0 m</div>',
            iconSize: [80, 20],
            iconAnchor: [40, 10]
          })
        }).addTo(map);
        
        // Set flag for mousemove handling
        mapEl.setAttribute('data-drawing', 'true');
      }
    }
  });
  
  // Mouse move handler
  mapEl.addEventListener('mousemove', function(e) {
    // Handle eraser mode
    if (eraserMode) {
      const point = map.mouseEventToLatLng(e);
      const marker = findClosestMarker(point, 30); // Increased detection range
      
      if (marker) {
        // Remove the marker
        map.removeLayer(marker);
        window.allMarkers = window.allMarkers.filter(m => m !== marker);
      }
      return;
    }
    
    // Handle line drawing
    if (mapEl.getAttribute('data-drawing') === 'true' && lineStartPoint && currentLine) {
      const currentPoint = map.mouseEventToLatLng(e);
      
      // Update the line
      currentLine.setLatLngs([lineStartPoint, currentPoint]);
      
      // Calculate and display distance
      const distance = calculateDistanceInMeters(lineStartPoint, currentPoint);
      const midPoint = L.latLng(
        (lineStartPoint.lat + currentPoint.lat) / 2,
        (lineStartPoint.lng + currentPoint.lng) / 2
      );
      
      currentLineDistance.setLatLng(midPoint);
      currentLineDistance.setIcon(L.divIcon({
        className: 'distance-label',
        html: `<div style="background: rgba(255,255,255,0.7); padding: 3px 6px; border-radius: 3px; font-weight: bold;">${Math.round(distance * 10) / 10} m</div>`,
        iconSize: [80, 20],
        iconAnchor: [40, 10]
      }));
    }
  });
  
  // Mouse up handler
  mapEl.addEventListener('mouseup', function(e) {
    // We don't need to handle eraser release either
    // since the eraser works continuously in eraser mode
    
    // Handle end of line drawing
    if (mapEl.getAttribute('data-drawing') === 'true' && lineStartPoint && currentLine) {
      // Re-enable map dragging
      map.dragging.enable();
      
      // Check if mouse is near an existing point to snap the endpoint
      const mouseLatLng = map.mouseEventToLatLng(e);
      const nearbyPoint = getClosestPoint(mouseLatLng, 20);
      
      // Determine the end point - either a nearby point or the mouse position
      const endPoint = nearbyPoint ? nearbyPoint.latlng : mouseLatLng;
      
      // Calculate the distance
      const distance = calculateDistanceInMeters(lineStartPoint, endPoint);
      
      // Don't create lines that are too short (less than 1 meter)
      if (distance < 1) {
        // Clean up temporary drawing elements
        map.removeLayer(currentLine);
        map.removeLayer(currentLineDistance);
        currentLine = null;
        currentLineDistance = null;
        
        // Reset drawing state
        mapEl.setAttribute('data-drawing', 'false');
        lineStartPoint = null;
        return;
      }
      
      // Create a permanent line
      const lineObj = {
        id: 'line_' + Date.now(),
        startPoint: lineStartPoint,
        endPoint: endPoint,
        distance: distance,
        segmented: false,
        segments: [],
        points: []
      };
      
      // Create the polyline
      lineObj.polyline = L.polyline([lineStartPoint, endPoint], {
        color: '#3b82f6',
        weight: 3
      }).addTo(map);
      
      // Add a permanent distance label
      lineObj.distanceLabel = L.marker(currentLineDistance.getLatLng(), {
        icon: L.divIcon({
          className: 'distance-label',
          html: `<div style="background: rgba(255,255,255,0.7); padding: 3px 6px; border-radius: 3px; font-weight: bold;">${Math.round(distance * 10) / 10} m</div>`,
          iconSize: [80, 20],
          iconAnchor: [40, 10]
        })
      }).addTo(map);
      
      // If we snapped to a point at the end, highlight it temporarily
      if (nearbyPoint) {
        nearbyPoint.marker.setStyle({
          fillColor: '#ff4081',
          radius: 8
        });
        
        // Reset after animation
        setTimeout(() => {
          nearbyPoint.marker.setStyle({
            fillColor: '#1e88e5',
            radius: 5
          });
        }, 500);
      }
      
      // Note: We're now handling line selection in the map click handler
      // with a more effective distance-based approach instead of relying on
      // the event bubbling which was causing issues. These event handlers
      // are no longer necessary but kept for backward compatibility.
      
      lineObj.polyline.on('contextmenu', function(e) {
        e.originalEvent.preventDefault();
        e.originalEvent.stopPropagation();
        selectLine(lineObj);
        return false;
      });
      
      // Change cursor when hovering over the line and show tooltip
      lineObj.polyline.on('mouseover', function() {
        document.getElementById('map').style.cursor = 'pointer';
        
        // Add helpful tooltip for line interaction
        if (!lineObj.tooltip) {
          lineObj.tooltip = L.tooltip({
            permanent: false,
            direction: 'top',
            className: 'line-tooltip',
            offset: [0, -10]
          })
          .setContent('Click to select, right-click to edit')
          .setLatLng(lineObj.distanceLabel.getLatLng());
          
          lineObj.polyline.bindTooltip(lineObj.tooltip).openTooltip();
        }
      });
      
      lineObj.polyline.on('mouseout', function() {
        // Don't reset cursor if we're in a special mode
        if (!eraserMode && !lineDrawingMode && !lineEditMode) {
          document.getElementById('map').style.cursor = '';
        }
        
        // Close tooltip when not hovering (unless editing)
        if (!lineEditMode && lineObj.tooltip) {
          lineObj.polyline.closeTooltip();
        }
      });
      
      // Store the line in our lines array
      lines.push(lineObj);
      
      // Automatically select the newly created line
      selectLine(lineObj);
      
      // Clean up temporary drawing elements
      map.removeLayer(currentLine);
      map.removeLayer(currentLineDistance);
      currentLine = null;
      currentLineDistance = null;
      
      // Reset drawing state
      mapEl.setAttribute('data-drawing', 'false');
      lineStartPoint = null;
    }
  });
  
  // Always prevent context menu on map when in eraser mode, when selecting a line, or when near a point
  mapEl.addEventListener('contextmenu', function(e) {
    if (eraserMode) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    
    // Check if right-clicking near a point
    const mouseLatLng = map.mouseEventToLatLng(e);
    const closestPoint = getClosestPoint(mouseLatLng);
    
    if (closestPoint) {
      // Get current item selection state
      const currentIcon = window.selectedItemIcon;
      const currentName = window.selectedItemName;
      
      // If we're near a point and have an item selected, place it at the point
      if (currentIcon) {
        createInteractiveMarker(
          closestPoint.latlng.lat,
          closestPoint.latlng.lng,
          currentName,
          currentIcon
        );
      }
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    
    // Prevent default context menu behavior for all elements
    // to make right-click line selection more reliable
    e.preventDefault();
    return false;
  });
  
  // Variables to track temporary suspension of placement mode
  let tempPlacementModeSuspended = false;
  
  // Variables to save item state during placement mode suspension
  let wasPlacementModeActive = false;
  let savedItemType = null;
  let savedItemName = null;
  let savedItemIcon = null;
  
  // Function to save current item selection state
  function saveItemSelectionState() {
    wasPlacementModeActive = window.placementModeActive;
    savedItemType = window.selectedItemType;
    savedItemName = window.selectedItemName;
    savedItemIcon = window.selectedItemIcon;
  }
  
  // Function to restore saved item selection state
  function restoreItemSelectionState() {
    window.placementModeActive = wasPlacementModeActive;
    window.selectedItemType = savedItemType;
    window.selectedItemName = savedItemName;
    window.selectedItemIcon = savedItemIcon;
  }
  
  // Check for proximity to lines during mouse movement
  map.on('mousemove', function(e) {
    // We need to handle the line tool specially to prevent creating new lines over existing ones
    if (eraserMode || lineEditMode) {
      return;
    }
    
    // First check if we're near a point
    const closestPoint = getClosestPoint(e.latlng);
    if (closestPoint) {
      // If near a point, don't suspend placement mode and show pointer cursor
      document.getElementById('map').style.cursor = 'pointer';
      
      // Restore placement mode if it was suspended
      if (tempPlacementModeSuspended) {
        tempPlacementModeSuspended = false;
        restoreItemSelectionState();
      }
      
      return; // Skip line proximity check when near a point
    }
    
    // Check if mouse is near any line
    let nearLine = false;
    let closestLine = null;
    let minDistance = Infinity;
    
    for (const line of lines) {
      const linePoints = line.polyline.getLatLngs();
      const p1 = map.latLngToContainerPoint(linePoints[0]);
      const p2 = map.latLngToContainerPoint(linePoints[1]);
      const mousePoint = map.latLngToContainerPoint(e.latlng);
      
      // Calculate distance from mouse to line segment
      const distance = distanceToLineSegment(p1.x, p1.y, p2.x, p2.y, mousePoint.x, mousePoint.y);
      
      // Track the closest line
      if (distance < minDistance) {
        minDistance = distance;
        closestLine = line;
      }
      
      // If mouse is within 15 pixels of a line, consider it near
      if (distance < 15) {
        nearLine = true;
      }
    }
    
    // If near a line, suspend placement mode and show pointer cursor
    if (nearLine) {
      document.getElementById('map').style.cursor = 'pointer';
      
      // If not already suspended, save current state and suspend
      if (!tempPlacementModeSuspended && window.placementModeActive) {
        // Save state before suspending
        saveItemSelectionState();
        tempPlacementModeSuspended = true;
        
        // Temporarily disable placement mode
        window.placementModeActive = false;
      }
    } else {
      // If not near a line and placement was suspended, restore it
      if (tempPlacementModeSuspended) {
        tempPlacementModeSuspended = false;
        restoreItemSelectionState();
        
        // Reset cursor if not in a special mode
        if (!eraserMode && !lineDrawingMode && !lineEditMode && !window.placementModeActive) {
          if (window.selectedItemIcon) {
            document.getElementById('map').style.cursor = 'crosshair';
          } else {
            document.getElementById('map').style.cursor = '';
          }
        }
      }
    }
  });
  
  // Handle click for line selection and point placement
  map.on('click', function(e) {
    // Remove debug statement in production
    // console.log("Item-placement.js map click handler called, pointToolActive:", window.pointToolActive);
    
    // Check if Point Tool is active
    if (window.pointToolActive) {
      // Flag to track whether a point was deleted - this prevents creating a new point
      // immediately after deleting an existing one
      let pointDeleted = false;
      
      // First check if we clicked on an existing point
      const clickPoint = map.latLngToContainerPoint(e.latlng);
      
      // Check each point to see if it was clicked
      for (let i = 0; i < window.points.length; i++) {
        const point = window.points[i];
        const pointPos = map.latLngToContainerPoint(point.latlng);
        
        // Calculate distance between click and point
        const dx = pointPos.x - clickPoint.x;
        const dy = pointPos.y - clickPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If click is within 15 pixels of a point, delete it
        if (distance < 15) {
          // Mark that we're deleting a point
          pointDeleted = true;
          
          // Remove from map
          map.removeLayer(point.marker);
          map.removeLayer(point.label);
          
          // Remove from global points array
          const pointId = point.id;
          window.points = window.points.filter(p => p.id !== pointId);
          
          // Also remove from parent line's points array if it exists
          for (const line of lines) {
            if (line.points) {
              line.points = line.points.filter(p => p.id !== pointId);
            }
          }
          
          // Add delete animation effect
          const deleteEffect = L.circleMarker(point.latlng, {
            radius: 10,
            color: '#ef4444',
            weight: 2,
            opacity: 0.9,
            fillOpacity: 0.3,
            className: 'snap-effect'
          }).addTo(map);
          
          // Remove the effect after animation completes
          setTimeout(() => {
            map.removeLayer(deleteEffect);
          }, 800);
          
          e.originalEvent.preventDefault();
          e.originalEvent.stopPropagation();
          
          // We found and deleted a point, so terminate further processing
          return false;
        }
      }
      
      // If we deleted a point, don't attempt to create a new one
      if (pointDeleted) {
        return false;
      }
      
      // If we didn't delete an existing point, check if click is near any line
      for (const line of lines) {
        const linePoints = line.polyline.getLatLngs();
        const p1 = map.latLngToContainerPoint(linePoints[0]);
        const p2 = map.latLngToContainerPoint(linePoints[1]);
        
        // Calculate distance from click to line segment
        const distance = distanceToLineSegment(p1.x, p1.y, p2.x, p2.y, clickPoint.x, clickPoint.y);
        
        // If distance is less than 15 pixels, place a point on the line
        if (distance < 15) {
          // Find the closest point on the line
          const closestPointOnLine = projectPointOnLine(
            p1.x, p1.y, p2.x, p2.y, clickPoint.x, clickPoint.y
          );
          
          // Convert back to latlng
          const latlng = map.containerPointToLatLng(L.point(closestPointOnLine.x, closestPointOnLine.y));
          
          // Create a segment point at the exact location on the line
          const label = `Point on line`;
          const newPoint = createSegmentPoint(latlng, label);
          
          // Add the new point to the line's points array
          if (!line.points) {
            line.points = [];
          }
          line.points.push(newPoint);
          
          // Add a visual "snap" effect with animation
          const snapEffect = L.circleMarker(latlng, {
            radius: 12,
            color: '#4ade80',
            weight: 3,
            opacity: 0.8,
            fillOpacity: 0.2
          }).addTo(map);
          
          // Animate the snap effect
          let counter = 0;
          const animateSnap = setInterval(() => {
            counter++;
            snapEffect.setRadius(12 - counter);
            snapEffect.setStyle({
              opacity: 0.8 - (counter * 0.1)
            });
            
            if (counter >= 8) {
              clearInterval(animateSnap);
              map.removeLayer(snapEffect);
            }
          }, 50);
          
          e.originalEvent.preventDefault();
          e.originalEvent.stopPropagation();
          return false;
        }
      }
      return;  // If Point Tool is active but no line or point was clicked, exit
    }
    
    // If not in point tool mode, check for line selection
    for (const line of lines) {
      const linePoints = line.polyline.getLatLngs();
      const p1 = map.latLngToContainerPoint(linePoints[0]);
      const p2 = map.latLngToContainerPoint(linePoints[1]);
      const clickPoint = map.latLngToContainerPoint(e.latlng);
      
      // Calculate distance from click to line segment
      const distance = distanceToLineSegment(p1.x, p1.y, p2.x, p2.y, clickPoint.x, clickPoint.y);
      
      // If distance is less than 15 pixels, select the line
      if (distance < 15) {
        // Save current selection state before suspending
        if (!tempPlacementModeSuspended) {
          saveItemSelectionState();
          tempPlacementModeSuspended = true;
        }
        window.placementModeActive = false;
        
        selectLine(line);
        e.originalEvent.preventDefault();
        e.originalEvent.stopPropagation();
        return false;
      }
    }
    
    // Check if clicking on a point for placement
    // Work whether placement mode is active or not, as long as an item is selected
    // Get current item selection state
    const currentIcon = window.selectedItemIcon;
    const currentName = window.selectedItemName;
    
    if (currentIcon) {
      const closestPoint = getClosestPoint(e.latlng);
      if (closestPoint) {
        // Place item at the point location
        createInteractiveMarker(
          closestPoint.latlng.lat,
          closestPoint.latlng.lng,
          currentName,
          currentIcon
        );
        // Prevent normal map click behavior
        e.originalEvent.stopPropagation();
        return false;
      }
    }
  });
  
  /**
   * Calculate the shortest distance from a point to a line segment
   * @param {number} x1 - Line start point x
   * @param {number} y1 - Line start point y
   * @param {number} x2 - Line end point x
   * @param {number} y2 - Line end point y
   * @param {number} px - Point x
   * @param {number} py - Point y
   * @returns {number} The shortest distance
   */
  function distanceToLineSegment(x1, y1, x2, y2, px, py) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;
    if (len_sq !== 0) param = dot / len_sq;
    
    let xx, yy;
    
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  /**
   * Project a point onto a line segment, finding the closest point on the line
   * @param {number} x1 - Line start point x
   * @param {number} y1 - Line start point y
   * @param {number} x2 - Line end point x
   * @param {number} y2 - Line end point y
   * @param {number} px - Point x
   * @param {number} py - Point y
   * @returns {Object} The closest point on the line as {x, y}
   */
  function projectPointOnLine(x1, y1, x2, y2, px, py) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;
    if (len_sq !== 0) param = dot / len_sq;
    
    let xx, yy;
    
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    return { x: xx, y: yy };
  }
  
  // Add escape key handler to exit all modes
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      exitPlacementMode();
      document.getElementById('item-selection-menu').style.display = 'none';
    }
  });
  
  // Add a document-wide click handler to detect clicks outside lines
  document.addEventListener('mousedown', function(e) {
    // Skip if we're in one of the special modes
    if (eraserMode || lineDrawingMode || lineEditMode || polygonDrawingMode || roadDrawingMode) {
      return;
    }
    
    // Skip if the click is on the line panel itself
    if (e.target.closest('#line-panel')) {
      return;
    }
    
    // Check if the click is on the map (not on UI elements)
    if (e.target.closest('#map')) {
      // Get the click location in map coordinates
      const clickPoint = map.mouseEventToLatLng(e);
      
      // Convert to screen coordinates for distance calculations
      const clickPixel = map.latLngToContainerPoint(clickPoint);
      
      // Flag to track if we clicked near any line
      let clickedNearLine = false;
      
      // Check if the click is near any line
      for (const line of lines) {
        const linePoints = line.polyline.getLatLngs();
        const p1 = map.latLngToContainerPoint(linePoints[0]);
        const p2 = map.latLngToContainerPoint(linePoints[1]);
        
        // Calculate distance from click to line segment
        const distance = distanceToLineSegment(p1.x, p1.y, p2.x, p2.y, clickPixel.x, clickPixel.y);
        
        // If distance is less than 15 pixels, we're clicking near a line
        if (distance < 15) {
          clickedNearLine = true;
          break;
        }
      }
      
      // Check if we clicked near any point
      const nearbyPoint = getClosestPoint(clickPoint, 20);
      if (nearbyPoint) {
        clickedNearLine = true;
      }
      
      // If we didn't click near any line or point, deselect the current line
      if (!clickedNearLine && selectedLine) {
        // Deselect the current line
        selectedLine.polyline.setStyle({ color: '#3b82f6', weight: 3 });
        
        // Remove handles
        removeLineHandles();
        
        // Hide the line panel
        document.getElementById('line-panel').style.display = 'none';
        
        // Reset the selected line
        selectedLine = null;
      }
    } else {
      // If we clicked outside the map entirely, deselect the line
      if (selectedLine) {
        // Deselect the current line
        selectedLine.polyline.setStyle({ color: '#3b82f6', weight: 3 });
        
        // Remove handles
        removeLineHandles();
        
        // Hide the line panel
        document.getElementById('line-panel').style.display = 'none';
        
        // Reset the selected line
        selectedLine = null;
      }
    }
  });
});

// Export functions if in a module environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    availableItems,
    initItemSelectionMenu,
    selectItem,
    toggleItemMenu,
    exitPlacementMode
  };
}