/**
 * AI Integration Module for Construction Manager
 * 
 * This file provides functionality to integrate the trained AI model
 * with the Construction Manager to suggest optimal rotation angles.
 */

// API endpoint for the AI model
const API_ENDPOINT = 'http://localhost:8080/api/predict';

// Function to call the AI API for construction placement prediction
async function predictConstructionPlacement(workAreaPoints) {
  console.log("Calling AI prediction API with input:", workAreaPoints);
  
  try {
    // Make API call to the Python backend
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ workAreaPoints }),
    });
    
    // Parse response
    const data = await response.json();
    
    if (!data.success) {
      console.error("API Error:", data.error);
      // Fall back to simple algorithm if API fails
      return fallbackPrediction(workAreaPoints);
    }
    
    // Check if the response includes position data
    if (data.position && Array.isArray(data.position)) {
      console.log("AI Suggested Rotation:", data.rotation);
      console.log("AI Suggested Position:", data.position);
      
      // Return both rotation and position
      return {
        rotation: data.rotation,
        position: data.position
      };
    } else {
      // If only rotation is provided (backward compatibility)
      console.log("AI Suggested Rotation:", data.rotation);
      
      // Calculate center from work area points as fallback for position
      const centroid = [
        (workAreaPoints[0][0] + workAreaPoints[1][0] + workAreaPoints[2][0] + workAreaPoints[3][0]) / 4,
        (workAreaPoints[0][1] + workAreaPoints[1][1] + workAreaPoints[2][1] + workAreaPoints[3][1]) / 4
      ];
      
      return {
        rotation: data.rotation,
        position: centroid
      };
    }
  } catch (error) {
    console.error("API Call Failed:", error);
    // Fall back to simple algorithm if API call fails
    const fallbackResult = fallbackPrediction(workAreaPoints);
    return fallbackResult;
  }
}

// Fallback function if API is not available
function fallbackPrediction(workAreaPoints) {
  console.log("Using fallback prediction algorithm");
  
  // Simple algorithm (same as in Python fallback)
  function calculateAngleBetweenPoints(p1, p2) {
    return Math.atan2(p2[0] - p1[0], p2[1] - p1[1]) * 180 / Math.PI;
  }
  
  // Get a base angle from the first two points
  const referencePoint = workAreaPoints[0];
  const point2 = workAreaPoints[1];
  
  // Calculate angle and add 90 degrees to face the work area
  let baseAngle = calculateAngleBetweenPoints(referencePoint, point2);
  let suggestedRotation = (baseAngle + 90) % 360;
  if (suggestedRotation < 0) suggestedRotation += 360;
  
  // Calculate center of work area as fallback position
  const centroid = [
    (workAreaPoints[0][0] + workAreaPoints[1][0] + workAreaPoints[2][0] + workAreaPoints[3][0]) / 4,
    (workAreaPoints[0][1] + workAreaPoints[1][1] + workAreaPoints[2][1] + workAreaPoints[3][1]) / 4
  ];
  
  console.log("Fallback Suggested Rotation:", suggestedRotation);
  console.log("Fallback Using Centroid Position:", centroid);
  
  return {
    rotation: suggestedRotation,
    position: centroid
  };
}

// Function to integrate with the construction manager
function integrateAI() {
  console.log("Initializing AI integration...");
  
  // Check if server is healthy
  checkAPIHealth();
  
  // Add "Auto-Place Construction" button to main UI if not already present
  addAutoPlaceButton();
  
  // Check if we're in the training mode
  if (window.trainingState) {
    // Add AI suggestion button to the training sidebar
    const trainingSidebar = document.getElementById('training-sidebar');
    if (trainingSidebar) {
      const aiSectionDiv = document.createElement('div');
      aiSectionDiv.style.borderTop = '1px solid #ddd';
      aiSectionDiv.style.paddingTop = '15px';
      aiSectionDiv.style.marginTop = '15px';
      
      aiSectionDiv.innerHTML = `
        <label style="display: block; margin-bottom: 10px; font-weight: bold;">AI Assistance:</label>
        <button id="ai-suggest-rotation-btn" style="background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white; border: none; border-radius: 4px; padding: 8px 15px; width: 100%; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 5px;">
          <ion-icon name="flash-outline"></ion-icon> Suggest Optimal Rotation
        </button>
        <div id="ai-suggestion-result" style="margin-top: 10px; font-size: 14px; display: none;">
          <div style="font-weight: bold;">Suggested Rotation:</div>
          <div id="ai-rotation-value" style="font-size: 16px; color: #6366f1;"></div>
          <button id="apply-ai-rotation-btn" style="background: #10b981; color: white; border: none; border-radius: 4px; padding: 5px 10px; margin-top: 5px; width: 100%; cursor: pointer;">
            Apply This Rotation
          </button>
        </div>
      `;
      
      // Insert before the last div (buttons)
      const lastDiv = trainingSidebar.querySelector('.custom-modal-buttons').parentNode;
      trainingSidebar.insertBefore(aiSectionDiv, lastDiv);
      
      // Add event listeners
      document.getElementById('ai-suggest-rotation-btn').addEventListener('click', suggestRotation);
      document.getElementById('apply-ai-rotation-btn').addEventListener('click', applyAISuggestedRotation);
    }
  }
}

