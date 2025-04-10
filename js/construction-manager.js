/**
 * Construction Manager - Handles saving and loading constructions with relative positions
 * 
 * This file provides functionality to save and load construction layouts with their relative positions.
 * It uses localStorage to persist saved constructions between sessions.
 */

// Make sure we have console available for debugging
if (!window.console) window.console = { log: function() {}, error: function() {} };

/**
 * Save the selected construction items with relative positions
 * @param {string} name - Name for the saved construction
 * @param {Array} selectedItems - Array of selected items (markers, lines, points)
 * @returns {Object} Saved construction object
 */
function saveConstruction(name, selectedItems, workAreaPoints = null) {
  // Filter out any undefined or null items
  selectedItems = selectedItems.filter(item => item);
  
  if (selectedItems.length === 0) {
    alert("No items to save");
    return null;
  }
  
  // Calculate bounds of all items to find the center point
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  
  selectedItems.forEach(item => {
    // Handle different types of items
    if (item instanceof L.Marker) {
      const pos = item.getLatLng();
      minLat = Math.min(minLat, pos.lat);
      maxLat = Math.max(maxLat, pos.lat);
      minLng = Math.min(minLng, pos.lng);
      maxLng = Math.max(maxLng, pos.lng);
    } else if (item.hasOwnProperty('polyline')) {
      // It's a line object
      const points = item.polyline.getLatLngs();
      points.forEach(pos => {
        minLat = Math.min(minLat, pos.lat);
        maxLat = Math.max(maxLat, pos.lat);
        minLng = Math.min(minLng, pos.lng);
        maxLng = Math.max(maxLng, pos.lng);
      });
    } else if (item.hasOwnProperty('marker') && item.hasOwnProperty('latlng')) {
      // It's a point object
      const pos = item.latlng;
      minLat = Math.min(minLat, pos.lat);
      maxLat = Math.max(maxLat, pos.lat);
      minLng = Math.min(minLng, pos.lng);
      maxLng = Math.max(maxLng, pos.lng);
    }
  });
  
  // Calculate center point
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  const referencePoint = { lat: centerLat, lng: centerLng };
  
  // Create the construction object
  const construction = {
    id: "construction_" + Date.now(),
    name: name,
    referencePoint: referencePoint,
    items: [],
    workArea: null // Will store work area if defined
  };
  
  // If work area points were provided, save them relative to the reference point
  if (workAreaPoints && workAreaPoints.length >= 3) {
    construction.workArea = [];
    
    // Save each point as distance and bearing from reference point
    workAreaPoints.forEach(point => {
      const distance = calculateDistance(referencePoint.lat, referencePoint.lng, point.lat, point.lng);
      const bearing = calculateBearing(referencePoint.lat, referencePoint.lng, point.lat, point.lng);
      
      construction.workArea.push({
        distance: distance,
        bearing: bearing
      });
    });
  }
  
  // Process each selected item and calculate relative position
  selectedItems.forEach(item => {
    if (item instanceof L.Marker) {
      // Handle marker
      const position = item.getLatLng();
      const distance = calculateDistance(referencePoint.lat, referencePoint.lng, position.lat, position.lng);
      const bearing = calculateBearing(referencePoint.lat, referencePoint.lng, position.lat, position.lng);
      
      // Get icon URL from marker
      let iconUrl = "";
      if (item._icon && item._icon.src) {
        iconUrl = item._icon.src.split('/').pop(); // Get just the filename
        iconUrl = "assets/" + iconUrl;
      }
      
      construction.items.push({
        type: "marker",
        distance: distance,
        bearing: bearing,
        itemData: {
          popupContent: item.getPopup() ? item.getPopup().getContent() : "",
          iconUrl: iconUrl
        }
      });
    } else if (item.hasOwnProperty('polyline')) {
      // Handle line
      const startPoint = item.startPoint;
      const endPoint = item.endPoint;
      
      // Calculate distances and bearings from reference point
      const startDistance = calculateDistance(referencePoint.lat, referencePoint.lng, startPoint.lat, startPoint.lng);
      const startBearing = calculateBearing(referencePoint.lat, referencePoint.lng, startPoint.lat, startPoint.lng);
      
      const endDistance = calculateDistance(referencePoint.lat, referencePoint.lng, endPoint.lat, endPoint.lng);
      const endBearing = calculateBearing(referencePoint.lat, referencePoint.lng, endPoint.lat, endPoint.lng);
      
      construction.items.push({
        type: "line",
        start: { 
          distance: startDistance, 
          bearing: startBearing
        },
        end: { 
          distance: endDistance, 
          bearing: endBearing
        },
        segmented: item.segmented || false,
        segmentDistance: item.segmentDistance || 10
      });
    } else if (item.hasOwnProperty('marker') && item.hasOwnProperty('latlng')) {
      // Handle point
      const position = item.latlng;
      const distance = calculateDistance(referencePoint.lat, referencePoint.lng, position.lat, position.lng);
      const bearing = calculateBearing(referencePoint.lat, referencePoint.lng, position.lat, position.lng);
      
      // Get label text if available
      let labelText = "Point";
      if (item.label && item.label._icon) {
        const divElement = item.label._icon.querySelector('div');
        if (divElement) {
          labelText = divElement.textContent;
        }
      }
      
      construction.items.push({
        type: "point",
        distance: distance,
        bearing: bearing,
        label: labelText
      });
    }
  });
  
  // Store in localStorage
  const savedConstructions = getSavedConstructions();
  savedConstructions.push(construction);
  localStorage.setItem("savedConstructions", JSON.stringify(savedConstructions));
  
  return construction;
}

/**
 * Get all saved constructions from localStorage
 * @returns {Array} Array of saved construction objects
 */
function getSavedConstructions() {
  try {
    console.log('Getting saved constructions from localStorage');
    const savedJSON = localStorage.getItem("savedConstructions");
    
    if (!savedJSON) {
      console.log('No savedConstructions found in localStorage');
      return [];
    }
    
    const parsed = JSON.parse(savedJSON);
    
    // Validate the data structure to prevent errors
    if (!Array.isArray(parsed)) {
      console.error('savedConstructions is not an array, resetting');
      localStorage.removeItem("savedConstructions");
      return [];
    }
    
    // Validate each construction object
    return parsed.filter(construction => {
      if (!construction || typeof construction !== 'object') {
        console.error('Invalid construction item found, skipping', construction);
        return false;
      }
      
      // Ensure required properties exist
      if (!construction.name) construction.name = 'Unnamed Construction';
      if (!construction.items || !Array.isArray(construction.items)) construction.items = [];
      
      return true;
    });
  } catch (error) {
    console.error('Error loading saved constructions:', error);
    // Clear corrupt data
    localStorage.removeItem("savedConstructions");
    return [];
  }
}

/**
 * Load a saved construction and place it at a specified location
 * @param {Object} construction - Saved construction object
 * @param {L.LatLng} targetLocation - Location where to place the construction
 * @param {number} rotationAngle - Angle in degrees to rotate the construction
 * @returns {Array} Array of created items (markers, lines, points)
 */
