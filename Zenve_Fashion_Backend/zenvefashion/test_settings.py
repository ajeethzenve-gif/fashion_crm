from .settings import *

DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
DB_TABLE_PREFIX = ""
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