// Check if the API server is healthy
async function checkAPIHealth() {
  try {
    const response = await fetch('http://localhost:8080/api/health');
    const data = await response.json();
    
    if (data.status === 'healthy') {
      console.log("AI API server is healthy. Model loaded:", data.model_loaded);
      
      // Show a small notification if the model is loaded
      if (data.model_loaded) {
        showNotification('AI Model Connected', 'success');
      } else {
        showNotification('AI Model available (using fallback mode)', 'warning');
      }
    }
  } catch (error) {
    console.warn("AI API server not available:", error);
    showNotification('AI using fallback mode (server unavailable)', 'warning');
  }
}

// Show a notification to the user
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

// Add "Auto-Place Construction" button to main UI
function addAutoPlaceButton() {
  // Check if button already exists
  if (document.getElementById('auto-place-construction-btn')) {
    return;
  }
  
  // Find the right place to insert the button (after the "Place Construction" button)
  const placeConstructionBtn = document.querySelector('button[data-action="placeConstruction"]');
  if (!placeConstructionBtn) {
    console.warn("Could not find the 'Place Construction' button");
    return;
  }
  
  // Create the new button
  const autoPlaceBtn = document.createElement('button');
  autoPlaceBtn.id = 'auto-place-construction-btn';
  autoPlaceBtn.className = 'flex-center';
  autoPlaceBtn.style.background = 'linear-gradient(135deg, #8b5cf6, #6366f1)';
  autoPlaceBtn.style.margin = '5px 0';
  autoPlaceBtn.style.width = '100%';
  autoPlaceBtn.innerHTML = '<ion-icon name="flash-outline"></ion-icon> <span>Auto-Place with AI</span>';
  
  // Insert after the Place Construction button
  placeConstructionBtn.parentNode.insertBefore(autoPlaceBtn, placeConstructionBtn.nextSibling);
  
  // Add event listener
  autoPlaceBtn.addEventListener('click', placeConstructionWithAI);
}

// Function to automatically place construction with AI
async function placeConstructionWithAI() {
  // Check if a work area is defined
  const workAreaPoints = getWorkAreaPoints();
  if (!workAreaPoints || workAreaPoints.length < 4) {
    showNotification('Please define a work area first', 'warning');
    return;
  }
  
  // Show loading indicator
  showNotification('Calculating optimal placement...', 'info');
  
  try {
    // Get optimal placement prediction from AI (both rotation and position)
    const result = await predictOptimalPlacement(workAreaPoints);
    
    // Place the construction with the suggested rotation and position
    if (result.position) {
      // Using both position and rotation
      const items = loadConstruction(
        window.selectedConstruction, 
        L.latLng(result.position[0], result.position[1]), 
        result.rotation
      );
      
      if (items && items.length > 0) {
        // Create a feature group and fit bounds
        const group = L.featureGroup(items);
        map.fitBounds(group.getBounds().pad(0.2));
      }
      
      // Show success notification with both rotation and position
      showNotification(`Construction placed with ${Math.round(result.rotation)}° rotation at optimal position`, 'success');
    } else {
      // Backward compatibility - only rotation provided
      generateVariationWithPredictedRotation(workAreaPoints, result.rotation);
      
      // Show success notification with just rotation
      showNotification(`Construction placed with ${Math.round(result.rotation)}° rotation`, 'success');
    }
  } catch (error) {
    console.error('Error during AI placement:', error);
    showNotification('Failed to place construction with AI', 'error');
  }
}

