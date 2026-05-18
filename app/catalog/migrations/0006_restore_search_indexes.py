from django.db import migrations
from django.contrib.postgres.indexes import GinIndex


class Migration(migrations.Migration):
    """
    Restores the three GIN trigram indexes removed by the auto-generated 0005
    migration. The indexes are now also declared in each model's Meta.indexes
    so that `makemigrations` will not auto-generate a removal migration again.

    Prerequisite: pg_trgm extension must be installed on the PostgreSQL cluster.
    Run once as superuser if not already present:
        CREATE EXTENSION IF NOT EXISTS pg_trgm;
    """

    dependencies = [
        ("catalog", "0005_remove_author_author_name_gin_trgm_idx_and_more"),
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
