# Construction Placement AI Model

This directory contains a machine learning model that predicts the optimal rotation for construction placements based on work area points.

## Files

- `train_model.py`: Python script to train the model using the construction samples dataset
- `predict.py`: Python script to load the model and make predictions
- `app.py`: Flask API server that provides predictions via HTTP endpoints
- `integrate.js`: JavaScript file that integrates the AI functionality with the Construction Manager web app

## Model Description

The model uses a neural network to predict the optimal rotation angle for a construction based on the four points of a work area. It takes as input:

- 4 work area points (lat/lng pairs), with the first being the reference point
- Total: 8 input features

The output is:
- Construction rotation angle (in degrees)

## API Server

The API server provides the following endpoints:

- `POST /api/predict`: Predicts optimal rotation for a construction based on work area points
- `GET /api/health`: Health check endpoint to verify the API is working

### Running the API Server

To run the API server:

```bash
cd ai_model
pip install -r requirements.txt
python app.py
```

The server will start on http://localhost:5000 by default.

## Training the Model

To train the model, you'll need Python 3.6+ with PyTorch and other dependencies installed. Run:

```bash
cd ai_model
pip install -r requirements.txt
python train_model.py
```

The training script will:
1. Load the construction samples dataset
2. Preprocess the data
3. Build and train the neural network model
4. Evaluate model performance
5. Save the trained model and feature scaler

## Using the Model for Predictions

To demonstrate predictions with the trained model, run:

```bash
python predict.py
```

This will load the trained model and make a prediction for a sample work area.

## JavaScript Integration

The `integrate.js` file adds AI capabilities to the Construction Manager web application:

1. Adds an "AI Assistance" section to the training sidebar
2. Provides a "Suggest Optimal Rotation" button
3. Displays AI-suggested rotation and allows applying it
4. Adds an "Auto-Place with AI" button to the main UI

The JavaScript implementation includes:
- API calls to the Flask backend for predictions
- Fallback algorithm when the API is not available
- Functions to suggest and apply rotations
- UI elements for displaying suggestions

## Performance

On the test dataset, the model achieves:
- Mean Circular Error: 9.55° (average error in degrees)

This accuracy is suitable for providing reasonable suggestions that construction planners can use as a starting point.

## Sample Generation

The samples used for training were generated using the web application's training mode, which creates variations of work areas with different reference points and variance settings.

## Future Work

1. Expand the model to predict construction position in addition to rotation
2. Incorporate additional features like road geometry and traffic data
3. Improve prediction accuracy with a more sophisticated model architecture
4. Deploy the API to a cloud service for production use