// Get work area points, re-ordered to start with reference point
function getWorkAreaPoints() {
  // Different ways to get work area points depending on context
  let workAreaPoints;
  
  // First check if we're in training mode
  if (window.trainingState && window.trainingState.workAreaPoints) {
    workAreaPoints = window.trainingState.workAreaPoints;
    // Re-order to start with reference point
    const refPointIndex = window.trainingState.referencePointIndex || 0;
    return reorderPointsForAI(workAreaPoints, refPointIndex);
  }
  
  // Otherwise get from the construction manager
  if (typeof constructionManager !== 'undefined' && constructionManager.workAreaPoints) {
    workAreaPoints = constructionManager.workAreaPoints;
    // Assume first point is reference point if not specified
    const refPointIndex = constructionManager.referencePointIndex || 0;
    return reorderPointsForAI(workAreaPoints, refPointIndex);
  }
  
  // Check global workAreaPoints as a fallback (from work-area-manager.js)
  if (window.workAreaPoints && window.workAreaPoints.length >= 4) {
    return reorderPointsForAI(window.workAreaPoints, window.referencePointIndex || 0);
  }
  
  return null;
}

// Re-order points to start with reference point, then go clockwise
function reorderPointsForAI(workAreaPoints, refPointIndex) {
  // Convert Leaflet latLng objects to simple arrays for the API
  const pointsArray = workAreaPoints.map(point => {
    // Check if it's a Leaflet latLng object
    if (typeof point.lat === 'function') {
      return [point.lat(), point.lng()];
    } else if (typeof point.lat === 'number') {
      return [point.lat, point.lng];
    }
    // Already an array
    return point;
  });
  
  // Handle if reference point index is out of bounds
  const validRefIndex = Math.min(Math.max(0, refPointIndex), pointsArray.length - 1);
  
  // Add reference point first
  const orderedPoints = [];
  orderedPoints.push(pointsArray[validRefIndex]);
  
  // Calculate angles for the remaining points relative to reference point
  const remainingPoints = pointsArray.filter((_, idx) => idx !== validRefIndex);
  const refLat = pointsArray[validRefIndex][0];
  const refLng = pointsArray[validRefIndex][1];
  
  // Calculate angles for sorting
  const pointsWithAngles = remainingPoints.map(point => {
    const angle = Math.atan2(
      point[0] - refLat,
      point[1] - refLng
    );
    return { point, angle };
  });
  
  // Sort by angle (clockwise from reference point)
  pointsWithAngles.sort((a, b) => a.angle - b.angle);
  
  // Add sorted points to ordered array
  pointsWithAngles.forEach(p => orderedPoints.push(p.point));
  
  return orderedPoints;
}

// Function to predict optimal placement using AI
async function predictOptimalPlacement(workAreaPoints) {
  // Get prediction from API with both rotation and position
  const result = await predictConstructionPlacement(workAreaPoints);
  return result;
}

// Function to suggest placement based on current work area
async function suggestRotation() {
  // Check if we have work area points
  if (!window.trainingState || !window.trainingState.workAreaPoints || window.trainingState.workAreaPoints.length < 4) {
    alert("No valid work area defined. Please define a work area first.");
    return;
  }
  
  // Show loading state
  document.getElementById('ai-suggest-rotation-btn').disabled = true;
  document.getElementById('ai-suggest-rotation-btn').innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Calculating...';
  
  try {
    // Get work area points
    const refPointIndex = window.trainingState.referencePointIndex;
    const workAreaPoints = window.trainingState.workAreaPoints;
    
    // Reorder and format points for AI
    const orderedPoints = reorderPointsForAI(workAreaPoints, refPointIndex);
    
    // Call the prediction function for both rotation and position
    const result = await predictOptimalPlacement(orderedPoints);
    const suggestedRotation = result.rotation;
    const suggestedPosition = result.position;
    
    // Display the suggestion
    document.getElementById('ai-suggestion-result').style.display = 'block';
    document.getElementById('ai-rotation-value').textContent = `${Math.round(suggestedRotation)}° rotation`;
    
    // Update position info if available
    const positionElement = document.getElementById('ai-position-value');
    if (positionElement) {
      positionElement.textContent = `[${suggestedPosition[0].toFixed(6)}, ${suggestedPosition[1].toFixed(6)}]`;
    }
    
    // Store the suggestions for later use
    window.aiSuggestedRotation = suggestedRotation;
    window.aiSuggestedPosition = suggestedPosition;
  } catch (error) {
    console.error("Error getting AI suggestion:", error);
    alert("Failed to get AI suggestion. Please try again.");
  } finally {
    // Reset button state
    document.getElementById('ai-suggest-rotation-btn').disabled = false;
    document.getElementById('ai-suggest-rotation-btn').innerHTML = '<ion-icon name="flash-outline"></ion-icon> Suggest Optimal Placement';
  }
}

