from catalog.models import MagazineIssue
from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework import status
from collections import defaultdict
from django.db.models import Q

from catalog.serializers import MagazineIssueSerializer

def format_into_datetime(datetime_str):
    from datetime import datetime
    return datetime.strptime(datetime_str, '%B-%Y')

def parse_issue_id(issue_id_str):
    return {
        "issue_number": int(issue_id_str.split("-")[0]),
        "issue_year": int(issue_id_str.split("-")[1]),
    }

def get_q_object_for_issue_range(issue_range, parsed_issue_param):
    return Q(issue_number__contained_by=issue_range,
                           publication_date__year=parsed_issue_param["issue_year"])


class MagazineIssueViewSet(ModelViewSet):
    queryset = MagazineIssue.objects.prefetch_related(
        'magazinearticle_set__articles'
    ).all()
    serializer_class = MagazineIssueSerializer

    def list(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        serializer_output = self.serializer_class(queryset, many=True, context={'request': request}).data

        d=defaultdict(list)
        for instance in serializer_output:
            pub_year = instance['publication_date'].split('/')[1]
            d[pub_year].append(instance)

        return Response(d)

    @action(detail=False, methods=['get'])
    def decades(self, request):
        data = self.list(request).data

        d=defaultdict(list)
        years = data.keys()
        for year in years:
            year=int(year)
            d[int(year - (year%10))].append(year)

        return Response(d)


    @action(detail=False, methods=['get'])
    def filter_values(self, request):
        import calendar

        qs = self.get_queryset()

        issue_lst, year_lst, months_lst = (
            qs.values_list('issue_number', flat=True).distinct(),
            qs.values_list('publication_date__year', flat=True).distinct(),
            qs.values_list('publication_date__month', flat=True).distinct()
        )

        issues=set()
        for inner_lst in issue_lst:
            for element in inner_lst:
                issues.add(element)

        months_lst = list(set([calendar.month_name[month_num] for month_num in months_lst]))

        d = {
            'issues': list(issues),
            'years': list(set(year_lst)),
            'months': months_lst
        }

        return Response(d)



    @action(detail=False, methods=['get'])
    def search(self, request):
        date_begin = request.query_params.get('date_begin', None)
        date_end = request.query_params.get('date_end', None)

        issue_begin = request.query_params.get('issue_begin', None)
        issue_end = request.query_params.get('issue_end', None)

        if date_begin:
            date_begin = format_into_datetime(date_begin)

            if date_end:
                date_end = format_into_datetime(date_end)
                filter_query = Q(publication_date__range=(date_begin, date_end))
            else:
                filter_query=Q(publication_date=date_begin)

            queryset = self.get_queryset().filter(filter_query)

        if issue_begin:
            parsed_issue_param = parse_issue_id(issue_begin)

            if issue_end:
                issue_begin_range = list(range(parsed_issue_param["issue_number"], 5))
                filter_query_begin = get_q_object_for_issue_range(issue_begin_range,
                                                                  parsed_issue_param)

                parsed_issue_param_end = parse_issue_id(issue_end)
                issue_end_range = list(range(1, parsed_issue_param_end["issue_number"]+1))
                filter_query_end = get_q_object_for_issue_range(issue_end_range,
                                                                parsed_issue_param_end)

                queryset_begin = self.get_queryset().filter(filter_query_begin)
                queryset_end = self.get_queryset().filter(filter_query_end)
                queryset = queryset_begin.union(queryset_end)

            else:
                filter_query=get_q_object_for_issue_range([parsed_issue_param["issue_number"]],
                                                          parsed_issue_param)
                queryset = self.get_queryset().filter(filter_query)

        queryset = queryset.order_by('publication_date')

        serializer_output = self.serializer_class(queryset, many=True, context={'request': request}).data

        return Response(serializer_output)

    @action(detail=False, methods=['get'])
    def by_entity(self, request):
        """
        Return magazine issues filtered by a related entity, grouped by year.
        Query params:
          type  — 'author', 'tag', or 'article'
          id    — integer pk of the entity
        Response shape: { "1988": [...issues], "2001": [...issues] }
        """
        entity_type = request.query_params.get('type', '').strip()
        entity_id   = request.query_params.get('id', '').strip()

        if not entity_type or not entity_id:
            return Response(
                {'error': 'type and id query params are required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            entity_id = int(entity_id)
        except ValueError:
            return Response(
                {'error': 'id must be an integer'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        qs = self.get_queryset()

        if entity_type == 'author':
            # MagazineArticle.articles is the M2M field pointing to Author
            qs = qs.filter(magazinearticle__articles__id=entity_id).distinct()
        elif entity_type == 'tag':
            qs = qs.filter(magazinearticle__tags__id=entity_id).distinct()
        elif entity_type == 'article':
            qs = qs.filter(magazinearticle__id=entity_id).distinct()
        else:
            return Response(
                {'error': "type must be 'author', 'tag', or 'article'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        qs = qs.order_by('publication_date')
        serializer_output = self.serializer_class(qs, many=True, context={'request': request}).data

        grouped = defaultdict(list)
        for issue in serializer_output:
            year = issue['publication_date'].split('/')[1]
            grouped[year].append(issue)

        return Response(grouped)
