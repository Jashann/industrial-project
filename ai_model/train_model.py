#!/usr/bin/env python3
"""
Construction Placement AI - Supervised Learning Model

This script trains a model to predict both construction position and rotation
based on the four points of a work area. It uses a shared feature network with
two specialized output branches for position and rotation prediction.
"""

import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import pickle

# Set seeds for reproducibility
np.random.seed(42)
torch.manual_seed(42)

# File paths
csv_path = '../construction_samples_1743777545928.csv'
model_path = 'construction_placement_model.pt'
scaler_path = 'feature_scaler.pkl'
results_path = 'model_evaluation.txt'
plot_path = 'training_history.png'

# Custom dataset for construction data with both rotation and position targets
class ConstructionDataset(Dataset):
    def __init__(self, features, rotation_targets, position_targets=None):
        self.features = torch.tensor(features, dtype=torch.float32)
        self.rotation_targets = torch.tensor(rotation_targets, dtype=torch.float32).unsqueeze(1)
        
        # Handle position targets if provided
        if position_targets is not None:
            self.position_targets = torch.tensor(position_targets, dtype=torch.float32)
            self.has_position = True
        else:
            self.has_position = False
        
    def __len__(self):
        return len(self.features)
        
    def __getitem__(self, idx):
        if self.has_position:
            return self.features[idx], (self.rotation_targets[idx], self.position_targets[idx])
        else:
            return self.features[idx], self.rotation_targets[idx]

# Define the neural network model with two heads for rotation and position
class ConstructionPlacementPredictor(nn.Module):
    def __init__(self, input_dim):
        super(ConstructionPlacementPredictor, self).__init__()
        
        # Shared feature extraction network
        self.shared_network = nn.Sequential(
            nn.Linear(input_dim, 64),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.Dropout(0.2),
            
            nn.Linear(64, 32),
            nn.BatchNorm1d(32),
            nn.ReLU(),
            nn.Dropout(0.2)
        )
        
        # Branch for rotation prediction
        self.rotation_network = nn.Sequential(
            nn.Linear(32, 16),
            nn.BatchNorm1d(16),
            nn.ReLU(),
            nn.Linear(16, 1)  # Output: rotation (normalized 0-1)
        )
        
        # Branch for position prediction
        self.position_network = nn.Sequential(
            nn.Linear(32, 16),
            nn.BatchNorm1d(16),
            nn.ReLU(),
            nn.Linear(16, 2)  # Output: [lat, lng] (normalized)
        )
        
    def forward(self, x):
        shared_features = self.shared_network(x)
        rotation = self.rotation_network(shared_features)
        position = self.position_network(shared_features)
        return rotation, position

# Custom loss for angle prediction (circular mean squared error)
def angle_loss(pred, target):
    # Convert normalized angles to radians
    pred_rad = pred * 2 * np.pi
    target_rad = target * 2 * np.pi
    
    # Calculate the sine and cosine of the difference
    sin_diff = torch.sin(target_rad - pred_rad)
    cos_diff = torch.cos(target_rad - pred_rad)
    
    # Calculate the circular loss (1 - cos of difference)
    loss = 1 - cos_diff
    
    return loss.mean()

