from django.db import models
from blusers.models import BlocklogicUser

from common.models import SkeletonU
from pos.models import Company


class UserConfig(SkeletonU):
    user = models.ForeignKey(BlocklogicUser)
    
    # all settings are stored in json format
    data = models.TextField(null=False)
    
    def __unicode__(self):
        return str(self.user.id) + ":" + self.app


class CompanyConfig(SkeletonU):
    company = models.ForeignKey(Company)

    data = models.TextField(null=False)

    def __unicode__(self):
        return str(self.company.id) + ":" + self.app