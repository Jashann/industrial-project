/**
 * Work Area Manager - Handles defining work areas and using AI to place constructions
 * 
 * This file provides functionality to define work areas on the map
 * and use the AI model to place constructions with optimal rotation.
 */

// Global variables for work area definition
window.workAreaDefMode = false;
window.workAreaPoints = [];
window.workAreaMarkers = [];
window.workAreaPolygon = null;
window.referencePointIndex = 0;

// Initialize work area manager
function initWorkAreaManager() {
  console.log('Initializing Work Area Manager...');
  
  // Add button event listener
  const defineWorkAreaBtn = document.getElementById('define-workarea-btn');
  if (defineWorkAreaBtn) {
    defineWorkAreaBtn.addEventListener('click', startWorkAreaDefinition);
  }
}

// Start defining a work area
function startWorkAreaDefinition() {
  console.log('Starting work area definition mode');
  
  // If already in work area definition mode, exit first
  if (window.workAreaDefMode) {
    exitWorkAreaDefinitionMode();
  }
  
  // Set the work area definition mode
  window.workAreaDefMode = true;
  
  // Clear any existing work area
  cleanupWorkArea();
  
  // Change cursor to crosshair
  document.getElementById('map').style.cursor = 'crosshair';
  
  // Show instructions
  alert("Work Area Definition Mode: Click on 4 points on the map to define the work area. The first point will be the reference point. Press ESC to cancel.");
  
  // Add ESC key handler
  document.addEventListener('keydown', escapeWorkAreaHandler);
  
  // Override map click handler
  const originalClickHandler = map._events.click ? map._events.click[0].fn : null;
  
  // Save original click handler
  window.originalMapClickHandler = originalClickHandler;
  
  // Remove existing click handlers
  map.off('click');
  
  // Add new click handler for work area definition
  map.on('click', handleWorkAreaClick);
}

// Handle escape key to exit work area definition mode
function escapeWorkAreaHandler(e) {
  if (e.key === 'Escape' && window.workAreaDefMode) {
    exitWorkAreaDefinitionMode();
  }
}