def preprocess_data(df):
    """Preprocess the data for model training."""
    print("Preprocessing data...")
    
    # Extract features (work area points)
    X = df[['reference_point_lat', 'reference_point_lng', 
           'point2_lat', 'point2_lng', 
           'point3_lat', 'point3_lng', 
           'point4_lat', 'point4_lng']].values
    
    # Extract rotation targets
    y_rotation = df['construction_rotation'].values
    
    # Normalize rotation angle to be between 0 and 1
    y_rotation = y_rotation / 360.0
    
    # Extract position targets
    if 'construction_center_lat' in df.columns and 'construction_center_lng' in df.columns:
        print("Found position data in dataset. Training for both rotation and position.")
        has_position_data = True
        
        # Get position data
        position_data = df[['construction_center_lat', 'construction_center_lng']].values
        
        # Calculate centroid of each work area for normalization reference
        centroids = np.zeros((len(df), 2))
        for i in range(len(df)):
            centroids[i, 0] = (X[i, 0] + X[i, 2] + X[i, 4] + X[i, 6]) / 4  # average of all lats
            centroids[i, 1] = (X[i, 1] + X[i, 3] + X[i, 5] + X[i, 7]) / 4  # average of all lngs
        
        # Calculate the difference between position and centroid
        # This normalizes the position relative to the work area centroid
        position_offsets = position_data - centroids
        
        # Split data maintaining the relationship between X, rotation and position
        X_train, X_temp, y_train_rot, y_temp_rot, y_train_pos, y_temp_pos = train_test_split(
            X, y_rotation, position_offsets, test_size=0.3, random_state=42)
        
        X_val, X_test, y_val_rot, y_test_rot, y_val_pos, y_test_pos = train_test_split(
            X_temp, y_temp_rot, y_temp_pos, test_size=0.5, random_state=42)
    else:
        print("No position data found in dataset. Training for rotation only.")
        has_position_data = False
        
        # Split the data (rotation only)
        X_train, X_temp, y_train_rot, y_temp_rot = train_test_split(X, y_rotation, test_size=0.3, random_state=42)
        X_val, X_test, y_val_rot, y_test_rot = train_test_split(X_temp, y_temp_rot, test_size=0.5, random_state=42)
        
        # Set position targets to None
        y_train_pos = y_val_pos = y_test_pos = None
    
    # Normalize features
    scaler = StandardScaler()
    X_train = scaler.fit_transform(X_train)
    X_val = scaler.transform(X_val)
    X_test = scaler.transform(X_test)
    
    # Save the scaler for later use
    with open(scaler_path, 'wb') as f:
        pickle.dump(scaler, f)
    
    return X_train, X_val, X_test, y_train_rot, y_val_rot, y_test_rot, y_train_pos, y_val_pos, y_test_pos, scaler, has_position_data

def train_model(model, train_loader, val_loader, device, has_position_data=False, epochs=100):
    """Train the model."""
    print("Training model...")
    
    # Optimizer and loss functions
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    rotation_criterion = nn.MSELoss()
    position_criterion = nn.MSELoss() if has_position_data else None
    
    # Lists to store training history
    train_losses = []
    val_losses = []
    
    # Variables for early stopping
    best_val_loss = float('inf')
    patience = 30
    patience_counter = 0
    best_model_state = None
    
    for epoch in range(epochs):
        # Training
        model.train()
        train_loss = 0.0
        
        for batch_features, batch_targets in train_loader:
            batch_features = batch_features.to(device)
            
            # Different handling based on whether we have position data
            if has_position_data:
                # Unpack rotation and position targets
                batch_rotation_targets, batch_position_targets = batch_targets
                batch_rotation_targets = batch_rotation_targets.to(device)
                batch_position_targets = batch_position_targets.to(device)
                
                # Forward pass
                rotation_outputs, position_outputs = model(batch_features)
                
                # Calculate losses
                rotation_loss = rotation_criterion(rotation_outputs, batch_rotation_targets)
                position_loss = position_criterion(position_outputs, batch_position_targets)
                
                # Combine losses (with position having lower weight)
                loss = rotation_loss + 0.5 * position_loss
            else:
                # Only rotation targets
                batch_targets = batch_targets.to(device)
                
                # Forward pass (only use rotation output)
                rotation_outputs, _ = model(batch_features)
                
                # Calculate loss
                loss = rotation_criterion(rotation_outputs, batch_targets)
            
            # Backward pass and optimize
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item()
        
        train_loss /= len(train_loader)
        train_losses.append(train_loss)
        
        # Validation
        model.eval()
        val_loss = 0.0
        
        with torch.no_grad():
            for batch_features, batch_targets in val_loader:
                batch_features = batch_features.to(device)
                
                # Different handling based on whether we have position data
                if has_position_data:
                    # Unpack rotation and position targets
                    batch_rotation_targets, batch_position_targets = batch_targets
                    batch_rotation_targets = batch_rotation_targets.to(device)
                    batch_position_targets = batch_position_targets.to(device)
                    
                    # Forward pass
                    rotation_outputs, position_outputs = model(batch_features)
                    
                    # Calculate losses
                    rotation_loss = rotation_criterion(rotation_outputs, batch_rotation_targets)
                    position_loss = position_criterion(position_outputs, batch_position_targets)
                    
                    # Combine losses (with position having lower weight)
                    loss = rotation_loss + 0.5 * position_loss
                else:
                    # Only rotation targets
                    batch_targets = batch_targets.to(device)
                    
                    # Forward pass (only use rotation output)
                    rotation_outputs, _ = model(batch_features)
                    
                    # Calculate loss
                    loss = rotation_criterion(rotation_outputs, batch_targets)
                
                val_loss += loss.item()
        
        val_loss /= len(val_loader)
        val_losses.append(val_loss)
        
        # Print progress
        if (epoch + 1) % 10 == 0:
            print(f"Epoch {epoch+1}/{epochs}, Train Loss: {train_loss:.6f}, Val Loss: {val_loss:.6f}")
        
        # Early stopping
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            patience_counter = 0
            best_model_state = model.state_dict()
        else:
            patience_counter += 1
            if patience_counter >= patience:
                print(f"Early stopping at epoch {epoch+1}")
                break
    
    # Load best model
    if best_model_state is not None:
        model.load_state_dict(best_model_state)
    
    return model, train_losses, val_losses

