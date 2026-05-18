from django.db import migrations
from django.contrib.postgres.indexes import GinIndex


class Migration(migrations.Migration):
    """
    Adds GIN trigram indexes to the three columns used by the global search endpoint.

    Prerequisite: the pg_trgm PostgreSQL extension must already exist on the cluster.
    Run this once as a superuser before applying this migration:

        CREATE EXTENSION IF NOT EXISTS pg_trgm;

    In the development environment this is safe because the hello_django user has
    superuser privileges. In production, ask the university DBA to run the command
    above on the database cluster once; this migration only creates indexes, which
    the application user is allowed to do.
    """

    dependencies = [
        ("catalog", "0003_alter_author_name"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="magazinearticle",
            index=GinIndex(
                fields=["title"],
                name="article_title_gin_trgm_idx",
                opclasses=["gin_trgm_ops"],
            ),
        ),
        migrations.AddIndex(
            model_name="author",
            index=GinIndex(
                fields=["name"],
                name="author_name_gin_trgm_idx",
                opclasses=["gin_trgm_ops"],
            ),
        ),
        migrations.AddIndex(
            model_name="tag",
            index=GinIndex(
                fields=["name"],
                name="tag_name_gin_trgm_idx",
                opclasses=["gin_trgm_ops"],
            ),
        ),
    ]
