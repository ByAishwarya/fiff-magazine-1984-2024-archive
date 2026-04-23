from catalog.models import MagazineIssue, MagazineArticle
from rest_framework import serializers


class MagazineArticleSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()

    class Meta:
        model = MagazineArticle
        fields = ['title', 'author']

    def get_author(self, obj):
        authors = obj.articles.all()
        if authors.exists():
            return ', '.join(author.name for author in authors)
        return ''


class MagazineIssueSerializer(serializers.HyperlinkedModelSerializer):
    articles = MagazineArticleSerializer(
        many=True, read_only=True, source='magazinearticle_set'
    )

    class Meta:
        model = MagazineIssue
        fields = '__all__'

    def to_representation(self, instance):
        representation = super(MagazineIssueSerializer, self).to_representation(instance)
        representation["publication_date"] = instance.get_publication_date()
        return representation
