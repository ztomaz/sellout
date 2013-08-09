from django.contrib import admin

# TODO: include only used models
from pos.models import *

admin.site.register(Company)
admin.site.register(CompanyAttribute)
admin.site.register(Category)
admin.site.register(CategoryAttribute)
admin.site.register(Discount)
admin.site.register(ProductImage)
admin.site.register(Product)
admin.site.register(Price)
admin.site.register(Contact)
admin.site.register(ContactAttribute)
admin.site.register(Bill)
admin.site.register(BillItem)

# TODO: remove history
admin.site.register(BillHistory)