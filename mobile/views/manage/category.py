from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.utils.translation import ugettext as _
from django import forms
from django.http import Http404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from pos.models import Company, Category
from pos.views.manage.category import get_category, delete_category, get_all_categories, validate_category
from pos.views.util import JSON_response, JSON_error, JSON_parse, JSON_ok, resize_image, validate_image, \
    image_dimensions, max_field_length, image_from_base64, has_permission, no_permission_view
from common import globals as g



#############
### views ###
#############

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

    # return all categories' data in JSON format
    return JSON_response(get_all_categories(c.id, sort='name', data=[], json=True))




@api_view(['POST', 'GET'])
@permission_classes((IsAuthenticated,))
def mobile_add_category(request, company):
    return add_category(request, company, -1)


def add_category(request, company, parent_id=-1):
    try:
        c = Company.objects.get(url_name = company)
    except Company.DoesNotExist:
        return JSON_error(_("Company does not exist"))
    
    # sellers can add category
    if not has_permission(request.user, c, 'category', 'edit'):
        return JSON_error(_("You have no permission to add products"))

    data = JSON_parse(request.POST['data'])
    
    # validate data
    valid = validate_category(request.user, c, data, parent_id)
    if not valid['status']:
        return JSON_error(valid['message'])
    data = valid['data']
        
    if int(parent_id) == -1:
        parent = None
    else:
        parent = Category.objects.get(id=parent_id)
    
    # save category:
    product = Category(
        company = c,
        parent = parent,
        name = data['name'],
        description = data['description'],
        created_by = request.user,
    )
    product.save()
    
    # add image, if it's there
    if data['change_image']:
        if 'image' in data:
            product.image = data['image']
            product.save()
    
    return JSON_ok()

@api_view(['POST', 'GET'])
@permission_classes((IsAuthenticated,))
def mobile_edit_category(request, company, category_id):
    return edit_category(request, company, category_id)


def edit_category(request, company, category_id):
    try:
        c = Company.objects.get(url_name = company)
    except Company.DoesNotExist:
        return JSON_error(_("Company does not exist"))
    
    # sellers can edit product
    if not has_permission(request.user, c, 'category', 'edit'):
        return JSON_error(_("You have no permission to edit products"))

    data = JSON_parse(request.POST['data'])

    # see if product exists in database
    try:
        category = Category.objects.get(id=category_id)
    except:
        return JSON_error(_("Product does not exist"))
    
    # validate data
    valid = validate_category(request.user, c, data, category_id)
    
    if not valid['status']:
        return JSON_error(valid['message'])
    data = valid['data']
    
    # update category:
    category.name = data['name']
    category.description = data['description']
    

    # image
    if data['change_image'] == True:
        if data['image']: # new image is uploaded
            # create a file from the base64 data and save it to product.image
            if category.image:
                category.image.delete()
            # save a new image
            category.image = data['image'] # conversion from base64 is done in validate_product
        else: # delete the old image
            category.image.delete()
    category.save()
    return JSON_ok()


@api_view(['POST', 'GET'])
@permission_classes((IsAuthenticated,))
def mobile_delete_category(request, company, category_id):
    return delete_category(request, company, category_id)


@api_view(['POST', 'GET'])
@permission_classes((IsAuthenticated,))
def mobile_get_category(request, company, category_id):
    return get_category(request, company, category_id)