function loadConstruction(construction, targetLocation, rotationAngle = 0) {
  const createdItems = [];
  let workAreaPolygon = null;
  
  // Initialize inventory tracking
  const inventory = {};
  
  // If workArea is defined, create a polygon to represent it
  if (construction.workArea && construction.workArea.length >= 3) {
    const workAreaPoints = [];
    
    // Calculate the positions of each work area point
    construction.workArea.forEach(point => {
      // Apply rotation to the bearing
      const rotatedBearing = (point.bearing + rotationAngle) % 360;
      
      // Calculate new position
      const newPosition = calculateDestination(
        targetLocation.lat,
        targetLocation.lng,
        point.distance,
        rotatedBearing
      );
      
      workAreaPoints.push([newPosition.lat, newPosition.lng]);
    });
    
    // Create the work area polygon
    workAreaPolygon = L.polygon(workAreaPoints, {
      color: '#ff7800',
      weight: 2,
      fillColor: '#ff9933',
      fillOpacity: 0.2,
      dashArray: '5, 5'
    }).addTo(map);
    
    // Add to created items
    createdItems.push(workAreaPolygon);
  }
  
  // Place each item relative to the target location
  construction.items.forEach(item => {
    if (item.type === "marker") {
      // Apply rotation to the bearing
      const rotatedBearing = (item.bearing + rotationAngle) % 360;
      
      // Calculate new position based on distance and rotated bearing from target
      const newPosition = calculateDestination(
        targetLocation.lat, 
        targetLocation.lng, 
        item.distance,
        rotatedBearing
      );
      
      // Create marker
      const marker = createInteractiveMarker(
        newPosition.lat,
        newPosition.lng,
        item.itemData.popupContent,
        item.itemData.iconUrl
      );
      
      createdItems.push(marker);
      
      // Update inventory count
      const itemName = item.itemData.popupContent;
      const itemIcon = item.itemData.iconUrl;
      if (!inventory[itemName]) {
        inventory[itemName] = { count: 0, icon: itemIcon };
      }
      inventory[itemName].count++;
    } else if (item.type === "line") {
      // Apply rotation to the bearings for line start and end points
      const startRotatedBearing = (item.start.bearing + rotationAngle) % 360;
      const endRotatedBearing = (item.end.bearing + rotationAngle) % 360;
      
      // Calculate new positions for line start and end
      const newStart = calculateDestination(
        targetLocation.lat, 
        targetLocation.lng, 
        item.start.distance,
        startRotatedBearing
      );
      
      const newEnd = calculateDestination(
        targetLocation.lat, 
        targetLocation.lng, 
        item.end.distance,
        endRotatedBearing
      );
      
      // Create line using existing functionality
      const lineObj = {
        id: 'line_' + Date.now(),
        startPoint: L.latLng(newStart.lat, newStart.lng),
        endPoint: L.latLng(newEnd.lat, newEnd.lng),
        distance: calculateDistance(newStart.lat, newStart.lng, newEnd.lat, newEnd.lng),
        segmented: false,
        segments: [],
        points: []
      };
      
      // Create polyline
      lineObj.polyline = L.polyline([lineObj.startPoint, lineObj.endPoint], {
        color: '#3b82f6',
        weight: 3
      }).addTo(map);
      
      // Add distance label
      const midPoint = L.latLng(
        (lineObj.startPoint.lat + lineObj.endPoint.lat) / 2,
        (lineObj.startPoint.lng + lineObj.endPoint.lng) / 2
      );
      
      lineObj.distanceLabel = L.marker(midPoint, {
        icon: L.divIcon({
          className: 'distance-label',
          html: `<div style="background: rgba(255,255,255,0.7); padding: 3px 6px; border-radius: 3px; font-weight: bold;">${Math.round(lineObj.distance * 10) / 10} m</div>`,
          iconSize: [80, 20],
          iconAnchor: [40, 10]
        })
      }).addTo(map);
      
      // Add click handler
      lineObj.polyline.on('click', function(e) {
        selectLine(lineObj);
      });
      
      // Add line to global lines array
      lines.push(lineObj);
      
      // Apply segmentation if needed
      if (item.segmented && item.segmentDistance) {
        segmentLine(lineObj, item.segmentDistance);
      }
      
      createdItems.push(lineObj.polyline);
    } else if (item.type === "point") {
      // Apply rotation to the bearing
      const rotatedBearing = (item.bearing + rotationAngle) % 360;
      
      // Calculate new position
      const newPosition = calculateDestination(
        targetLocation.lat, 
        targetLocation.lng, 
        item.distance,
        rotatedBearing
      );
      
      // Create point
      const point = createSegmentPoint(
        L.latLng(newPosition.lat, newPosition.lng),
        item.label || "Point"
      );
      
      createdItems.push(point.marker);
    }
  });
  
  // Display the inventory
  displayInventory(inventory);
  
  return createdItems;
}

/**
 * Display inventory of construction items in the sidebar
 * @param {Object} inventory - Object containing item counts
 */
function displayInventory(inventory) {
  const inventoryPanel = document.getElementById('construction-inventory');
  const inventoryList = document.getElementById('inventory-list');
  const emptyMessage = document.getElementById('inventory-empty');
  
  // Clear previous items
  inventoryList.innerHTML = '';
  
  // Get items from inventory object
  const items = Object.keys(inventory);
  
  if (items.length === 0) {
    // Show empty message if no items
    emptyMessage.style.display = 'block';
    inventoryList.style.display = 'none';
  } else {
    // Hide empty message and show the list
    emptyMessage.style.display = 'none';
    inventoryList.style.display = 'block';
    
    // Create list items for each inventory item
    items.forEach(itemName => {
      const itemData = inventory[itemName];
      const li = document.createElement('li');
      
      // Create item name with icon
      const nameSpan = document.createElement('div');
      nameSpan.className = 'item-name';
      
      const icon = document.createElement('img');
      icon.src = itemData.icon;
      icon.className = 'item-icon';
      
      const name = document.createElement('span');
      name.textContent = itemName;
      
      nameSpan.appendChild(icon);
      nameSpan.appendChild(name);
      
      // Create count badge
      const countBadge = document.createElement('span');
      countBadge.className = 'item-count';
      countBadge.textContent = itemData.count;
      
      // Add elements to list item
      li.appendChild(nameSpan);
      li.appendChild(countBadge);
      
      // Add to the list
      inventoryList.appendChild(li);
    });
  }
  
  // Show the inventory panel
  inventoryPanel.style.display = 'block';
}

/**
 * Initialize UI elements for the Save Construction feature
 */
function initConstructionManager() {
  console.log('Initializing Construction Manager...');
  
  // Create a button container
  const buttonContainer = document.createElement('div');
  buttonContainer.id = 'construction-buttons';
  buttonContainer.className = 'button-container';
  buttonContainer.style.position = 'fixed';
  buttonContainer.style.bottom = '20px';
  buttonContainer.style.left = '100px'; // Position next to menu toggle button
  buttonContainer.style.zIndex = '1000';
  buttonContainer.style.display = 'flex';
  buttonContainer.style.gap = '10px';
  
  // Create Save Construction button
  const saveButton = document.createElement('button');
  saveButton.id = 'save-construction-btn';
  saveButton.innerHTML = '<ion-icon name="save-outline"></ion-icon><span>Save Construction</span>';
  saveButton.className = 'flex-center';
  saveButton.style.background = 'linear-gradient(135deg, #0d9488, #10b981)';
  saveButton.style.color = '#fff';
  saveButton.style.padding = '10px 15px';
  saveButton.style.borderRadius = '8px';
  saveButton.style.width = '50px';
  saveButton.style.overflow = 'hidden';
  saveButton.style.whiteSpace = 'nowrap';
  saveButton.style.display = 'inline-flex';
  saveButton.style.transition = 'width 0.3s, box-shadow 0.3s';
  
  // Expand on hover
  saveButton.addEventListener('mouseenter', function() {
    this.style.width = '180px';
    saveButton.querySelector('span').style.opacity = '1';
    saveButton.querySelector('span').style.display = 'block';
  });
  
  saveButton.addEventListener('mouseleave', function() {
    this.style.width = '50px';
    saveButton.querySelector('span').style.opacity = '0';
    saveButton.querySelector('span').style.display = 'none';
  });
  
  // Create Load Construction button
  const loadButton = document.createElement('button');
  loadButton.id = 'load-construction-btn';
  loadButton.innerHTML = '<ion-icon name="folder-open-outline"></ion-icon><span>Load Construction</span>';
  loadButton.className = 'flex-center';
  loadButton.style.background = 'linear-gradient(135deg, #6366f1, #8b5cf6)';
  loadButton.style.color = '#fff';
  loadButton.style.padding = '10px 15px';
  loadButton.style.borderRadius = '8px';
  loadButton.style.width = '50px';
  loadButton.style.overflow = 'hidden';
  loadButton.style.whiteSpace = 'nowrap';
  loadButton.style.display = 'inline-flex';
  loadButton.style.transition = 'width 0.3s, box-shadow 0.3s';
  
  // Expand on hover
  loadButton.addEventListener('mouseenter', function() {
    this.style.width = '180px';
    loadButton.querySelector('span').style.opacity = '1';
    loadButton.querySelector('span').style.display = 'block';
  });
  
  loadButton.addEventListener('mouseleave', function() {
    this.style.width = '50px';
    loadButton.querySelector('span').style.opacity = '0';
    loadButton.querySelector('span').style.display = 'none';
  });
  
  // Initial setup for button spans (for the hover effect)
  saveButton.querySelector('span').style.opacity = '0';
  saveButton.querySelector('span').style.display = 'none';
  saveButton.querySelector('span').style.marginLeft = '5px';
  saveButton.querySelector('span').style.transition = 'opacity 0.2s';
  
  loadButton.querySelector('span').style.opacity = '0';
  loadButton.querySelector('span').style.display = 'none';
  loadButton.querySelector('span').style.marginLeft = '5px';
  loadButton.querySelector('span').style.transition = 'opacity 0.2s';
  
  // Add buttons to container
  buttonContainer.appendChild(saveButton);
  buttonContainer.appendChild(loadButton);
  
  // Add container to document
  document.body.appendChild(buttonContainer);
  
  // Create modals for save/load functionality
  createConstructionModals();
  
  // Add button event listeners
  saveButton.addEventListener('click', function() {
    console.log('Save button clicked');
    handleSaveConstruction();
  });
  
  loadButton.addEventListener('click', function() {
    console.log('Load button clicked');
    handleLoadConstruction();
  });
}

/**
 * Create modals for save/load construction UI
 */
