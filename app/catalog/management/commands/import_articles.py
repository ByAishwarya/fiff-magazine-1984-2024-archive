import re

from django.core.management.base import BaseCommand
from django.db import transaction

from odf.opendocument import load
from odf.table import Table, TableRow, TableCell
from odf.text import P

from catalog.models import MagazineIssue, MagazineArticle, Author, AuthorArticle


def get_text(cell):
    parts = []
    for p in cell.getElementsByType(P):
        for child in p.childNodes:
            if hasattr(child, 'data'):
                parts.append(child.data)
            elif hasattr(child, 'childNodes'):
                for c2 in child.childNodes:
                    if hasattr(c2, 'data'):
                        parts.append(c2.data)
    return ''.join(parts).strip()


def parse_jahrgang(jahrgang):
    """Parse jahrgang like '1988-1', '2012-01', '2018_02', '2021_02+03' into (year, [issue_numbers])."""
    jahrgang = jahrgang.strip()
    # Split on - or _
    parts = re.split(r'[-_]', jahrgang, maxsplit=1)
    if len(parts) != 2:
        return None, None
    year_str, issue_str = parts
    try:
        year = int(year_str)
    except ValueError:
        return None, None
    # Issue part may be "02+03" or "1" or "01"
    issue_numbers = []
    for num_str in issue_str.split('+'):
        num_str = num_str.strip()
        try:
            issue_numbers.append(int(num_str))
        except ValueError:
            return None, None
    return year, sorted(issue_numbers)


class Command(BaseCommand):
    help = 'Import articles from the ODS spreadsheet into MagazineArticle, Author, and AuthorArticle tables.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            default='data/FK-RB_Autoren-Artikel_Buecher_ in GS_bis FK 4-2025.ods',
            help='Path to the ODS file',
        )
        parser.add_argument(
            '--sheet',
            default='FK-Nr-Artikel',
            help='Sheet name to import from',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Parse and report without writing to the database',
        )

    def handle(self, *args, **options):
        file_path = options['file']
        sheet_name = options['sheet']
        dry_run = options['dry_run']

        self.stdout.write(self.style.NOTICE('Loading ODS file: ' + file_path))
        doc = load(file_path)

        target_sheet = None
        for sheet in doc.spreadsheet.getElementsByType(Table):
            if sheet.getAttribute('name') == sheet_name:
                target_sheet = sheet
                break

        if target_sheet is None:
            self.stderr.write(self.style.ERROR('Sheet "%s" not found.' % sheet_name))
            return

        # Build a lookup: (year, tuple(issue_numbers)) -> MagazineIssue
        issue_lookup = {}
        for issue in MagazineIssue.objects.all():
            key = (issue.publication_date.year, tuple(sorted(issue.issue_number)))
            issue_lookup[key] = issue

        rows = target_sheet.getElementsByType(TableRow)
        articles_to_create = []
        skipped = 0
        no_match = set()

        for row in rows:
            cells = row.getElementsByType(TableCell)
            if len(cells) < 4:
                continue
            vals = [get_text(cells[i]) for i in range(4)]
            jahrgang, _, autor_raw, title = vals

            if not jahrgang or jahrgang == 'Jahrgang':
                continue
            if not title:
                continue

            year, issue_numbers = parse_jahrgang(jahrgang)
            if year is None:
                skipped += 1
                continue

            key = (year, tuple(issue_numbers))
            issue = issue_lookup.get(key)
            if issue is None:
                no_match.add(jahrgang)
                skipped += 1
                continue

            articles_to_create.append({
                'issue': issue,
                'year': year,
                'title': title,
                'author_raw': autor_raw,
            })

        self.stdout.write('Parsed %d articles, skipped %d rows.' % (len(articles_to_create), skipped))
        if no_match:
            self.stdout.write(self.style.WARNING(
                'No matching MagazineIssue for jahrgang values: %s' % ', '.join(sorted(no_match))
            ))

        if dry_run:
            self.stdout.write(self.style.SUCCESS('Dry run complete. No data written.'))
            return

        # Import in a transaction
        with transaction.atomic():
            # Clear existing data to allow re-runs
            AuthorArticle.objects.all().delete()
            MagazineArticle.objects.all().delete()
            Author.objects.all().delete()

            author_cache = {}
            created_articles = 0
            created_authors = 0

            for item in articles_to_create:
                from datetime import date
                article = MagazineArticle.objects.create(
                    issue=item['issue'],
                    publication_year=date(item['year'], 1, 1),
                    title=item['title'],
                )
                created_articles += 1

                # Parse authors: clean up (SP) markers, split on / or +
                author_raw = item['author_raw']
                if not author_raw:
                    continue

                # Remove markers like (SP), (CC), (IG Metall) etc.
                author_clean = re.sub(r'\([^)]*\)', '', author_raw).strip()
                if not author_clean:
                    continue

                # Split on common delimiters: / + and
                author_names = re.split(r'\s*/\s*|\s*\+\s*', author_clean)

                for name in author_names:
                    name = name.strip().rstrip(',').strip()
                    if not name:
                        continue
                    if name not in author_cache:
                        author_obj = Author.objects.create(name=name)
                        author_cache[name] = author_obj
                        created_authors += 1
                    AuthorArticle.objects.create(
                        author=author_cache[name],
                        article=article,
                    )

        self.stdout.write(self.style.SUCCESS(
            'Import complete: %d articles, %d unique authors created.' % (created_articles, created_authors)
        ))
