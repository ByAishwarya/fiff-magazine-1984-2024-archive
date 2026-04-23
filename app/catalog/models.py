import os

from django.core.files.storage import FileSystemStorage
from django.db import models
from django.contrib.postgres.fields import ArrayField
from django.conf import settings

#COVERS_STORAGE = FileSystemStorage(location="/media/covers")
COVERS_STORAGE = FileSystemStorage(location=settings.MEDIA_ROOT)

class MagazineIssue(models.Model):
    publication_date = models.DateField()
    issue_number = ArrayField(models.IntegerField(), blank=True, default=list)
    front_cover = models.ImageField(storage=COVERS_STORAGE)
    pdf_file = models.FileField(storage=COVERS_STORAGE, null=True)

    class Meta:
        ordering = ['issue_number']

    def get_publication_date(self):
        return self.publication_date.strftime("%B/%Y")

    def __str__(self):
        issues = list(map(lambda x: str(x), self.issue_number))
        return f"Issue: {','.join(issues)} - Publication_Date: {self.get_publication_date()}"
        

class MagazineArticle(models.Model):
    issue = models.ForeignKey('MagazineIssue', on_delete=models.CASCADE)
    publication_year = models.DateField()
    articles = models.ManyToManyField('Author', through='AuthorArticle')
    tags = models.ManyToManyField('Tag', through='ArticleTag')
    title = models.CharField(max_length=300, blank=True, default='')

class Author(models.Model):
    name = models.CharField(max_length=200)
    articles = models.ManyToManyField('MagazineArticle', through='AuthorArticle')

class AuthorArticle(models.Model):
    author = models.ForeignKey('Author', on_delete=models.CASCADE)
    article = models.ForeignKey('MagazineArticle', on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.author.__str__()} - {self.article.__str__()}"


class ArticleTag(models.Model):
    tag = models.ForeignKey('Tag', on_delete=models.CASCADE)
    article = models.ForeignKey('MagazineArticle', on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.tag.__str__()} - {self.article.__str__()}"
 

class Tag(models.Model):
    name = models.CharField(max_length=30)