function createConstructionModals() {
  // Save Construction Modal
  const saveModal = document.createElement('div');
  saveModal.id = 'save-construction-modal';
  saveModal.className = 'custom-modal';
  
  saveModal.innerHTML = `
    <div class="custom-modal-content">
      <p>Save Construction</p>
      <div style="margin: 15px 0;">
        <div style="margin-bottom: 10px;">
          <label for="construction-name" style="display: block; margin-bottom: 5px; text-align: left;">Construction Name:</label>
          <input type="text" id="construction-name" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" placeholder="Enter a name for this construction">
        </div>
        <div style="margin-bottom: 10px; text-align: left;">
          <label style="display: block; margin-bottom: 5px;">Items to Include:</label>
          <div style="margin-bottom: 5px;">
            <input type="checkbox" id="include-markers" checked>
            <label for="include-markers">Markers (<span id="marker-count">0</span>)</label>
          </div>
          <div style="margin-bottom: 5px;">
            <input type="checkbox" id="include-lines" checked>
            <label for="include-lines">Lines (<span id="line-count">0</span>)</label>
          </div>
          <div style="margin-bottom: 15px;">
            <input type="checkbox" id="include-points" checked>
            <label for="include-points">Points (<span id="point-count">0</span>)</label>
          </div>
        </div>
        <div style="margin-bottom: 10px; text-align: left;">
          <button id="define-work-area-btn" style="width: 100%; padding: 8px; background: linear-gradient(135deg, #4f46e5, #6366f1); color: white; border: none; border-radius: 4px; cursor: pointer;">
            <ion-icon name="create-outline"></ion-icon> Define Work Area
          </button>
          <div id="work-area-status" style="margin-top: 5px; font-size: 12px; color: #666;">
            No work area defined
          </div>
        </div>
      </div>
      <div class="custom-modal-buttons">
        <button id="save-construction-confirm" style="background: linear-gradient(135deg, #0d9488, #10b981);">
          <ion-icon name="save-outline"></ion-icon> Save
        </button>
        <button id="save-construction-cancel" style="background: linear-gradient(135deg, #6c757d, #5a6268);">
          <ion-icon name="close-outline"></ion-icon> Cancel
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(saveModal);
  
  // Load Construction Modal
  const loadModal = document.createElement('div');
  loadModal.id = 'load-construction-modal';
  loadModal.className = 'custom-modal';
  
  loadModal.innerHTML = `
    <div class="custom-modal-content">
      <p>Load Construction</p>
      <div style="margin: 15px 0; max-height: 300px; overflow-y: auto;">
        <div id="constructions-list" style="margin-bottom: 15px; text-align: left;">
          <!-- Construction items will be dynamically added here -->
          <div style="text-align: center; color: #666;">(No saved constructions)</div>
        </div>
        <div style="margin-top: 15px; text-align: left;">
          <label style="display: block; margin-bottom: 5px;">Placement Method:</label>
          <div style="margin-bottom: 5px;">
            <input type="radio" id="place-click" name="place-method" checked>
            <label for="place-click">Click on map to place</label>
          </div>
          <div style="margin-bottom: 15px;">
            <input type="radio" id="place-center" name="place-method">
            <label for="place-center">Place at map center</label>
          </div>
        </div>
        <div style="margin-top: 15px; text-align: left;">
          <label for="rotation-angle" style="display: block; margin-bottom: 5px;">Rotation Angle:</label>
          <div style="display: flex; align-items: center;">
            <input type="range" id="rotation-angle" min="0" max="359" value="0" style="flex: 1; margin-right: 10px;">
            <span id="rotation-value">0°</span>
          </div>
        </div>
      </div>
      <div class="custom-modal-buttons">
        <button id="load-construction-confirm" style="background: linear-gradient(135deg, #6366f1, #8b5cf6);">
          <ion-icon name="folder-open-outline"></ion-icon> Load
        </button>
        <button id="train-construction-btn" style="background: linear-gradient(135deg, #10b981, #047857);">
          <ion-icon name="school-outline"></ion-icon> Train
        </button>
        <button id="load-construction-cancel" style="background: linear-gradient(135deg, #6c757d, #5a6268);">
          <ion-icon name="close-outline"></ion-icon> Cancel
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(loadModal);
  
  // Add event listeners
  document.getElementById('save-construction-cancel').addEventListener('click', function() {
    document.getElementById('save-construction-modal').style.display = 'none';
    // Reset work area selection mode
    if (window.workAreaSelectionMode) {
      exitWorkAreaSelectionMode();
    }
  });
  
  document.getElementById('load-construction-cancel').addEventListener('click', function() {
    document.getElementById('load-construction-modal').style.display = 'none';
  });
  
  document.getElementById('save-construction-confirm').addEventListener('click', confirmSaveConstruction);
  document.getElementById('load-construction-confirm').addEventListener('click', confirmLoadConstruction);
  document.getElementById('train-construction-btn').addEventListener('click', startTrainingMode);
  
  // Define work area button
  document.getElementById('define-work-area-btn').addEventListener('click', startWorkAreaSelection);
  
  // Update the rotation value display when the slider is moved
  document.getElementById('rotation-angle').addEventListener('input', function() {
    document.getElementById('rotation-value').textContent = this.value + '°';
  });
}

/**
 * Handle save construction button click
 */
function handleSaveConstruction() {
  // Check if we have items on the map
  if (allMarkers.length === 0 && lines.length === 0 && window.points.length === 0) {
    alert("No items on the map to save. Please place some items first.");
    return;
  }
  
  // Update counts in the modal
  document.getElementById('marker-count').textContent = allMarkers.length;
  document.getElementById('line-count').textContent = lines.length;
  document.getElementById('point-count').textContent = window.points.length;
  
  // Show the save modal
  const modal = document.getElementById('save-construction-modal');
  modal.style.display = 'flex';
  
  // Focus the name input
  setTimeout(() => {
    document.getElementById('construction-name').focus();
  }, 100);
}

// Global variables for work area selection
window.workAreaSelectionMode = false;
window.workAreaPoints = [];
window.workAreaTempMarkers = [];
window.workAreaTempPolygon = null;

/**
 * Start the work area selection mode
 */
function startWorkAreaSelection() {
  // Hide the save modal temporarily
  document.getElementById('save-construction-modal').style.display = 'none';
  
  // Set the work area selection mode
  window.workAreaSelectionMode = true;
  
  // Clear any previous points
  window.workAreaPoints = [];
  
  // Remove any temporary markers or polygons
  window.workAreaTempMarkers.forEach(marker => map.removeLayer(marker));
  window.workAreaTempMarkers = [];
  
  if (window.workAreaTempPolygon) {
    map.removeLayer(window.workAreaTempPolygon);
    window.workAreaTempPolygon = null;
  }
  
  // Change cursor to indicate selection mode
  document.getElementById('map').style.cursor = 'crosshair';
  
  // Show instructions
  alert("Work Area Selection Mode: Click on 4 points on the map to define the work area. You can select existing points or create new ones. Press ESC to cancel.");
  
  // Add a one-time escape key handler to exit selection mode
  const escHandler = function(e) {
    if (e.key === 'Escape') {
      exitWorkAreaSelectionMode();
      document.removeEventListener('keydown', escHandler);
    }
  };
  
  document.addEventListener('keydown', escHandler);
  
  // Override map click handler temporarily
  map.off('click');
  map.on('click', handleWorkAreaClick);
}

/**
 * Handle clicks during work area selection mode
 */
