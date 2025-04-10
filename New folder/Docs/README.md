# Traffic Safety Planner

A web-based application for designing and planning construction zones with AI assistance, ensuring compliance with Winnipeg traffic control regulations.

## Overview

The Traffic Safety Planner is a tool that allows users to:

1. Define road areas on a map
2. Create construction zones
3. Place traffic control elements (signs, cones, barriers)
4. Verify compliance with traffic safety regulations
5. Get AI recommendations for proper traffic control setup

The application uses a vector-based approach for placing traffic control elements, taking into account the road direction and construction zone shape to create accurate and compliant layouts.

## Features

### Road Definition
- Draw a road area as a polygon
- Specify the number of lanes
- Set the road direction using a compass interface
- Visual feedback for the defined road area

### Construction Zone Creation
- Draw construction zones as polygons
- Automatically analyze road type based on location
- Generate appropriate work zone type recommendations
- Create construction zones based on road type and dimensions

### AI-Assisted Traffic Control Planning
- Vector-based sign placement algorithm
- Automatic detection of the best-aligned edge
- Perpendicular vector calculation for optimal sign placement
- Traffic cone/channelization barrel placement
- Compliance checking against traffic safety regulations

### Visualization Tools
- Toggle different visualization components
- View direction vectors, edges, and sign paths
- Debug inside/outside polygon tests
- Clear all visualizations with one click

### Data Management
- Export traffic plans to JSON files
- Import previously saved plans
- Download map screenshots

## Technical Architecture

The application is organized into several modular JavaScript files, each responsible for a specific part of the functionality:

### File Structure

```
/traffic-safety-planner/
├── css/
│   └── styles.css              # All application styles
├── docs/
│   └── README.md               # Project documentation
├── js/
│   ├── main.js                 # Application entry point and initialization
│   ├── utils.js                # Utility functions for calculations
│   ├── modals.js               # Dialog and modal components
│   ├── visualization.js        # Visualization controls and vector display
│   ├── road-markers.js         # Road definition and marker handling
│   ├── traffic-planner.js      # AI traffic planner and compliance checking
│   └── search.js               # Location search and selection
└── index.html                  # Main HTML file
```

### Key Components

#### 1. Utilities (`utils.js`)
- Geographic calculations (distances, bearings, destinations)
- Polygon containment tests
- Helper functions for debouncing, etc.

#### 2. Modal Dialogs (`modals.js`)
- Custom confirmation dialogs
- Action selection dialogs
- Road direction selection
- Polygon option dialogs

#### 3. Visualizations (`visualization.js`)
- Vector visualization with arrows
- Inside/outside polygon tests
- Visibility toggle controls
- Control panel management

#### 4. Road and Markers (`road-markers.js`)
- Road area definition
- Interactive marker creation
- Polygon drawing tools
- Construction zone creation

#### 5. Traffic Planner (`traffic-planner.js`)
- Traffic control regulations
- Vector-based sign placement algorithm
- Compliance checking
- AI recommendations for fixes

#### 6. Search (`search.js`)
- Location search
- Result suggestions
- Road type analysis
- State export and import

#### 7. Main App (`main.js`)
- Map initialization
- Event handlers
- UI coordination

## The Vector-Based Approach

The application uses a vector-based approach for placing traffic control elements:

1. **Road Direction Vector**: Determines the primary direction of traffic flow
2. **Edge Alignment**: Finds the edge of the construction zone that best aligns with the road direction
3. **Perpendicular Vector Calculation**: Calculates vectors perpendicular to the best aligned edge for sign placement
4. **Sign Placement**: Places signs at specific distances along this perpendicular vector
5. **Road Area Containment**: Ensures signs are placed within the defined road area

This approach ensures that traffic control elements are placed logically in relation to the road direction and construction zone.

## Winnipeg Traffic Regulations

The application includes built-in knowledge of Winnipeg traffic control regulations:

### Work Zone Types
- **TC-2 Roadwork**: Short duration work zones
- **TC-3 Work Area**: Extended duration work zones
- **TC-7 Lane Closure**: Lane closure configurations

### Road Types
- **Residential**: 50 km/h speed limit
- **Collector**: 60 km/h speed limit
- **Arterial**: 80 km/h speed limit
- **Highway**: 100 km/h speed limit

### Sign Types
- TC-1: Construction Ahead
- TC-2: Roadwork
- TC-3: Work Area
- TC-4: End Construction
- TC-7: Lane Closed
- TC-36: Keep Right
- TC-63: Channelization Barrel

## Usage Guide

### Getting Started

1. Open the application in a web browser
2. Search for a location or navigate the map
3. Define a road area (optional but recommended)
4. Create a construction zone
5. Use AI planning to place traffic control elements
6. Check compliance with regulations
7. Export your plan

### Defining a Road Area

1. Click the "Define Road" button
2. Enter the number of lanes
3. Click on the map to add points defining the road boundary
4. Click "Set Road" when finished
5. Use the direction compass to set the road direction
6. Click "Save Direction" to confirm

### Creating a Construction Zone

1. Click the "Select Area" button
2. Click on the map to add points defining the construction zone boundary
3. Click "Finish Area" when done
4. Choose whether to use AI planning

### AI Planning

1. Select the road type (residential, collector, arterial, highway)
2. Select the work zone type (TC-2, TC-3, TC-7)
3. The AI will analyze the construction zone
4. Traffic control elements will be placed according to regulations

### Compliance Checking

1. Click the "AI Check" button
2. The system will analyze your traffic plan
3. If compliant, you'll see a success message
4. If not compliant, you'll see recommendations for fixes

### Exporting and Importing

1. Click "Export State" to save your plan as a JSON file
2. Click "Import State" to load a previously saved plan

## Development Notes

### Vector Math in Geographic Context

When working with vectors in a geographic context, it's important to remember:

- Latitude increases as you go north
- Longitude increases as you go east
- Map coordinates use a different system than standard vector math
- Road direction is measured in degrees clockwise from north

### Road Direction Vector

The road direction vector is calculated as:
```javascript
const v1 = {
  x: Math.sin(bearingRad),
  y: -Math.cos(bearingRad)  // Negative because y increases southward on maps
};
```

### Edge Alignment

Edge alignment is determined using the dot product between the road direction vector and each edge vector of the construction zone:

```javascript
const dotProduct = (v1.x * vector.dx) + (v1.y * vector.dy);
const alignment = Math.abs(dotProduct);
```

### Perpendicular Vector

Two perpendicular vectors are calculated and the better one is chosen:

```javascript
const perpVector1 = {
  x: -bestVector.dy, // Perpendicular option 1: (-dy, dx)
  y: bestVector.dx
};

const perpVector2 = {
  x: bestVector.dy, // Perpendicular option 2: (dy, -dx)
  y: -bestVector.dx
};
```

## Troubleshooting

### Sign Placement Issues

If signs are not being placed correctly:

1. Enable visualization controls
2. Check if the road direction vector is correct
3. Verify that the perpendicular vector points into the road area
4. Check if signs are being placed inside the road area
5. Adjust the road area or direction if needed

### Technical Issues

- **Map not loading**: Check internet connection and script loading
- **Cannot define road**: Ensure you have permissions to access your location
- **Signs not visible**: Check if they're being placed outside the road area
- **Export not working**: Check browser permissions for file downloads

## Future Enhancements

- 3D visualization of traffic control plans
- More detailed regulatory compliance checks
- Integration with city permitting systems
- Mobile device support
- Collaboration features for team planning

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- OpenStreetMap for mapping data
- Leaflet for the interactive mapping library
- Winnipeg Manual of Temporary Traffic Control for regulations