def evaluate_model(model, X_test, y_test_rot, y_test_pos, device, has_position_data=False):
    """Evaluate the model on the test set."""
    print("Evaluating model...")
    
    # Convert to PyTorch tensors
    X_test_tensor = torch.tensor(X_test, dtype=torch.float32).to(device)
    
    # Get predictions
    model.eval()
    with torch.no_grad():
        y_pred_rot, y_pred_pos = model(X_test_tensor)
        y_pred_rot = y_pred_rot.cpu().numpy().flatten()
        if has_position_data:
            y_pred_pos = y_pred_pos.cpu().numpy()
    
    # Convert normalized rotation predictions back to degrees
    y_pred_degrees = y_pred_rot * 360.0
    y_test_degrees = y_test_rot * 360.0
    
    # Calculate mean absolute error in degrees for rotation
    mae_degrees = np.mean(np.abs(y_pred_degrees - y_test_degrees))
    
    # Calculate circular error (accounting for the circular nature of angles)
    circular_error = []
    for true, pred in zip(y_test_degrees, y_pred_degrees):
        # Calculate the minimum angle between the two
        err = np.abs(((true - pred) + 180) % 360 - 180)
        circular_error.append(err)
    
    mean_circular_error = np.mean(circular_error)
    
    # Evaluate position if available
    if has_position_data and y_test_pos is not None:
        # Calculate mean squared error for position
        position_mse = np.mean(np.sum((y_pred_pos - y_test_pos) ** 2, axis=1))
        position_mae = np.mean(np.sqrt(np.sum((y_pred_pos - y_test_pos) ** 2, axis=1)))
        
        # Print and save results with position metrics
        results = f"""
        Model Evaluation Results:
        ------------------------
        Rotation Metrics:
        - Mean Absolute Error (degrees): {mae_degrees:.2f}
        - Mean Circular Error (degrees): {mean_circular_error:.2f}
        
        Position Metrics:
        - Mean Squared Error (offset): {position_mse:.6f}
        - Mean Distance Error: {position_mae:.6f}
        
        This means the model can predict the construction rotation
        with an average error of {mean_circular_error:.2f} degrees
        and the construction position with an average error
        of {position_mae:.6f} coordinate units.
        """
    else:
        # Print and save results for rotation only
        results = f"""
        Model Evaluation Results:
        ------------------------
        Rotation Metrics:
        - Mean Absolute Error (degrees): {mae_degrees:.2f}
        - Mean Circular Error (degrees): {mean_circular_error:.2f}
        
        This means the model can predict the construction rotation
        with an average error of {mean_circular_error:.2f} degrees.
        """
    
    print(results)
    
    with open(results_path, 'w') as f:
        f.write(results)
    
    # Return metrics
    if has_position_data and y_test_pos is not None:
        return mae_degrees, mean_circular_error, position_mse, position_mae
    else:
        return mae_degrees, mean_circular_error, None, None