function handleWorkAreaClick(e) {
  if (!window.workAreaSelectionMode) return;
  
  const clickLatlng = e.latlng;
  
  // Check if click is near an existing point or marker
  const nearbyPoint = findNearestPointOrMarker(clickLatlng);
  const pointToAdd = nearbyPoint ? nearbyPoint : clickLatlng;
  
  // Add the point to our selection
  window.workAreaPoints.push(pointToAdd);
  
  // Add a visual marker
  const marker = L.circleMarker(pointToAdd, {
    radius: 6,
    color: '#ff7800',
    fillColor: '#ff9933',
    fillOpacity: 0.7,
    weight: 2
  }).addTo(map);
  
  window.workAreaTempMarkers.push(marker);
  
  // Add a label showing the point number
  const pointNumber = window.workAreaPoints.length;
  const label = L.marker(pointToAdd, {
    icon: L.divIcon({
      className: 'work-area-label',
      html: `<div style="background: #ff7800; color: white; border-radius: 50%; width: 20px; height: 20px; text-align: center; line-height: 20px; font-weight: bold;">${pointNumber}</div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    })
  }).addTo(map);
  
  window.workAreaTempMarkers.push(label);
  
  // If we have at least 3 points, draw a polygon
  if (window.workAreaPoints.length >= 3) {
    // Remove previous polygon if exists
    if (window.workAreaTempPolygon) {
      map.removeLayer(window.workAreaTempPolygon);
    }
    
    // Create a new polygon
    window.workAreaTempPolygon = L.polygon(window.workAreaPoints, {
      color: '#ff7800',
      weight: 2,
      fillColor: '#ff9933',
      fillOpacity: 0.2,
      dashArray: '5, 5'
    }).addTo(map);
  }
  
  // If we have 4 points, finish the selection
  if (window.workAreaPoints.length >= 4) {
    finishWorkAreaSelection();
  }
}

/**
 * Find the nearest point or marker to a given location
 */
function findNearestPointOrMarker(latlng) {
  const pixelThreshold = 20; // Consider points within 20 pixels as "near"
  let nearestPoint = null;
  let minDistance = Infinity;
  
  // Check existing points
  if (window.points && window.points.length > 0) {
    for (const point of window.points) {
      const pointPixel = map.latLngToContainerPoint(point.latlng);
      const clickPixel = map.latLngToContainerPoint(latlng);
      
      const dx = pointPixel.x - clickPixel.x;
      const dy = pointPixel.y - clickPixel.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < minDistance && distance < pixelThreshold) {
        minDistance = distance;
        nearestPoint = point.latlng;
      }
    }
  }
  
  // Check existing markers
  if (allMarkers && allMarkers.length > 0) {
    for (const marker of allMarkers) {
      const markerPixel = map.latLngToContainerPoint(marker.getLatLng());
      const clickPixel = map.latLngToContainerPoint(latlng);
      
      const dx = markerPixel.x - clickPixel.x;
      const dy = markerPixel.y - clickPixel.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < minDistance && distance < pixelThreshold) {
        minDistance = distance;
        nearestPoint = marker.getLatLng();
      }
    }
  }
  
  return nearestPoint;
}

/**
 * Finish the work area selection
 */
function finishWorkAreaSelection() {
  // Exit selection mode but keep the markers and polygon
  window.workAreaSelectionMode = false;
  
  // Reset cursor
  document.getElementById('map').style.cursor = '';
  
  // Remove temporary click handler
  map.off('click', handleWorkAreaClick);
  
  // Restore original map click handler
  map.on('click', async function (e) {
    // Map click handler in main.js
    
    // If the polygon options modal is open, do nothing.
    if (polygonModalOpen) return;
    
    // If road drawing mode is active, add points to road polygon
    if (roadDrawingMode) {
      // (rest of the original handler)
      return;
    }
    
    // If polygon drawing mode is active, add point to current polygon.
    if (polygonDrawingMode) {
      // (rest of the original handler)
      return;
    }
    
    // If placement mode is active, place the selected item
    if (placementModeActive && selectedItemIcon) {
      // (rest of the original handler)
      return;
    }
  });
  
  // Show success message and reopen the save modal
  alert("Work area defined successfully with 4 points! You can now save your construction with this work area.");
  
  // Update the work area status in the save modal
  document.getElementById('work-area-status').textContent = "Work area defined with 4 points";
  document.getElementById('work-area-status').style.color = "#10b981";
  
  // Show the save modal again
  document.getElementById('save-construction-modal').style.display = 'flex';
}

/**
 * Exit work area selection mode without saving
 */
function exitWorkAreaSelectionMode() {
  // Reset selection mode
  window.workAreaSelectionMode = false;
  
  // Clear work area points
  window.workAreaPoints = [];
  
  // Remove temporary markers and polygon
  window.workAreaTempMarkers.forEach(marker => map.removeLayer(marker));
  window.workAreaTempMarkers = [];
  
  if (window.workAreaTempPolygon) {
    map.removeLayer(window.workAreaTempPolygon);
    window.workAreaTempPolygon = null;
  }
  
  // Reset cursor
  document.getElementById('map').style.cursor = '';
  
  // Remove temporary click handler and restore original
  map.off('click', handleWorkAreaClick);
  
  // Show the save modal again
  document.getElementById('save-construction-modal').style.display = 'flex';
}

/**
 * Confirm saving a construction when the user clicks Save in the modal
 */
function confirmSaveConstruction() {
  const constructionName = document.getElementById('construction-name').value;
  if (!constructionName) {
    alert("Please enter a name for this construction.");
    return;
  }
  
  // Collect selected items
  const selectedItems = [];
  
  if (document.getElementById('include-markers').checked && allMarkers.length > 0) {
    selectedItems.push(...allMarkers);
  }
  
  if (document.getElementById('include-lines').checked && lines.length > 0) {
    selectedItems.push(...lines);
  }
  
  if (document.getElementById('include-points').checked && window.points.length > 0) {
    selectedItems.push(...window.points);
  }
  
  if (selectedItems.length === 0) {
    alert("Please select at least one type of item to include.");
    return;
  }
  
  // Get work area points if defined
  const workAreaPoints = window.workAreaPoints.length >= 4 ? window.workAreaPoints : null;
  
  // Save the construction
  const savedConstruction = saveConstruction(constructionName, selectedItems, workAreaPoints);
  
  if (savedConstruction) {
    // Confirm to user
    let successMessage = `Construction "${constructionName}" saved successfully with ${savedConstruction.items.length} items`;
    if (savedConstruction.workArea) {
      successMessage += " and a defined work area";
    }
    successMessage += ".";
    
    alert(successMessage);
    
    // Close modal
    document.getElementById('save-construction-modal').style.display = 'none';
    
    // Clean up any work area visual elements
    window.workAreaTempMarkers.forEach(marker => map.removeLayer(marker));
    window.workAreaTempMarkers = [];
    
    if (window.workAreaTempPolygon) {
      map.removeLayer(window.workAreaTempPolygon);
      window.workAreaTempPolygon = null;
    }
    
    // Reset work area data
    window.workAreaPoints = [];
  }
}

/**
 * Handle load construction button click
 */
function handleLoadConstruction() {
  console.log('handleLoadConstruction called');
  
  // Get existing saved constructions
  const savedConstructions = getSavedConstructions();
  console.log('Saved constructions:', savedConstructions);
  
  if (savedConstructions.length === 0) {
    alert("No saved constructions found. Save a construction first.");
    return;
  }
  
  // Update the constructions list in the modal
  const constructionsList = document.getElementById('constructions-list');
  if (!constructionsList) {
    console.error('Could not find constructions-list element');
    return;
  }
  
  constructionsList.innerHTML = '';
  
  savedConstructions.forEach((construction, index) => {
    const constructionItem = document.createElement('div');
    constructionItem.style.marginBottom = '10px';
    constructionItem.style.padding = '8px';
    constructionItem.style.border = '1px solid #ddd';
    constructionItem.style.borderRadius = '4px';
    
    constructionItem.innerHTML = `
      <input type="radio" name="construction" id="construction-${index}" value="${index}" ${index === 0 ? 'checked' : ''}>
      <label for="construction-${index}">
        <strong>${construction.name || 'Unnamed Construction'}</strong> (${construction.items && construction.items.length ? construction.items.length : 0} items)
      </label>
      <button class="delete-construction-btn" data-index="${index}" style="float: right; background: #dc3545; color: white; border: none; border-radius: 4px; padding: 2px 5px; cursor: pointer;">
        <ion-icon name="trash-outline" style="font-size: 14px;"></ion-icon>
      </button>
    `;
    
    constructionsList.appendChild(constructionItem);
  });
  
  // Add delete button event listeners
  document.querySelectorAll('.delete-construction-btn').forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const index = parseInt(this.getAttribute('data-index'));
      deleteConstruction(index);
    });
  });
  
  // Show the load modal
  const loadModal = document.getElementById('load-construction-modal');
  if (!loadModal) {
    console.error('Could not find load-construction-modal element');
    return;
  }
  
  loadModal.style.display = 'flex';
  console.log('Load modal displayed');
}

/**
 * Delete a saved construction
 * @param {number} index - Index of the construction to delete
 */
function deleteConstruction(index) {
  const savedConstructions = getSavedConstructions();
  
  if (confirm(`Are you sure you want to delete the construction "${savedConstructions[index].name}"?`)) {
    savedConstructions.splice(index, 1);
    localStorage.setItem("savedConstructions", JSON.stringify(savedConstructions));
    
    // Re-render the list or close the modal if empty
    if (savedConstructions.length === 0) {
      alert("No more saved constructions.");
      document.getElementById('load-construction-modal').style.display = 'none';
    } else {
      handleLoadConstruction(); // Refresh the list
    }
  }
}

/**
 * Confirm loading a construction when the user clicks Load in the modal
 */
function confirmLoadConstruction() {
  // Get selected construction
  const selectedRadio = document.querySelector('input[name="construction"]:checked');
  if (!selectedRadio) {
    alert("Please select a construction to load.");
    return;
  }
  
  const selectedIndex = parseInt(selectedRadio.value);
  const savedConstructions = getSavedConstructions();
  const selectedConstruction = savedConstructions[selectedIndex];
  
  // Get placement method
  const placeOnClick = document.getElementById('place-click').checked;
  
  // Get rotation angle
  const rotationAngle = parseInt(document.getElementById('rotation-angle').value) || 0;
  
  // Close the modal
  document.getElementById('load-construction-modal').style.display = 'none';
  
  if (placeOnClick) {
    // Set map cursor to crosshair
    document.getElementById('map').style.cursor = 'crosshair';
    
    // Set mode for click placement
    map.closePopup();
    alert(`Click on the map where you want to place "${selectedConstruction.name}" with ${rotationAngle}° rotation.`);
    
    // Create one-time click handler for placement
    const clickHandler = function(e) {
      const items = loadConstruction(selectedConstruction, e.latlng, rotationAngle);
      
      // Reset cursor
      document.getElementById('map').style.cursor = '';
      
      // Create a feature group and fit bounds
      const group = L.featureGroup(items);
      map.fitBounds(group.getBounds().pad(0.2));
      
      alert(`Construction "${selectedConstruction.name}" placed with ${items.length} items and ${rotationAngle}° rotation.`);
    };
    
    // Attach the click handler
    map.once('click', clickHandler);
  } else {
    // Place at map center
    const center = map.getCenter();
    const items = loadConstruction(selectedConstruction, center, rotationAngle);
    
    // Create a feature group and fit bounds
    const group = L.featureGroup(items);
    map.fitBounds(group.getBounds().pad(0.2));
    
    alert(`Construction "${selectedConstruction.name}" placed at map center with ${items.length} items and ${rotationAngle}° rotation.`);
  }
}

/**
 * Start the training mode for a construction
 */
function startTrainingMode() {
  // Get selected construction
  const selectedRadio = document.querySelector('input[name="construction"]:checked');
  if (!selectedRadio) {
    alert("Please select a construction to train.");
    return;
  }
  
  const selectedIndex = parseInt(selectedRadio.value);
  const savedConstructions = getSavedConstructions();
  const selectedConstruction = savedConstructions[selectedIndex];
  
  // Close the load modal
  document.getElementById('load-construction-modal').style.display = 'none';
  
  // Create training sidebar if it doesn't exist
  if (!document.getElementById('training-sidebar')) {
    createTrainingSidebar();
  }
  
  // Initialize training state
  window.trainingState = {
    construction: selectedConstruction,
    currentVariation: 0,
    totalVariations: 10,
    variationItems: [],
    pointVarianceRadii: [10, 10, 10, 10], // Default variance radii for each of the 4 points
    referencePointIndex: 0, // Default reference point is the first point
    workAreaPoints: [],
    originalUIElements: []
  };
  
  // Hide original UI elements
  hideOriginalUI();
  
  // If construction has a work area, use it for training
  if (selectedConstruction.workArea && selectedConstruction.workArea.length >= 4) {
    // Convert relative positions to absolute
    const referencePoint = selectedConstruction.referencePoint;
    const workAreaPoints = [];
    
    // Store original work area specification for generating variations
    const originalWorkArea = selectedConstruction.workArea.map(point => {
      return {
        distance: point.distance,
        bearing: point.bearing
      };
    });
    
    selectedConstruction.workArea.forEach(point => {
      const position = calculateDestination(
        referencePoint.lat,
        referencePoint.lng,
        point.distance,
        point.bearing
      );
      workAreaPoints.push(position);
    });
    
    // Store both work area points and original spec for variations
    window.trainingState.workAreaPoints = workAreaPoints;
    window.trainingState.originalWorkArea = originalWorkArea;
    window.trainingState.referencePoint = referencePoint;
    
    // Generate first variation
    generateVariation();
  } else {
    alert("This construction does not have a defined work area with 4 points. Please select another construction or define a work area for this one.");
    exitTrainingMode();
  }
}

/**
 * Create the training sidebar UI
 */
function createTrainingSidebar() {
  const sidebar = document.createElement('div');
  sidebar.id = 'training-sidebar';
  sidebar.style.position = 'fixed';
  sidebar.style.right = '20px';
  sidebar.style.top = '20px';
  sidebar.style.bottom = '20px';
  sidebar.style.width = '300px';
  sidebar.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
  sidebar.style.borderRadius = '8px';
  sidebar.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  sidebar.style.padding = '15px';
  sidebar.style.zIndex = '1000';
  sidebar.style.overflowY = 'auto';
  sidebar.style.display = 'none';
  
  sidebar.innerHTML = `
    <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
      <h3 style="margin: 0; color: #333; font-size: 18px;">Training Mode</h3>
      <button id="exit-training-btn" style="background: #f43f5e; color: white; border: none; border-radius: 4px; padding: 5px 10px; cursor: pointer;">
        <ion-icon name="exit-outline"></ion-icon> Exit
      </button>
    </div>
    
    <div style="margin-bottom: 15px; text-align: center;">
      <div style="font-weight: bold; margin-bottom: 8px;">Variation <span id="current-variation">1</span> / <span id="total-variations">10</span></div>
      <div style="margin-bottom: 8px; color: #6366f1;">Current Rotation: <span id="current-rotation">0</span>°</div>
      <button id="next-variation-btn" style="background: linear-gradient(135deg, #10b981, #047857); color: white; border: none; border-radius: 4px; padding: 8px 15px; width: 100%; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 5px; margin-bottom: 10px;">
        <ion-icon name="arrow-forward-outline"></ion-icon> Generate Next Variation
      </button>
      <button id="generate-samples-btn" style="background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; border: none; border-radius: 4px; padding: 8px 15px; width: 100%; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 5px;">
        <ion-icon name="document-text-outline"></ion-icon> Generate 5000 Samples
      </button>
    </div>
    
    <div style="margin-bottom: 15px; border-top: 1px solid #ddd; padding-top: 15px;">
      <label style="display: block; margin-bottom: 10px; font-weight: bold;">Reference Point:</label>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">
        <button id="ref-point-1" class="ref-point-btn ref-point-selected" data-index="0">Point 1</button>
        <button id="ref-point-2" class="ref-point-btn" data-index="1">Point 2</button>
        <button id="ref-point-3" class="ref-point-btn" data-index="2">Point 3</button>
        <button id="ref-point-4" class="ref-point-btn" data-index="3">Point 4</button>
      </div>
      <p style="font-size: 12px; color: #666; margin-top: 5px;">The reference point will remain fixed while others vary.</p>
    </div>
    
    <div style="border-top: 1px solid #ddd; padding-top: 15px;">
      <label style="display: block; margin-bottom: 10px; font-weight: bold;">Variance Controls:</label>
      
      <div style="margin-bottom: 15px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <label for="point-1-variance">Point 1 Variance:</label>
          <span id="point-1-variance-value" style="font-weight: bold;">10m</span>
        </div>
        <input type="range" id="point-1-variance" min="0" max="50" value="10" class="variance-slider" style="width: 100%;">
      </div>
      
      <div style="margin-bottom: 15px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <label for="point-2-variance">Point 2 Variance:</label>
          <span id="point-2-variance-value" style="font-weight: bold;">10m</span>
        </div>
        <input type="range" id="point-2-variance" min="0" max="50" value="10" class="variance-slider" style="width: 100%;">
      </div>
      
      <div style="margin-bottom: 15px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <label for="point-3-variance">Point 3 Variance:</label>
          <span id="point-3-variance-value" style="font-weight: bold;">10m</span>
        </div>
        <input type="range" id="point-3-variance" min="0" max="50" value="10" class="variance-slider" style="width: 100%;">
      </div>
      
      <div style="margin-bottom: 15px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <label for="point-4-variance">Point 4 Variance:</label>
          <span id="point-4-variance-value" style="font-weight: bold;">10m</span>
        </div>
        <input type="range" id="point-4-variance" min="0" max="50" value="10" class="variance-slider" style="width: 100%;">
      </div>
    </div>
  `;
  
  document.body.appendChild(sidebar);
  
  // Add CSS for reference point buttons
  const style = document.createElement('style');
  style.textContent = `
    .ref-point-btn {
      padding: 8px 12px;
      border: 1px solid #ccc;
      background: #f5f5f5;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    }
    .ref-point-selected {
      background: #10b981;
      color: white;
      border-color: #047857;
    }
    .variance-slider {
      -webkit-appearance: none;
      height: 8px;
      border-radius: 4px;
      background: #e5e7eb;
      outline: none;
    }
    .variance-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #3b82f6;
      cursor: pointer;
    }
    .variance-slider::-moz-range-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #3b82f6;
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);
  
  // Add event listeners for sidebar
  document.getElementById('exit-training-btn').addEventListener('click', exitTrainingMode);
  document.getElementById('next-variation-btn').addEventListener('click', generateVariation);
  document.getElementById('generate-samples-btn').addEventListener('click', generateSamples);
  
  // Add event listeners for reference point buttons
  document.querySelectorAll('.ref-point-btn').forEach(button => {
    button.addEventListener('click', function() {
      // Update selected reference point
      document.querySelectorAll('.ref-point-btn').forEach(btn => {
        btn.classList.remove('ref-point-selected');
      });
      this.classList.add('ref-point-selected');
      
      // Update reference point in training state
      window.trainingState.referencePointIndex = parseInt(this.getAttribute('data-index'));
      
      // Regenerate variation with new reference point
      generateVariation();
    });
  });
  
  // Add event listeners for variance sliders
  for (let i = 1; i <= 4; i++) {
    document.getElementById(`point-${i}-variance`).addEventListener('input', function() {
      const value = this.value;
      document.getElementById(`point-${i}-variance-value`).textContent = value + 'm';
      window.trainingState.pointVarianceRadii[i-1] = parseInt(value);
    });
  }
}

/**
 * Hide original UI elements
 */
function hideOriginalUI() {
  // Store and hide UI elements
  const elements = [
    document.getElementById('construction-buttons'),
    document.getElementById('item-panel'),
    document.querySelector('.leaflet-bar'),
    document.getElementById('construction-inventory')
  ];
  
  elements.forEach(element => {
    if (element) {
      window.trainingState.originalUIElements.push({
        element: element,
        display: element.style.display
      });
      element.style.display = 'none';
    }
  });
  
  // Show the training sidebar
  document.getElementById('training-sidebar').style.display = 'block';
}

/**
 * Exit training mode and restore original UI
 */
function exitTrainingMode() {
  // Clean up current variation
  if (window.trainingState && window.trainingState.variationItems) {
    window.trainingState.variationItems.forEach(item => {
      if (item.remove) {
        item.remove();
      } else if (map.hasLayer(item)) {
        map.removeLayer(item);
      }
    });
  }
  
  // Hide training sidebar
  document.getElementById('training-sidebar').style.display = 'none';
  
  // Restore original UI elements
  if (window.trainingState && window.trainingState.originalUIElements) {
    window.trainingState.originalUIElements.forEach(item => {
      item.element.style.display = item.display;
    });
  }
}

/**
 * Generate a new random variation of the construction
 */
function generateVariation() {
  // First completely clean up ALL items from the map
  
  // 1. Clear any variationItems from previous training iterations
  if (window.trainingState.variationItems) {
    window.trainingState.variationItems.forEach(item => {
      if (item.remove) {
        item.remove();
      } else if (map.hasLayer(item)) {
        map.removeLayer(item);
      }
    });
  }
  window.trainingState.variationItems = [];
  
  // 2. Clean up all markers
  if (typeof allMarkers !== 'undefined') {
    allMarkers.forEach(marker => {
      if (map.hasLayer(marker)) {
        map.removeLayer(marker);
      }
    });
    allMarkers = [];
  }
  
  // 3. Clean up all lines and their components
  if (typeof lines !== 'undefined') {
    lines.forEach(line => {
      if (line.polyline && map.hasLayer(line.polyline)) {
        map.removeLayer(line.polyline);
      }
      if (line.distanceLabel && map.hasLayer(line.distanceLabel)) {
        map.removeLayer(line.distanceLabel);
      }
      if (line.segments) {
        line.segments.forEach(segment => {
          if (map.hasLayer(segment)) {
            map.removeLayer(segment);
          }
        });
      }
    });
    lines = [];
  }
  
  // 4. Clean up any points
  if (window.points && window.points.length) {
    window.points.forEach(point => {
      if (point.marker && map.hasLayer(point.marker)) {
        map.removeLayer(point.marker);
      }
      if (point.label && map.hasLayer(point.label)) {
        map.removeLayer(point.label);
      }
    });
    window.points = [];
  }
  
  // 5. Clear any existing work area polygons
  map.eachLayer(function(layer) {
    if (layer instanceof L.Polygon) {
      map.removeLayer(layer);
    }
  });
  
  // 1. FIRST: Generate random rotation angle for the construction
  const rotationAngle = Math.floor(Math.random() * 360);
  
  // Update the rotation display
  document.getElementById('current-rotation').textContent = rotationAngle;
  
  // Store the rotation angle in the training state
  window.trainingState.currentRotation = rotationAngle;
  
  // 2. SECOND: Place the original construction with random rotation at the map center
  const construction = window.trainingState.construction;
  const mapCenter = map.getCenter();
  
  // Load the construction - this will place the work area polygon and all items
  const items = loadConstruction(construction, mapCenter, rotationAngle);
  
  // Store reference to the loaded items
  window.trainingState.variationItems.push(...items);
  
  // 3. THIRD: Find the work area polygon that was created from loadConstruction
  let workAreaPolygon = null;
  let originalWorkAreaPoints = [];
  
  // Look through items to find the work area polygon
  for (const item of items) {
    if (item instanceof L.Polygon) {
      workAreaPolygon = item;
      // Get the latlngs from the polygon
      originalWorkAreaPoints = workAreaPolygon.getLatLngs()[0];
      break;
    }
  }
  
  // Remove the original work area polygon since we'll create a new, varied one
  if (workAreaPolygon) {
    map.removeLayer(workAreaPolygon);
    // Remove it from the variationItems array
    const index = window.trainingState.variationItems.indexOf(workAreaPolygon);
    if (index > -1) {
      window.trainingState.variationItems.splice(index, 1);
    }
  }
  
  // If we don't have 4 points, something went wrong - exit
  if (!originalWorkAreaPoints || originalWorkAreaPoints.length < 4) {
    console.error("Could not find valid work area polygon points");
    return;
  }
  
  // 4. FOURTH: Create a varied work area based on the loaded construction's polygon points
  const refPointIndex = window.trainingState.referencePointIndex;
  const referencePoint = originalWorkAreaPoints[refPointIndex];
  
  // Create varied work area points, keeping the reference point fixed
  const variedPoints = [];
  
  for (let i = 0; i < originalWorkAreaPoints.length; i++) {
    if (i === refPointIndex) {
      // Keep reference point unchanged
      variedPoints.push(L.latLng(referencePoint.lat, referencePoint.lng));
    } else {
      // Vary other points
      const originalPoint = originalWorkAreaPoints[i];
      const varianceRadius = window.trainingState.pointVarianceRadii[i];
      
      // Random distance within the variance radius
      const distance = Math.random() * varianceRadius;
      // Random angle in radians
      const angle = Math.random() * 2 * Math.PI;
      
      // Calculate new point with variation
      const dx = distance * Math.cos(angle);
      const dy = distance * Math.sin(angle);
      
      // Convert dx/dy (meters) to lat/lng changes
      // 111,000 meters per degree of latitude (approximate)
      const latChange = dy / 111000;
      // 111,000 * cos(lat) meters per degree of longitude (approximate)
      const lngChange = dx / (111000 * Math.cos(originalPoint.lat * Math.PI / 180));
      
      variedPoints.push(L.latLng(
        originalPoint.lat + latChange,
        originalPoint.lng + lngChange
      ));
    }
  }
  
  // 5. FIFTH: Create a new polygon for the varied work area
  const variedWorkAreaPolygon = L.polygon(variedPoints, {
    color: '#ff7800',
    weight: 2,
    fillColor: '#ff9933',
    fillOpacity: 0.2,
    dashArray: '5, 5'
  }).addTo(map);
  
  window.trainingState.variationItems.push(variedWorkAreaPolygon);
  
  // Create markers for the points with labels
  for (let i = 0; i < variedPoints.length; i++) {
    const isReference = (i === refPointIndex);
    
    // Create marker
    const marker = L.circleMarker(variedPoints[i], {
      radius: isReference ? 8 : 6,
      color: isReference ? '#e11d48' : '#ff7800',
      fillColor: isReference ? '#f43f5e' : '#ff9933',
      fillOpacity: 0.7,
      weight: 2
    }).addTo(map);
    
    // Add label
    const label = L.marker(variedPoints[i], {
      icon: L.divIcon({
        className: 'work-area-label',
        html: `<div style="background: ${isReference ? '#e11d48' : '#ff7800'}; color: white; border-radius: 50%; width: 20px; height: 20px; text-align: center; line-height: 20px; font-weight: bold;">${i+1}${isReference ? '*' : ''}</div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      })
    }).addTo(map);
    
    window.trainingState.variationItems.push(marker);
    window.trainingState.variationItems.push(label);
  }
  
  // Update variation counter
  window.trainingState.currentVariation++;
  document.getElementById('current-variation').textContent = window.trainingState.currentVariation;
  document.getElementById('total-variations').textContent = window.trainingState.totalVariations;
  
  // Create a feature group and fit bounds
  const group = L.featureGroup([...items, variedWorkAreaPolygon]);
  map.fitBounds(group.getBounds().pad(0.2));
}

/**
 * Generate a large number of training samples and save as CSV
 */
function generateSamples() {
  const numSamples = 5000;
  const refPointIndex = window.trainingState.referencePointIndex;
  
  // First, ensure we have the work area data
  if (!window.trainingState.originalWorkArea) {
    // We need to load a construction first to get work area data
    // Generate one variation to initialize the data we need
    const constructionData = window.trainingState.construction;
    const workAreaPoints = window.trainingState.workAreaPoints;
    
    if (!workAreaPoints || workAreaPoints.length < 4) {
      alert("Please make sure the construction has a valid work area with 4 points before generating samples.");
      return;
    }
    
    // Force a variation generation to make sure all needed data is present
    generateVariation();
  }
  
  // Create a progress modal
  const progressModal = document.createElement('div');
  progressModal.id = 'progress-modal';
  progressModal.style.position = 'fixed';
  progressModal.style.top = '50%';
  progressModal.style.left = '50%';
  progressModal.style.transform = 'translate(-50%, -50%)';
  progressModal.style.backgroundColor = 'white';
  progressModal.style.padding = '20px';
  progressModal.style.borderRadius = '8px';
  progressModal.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  progressModal.style.zIndex = '2000';
  progressModal.style.width = '300px';
  progressModal.style.textAlign = 'center';
  
  progressModal.innerHTML = `
    <h3 style="margin-top: 0;">Generating Samples</h3>
    <div style="margin: 15px 0;">
      <div id="progress-text">Preparing... (0/${numSamples})</div>
      <div style="background-color: #eee; height: 20px; border-radius: 10px; margin-top: 10px; overflow: hidden;">
        <div id="progress-bar" style="background: linear-gradient(90deg, #3b82f6, #2563eb); height: 100%; width: 0%;"></div>
      </div>
    </div>
    <button id="cancel-samples-btn" style="background: #ef4444; color: white; border: none; border-radius: 4px; padding: 8px 15px; cursor: pointer;">
      Cancel
    </button>
  `;
  
  document.body.appendChild(progressModal);
  
  // Add cancel button event listener
  document.getElementById('cancel-samples-btn').addEventListener('click', function() {
    window.cancelSampleGeneration = true;
    progressModal.innerHTML = `
      <h3 style="margin-top: 0;">Cancelling...</h3>
      <p>Stopping sample generation, please wait...</p>
    `;
  });
  
  // Create an array to hold the samples
  const samples = [];
  
  // CSV header
  let csvContent = "construction_name,construction_rotation,construction_center_lat,construction_center_lng,reference_point_lat,reference_point_lng,point2_lat,point2_lng,point3_lat,point3_lng,point4_lat,point4_lng\n";
  
  // Reset cancel flag
  window.cancelSampleGeneration = false;
  
  // Function to update progress
  function updateProgress(current) {
    const percentage = (current / numSamples) * 100;
    document.getElementById('progress-text').textContent = `Generating... (${current}/${numSamples})`;
    document.getElementById('progress-bar').style.width = `${percentage}%`;
  }
  
  // Function to generate samples in batches to avoid UI freezing
  function generateBatch(startIndex, batchSize) {
    return new Promise(resolve => {
      setTimeout(() => {
        for (let i = 0; i < batchSize; i++) {
          if (window.cancelSampleGeneration) {
            resolve(startIndex + i);
            return;
          }
          
          if (startIndex + i >= numSamples) {
            resolve(numSamples);
            return;
          }
          
          // Generate random rotation
          const rotationAngle = Math.floor(Math.random() * 360);
          
          // Get the original construction and its details
          const construction = window.trainingState.construction;
          
          // Get the construction and check if we have work area data
          if (!window.trainingState.originalWorkArea || !window.trainingState.originalWorkArea.length) {
            console.error("Original work area data not found");
            window.cancelSampleGeneration = true;
            resolve(startIndex + i);
            return;
          }
          
          // Create sample work area points
          const originalWorkArea = window.trainingState.originalWorkArea;
          const mapCenter = map.getCenter();
          const workAreaPoints = [];
          
          // Generate a random position offset for the construction center
          const positionOffsetDistance = Math.random() * 30; // Random distance up to 30 meters
          const positionOffsetAngle = Math.random() * 360; // Random angle
          
          // Calculate new center with offset
          const constructionCenter = calculateDestination(
            mapCenter.lat,
            mapCenter.lng,
            positionOffsetDistance,
            positionOffsetAngle
          );
          
          // Calculate base points from original work area spec using the new center
          for (let j = 0; j < originalWorkArea.length; j++) {
            const point = calculateDestination(
              constructionCenter.lat,
              constructionCenter.lng,
              originalWorkArea[j].distance,
              originalWorkArea[j].bearing + rotationAngle
            );
            workAreaPoints.push(point);
          }
          
          // Now apply variance to non-reference points
          const variedPoints = [];
          
          for (let j = 0; j < workAreaPoints.length; j++) {
            if (j === refPointIndex) {
              // Keep reference point unchanged
              variedPoints.push(workAreaPoints[j]);
            } else {
              // Apply variance
              const originalPoint = workAreaPoints[j];
              const varianceRadius = window.trainingState.pointVarianceRadii[j];
              
              // Random distance within the variance radius
              const distance = Math.random() * varianceRadius;
              // Random angle in radians
              const angle = Math.random() * 2 * Math.PI;
              
              // Calculate new point with variation
              const dx = distance * Math.cos(angle);
              const dy = distance * Math.sin(angle);
              
              // Convert dx/dy (meters) to lat/lng changes
              const latChange = dy / 111000;
              const lngChange = dx / (111000 * Math.cos(originalPoint.lat * Math.PI / 180));
              
              variedPoints.push({
                lat: originalPoint.lat + latChange,
                lng: originalPoint.lng + lngChange
              });
            }
          }
          
          // Now reorder points to start with reference point, then go clockwise
          const orderedPoints = [];
          orderedPoints.push(variedPoints[refPointIndex]); // First the reference point
          
          // Calculate angles for the remaining points relative to reference point
          const remainingPoints = variedPoints.filter((_, idx) => idx !== refPointIndex);
          const refLat = variedPoints[refPointIndex].lat;
          const refLng = variedPoints[refPointIndex].lng;
          
          // Calculate angles for sorting
          const pointsWithAngles = remainingPoints.map(point => {
            const angle = Math.atan2(
              point.lat - refLat,
              point.lng - refLng
            );
            return { point, angle };
          });
          
          // Sort by angle (clockwise from reference point)
          pointsWithAngles.sort((a, b) => a.angle - b.angle);
          
          // Add sorted points to ordered array
          pointsWithAngles.forEach(p => orderedPoints.push(p.point));
          
          // Add to samples array
          samples.push({
            constructionName: construction.name,
            rotationAngle: rotationAngle,
            constructionCenter: constructionCenter,
            referencePoint: orderedPoints[0],
            point2: orderedPoints[1],
            point3: orderedPoints[2],
            point4: orderedPoints[3]
          });
          
          // Add to CSV
          csvContent += `${construction.name},${rotationAngle},${constructionCenter.lat},${constructionCenter.lng},${orderedPoints[0].lat},${orderedPoints[0].lng},${orderedPoints[1].lat},${orderedPoints[1].lng},${orderedPoints[2].lat},${orderedPoints[2].lng},${orderedPoints[3].lat},${orderedPoints[3].lng}\n`;
        }
        
        updateProgress(startIndex + batchSize);
        resolve(startIndex + batchSize);
      }, 0);
    });
  }
  
  // Generate samples in batches of 100
  async function runGeneration() {
    const batchSize = 100;
    let currentIndex = 0;
    
    while (currentIndex < numSamples && !window.cancelSampleGeneration) {
      currentIndex = await generateBatch(currentIndex, batchSize);
    }
    
    // Samples generation complete or cancelled
    if (window.cancelSampleGeneration) {
      progressModal.innerHTML = `
        <h3 style="margin-top: 0;">Generation Cancelled</h3>
        <p>${currentIndex} samples were generated.</p>
        <div id="error-message" style="color: red; margin-top: 10px;"></div>
        <div class="buttons-row" style="display: flex; gap: 10px; margin-top: 15px;">
          <button id="close-progress-btn" style="background: #3b82f6; color: white; border: none; border-radius: 4px; padding: 8px 15px; cursor: pointer;">
            Close
          </button>
        </div>
      `;
      
      // Check if there was an error with the originalWorkArea
      if (!window.trainingState.originalWorkArea) {
        document.getElementById('error-message').textContent = 
          "Error: Missing original work area data. Try generating a variation first.";
      }
      
      // Only download available samples if some were generated
      if (currentIndex > 0) {
        const buttonsRow = progressModal.querySelector('.buttons-row');
        buttonsRow.innerHTML += `
          <button id="download-samples-btn" style="background: #10b981; color: white; border: none; border-radius: 4px; padding: 8px 15px; cursor: pointer;">
            Download CSV
          </button>
          <button id="preview-samples-btn" style="background: #8b5cf6; color: white; border: none; border-radius: 4px; padding: 8px 15px; cursor: pointer;">
            Preview Samples
          </button>
        `;
        
        document.getElementById('download-samples-btn').addEventListener('click', function() {
          downloadCSV(csvContent, `construction_samples_${Date.now()}.csv`);
        });
        
        document.getElementById('preview-samples-btn').addEventListener('click', function() {
          showSamplesPreview(samples);
        });
      }
    } else {
      progressModal.innerHTML = `
        <h3 style="margin-top: 0;">Generation Complete!</h3>
        <p>${numSamples} samples were successfully generated.</p>
        <div class="buttons-row" style="display: flex; gap: 10px; margin-top: 15px;">
          <button id="download-samples-btn" style="background: #10b981; color: white; border: none; border-radius: 4px; padding: 8px 15px; cursor: pointer;">
            Download CSV
          </button>
          <button id="preview-samples-btn" style="background: #8b5cf6; color: white; border: none; border-radius: 4px; padding: 8px 15px; cursor: pointer;">
            Preview Samples
          </button>
          <button id="close-progress-btn" style="background: #3b82f6; color: white; border: none; border-radius: 4px; padding: 8px 15px; cursor: pointer;">
            Close
          </button>
        </div>
      `;
      
      document.getElementById('download-samples-btn').addEventListener('click', function() {
        downloadCSV(csvContent, `construction_samples_${Date.now()}.csv`);
      });
      
      document.getElementById('preview-samples-btn').addEventListener('click', function() {
        showSamplesPreview(samples);
      });
    }
    
    document.getElementById('close-progress-btn').addEventListener('click', function() {
      document.body.removeChild(progressModal);
    });
  }
  
  // Start generation
  runGeneration();
}

/**
 * Helper function to download CSV content
 */
function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  // Create download link
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  // Add to document, click to download, then remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Shows a preview of generated samples with navigation controls
 * @param {Array} samples - Array of generated samples
 */
function showSamplesPreview(samples) {
  if (!samples || samples.length === 0) {
    alert("No samples to preview");
    return;
  }
  
  // Store current state to restore later
  const originalItems = [];
  map.eachLayer(layer => {
    if (layer instanceof L.Marker || layer instanceof L.Polyline || layer instanceof L.Polygon) {
      originalItems.push(layer);
    }
  });
  
  // Create preview modal
  const previewModal = document.createElement('div');
  previewModal.style.position = 'fixed';
  previewModal.style.left = '50%';
  previewModal.style.bottom = '20px'; // Position at bottom
  previewModal.style.transform = 'translateX(-50%)'; // Center horizontally only
  previewModal.style.backgroundColor = 'white';
  previewModal.style.border = '1px solid #ddd';
  previewModal.style.borderRadius = '8px';
  previewModal.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  previewModal.style.padding = '20px';
  previewModal.style.zIndex = '10000';
  previewModal.style.maxWidth = '500px';
  previewModal.style.width = '90%';
  
  // Initialize current sample index
  let currentSampleIndex = 0;
  
  // Function to display the current sample
  function displaySample(index) {
    // Clear everything from the map first
    map.eachLayer(layer => {
      // Only remove layers that aren't the base tile layer
      if (!(layer instanceof L.TileLayer)) {
        map.removeLayer(layer);
      }
    });
    
    const sample = samples[index];
    
    // Update modal content
    document.getElementById('sample-index').textContent = index + 1;
    document.getElementById('sample-rotation').textContent = sample.rotationAngle;
    
    // Display work area points
    const workAreaPoints = [
      sample.referencePoint,
      sample.point2,
      sample.point3,
      sample.point4
    ];
    
    // Create work area polygon
    const workAreaPolygon = L.polygon(workAreaPoints, {
      color: '#ff7800',
      weight: 2,
      fillColor: '#ff9933',
      fillOpacity: 0.2,
      dashArray: '5, 5'
    }).addTo(map);
    workAreaPolygon._previewItem = true;
    
    // Create markers for each point
    for (let i = 0; i < workAreaPoints.length; i++) {
      const isReference = i === 0;
      const marker = L.circleMarker(workAreaPoints[i], {
        radius: isReference ? 8 : 6,
        color: isReference ? '#e11d48' : '#ff7800',
        fillColor: isReference ? '#f43f5e' : '#ff9933',
        fillOpacity: 0.7,
        weight: 2
      }).addTo(map);
      marker._previewItem = true;
      
      // Add label
      const label = L.marker(workAreaPoints[i], {
        icon: L.divIcon({
          className: 'work-area-label',
          html: `<div style="background: ${isReference ? '#e11d48' : '#ff7800'}; color: white; border-radius: 50%; width: 20px; height: 20px; text-align: center; line-height: 20px; font-weight: bold;">${i+1}${isReference ? '*' : ''}</div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        })
      }).addTo(map);
      label._previewItem = true;
    }
    
    // Display the construction at the center position with rotation
    if (sample.constructionCenter) {
      const center = L.latLng(sample.constructionCenter.lat, sample.constructionCenter.lng);
      const centerMarker = L.circleMarker(center, {
        radius: 6,
        color: '#8b5cf6',
        fillColor: '#8b5cf6',
        fillOpacity: 0.7,
        weight: 2
      }).addTo(map);
      centerMarker._previewItem = true;
      
      // Load construction
      const items = loadConstruction(window.trainingState.construction, center, sample.rotationAngle);
      items.forEach(item => item._previewItem = true);
      
      // Fit bounds
      const allElements = [...items, workAreaPolygon];
      const group = L.featureGroup(allElements);
      map.fitBounds(group.getBounds().pad(0.2));
    } else {
      // Fit to work area if no construction center available
      map.fitBounds(workAreaPolygon.getBounds().pad(0.2));
    }
  }
  
  // Create modal content
  previewModal.innerHTML = `
    <div>
      <h3 style="margin-top: 0; margin-bottom: 15px;">Sample Preview</h3>
      <div style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
        <div>Sample <span id="sample-index">1</span> of ${samples.length}</div>
        <div style="color: #8b5cf6; font-weight: bold;">Rotation: <span id="sample-rotation">0</span>°</div>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin: 20px 0;">
        <button id="prev-sample-btn" style="background: #f43f5e; color: white; border: none; border-radius: 4px; padding: 8px 15px; cursor: pointer; display: flex; align-items: center; gap: 5px;">
          <ion-icon name="arrow-back-outline"></ion-icon> Previous
        </button>
        <button id="next-sample-btn" style="background: #10b981; color: white; border: none; border-radius: 4px; padding: 8px 15px; cursor: pointer; display: flex; align-items: center; gap: 5px;">
          Next <ion-icon name="arrow-forward-outline"></ion-icon>
        </button>
      </div>
      
      <button id="close-preview-btn" style="background: #3b82f6; color: white; border: none; border-radius: 4px; padding: 8px 15px; cursor: pointer; width: 100%; margin-top: 10px;">
        Close Preview
      </button>
    </div>
  `;
  
  // Add to document
  document.body.appendChild(previewModal);
  
  // Display first sample
  displaySample(currentSampleIndex);
  
  // Event handlers
  document.getElementById('prev-sample-btn').addEventListener('click', function() {
    currentSampleIndex = (currentSampleIndex - 1 + samples.length) % samples.length;
    displaySample(currentSampleIndex);
  });
  
  document.getElementById('next-sample-btn').addEventListener('click', function() {
    currentSampleIndex = (currentSampleIndex + 1) % samples.length;
    displaySample(currentSampleIndex);
  });
  
  document.getElementById('close-preview-btn').addEventListener('click', function() {
    // Clear everything from the map
    map.eachLayer(layer => {
      // Only remove layers that aren't the base tile layer
      if (!(layer instanceof L.TileLayer)) {
        map.removeLayer(layer);
      }
    });
    
    // Remove modal
    document.body.removeChild(previewModal);
    
    // Regenerate the current variation to restore the view
    generateVariation();
  });
  
  // Add keyboard navigation
  const keyHandler = function(e) {
    if (e.key === 'ArrowLeft') {
      document.getElementById('prev-sample-btn').click();
    } else if (e.key === 'ArrowRight') {
      document.getElementById('next-sample-btn').click();
    } else if (e.key === 'Escape') {
      document.getElementById('close-preview-btn').click();
    }
  };
  
  document.addEventListener('keydown', keyHandler);
  
  // Remove event listener when closing
  const closeBtn = document.getElementById('close-preview-btn');
  const originalClickHandler = closeBtn.onclick;
  closeBtn.onclick = function() {
    document.removeEventListener('keydown', keyHandler);
    originalClickHandler();
  };
}

// Initialize the construction manager when the page loads
// We need to make sure this runs after the DOM is fully loaded
window.addEventListener('load', function() {
  console.log('Window loaded, initializing construction manager...');
  // Give time for other components to initialize first
  setTimeout(function() {
    initConstructionManager();
    console.log('Construction manager initialized');
  }, 500);
});