// Function to apply the AI suggested placement (both rotation and position)
function applyAISuggestedRotation() {
  if (typeof window.aiSuggestedRotation !== 'undefined') {
    // Clean up existing variation
    cleanupExistingVariation();
    
    // Generate a new variation with the AI suggested rotation and position if available
    if (typeof window.aiSuggestedPosition !== 'undefined') {
      // If we have both rotation and position
      generateVariationWithPositionAndRotation(window.aiSuggestedPosition, window.aiSuggestedRotation);
    } else {
      // Backward compatibility - rotation only
      generateVariationWithRotation(window.aiSuggestedRotation);
    }
  } else {
    alert("No AI suggestion available. Please get a suggestion first.");
  }
}

// Helper function to clean up existing variation
function cleanupExistingVariation() {
  // This duplicates the cleanup logic from generateVariation()
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
  
  // Clean up all markers
  if (typeof allMarkers !== 'undefined') {
    allMarkers.forEach(marker => {
      if (map.hasLayer(marker)) {
        map.removeLayer(marker);
      }
    });
    allMarkers = [];
  }
  
  // Clean up all lines and their components
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
  
  // Clean up any points
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
  
  // Clear any existing work area polygons
  map.eachLayer(function(layer) {
    if (layer instanceof L.Polygon) {
      map.removeLayer(layer);
    }
  });
}

// Function to generate a variation with a specific rotation angle
function generateVariationWithRotation(rotationAngle) {
  // Use the center calculated from work area points
  const workAreaPoints = window.trainingState.workAreaPoints;
  
  if (!workAreaPoints || workAreaPoints.length < 4) {
    alert("No valid work area points found.");
    return;
  }
  
  // Calculate the center of the varied work area
  const refPointIndex = window.trainingState.referencePointIndex;
  const variedPoints = createVariedWorkArea(workAreaPoints, refPointIndex);
  
  // Calculate center from the varied points
  const center = L.latLng(
    (variedPoints[0].lat + variedPoints[1].lat + variedPoints[2].lat + variedPoints[3].lat) / 4,
    (variedPoints[0].lng + variedPoints[1].lng + variedPoints[2].lng + variedPoints[3].lng) / 4
  );
  
  // Create visual representation and place the construction
  placeAndVisualizeConstruction(variedPoints, center, rotationAngle, refPointIndex);
}

// New function to generate a variation with both position and rotation
function generateVariationWithPositionAndRotation(position, rotationAngle) {
  // Use the provided position instead of calculating from work area points
  const workAreaPoints = window.trainingState.workAreaPoints;
  
  if (!workAreaPoints || workAreaPoints.length < 4) {
    alert("No valid work area points found.");
    return;
  }
  
  // Create varied work area with reference point
  const refPointIndex = window.trainingState.referencePointIndex;
  const variedPoints = createVariedWorkArea(workAreaPoints, refPointIndex);
  
  // Use the provided position
  const center = L.latLng(position[0], position[1]);
  
  // Create visual representation and place the construction
  placeAndVisualizeConstruction(variedPoints, center, rotationAngle, refPointIndex, true);
}

