# AI-Powered Construction Zone Planning Tool

## Problem Statement

- **Manual construction zone planning** is time-consuming, error-prone, and requires extensive knowledge of local regulations
- Construction companies struggle with **compliance** to Winnipeg's rules for pylon placement, signage distances, and worksite layouts
- Iterations and significant oversight are often required, increasing costs and potential safety risks

---

## Project Overview

**AI-Assisted Construction Zone Planning Tool for Winnipeg Regulations**

A web-based application that:
- Provides an interactive map interface for planning construction zones
- Uses AI to assist with regulatory compliance
- Automates traffic control element placement according to Winnipeg's Manual of Temporary Traffic Control
- Reduces planning time while increasing safety and compliance

---

## Technical Approach

### Architecture
- Web-based interactive application using JavaScript and Leaflet.js mapping library
- Python-based AI model for optimal construction placement
- Flask API server to integrate the AI functionality

### Core Functionality
1. **Interactive map interface** for defining work areas and construction zones
2. **AI-powered placement system** for traffic control devices
3. **Compliance checking** against Winnipeg's regulations
4. **Training mode** for AI model improvement

---

## Process & Methodology

1. **Research Phase**
   - Studied Winnipeg's construction zone regulations
   - Analyzed traffic control device requirements based on road types and speed limits

2. **Design & Development**
   - Created web-based interface with Leaflet.js for map interaction
   - Developed core placement algorithms for traffic control elements
   - Implemented AI model training system for optimal rotations

3. **AI Integration**
   - Built a neural network model to predict optimal construction rotations
   - Created API server to serve predictions
   - Integrated AI suggestions into the planning workflow

4. **Testing & Refinement**
   - Generated training data through simulation
   - Evaluated AI model performance
   - Performed compliance checks against regulations

---

## Key Features

### Interactive Map Interface
- Search for locations in Winnipeg
- Define road areas and construction zones
- Place traffic control elements manually or automatically

### Intelligent Placement System
- Regulatory-compliant traffic control device placement
- Adaptive to road type, speed limit, and construction scenario
- Supports different work zone configurations

### AI-Powered Optimization
- Suggests optimal placement and rotation
- Learns from user adjustments through training mode
- Provides data-driven recommendations

### Data Management
- Save and load construction layouts
- Export state for sharing and collaboration
- Generate documentation for compliance verification

---

## Technical Implementation

### Front-End
- **Mapping**: Leaflet.js for interactive maps
- **UI**: Custom modular JavaScript components
- **Visualization**: Dynamic traffic control device rendering

### Back-End
- **AI Model**: PyTorch neural network
- **API**: Flask-based REST API
- **Data Processing**: NumPy for mathematical operations

### Data Flow
1. User defines work area on map
2. Application analyzes road type and configuration
3. AI recommends optimal placement
4. System places traffic control elements according to regulations
5. Compliance check verifies against Winnipeg's rules

---

## AI Model Details

- **Input**: 4 work area points (latitude/longitude pairs)
- **Output**: Optimal construction rotation angle and position
- **Architecture**: Neural network with multiple hidden layers
- **Training Data**: 5000+ simulated construction scenarios
- **Performance**: Average error of 9.55° on rotation predictions
- **Fallback**: Algorithm-based placement when API unavailable

---

## Challenges & Solutions

### Challenge: Regulatory Complexity
**Solution**: Encoded Winnipeg's rules into the system and implemented automated compliance checking

### Challenge: Spatial Reasoning
**Solution**: Used vector-based algorithms for device placement with proper spacing and orientation

### Challenge: AI Training Data
**Solution**: Created a training mode to generate thousands of simulated scenarios

### Challenge: Varying Road Types
**Solution**: Implemented adaptive placement based on road classification and speed limits

---

## Results & Impact

### Outcomes
- Fully functional prototype with AI-assisted planning
- Accurate traffic control device placement based on regulations
- Training system for continuous AI improvement

### Benefits
- **Time Savings**: Reduces planning time from hours to minutes
- **Improved Safety**: Ensures proper signage and device placement
- **Regulatory Compliance**: Verifies plans against Winnipeg's standards
- **Standardization**: Creates consistent construction zone layouts

---

## Future Directions

1. **Enhanced AI Capabilities**
   - Predict optimal positions for all traffic control elements
   - Incorporate road geometry and traffic data

2. **Extended Regulatory Coverage**
   - Support for additional municipalities and jurisdictions
   - Integration with construction permitting systems

3. **Mobile Application**
   - Field verification and adjustment capabilities
   - Augmented reality visualization

4. **Integration & API**
   - Connect with existing construction management systems
   - Provide API for third-party applications

---

## Demonstration

- **Work Area Definition**: Select areas for construction
- **AI-Assisted Planning**: Automatic placement of traffic control elements
- **Manual Adjustments**: Fine-tuning of device positions
- **Compliance Checking**: Verification against regulations
- **Saving & Exporting**: Preservation of plans for implementation

---

## Conclusion

The AI-Powered Construction Zone Planning Tool successfully:
- Addresses the challenges of manual construction zone planning
- Provides an intuitive interface for traffic control design
- Leverages AI to ensure regulatory compliance
- Improves safety through standardized placement
- Reduces planning time and potential errors

This solution demonstrates how AI can enhance specialized domains like construction safety planning while maintaining human oversight and judgment.

---

## Q&A

Thank you for your attention!

Questions?