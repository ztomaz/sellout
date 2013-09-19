# author: nejc jurkovic
# date: 9. 8. 2013
#
# Views for managing POS data: categories
from django import forms
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.utils.translation import ugettext as _
from django import forms
from django.http import Http404, HttpResponse

from pos.models import Company
from pos.views.util import error, JSON_response, resize_image, validate_image, \
                           has_permission, no_permission_view
from common import globals as g
from config.functions import get_config, set_value, get_value

import pytz
import json

########################
### helper functions ###
########################
def list_date_formats():
    """ lists first-level keys in g.DATE_FORMATS
        returns tuples for forms.ChoiceField
    
        could belong to ConfigForm, but will eventually be used in other parts of the app
    """
    return [(key, key) for key in g.DATE_FORMATS]

def list_timezones():
    timezones = []
    for tz in pytz.common_timezones:
        timezones.append((tz, tz))
        
    return timezones

#######################
### forms and views ###
#######################
class ConfigForm(forms.Form):
    """ user-configurable variables from config:
        pos_date_format: choice, keys for DATE_FORMATS dictionary in globals
        pos_timezone: choice, pytz timezones
        pos_currency: string (4 chars)
        pos_contacts_per_page: int
        pos_discounts_per_page:int
        pos_default_tax:decimal
        pos_decimal_separator:char(1)
    """
    
    date_format = forms.ChoiceField(choices=list_date_formats(),required=True)
    timezone = forms.ChoiceField(choices=list_timezones(), required=True)
    currency = forms.CharField(max_length=4, required=True)
    contacts_per_page = forms.IntegerField(required=True)
    discounts_per_page = forms.IntegerField(required=True)
    default_tax = forms.DecimalField(required=True)
    decimal_separator = forms.CharField(max_length=1, required=True)
    
@login_required
def edit_config(request, company):
    c = get_object_or_404(Company, url_name=company)
    
    # permissions
    if not has_permission(request.user, c, 'config', 'edit'):
        return no_permission_view(request, c, _("visit this page"))
    
    # get config: specify initial data manually (also for security reasons,
    # to not accidentally include secret data in request.POST or whatever)
    
    # this may be a little wasteful on resources, but config is only edited once in a lifetime or so
    # get_value is needed because dict['key'] will fail if new keys are added but not yet saved
    initial = {
        'date_format':get_value(request.user, 'pos_date_format'),
        'timezone':get_value(request.user, 'pos_timezone'),
        'currency':get_value(request.user, 'pos_currency'),
        'contacts_per_page':get_value(request.user, 'pos_contacts_per_page'),
        'discounts_per_page':get_value(request.user, 'pos_discounts_per_page'),
        'default_tax':get_value(request.user, 'pos_default_tax'),
        'decimal_separator':get_value(request.user, 'pos_decimal_separator'),
    }
    
    if request.method == 'POST':
        form = ConfigForm(request.POST)
        if form.is_valid():
            for key in initial:
                set_value(request.user, "pos_" + key, unicode(form.cleaned_data[key]))
    else:
        form = ConfigForm(initial=initial) # An unbound form

    context = {
        'company':c,
        'form':form,
        'title':_("System configuration"),
        'site_title':g.MISC['site_title'],
    }

    return render(request, 'pos/manage/config.html', context)