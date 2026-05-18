from django.conf import settings
from django.db.models import Count, Prefetch
from django.contrib.postgres.search import TrigramSimilarity
from django.utils.cache import patch_cache_control
from rest_framework.views import APIView
from rest_framework.response import Response

from catalog.models import MagazineArticle, Author, Tag


class GlobalSearchView(APIView):
    MIN_QUERY_LENGTH = 2
    RESULTS_PER_CATEGORY = 4

    def get(self, request):
        q = request.query_params.get("q", "").strip()

        if len(q) < self.MIN_QUERY_LENGTH:
            return Response({"articles": [], "authors": [], "tags": []})

        # icontains → GIN index accelerates the LIKE '%q%' filter.
        # TrigramSimilarity → annotates each surviving row with a 0–1 relevance
        # score so that "AI and Society" ranks above "Legal Frameworks for AI
        # Liability" when the user typed "AI".
        # select_related("issue") → single SQL JOIN, no extra query per article.
        # prefetch_related("tags") → one extra query total for all 4 articles'
        # tags, not one per article (avoids the N+1 problem).
        articles_qs = (
            MagazineArticle.objects
            .filter(title__icontains=q)
            .annotate(sim=TrigramSimilarity("title", q))
            .order_by("-sim")
            .select_related("issue")
            .prefetch_related(
                Prefetch("tags", queryset=Tag.objects.only("name"))
            )
            [: self.RESULTS_PER_CATEGORY]
        )

        articles = []
        for art in articles_qs:
            issue = art.issue
            nums = issue.issue_number           # ArrayField e.g. [2]
            year2 = str(issue.publication_date.year)[2:]   # "2023" → "23"
            issue_ref = f"{nums[0]}/{year2}" if nums else ""
            topic = next((t.name for t in art.tags.all()), "")
            articles.append({
                "id": art.id,
                "title": art.title,
                "issue_ref": issue_ref,
                "topic": topic,
                "issue_id": issue.id,   # needed to fetch filtered results
            })

        authors = list(
            Author.objects
            .filter(name__icontains=q)
            .annotate(
                sim=TrigramSimilarity("name", q),
                # Count via the through-table so JOINs don't inflate the number.
                article_count=Count("authorarticle", distinct=True),
            )
            .order_by("-article_count", "-sim")   # prolific authors first
            .values("id", "name")
            [: self.RESULTS_PER_CATEGORY]
        )

        tags = list(
            Tag.objects
            .filter(name__icontains=q)
            .annotate(sim=TrigramSimilarity("name", q))
            .order_by("-sim")
            .values("id", "name")
            [: self.RESULTS_PER_CATEGORY]
        )

        response = Response({
            "articles": articles,
            "authors": authors,
            "tags": tags,
        })

        # Production: cache for 1 hour at Nginx (archive is highly static).
        # Development: no caching so code changes are visible immediately.
        if not settings.DEBUG:
            patch_cache_control(response, max_age=3600, s_maxage=3600)
        return response
