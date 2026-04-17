emotion_model.h5  ← CNN trained on FER2013 (39MB) — already included!

Architecture: Conv2D → MaxPool → Conv2D → MaxPool → Flatten → Dense(128) → Dropout(0.5) → Softmax(7)
Emotions: angry, disgust, fear, happy, neutral, sad, surprise
Input: 48×48 grayscale image
Training accuracy: ~73%  |  Validation: ~70.2%  |  Test: 71.3%

The backend loads this automatically on startup.
To use it, install TensorFlow: pip install tensorflow-cpu==2.15.0
