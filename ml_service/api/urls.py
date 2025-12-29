from django.urls import path
from . import views

urlpatterns = [
    path('predict-priority/', views.predict_priority),
    path('detect-fake/', views.detect_fake),
    path('categorize/', views.categorize),
    path('analyze-image/', views.analyze_image),
    path('find-duplicates/', views.find_duplicates),
    path('get-embedding/', views.get_embedding),
]
