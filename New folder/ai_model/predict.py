#!/usr/bin/env python3
"""
Construction Placement AI - Prediction Script

This script loads a trained model and demonstrates how to use it
to predict the optimal rotation angle for a construction.
"""

import numpy as np
import torch
from torch.nn import Module
import pickle
import os

# File paths
model_path = 'construction_placement_model.pt'
scaler_path = 'feature_scaler.pkl'

# Neural network model definition (needs to match the training model)
class ConstructionPlacementPredictor(torch.nn.Module):
    def __init__(self, input_dim):
        super(ConstructionPlacementPredictor, self).__init__()
        self.shared_network = torch.nn.Sequential(
            torch.nn.Linear(input_dim, 64),
            torch.nn.BatchNorm1d(64),
            torch.nn.ReLU(),
            torch.nn.Dropout(0.2),
            
            torch.nn.Linear(64, 32),
            torch.nn.BatchNorm1d(32),
            torch.nn.ReLU(),
            torch.nn.Dropout(0.2)
        )
        
        # Branch for rotation prediction
        self.rotation_network = torch.nn.Sequential(
            torch.nn.Linear(32, 16),
            torch.nn.BatchNorm1d(16),
            torch.nn.ReLU(),
            torch.nn.Linear(16, 1)  # Output: rotation (normalized 0-1)
        )
        
        # Branch for position prediction
        self.position_network = torch.nn.Sequential(
            torch.nn.Linear(32, 16),
            torch.nn.BatchNorm1d(16),
            torch.nn.ReLU(),
            torch.nn.Linear(16, 2)  # Output: [lat, lng] (normalized)
        )
        
    def forward(self, x):
        shared_features = self.shared_network(x)
        rotation = self.rotation_network(shared_features)
        position = self.position_network(shared_features)
        return rotation, position

def load_trained_model():
    """Load the trained model and scaler."""
    try:
        # Load scaler
        if os.path.exists(scaler_path):
            with open(scaler_path, 'rb') as f:
                scaler = pickle.load(f)
            print(f"Successfully loaded scaler from {scaler_path}")
        else:
            print(f"Scaler file {scaler_path} not found, will use default normalization")
            scaler = None
        
        # Load model
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        model = ConstructionPlacementPredictor(input_dim=8)
        
        if os.path.exists(model_path):
            model.load_state_dict(torch.load(model_path, map_location=device))
            model.to(device)
            model.eval()
            print(f"Successfully loaded model from {model_path}")
        else:
            print(f"Model file {model_path} not found, please train the model first")
            return None, scaler
            
        return model, scaler, device
    except Exception as e:
        print(f"Error loading model: {e}")
        return None, None, None

def predict_construction_placement(model, scaler, device, work_area_points):
    """
    Predict the optimal rotation angle and position for a construction.
    
    Args:
        model: The trained model
        scaler: The feature scaler (if available)
        device: The device to run inference on
        work_area_points: List of 4 points, each with lat/lng coordinates
                         [[lat1, lng1], [lat2, lng2], [lat3, lng3], [lat4, lng4]]
    
    Returns:
        dict: Contains:
            - rotation: The predicted optimal rotation angle in degrees
            - position: The predicted optimal position [lat, lng]
    """
    # Convert points to the expected format
    features = np.array([
        work_area_points[0][0], work_area_points[0][1],  # reference point
        work_area_points[1][0], work_area_points[1][1],  # point 2
        work_area_points[2][0], work_area_points[2][1],  # point 3
        work_area_points[3][0], work_area_points[3][1]   # point 4
    ]).reshape(1, -1)
    
    # Normalize features if scaler is available
    if scaler is not None:
        features = scaler.transform(features)
    
    # Convert to PyTorch tensor
    features_tensor = torch.tensor(features, dtype=torch.float32).to(device)
    
    # Make prediction
    with torch.no_grad():
        rotation_pred, position_pred = model(features_tensor)
        rotation_pred = rotation_pred.cpu().numpy()[0, 0]
        position_pred = position_pred.cpu().numpy()[0]
    
    # Convert normalized rotation prediction back to degrees
    predicted_angle = rotation_pred * 360.0
    predicted_angle = predicted_angle % 360
    
    # Calculate predicted center
    # This depends on how position was normalized in training
    # For now, we'll use a simple approach assuming the position predictions
    # are relative to the centroid of the work area points
    centroid_lat = sum(point[0] for point in work_area_points) / 4
    centroid_lng = sum(point[1] for point in work_area_points) / 4
    
    # Scale the position prediction based on the size of the work area
    # Here we're assuming position_pred[0] is lat offset and position_pred[1] is lng offset
    # The actual implementation would depend on how you normalized the data during training
    lat_spread = max(point[0] for point in work_area_points) - min(point[0] for point in work_area_points)
    lng_spread = max(point[1] for point in work_area_points) - min(point[1] for point in work_area_points)
    
    predicted_lat = centroid_lat + position_pred[0] * lat_spread * 0.5  # Scale factor can be adjusted
    predicted_lng = centroid_lng + position_pred[1] * lng_spread * 0.5  # Scale factor can be adjusted
    
    return {
        "rotation": predicted_angle,
        "position": [predicted_lat, predicted_lng]
    }

# Keep this function for backward compatibility
def predict_construction_rotation(model, scaler, device, work_area_points):
    """
    Backward compatibility function that only returns rotation.
    """
    result = predict_construction_placement(model, scaler, device, work_area_points)
    return result["rotation"]

def demo_prediction():
    """Demonstrate a prediction with a sample work area."""
    model, scaler, device = load_trained_model()
    
    if model is None:
        return
    
    # Sample work area points (reference point first, then clockwise)
    sample_work_area = [
        [49.80141461742608, -97.07760782579732],  # Reference point
        [49.80136329624377, -97.07778716334005],  # Point 2
        [49.80134099917904, -97.07764262455791],  # Point 3
        [49.80142306447984, -97.07768519166763]   # Point 4
    ]
    
    # Get both rotation and position predictions
    prediction = predict_construction_placement(model, scaler, device, sample_work_area)
    
    print("\nPrediction Demo:")
    print("--------------")
    print("Work Area Points:")
    print(f"Reference Point: {sample_work_area[0]}")
    print(f"Point 2: {sample_work_area[1]}")
    print(f"Point 3: {sample_work_area[2]}")
    print(f"Point 4: {sample_work_area[3]}")
    print(f"Predicted Optimal Rotation: {prediction['rotation']:.2f} degrees")
    print(f"Predicted Optimal Position: [{prediction['position'][0]:.8f}, {prediction['position'][1]:.8f}]")

if __name__ == "__main__":
    demo_prediction()