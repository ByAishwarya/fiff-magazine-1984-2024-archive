from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from rest_framework import routers

from catalog.views import MagazineIssueViewSet
from catalog.search_views import GlobalSearchView

router = routers.DefaultRouter()
router.register(r'magazine_issue', MagazineIssueViewSet)

urlpatterns = [
    #path("", image_upload, name="upload"),
    path('', include(router.urls)),
    path("search/", GlobalSearchView.as_view(), name="global-search"),
    path("admin/", admin.site.urls),
]

if bool(settings.DEBUG):
#    urlpatterns = static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
