from base64 import b64decode
from django.db.models.fields.files import ImageField
from django.core.files.base import ContentFile

from django.utils.translation import ugettext as _
from django import forms
from django.http import Http404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from common.functions import get_image_path

from pos.models import Company, Category
from pos.views.manage.category import get_category, delete_category, get_all_categories, validate_category, \
    get_all_categories_structured, category_to_dict
from pos.views.util import JSON_response, JSON_error, JSON_parse, JSON_ok, resize_image, validate_image, \
    image_dimensions, max_field_length, image_from_base64, has_permission, no_permission_view
from common import globals as g



#############
### views ###
#############

@api_view(['POST', 'GET'])
@permission_classes((IsAuthenticated,))
def mobile_JSON_categories_strucutred(request, company):
    try:
        c = Company.objects.get(url_name=company)
    except Company.DoesNotExist:
        return JSON_error(_("Company does not exist"))

    # permissions
    if not has_permission(request.user, c, 'category', 'list'):
        return JSON_error("no permission")

    # return all categories' data in JSON format
    return JSON_response(get_all_categories_structured(c, sort='name', android=True))


@api_view(['POST', 'GET'])
@permission_classes((IsAuthenticated,))
def mobile_JSON_categories(request, company):
    try:
        c = Company.objects.get(url_name=company)
    except Company.DoesNotExist:
        return JSON_error(_("Company does not exist"))

    # permissions
    if not has_permission(request.user, c, 'category', 'list'):
        return JSON_error("no permission")
    data = []
    category = Category.objects.filter(company=c)

    for c in category:
        data.append(category_to_dict(c, android=True))

    # return all categories' data in JSON format
    return JSON_response(data)

@api_view(['POST', 'GET'])
@permission_classes((IsAuthenticated,))
def mobile_add_category(request, company):
    try:
        c = Company.objects.get(url_name = company)
    except Company.DoesNotExist:
        return JSON_error(_("Company does not exist"))

    # sellers can add category
    if not has_permission(request.user, c, 'category', 'edit'):
        return JSON_error(_("You have no permission to add products"))

    data = JSON_parse(request.POST['data'])

    # validate data
    valid = validate_category(request.user, c, data)
    if not valid['status']:
        return JSON_error(valid['message'])
    data = valid['data']

    parent_id = data['parent_id']

    if int(parent_id) == -1:
        parent = None
    else:
        parent = Category.objects.get(id=parent_id)

    # save category:
    category = Category(
        company = c,
        parent = parent,
        name = data['name'],
        description = data['description'],
        created_by = request.user,
    )
    category.save()

    # add image, if it's there

    if data['change_image'] == True:
        if data['image']: # new image is uploade

            if category.image:
                category.image.delete()
            # save a new image

            category.image = data['image']

        else: # delete the old image
            category.image.delete()

    return JSON_ok(extra=get_all_categories_structured(c, category, android=True))


@api_view(['POST', 'GET'])
@permission_classes((IsAuthenticated,))
def mobile_edit_category(request, company):
    return edit_category(request, company)


def edit_category(request, company):
    try:
        c = Company.objects.get(url_name = company)
    except Company.DoesNotExist:
        return JSON_error(_("Company does not exist"))
    
    # sellers can edit product
    if not has_permission(request.user, c, 'category', 'edit'):
        return JSON_error(_("You have no permission to edit products"))

    data = JSON_parse(request.POST['data'])

    category_id = data['id']

    # see if product exists in database
    try:
        category = Category.objects.get(id=category_id)
    except:
        return JSON_error(_("Product does not exist"))
    
    # validate data
    valid = validate_category(request.user, c, data)
    
    if not valid['status']:
        return JSON_error(valid['message'])
    data = valid['data']
    
    # update category:
    category.name = data['name']
    category.description = data['description']
    

    # image
    if data['change_image'] == True:
        if data['image']: # new image is uploade

            if category.image:
                category.image.delete()
            # save a new image

            category.image = data['image']

        else: # delete the old image
            category.image.delete()
    category.save()
    return JSON_ok(extra=get_all_categories_structured(c, category, android=True))


@api_view(['POST', 'GET'])
@permission_classes((IsAuthenticated,))
def mobile_delete_category(request, company):
    try:
        c = Company.objects.get(url_name = company)
    except Company.DoesNotExist:
        return JSON_error(_("Company does not exist"))

    data = JSON_parse(request.POST['data'])

    category_id = data['id']
    # check permissions: needs to be at least manager
    try:
        category = Category.objects.get(id=category_id)
    except Category.DoesNotExist:
        return JSON_error(_("Category does not exist"))

    # check if category actually belongs to the given company
    if category.company != c:
        return JSON_error("Error") # this category does not exist for the current user

    if Category.objects.filter(parent=category).count() > 0:
        return JSON_error("Cannot delete category with subcategories")

    # delete the category and return to management page
    try:
        category.delete()
    except:
        pass

    return JSON_ok(extra=category_to_dict(category, android=True))


@api_view(['POST', 'GET'])
@permission_classes((IsAuthenticated,))
def mobile_get_category(request, company, category_id):
    return get_category(request, company, category_id)


def mobile_JSON_dump_categories(request, company):
    try:
        c = Company.objects.get(url_name=company)
    except Company.DoesNotExist:
        return JSON_error(_("Company does not exist"))

    cat = Category.objects.filter(company__id=c.id)
    return JSON_ok(extra="")