// Helper function to create varied work area points
function createVariedWorkArea(workAreaPoints, refPointIndex) {
  const referencePoint = workAreaPoints[refPointIndex];
  
  // Create varied work area points, keeping the reference point fixed
  const variedPoints = [];
  for (let i = 0; i < workAreaPoints.length; i++) {
    if (i === refPointIndex) {
      // Keep reference point unchanged
      variedPoints.push(L.latLng(referencePoint.lat, referencePoint.lng));
    } else {
      // Vary other points
      const originalPoint = workAreaPoints[i];
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
  
  return variedPoints;
}

// Helper function to visualize and place construction
function placeAndVisualizeConstruction(variedPoints, center, rotationAngle, refPointIndex, usedAIPosition = false) {
  // Create polygon for varied work area
  const workAreaPolygon = L.polygon(variedPoints, {
    color: '#ff7800',
    weight: 2,
    fillColor: '#ff9933',
    fillOpacity: 0.2,
    dashArray: '5, 5'
  }).addTo(map);
  
  window.trainingState.variationItems.push(workAreaPolygon);
  
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
  
  // Add a visual marker for the AI-predicted position if we're using it
  if (usedAIPosition) {
    const positionMarker = L.circleMarker(center, {
      radius: 6,
      color: '#8b5cf6',
      fillColor: '#8b5cf6',
      fillOpacity: 0.7,
      weight: 2
    }).addTo(map);
    window.trainingState.variationItems.push(positionMarker);
  }
  
  // Place construction items in the work area with the AI-suggested rotation
  const construction = window.trainingState.construction;
  const items = loadConstruction(construction, center, rotationAngle);
  window.trainingState.variationItems.push(...items);
  
  // Update variation counter
  window.trainingState.currentVariation++;
  document.getElementById('current-variation').textContent = window.trainingState.currentVariation;
  document.getElementById('total-variations').textContent = window.trainingState.totalVariations;
  
  // Create a feature group and fit bounds
  const group = L.featureGroup([...items, workAreaPolygon]);
  map.fitBounds(group.getBounds().pad(0.2));
  
  // Highlight what we're using from AI
  const notification = document.createElement('div');
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.left = '50%';
  notification.style.transform = 'translateX(-50%)';
  notification.style.background = 'rgba(99, 102, 241, 0.9)';
  notification.style.color = 'white';
  notification.style.padding = '10px 20px';
  notification.style.borderRadius = '8px';
  notification.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
  notification.style.zIndex = '2000';
  notification.style.fontWeight = 'bold';
  
  if (usedAIPosition) {
    notification.textContent = `Applied AI-suggested rotation (${Math.round(rotationAngle)}°) and position`;
  } else {
    notification.textContent = `Applied AI-suggested rotation: ${Math.round(rotationAngle)}°`;
  }
  
  document.body.appendChild(notification);
  
  // Update the rotation display if we're in training mode
  if (document.getElementById('current-rotation')) {
    document.getElementById('current-rotation').textContent = Math.round(rotationAngle);
  }
  
  // Store the rotation angle in the training state if we're in training mode
  if (window.trainingState) {
    window.trainingState.currentRotation = rotationAngle;
  }
  
  // Remove notification after 3 seconds
  setTimeout(() => {
    document.body.removeChild(notification);
  }, 3000);
}

// Function to generate a variation with a predicted placement (for main UI)
function generateVariationWithPredictedRotation(workAreaPoints, rotation) {
  // For backward compatibility, we'll call the new function
  return generateVariationWithPredictedPlacement(workAreaPoints, { rotation });
}

// New function that handles both position and rotation
function generateVariationWithPredictedPlacement(workAreaPoints, result) {
  let rotation, position;
  
  // Check if we were passed a result object with both position and rotation
  if (typeof result === 'object' && result !== null) {
    if ('rotation' in result && 'position' in result) {
      // We have both rotation and position
      rotation = result.rotation;
      position = result.position;
      
      // Create L.LatLng object from position array
      const center = L.latLng(position[0], position[1]);
      console.log("Using AI-provided position:", center);
      return placeConstructionAtPosition(center, rotation);
    } else if ('rotation' in result) {
      // We only have rotation
      rotation = result.rotation;
    } else {
      // Invalid result object
      console.error("Invalid result object:", result);
      return [];
    }
  } else {
    // We were passed a rotation angle directly
    rotation = result;
  }
  
  // If we only have rotation, calculate center from work area points
  const center = L.latLng(
    (workAreaPoints[0][0] + workAreaPoints[1][0] + workAreaPoints[2][0] + workAreaPoints[3][0]) / 4,
    (workAreaPoints[0][1] + workAreaPoints[1][1] + workAreaPoints[2][1] + workAreaPoints[3][1]) / 4
  );
  console.log("Using calculated centroid position:", center);
  return placeConstructionAtPosition(center, rotation);
}

// Helper to place construction at specified center with rotation
function placeConstructionAtPosition(center, rotation) {
  // Get the current construction
  const construction = window.selectedConstruction;
  if (!construction) {
    console.error("No construction selected");
    return [];
  }
  
  try {
    console.log("Placing construction:", construction);
    console.log("At center:", center);
    console.log("With rotation:", rotation);
    
    const items = loadConstruction(construction, center, rotation);
    console.log("Placed items:", items);
    
    // Fit map to the bounds
    if (items && items.length > 0) {
      const group = L.featureGroup(items);
      map.fitBounds(group.getBounds().pad(0.2));
    } else {
      console.error("No items were placed by loadConstruction");
    }
    
    return items;
  } catch (error) {
    console.error("Error placing construction:", error);
    return [];
  }
}

// Initialize when the window loads
window.addEventListener('load', function() {
  setTimeout(integrateAI, 1000); // Initialize after the construction manager
});