def plot_training_history(train_losses, val_losses):
    """Plot and save the training history."""
    print("Plotting training history...")
    
    plt.figure(figsize=(10, 6))
    plt.plot(train_losses, label='Training Loss')
    plt.plot(val_losses, label='Validation Loss')
    plt.title('Model Loss')
    plt.ylabel('Loss')
    plt.xlabel('Epoch')
    plt.legend()
    plt.grid(True)
    
    plt.tight_layout()
    plt.savefig(plot_path)
    plt.close()

def main():
    """Main function to run the training pipeline."""
    print("Starting construction placement AI training...")
    
    # Determine device (use GPU if available)
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")
    
    # Check if the CSV file exists
    if not os.path.exists(csv_path):
        print(f"CSV file not found: {csv_path}")
        print("Please generate samples first by using the 'Generate 5000 Samples' button in the application.")
        return None, None, None, None
    
    # Load and explore the data
    df = pd.read_csv(csv_path)
    print(f"Loaded {len(df)} samples from the CSV file.")
    print("Sample data:")
    print(df.head())
    print("\nColumns in dataset:")
    print(df.columns.tolist())
    
    # Preprocess the data
    # This returns both rotation and position data if available
    X_train, X_val, X_test, y_train_rot, y_val_rot, y_test_rot, y_train_pos, y_val_pos, y_test_pos, scaler, has_position_data = preprocess_data(df)
    
    # Create datasets and data loaders
    if has_position_data:
        print("Creating datasets with both rotation and position targets")
        train_dataset = ConstructionDataset(X_train, y_train_rot, y_train_pos)
        val_dataset = ConstructionDataset(X_val, y_val_rot, y_val_pos)
    else:
        print("Creating datasets with rotation targets only")
        train_dataset = ConstructionDataset(X_train, y_train_rot)
        val_dataset = ConstructionDataset(X_val, y_val_rot)
    
    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=32)
    
    # Build and initialize the model
    input_dim = X_train.shape[1]
    model = ConstructionPlacementPredictor(input_dim).to(device)
    print(model)
    
    # Train the model
    model, train_losses, val_losses = train_model(model, train_loader, val_loader, device, has_position_data)
    
    # Save the model
    torch.save(model.state_dict(), model_path)
    
    # Evaluate the model
    if has_position_data:
        mae, circular_error, position_mse, position_mae = evaluate_model(
            model, X_test, y_test_rot, y_test_pos, device, has_position_data)
    else:
        mae, circular_error, _, _ = evaluate_model(
            model, X_test, y_test_rot, None, device, has_position_data)
    
    # Plot and save training history
    plot_training_history(train_losses, val_losses)
    
    print(f"Training complete! Model saved to {model_path}")
    print(f"Evaluation results saved to {results_path}")
    print(f"Training history plot saved to {plot_path}")
    
    # Update model type info for future reference
    model_info = {
        "model_type": "combined" if has_position_data else "rotation_only",
        "input_dim": input_dim,
        "trained_with_position": has_position_data
    }
    
    with open("model_info.json", "w") as f:
        import json
        json.dump(model_info, f, indent=2)
    
    print(f"Model info saved to model_info.json")
    
    if has_position_data:
        return model, scaler, (mae, circular_error), (position_mse, position_mae)
    else:
        return model, scaler, (mae, circular_error), None

if __name__ == "__main__":
    main()