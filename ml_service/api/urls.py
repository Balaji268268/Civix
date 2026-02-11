from django.urls import path
from . import views
from . import advanced_ai

urlpatterns = [
    path('health/', views.health_check),
    path('predict-priority/', views.predict_priority),
    path('detect-fake/', views.detect_fake),
    path('categorize/', views.categorize),
    path('analyze-image/', views.analyze_image),
    path('generate-caption/', views.generate_caption_view),
    path('validate-issue-image/', views.validate_issue_image),  # NEW: Spam detection
    path('find-duplicates/', views.find_duplicates),
    path('get-embedding/', views.get_embedding),
    
    # Advanced AI Endpoints
    path('analyze-toxicity/', advanced_ai.analyze_toxicity),
    path('transcribe-audio/', advanced_ai.transcribe_audio),
    path('check-semantic-duplicate/', advanced_ai.check_semantic_duplicate),
    path('generate-reply/', advanced_ai.generate_reply),
    path('predict-resolution-time/', advanced_ai.predict_resolution_time),
]
