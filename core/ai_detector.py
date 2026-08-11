"""
AI-generated image detector module for the SWARAKSHA project.
Uses a HuggingFace image classification model to detect deepfakes/AI-generated faces.
"""
import sys
import os

# Add parent directory to path to import config
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import config

import numpy as np
import cv2
from PIL import Image
import torch
from transformers import AutoModelForImageClassification

# Try ViTImageProcessor first (works with SadraCoding model),
# fall back to AutoImageProcessor for other models.
try:
    from transformers import ViTImageProcessor as _ImageProcessor
except ImportError:
    from transformers import AutoImageProcessor as _ImageProcessor


class AIImageDetector:
    """
    Detector for identifying AI-generated or deepfake face images.
    """
    def __init__(self, model_name=None, device=None):
        """
        Initialize the AIImageDetector.
        
        Args:
            model_name (str): The HuggingFace model identifier.
            device (str): Compute device ('cuda' or 'cpu').
        """
        self.model_name = model_name or getattr(config, 'AI_DETECTOR_MODEL', 'SadraCoding/SDXL-Deepfake-Detector')
        
        if device is None:
            self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        else:
            self.device = device
            
        print(f"[SWARAKSHA] Loading AI Detector model '{self.model_name}' on {self.device}...")
        
        try:
            # Use ViTImageProcessor for SadraCoding model compatibility
            try:
                self.processor = _ImageProcessor.from_pretrained(self.model_name)
            except Exception:
                from transformers import AutoImageProcessor
                self.processor = AutoImageProcessor.from_pretrained(self.model_name)
            
            self.model = AutoModelForImageClassification.from_pretrained(self.model_name).to(self.device)
            self.model.eval()
            self.id2label = self.model.config.id2label
            print(f"  ✓ AI Detector loaded — labels: {self.id2label}")
        except Exception as e:
            print(f"  ✗ Error loading model: {e}")
            raise

    def analyze(self, face_image) -> dict:
        """
        Analyze a face image to determine if it is AI-generated.
        
        Args:
            face_image: Image path (str), BGR numpy array (cv2), or PIL Image.
            
        Returns:
            dict: Analysis results containing probabilities and classification.
        """
        try:
            # Process input image
            if isinstance(face_image, str):
                image = Image.open(face_image).convert('RGB')
            elif isinstance(face_image, np.ndarray):
                # Convert OpenCV BGR to RGB, then to PIL Image
                image_rgb = cv2.cvtColor(face_image, cv2.COLOR_BGR2RGB)
                image = Image.fromarray(image_rgb).convert('RGB')
            elif isinstance(face_image, Image.Image):
                image = face_image.convert('RGB')
            else:
                raise ValueError("Unsupported image type. Must be str (path), numpy array, or PIL Image.")

            # Prepare inputs
            inputs = self.processor(images=image, return_tensors='pt').to(self.device)
            
            # Inference
            with torch.no_grad():
                outputs = self.model(**inputs)
                
            logits = outputs.logits
            probs = torch.nn.functional.softmax(logits, dim=-1)[0]
            
            # Identify which class index corresponds to AI/fake
            ai_idx = -1
            for idx, label in self.id2label.items():
                label_lower = label.lower()
                if any(kw in label_lower for kw in ['artificial', 'fake', 'ai', 'synthetic', 'generated']):
                    ai_idx = idx
                    break
            
            if ai_idx == -1:
                # Fallback: assume index 1 is fake if not found by keywords
                ai_idx = 1
                
            real_idx = 1 - ai_idx
            
            ai_confidence = float(probs[ai_idx].item())
            real_confidence = float(probs[real_idx].item())
            
            threshold = getattr(config, 'AI_DETECTOR_THRESHOLD', 0.5)
            is_ai = ai_confidence >= threshold
            
            return {
                'is_ai': is_ai,
                'ai_confidence': ai_confidence,
                'real_confidence': real_confidence,
                'label': 'AI-Generated' if is_ai else 'Real',
                'model': self.model_name,
            }
            
        except Exception as e:
            print(f"Error analyzing image: {e}")
            return {
                'is_ai': False,
                'ai_confidence': 0.0,
                'real_confidence': 0.0,
                'label': 'Error',
                'model': getattr(self, 'model_name', 'Unknown'),
            }

    def analyze_batch(self, face_images: list) -> list:
        """
        Analyze a batch of face images.
        
        Args:
            face_images (list): List of images to analyze.
            
        Returns:
            list: List of result dictionaries.
        """
        return [self.analyze(img) for img in face_images]


def preload_detector() -> AIImageDetector:
    """
    Preload and return the AIImageDetector instance.
    
    Returns:
        AIImageDetector: Initialized detector instance.
    """
    print("Preloading AI Image Detector...")
    try:
        detector = AIImageDetector()
        return detector
    except Exception as e:
        print(f"Failed to preload AI Image Detector: {e}")
        return None
