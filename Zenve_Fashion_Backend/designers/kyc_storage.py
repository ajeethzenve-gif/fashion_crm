from pathlib import Path
from uuid import uuid4
from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.utils.deconstruct import deconstructible

# Separate from public MEDIA_ROOT and PRIVATE_MEDIA_ROOT, which have media routes.
@deconstructible
class KYCStorage(FileSystemStorage):
    def __init__(self):
        super().__init__(location=settings.BASE_DIR / "kyc_documents")


kyc_storage = KYCStorage()


def kyc_upload_path(instance, filename):
    return f"{instance.designer_id}/{uuid4().hex}{Path(filename).suffix.lower()}"