// Handle click during work area definition
function handleWorkAreaClick(e) {
  if (!window.workAreaDefMode) return;
  
  const clickLatLng = e.latlng;
  
  // Add the point to our selection
  window.workAreaPoints.push(clickLatLng);
  
  // Add a visual marker
  const isReference = window.workAreaPoints.length === 1;
  const marker = L.circleMarker(clickLatLng, {
    radius: isReference ? 8 : 6,
    color: isReference ? '#e11d48' : '#ff7800',
    fillColor: isReference ? '#f43f5e' : '#ff9933',
    fillOpacity: 0.7,
    weight: 2
  }).addTo(map);
  
  window.workAreaMarkers.push(marker);
  
  // Add a label showing the point number
  const pointNumber = window.workAreaPoints.length;
  const label = L.marker(clickLatLng, {
    icon: L.divIcon({
      className: 'work-area-label',
      html: `<div style="background: ${isReference ? '#e11d48' : '#ff7800'}; color: white; border-radius: 50%; width: 20px; height: 20px; text-align: center; line-height: 20px; font-weight: bold;">${pointNumber}${isReference ? '*' : ''}</div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    })
  }).addTo(map);
  
  window.workAreaMarkers.push(label);
  
  // If we have 3+ points, update the polygon
  if (window.workAreaPoints.length >= 3) {
    if (window.workAreaPolygon) {
      window.workAreaPolygon.setLatLngs(window.workAreaPoints);
    } else {
      window.workAreaPolygon = L.polygon(window.workAreaPoints, {
        color: '#ff7800',
        weight: 2,
        fillColor: '#ff9933',
        fillOpacity: 0.2,
        dashArray: '5, 5'
      }).addTo(map);
    }
  }
  
  // If we have 4 points, finish the work area definition
  if (window.workAreaPoints.length >= 4) {
    setTimeout(() => {
      finishWorkAreaDefinition();
    }, 300);
  }
}

// Clean up work area visuals
function cleanupWorkArea() {
  // Clear any previous work area points
  window.workAreaPoints = [];
  
  // Remove any markers
  if (window.workAreaMarkers) {
    window.workAreaMarkers.forEach(marker => {
      if (map.hasLayer(marker)) {
        map.removeLayer(marker);
      }
    });
  }
  window.workAreaMarkers = [];
  
  // Remove polygon if it exists
  if (window.workAreaPolygon) {
    if (map.hasLayer(window.workAreaPolygon)) {
      map.removeLayer(window.workAreaPolygon);
    }
    window.workAreaPolygon = null;
  }
}

// Exit work area definition mode without saving
function exitWorkAreaDefinitionMode() {
  console.log('Exiting work area definition mode');
  
  // Reset mode flag
  window.workAreaDefMode = false;
  
  // Clean up visuals
  cleanupWorkArea();
  
  // Reset cursor
  document.getElementById('map').style.cursor = '';
  
  // Remove ESC key handler
  document.removeEventListener('keydown', escapeWorkAreaHandler);
  
  // Remove our click handler and restore original
  map.off('click', handleWorkAreaClick);
  
  // Restore original click handler if it exists
  if (window.originalMapClickHandler) {
    map.on('click', window.originalMapClickHandler);
    window.originalMapClickHandler = null;
  }
}

// Finish work area definition when all 4 points are defined
function finishWorkAreaDefinition() {
  // Exit definition mode but keep the visuals
  window.workAreaDefMode = false;
  
  // Reset cursor
  document.getElementById('map').style.cursor = '';
  
  // Remove key handler
  document.removeEventListener('keydown', escapeWorkAreaHandler);
  
  // Remove our click handler
  map.off('click', handleWorkAreaClick);
  
  // Restore original click handler if it exists
  if (window.originalMapClickHandler) {
    map.on('click', window.originalMapClickHandler);
    window.originalMapClickHandler = null;
  }
  
  // Show the construction selection modal
  showConstructionSelectionModal();
}

// Show modal to select a construction
function showConstructionSelectionModal() {
  // Get saved constructions
  const savedConstructions = getSavedConstructions();
  
  if (savedConstructions.length === 0) {
    alert("No saved constructions found. Please save a construction first.");
    return;
  }
  
  // Create or update modal
  let modal = document.getElementById('construction-selection-modal');
  
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'construction-selection-modal';
    modal.className = 'custom-modal';
    document.body.appendChild(modal);
  }
  
  modal.innerHTML = `
    <div class="custom-modal-content">
      <p>Select Construction for Work Area</p>
      <div style="margin: 15px 0; max-height: 300px; overflow-y: auto;">
        <div id="constructions-selection-list" style="margin-bottom: 15px; text-align: left;">
          <!-- Construction items will be dynamically added here -->
        </div>
        
        <div style="margin-top: 15px; text-align: left;">
          <p>Selected Construction: <span id="selected-construction-name" style="font-weight: bold;">None</span></p>
        </div>
        
        <div style="margin-top: 15px; border-top: 1px solid #ddd; padding-top: 15px;">
          <p style="margin-bottom: 10px;">Placement Options:</p>
          
          <div style="display: flex; gap: 10px; margin-bottom: 15px;">
            <button id="manual-placement-btn" class="placement-option-btn" style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 4px; background: #f5f5f5; cursor: pointer;">
              <ion-icon name="hand-left-outline"></ion-icon>
              <span>Manual Placement</span>
            </button>
            
            <button id="ai-placement-btn" class="placement-option-btn active" style="flex: 1; padding: 10px; border: 1px solid #8b5cf6; border-radius: 4px; background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white; cursor: pointer;">
              <ion-icon name="flash-outline"></ion-icon>
              <span>AI Placement</span>
            </button>
          </div>
        </div>
      </div>
      <div class="custom-modal-buttons">
        <button id="place-construction-btn" style="background: linear-gradient(135deg, #10b981, #047857);">
          <ion-icon name="checkmark-outline"></ion-icon> Place Construction
        </button>
        <button id="cancel-selection-btn" style="background: linear-gradient(135deg, #6c757d, #5a6268);">
          <ion-icon name="close-outline"></ion-icon> Cancel
        </button>
      </div>
    </div>
  `;
  
  // Show the modal
  modal.style.display = 'flex';
  
  // Populate constructions list
  const constructionsList = document.getElementById('constructions-selection-list');
  
  // Try to find a construction named "LONG TERM RIGHT LANE CLOSURE"
  const defaultIndex = savedConstructions.findIndex(c => 
    c.name && typeof c.name === 'string' && c.name.includes("LONG TERM RIGHT LANE CLOSURE")
  );
  
  // Use the default construction if found, otherwise use the first one
  const selectedIndex = defaultIndex !== -1 ? defaultIndex : 0;
  
  savedConstructions.forEach((construction, index) => {
    const constructionItem = document.createElement('div');
    constructionItem.style.marginBottom = '10px';
    constructionItem.style.padding = '8px';
    constructionItem.style.border = '1px solid #ddd';
    constructionItem.style.borderRadius = '4px';
    constructionItem.style.cursor = 'pointer';
    
    // Set as selected if matching the selected index
    if (index === selectedIndex) {
      constructionItem.style.borderColor = '#8b5cf6';
      constructionItem.style.background = 'rgba(139, 92, 246, 0.1)';
      window.selectedConstruction = construction;
      document.getElementById('selected-construction-name').textContent = construction.name || 'Unnamed Construction';
    }
    
    constructionItem.innerHTML = `
      <input type="radio" name="construction-select" id="construction-select-${index}" value="${index}" ${index === selectedIndex ? 'checked' : ''}>
      <label for="construction-select-${index}">
        <strong>${construction.name || 'Unnamed Construction'}</strong> (${construction.items && construction.items.length ? construction.items.length : 0} items)
      </label>
    `;
    
    constructionItem.addEventListener('click', () => {
      // Update selection
      document.querySelectorAll('input[name="construction-select"]').forEach(radio => {
        radio.checked = false;
      });
      
      const radio = constructionItem.querySelector('input[type="radio"]');
      radio.checked = true;
      
      // Update styles for all items
      document.querySelectorAll('#constructions-selection-list > div').forEach(item => {
        item.style.borderColor = '#ddd';
        item.style.background = 'transparent';
      });
      
      constructionItem.style.borderColor = '#8b5cf6';
      constructionItem.style.background = 'rgba(139, 92, 246, 0.1)';
      
      // Save selected construction
      window.selectedConstruction = savedConstructions[index];
      document.getElementById('selected-construction-name').textContent = savedConstructions[index].name;
    });
    
    constructionsList.appendChild(constructionItem);
  });
  
  // Set placement option
  window.useAIPlacement = true;
  
  // Add event listeners for placement options
  document.getElementById('manual-placement-btn').addEventListener('click', function() {
    document.querySelectorAll('.placement-option-btn').forEach(btn => {
      btn.classList.remove('active');
      btn.style.background = '#f5f5f5';
      btn.style.borderColor = '#ddd';
      btn.style.color = '#333';
    });
    
    this.classList.add('active');
    this.style.background = 'linear-gradient(135deg, #10b981, #047857)';
    this.style.borderColor = '#047857';
    this.style.color = 'white';
    
    window.useAIPlacement = false;
  });
  
  document.getElementById('ai-placement-btn').addEventListener('click', function() {
    document.querySelectorAll('.placement-option-btn').forEach(btn => {
      btn.classList.remove('active');
      btn.style.background = '#f5f5f5';
      btn.style.borderColor = '#ddd';
      btn.style.color = '#333';
    });
    
    this.classList.add('active');
    this.style.background = 'linear-gradient(135deg, #8b5cf6, #6366f1)';
    this.style.borderColor = '#8b5cf6';
    this.style.color = 'white';
    
    window.useAIPlacement = true;
  });
  
  // Add event listeners for buttons
  document.getElementById('place-construction-btn').addEventListener('click', function() {
    if (!window.selectedConstruction) {
      alert("Please select a construction first");
      return;
    }
    
    // Close the modal
    modal.style.display = 'none';
    
    // Place the construction using the selected method
    if (window.useAIPlacement) {
      placeConstructionWithAI();
    } else {
      placeConstructionManually();
    }
  });
  
  document.getElementById('cancel-selection-btn').addEventListener('click', function() {
    // Close the modal
    modal.style.display = 'none';
    
    // Clean up work area
    cleanupWorkArea();
  });
}

// Place construction using AI for optimal rotation
async function placeConstructionWithAI() {
  const construction = window.selectedConstruction;
  
  if (!construction) {
    alert("No construction selected");
    return;
  }
  
  try {
    // Show loading notification
    showNotification("Calculating optimal placement with AI...", "info");
    
    // Verify that work area points exist
    if (!window.workAreaPoints || window.workAreaPoints.length < 4) {
      showNotification("No valid work area defined. Please define a work area first.", "error");
      return;
    }
    
    // Format work area points for AI prediction
    const formattedPoints = [];
    
    // First point is reference point
    window.referencePointIndex = 0;
    
    for (let i = 0; i < window.workAreaPoints.length; i++) {
      // Handle both LatLng objects and plain objects
      const lat = typeof window.workAreaPoints[i].lat === 'function' 
                  ? window.workAreaPoints[i].lat() 
                  : window.workAreaPoints[i].lat;
      const lng = typeof window.workAreaPoints[i].lng === 'function'
                  ? window.workAreaPoints[i].lng()
                  : window.workAreaPoints[i].lng;
                  
      formattedPoints.push([lat, lng]);
    }
    
    // Debug log the work area points
    console.log("Work area points for AI:", formattedPoints);
    
    // Create variables to store the center position and rotation
    let center;
    let rotation;
    
    try {
      // Make API call to the Python backend
      const response = await fetch('http://localhost:8080/api/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workAreaPoints: formattedPoints }),
      });
      
      // Parse response
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || "API error");
      }
      
      // Check if both rotation and position are provided
      if (data.position && Array.isArray(data.position)) {
        // Get rotation and position predictions
        rotation = data.rotation;
        const predictedPosition = data.position;
        
        // Use the AI-suggested position
        center = L.latLng(predictedPosition[0], predictedPosition[1]);
        
        console.log("AI Suggested Rotation:", rotation);
        console.log("AI Suggested Position:", predictedPosition);
      } else {
        // Backward compatibility - only rotation provided
        rotation = data.rotation;
        console.log("AI Suggested Rotation:", rotation);
        
        // Calculate the center of the work area for placement
        center = L.latLng(
          formattedPoints.reduce((sum, point) => sum + point[0], 0) / formattedPoints.length,
          formattedPoints.reduce((sum, point) => sum + point[1], 0) / formattedPoints.length
        );
      }
    } catch (error) {
      console.error("AI API Call Failed:", error);
      
      // Use fallback prediction algorithm
      const usePoint = window.referencePointIndex === 0 ? 1 : 0;
      const p1 = formattedPoints[0];
      const p2 = formattedPoints[usePoint];
      
      // Calculate basic angle between points
      const angle = Math.atan2(p2[0] - p1[0], p2[1] - p1[1]) * 180 / Math.PI;
      rotation = (angle + 90) % 360;
      if (rotation < 0) rotation += 360;
      
      console.log("Using fallback algorithm, rotation:", rotation);
      
      // Calculate the center of the work area for placement
      center = L.latLng(
        formattedPoints.reduce((sum, point) => sum + point[0], 0) / formattedPoints.length,
        formattedPoints.reduce((sum, point) => sum + point[1], 0) / formattedPoints.length
      );
    }
    
    console.log("Placing the construction");
    // Place the construction
    const items = loadConstruction(construction, center, rotation);
    console.log(items);
    
    // Create a feature group and fit bounds
    const allElements = [...items, window.workAreaPolygon];
    const group = L.featureGroup(allElements);
    map.fitBounds(group.getBounds().pad(0.2));
    
    // Show success notification
    showNotification(`Construction placed with ${Math.round(rotation)}° rotation`, "success");
  } catch (error) {
    console.error("Error in AI placement:", error);
    showNotification("Error placing construction. Using manual placement instead.", "error");
    placeConstructionManually();
  }
}

// Place construction manually (user clicks for rotation)
function placeConstructionManually() {
  const construction = window.selectedConstruction;
  
  if (!construction) {
    alert("No construction selected");
    return;
  }
  
  // Show instruction notification
  showNotification("Click on the map to set the rotation direction", "info");
  
  // Verify that work area points exist
  if (!window.workAreaPoints || window.workAreaPoints.length < 4) {
    showNotification("No valid work area defined. Please define a work area first.", "error");
    return;
  }

  // Format points and handle both LatLng objects and plain objects
  const formattedPoints = window.workAreaPoints.map(point => {
    const lat = typeof point.lat === 'function' ? point.lat() : point.lat;
    const lng = typeof point.lng === 'function' ? point.lng() : point.lng;
    return [lat, lng];
  });
  
  // Center of the work area for placement
  const center = L.latLng(
    formattedPoints.reduce((sum, point) => sum + point[0], 0) / formattedPoints.length,
    formattedPoints.reduce((sum, point) => sum + point[1], 0) / formattedPoints.length
  );
  
  // Draw rotation indicator circle
  const rotationCircle = L.circle(center, {
    radius: 50,
    color: '#8b5cf6',
    weight: 2,
    fillColor: '#8b5cf6',
    fillOpacity: 0.1,
    dashArray: '5, 5'
  }).addTo(map);
  
  // Add one-time click handler for rotation
  const clickHandler = function(e) {
    // Calculate rotation angle based on click position relative to center
    const angle = Math.atan2(e.latlng.lat - center.lat, e.latlng.lng - center.lng) * 180 / Math.PI;
    const rotation = (angle + 90) % 360;
    
    // Place the construction
    const items = loadConstruction(construction, center, rotation);
    
    // Create a feature group and fit bounds
    const allElements = [...items, window.workAreaPolygon];
    const group = L.featureGroup(allElements);
    map.fitBounds(group.getBounds().pad(0.2));
    
    // Remove the rotation circle
    map.removeLayer(rotationCircle);
    
    // Show success notification
    showNotification(`Construction placed with ${Math.round(rotation)}° rotation`, "success");
  };
  
  // Attach the click handler
  map.once('click', clickHandler);
}

// Show notification to the user
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.right = '20px';
  notification.style.padding = '10px 15px';
  notification.style.borderRadius = '4px';
  notification.style.zIndex = '10000';
  notification.style.maxWidth = '300px';
  notification.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
  notification.style.display = 'flex';
  notification.style.alignItems = 'center';
  notification.style.gap = '8px';
  
  // Set styles based on type
  if (type === 'success') {
    notification.style.backgroundColor = '#10b981';
    notification.style.color = 'white';
    notification.innerHTML = `<ion-icon name="checkmark-circle"></ion-icon> ${message}`;
  } else if (type === 'warning') {
    notification.style.backgroundColor = '#f59e0b';
    notification.style.color = 'white';
    notification.innerHTML = `<ion-icon name="warning"></ion-icon> ${message}`;
  } else if (type === 'error') {
    notification.style.backgroundColor = '#ef4444';
    notification.style.color = 'white';
    notification.innerHTML = `<ion-icon name="alert-circle"></ion-icon> ${message}`;
  } else { // info
    notification.style.backgroundColor = '#3b82f6';
    notification.style.color = 'white';
    notification.innerHTML = `<ion-icon name="information-circle"></ion-icon> ${message}`;
  }
  
  // Add to document
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.5s ease-out';
    
    // Remove from DOM after fade out
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 500);
  }, 3000);
}

// Initialize the work area manager when the page loads
window.addEventListener('load', function() {
  console.log('Window loaded, initializing work area manager...');
  // Give time for other components to initialize first
  setTimeout(function() {
    initWorkAreaManager();
    console.log('Work area manager initialized');
  }, 1000);
});