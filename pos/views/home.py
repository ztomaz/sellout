from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.utils.translation import ugettext as _
from django.db import transaction
from django.core.paginator import Paginator
from django.forms import ModelForm

from pos.models import Company

# TODO: remove
from django.http import HttpResponse

### index
def terminal(request, company):
    c = get_object_or_404(Company, url_name=company)
    
    return render(request, 'pos/terminal.html', {'company':c})