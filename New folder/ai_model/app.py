#!/usr/bin/env python3
"""
Construction Placement AI - API Server

This script creates a simple API server that serves predictions from the trained model.
It allows the web application to get AI predictions via API calls.
"""

import os
import json
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import numpy as np
import torch
from predict import ConstructionPlacementPredictor, load_trained_model
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__, static_folder='.')
CORS(app)  # Enable CORS to allow requests from the web app

# Load the trained model at startup
logger.info("Loading trained model...")
model, scaler, device = load_trained_model()
if model is None:
    logger.error("Failed to load model. Using fallback logic.")
else:
    logger.info("Model loaded successfully")

@app.route('/api/predict', methods=['POST'])
def predict_rotation():
    """API endpoint to predict optimal rotation from work area points"""
    try:
        # Get data from request
        data = request.get_json()
        
        if not data or 'workAreaPoints' not in data:
            return jsonify({
                'error': 'Missing work area points',
                'success': False
            }), 400
            
        work_area_points = data['workAreaPoints']
        
        # Validate input format
        if len(work_area_points) != 4:
            return jsonify({
                'error': 'Expected exactly 4 work area points',
                'success': False
            }), 400
        
        # Make prediction using the trained model if available
        if model is not None:
            try:
                # Try using the new prediction function first
                from predict import predict_construction_placement
                predictions = predict_construction_placement(model, scaler, device, work_area_points)
                predicted_angle = predictions["rotation"]
                predicted_position = predictions["position"]
                logger.info(f"Predicted angle: {predicted_angle}")
                logger.info(f"Predicted position: {predicted_position}")
                
                return jsonify({
                    'rotation': float(predicted_angle),
                    'position': [float(predicted_position[0]), float(predicted_position[1])],
                    'success': True
                })
            except Exception as e:
                # Fall back to the older function if there's an error
                logger.warning(f"Error using new prediction function: {str(e)}. Falling back to rotation-only prediction.")
                from predict import predict_construction_rotation
                predicted_angle = predict_construction_rotation(model, scaler, device, work_area_points)
                logger.info(f"Predicted angle: {predicted_angle}")
                
                return jsonify({
                    'rotation': float(predicted_angle),
                    'success': True
                })
        else:
            # Fallback to simple algorithm if model isn't available
            logger.warning("Using fallback prediction algorithm")
            
            # Simple algorithm (same as in JavaScript version)
            def calculate_angle_between_points(p1, p2):
                return np.arctan2(p2[0] - p1[0], p2[1] - p1[1]) * 180 / np.pi
            
            # Get a base angle from the first two points
            reference_point = work_area_points[0]
            point2 = work_area_points[1]
            
            base_angle = calculate_angle_between_points(reference_point, point2)
            suggested_rotation = (base_angle + 90) % 360
            if suggested_rotation < 0:
                suggested_rotation += 360
                
            return jsonify({
                'rotation': float(suggested_rotation),
                'fallback': True,
                'success': True
            })
            
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        return jsonify({
            'error': str(e),
            'success': False
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    status = {
        'status': 'healthy',
        'model_loaded': model is not None
    }
    return jsonify(status)

@app.route('/', methods=['GET'])
def index():
    """Serve a simple info page"""
    return """
    <html>
        <head>
            <title>Construction Placement AI - API</title>
            <style>
                body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                h1, h2 { color: #333; }
                pre { background: #f4f4f4; padding: 10px; border-radius: 5px; }
                .endpoint { margin-bottom: 20px; }
            </style>
        </head>
        <body>
            <h1>Construction Placement AI - API Server</h1>
            <p>This server provides AI predictions for optimal construction rotations based on work area points.</p>
            
            <h2>Endpoints:</h2>
            
            <div class="endpoint">
                <h3>POST /api/predict</h3>
                <p>Predicts optimal rotation and position for a construction based on work area points.</p>
                <h4>Request:</h4>
                <pre>
{
  "workAreaPoints": [
    [49.80141, -97.07760],  // Reference point [lat, lng]
    [49.80136, -97.07778],  // Point 2
    [49.80134, -97.07764],  // Point 3 
    [49.80142, -97.07768]   // Point 4
  ]
}
                </pre>
                <h4>Response:</h4>
                <pre>
{
  "rotation": 145.23,  // Rotation in degrees
  "position": [49.80138, -97.07768],  // Optimal position [lat, lng]
  "success": true
}
                </pre>
            </div>
            
            <div class="endpoint">
                <h3>GET /api/health</h3>
                <p>Health check endpoint to verify the API is working.</p>
                <h4>Response:</h4>
                <pre>
{
  "status": "healthy",
  "model_loaded": true
}
                </pre>
            </div>
        </body>
    </html>
    """

@app.route('/training_history.png')
def serve_plot():
    """Serve the training history plot"""
    return send_from_directory('.', 'training_history.png')

if __name__ == "__main__":
    # Get port from environment variable or use 5000 as default
    port = int(os.environ.get('PORT', 8080))
    # Run the app
    app.run(host='0.0.0.0', port=port, debug=False)