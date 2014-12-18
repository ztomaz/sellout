from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from common.functions import JsonError, JsonParse
from mobile.views.login import get_user_credentials
from mobile.views.manage.configuration import company_config_to_dict
from pos.models import Company, Permission
from django.utils.translation import ugettext as _
from rest_framework.authtoken.models import Token
from pos.views.manage.company import company_to_dict
from pos.views.terminal import switch_user, lock_session, switch_user_


@api_view(['GET', 'POST'])
@permission_classes((IsAuthenticated,))
def mobile_lock_session(request, company_id):
    try:
        c = Company.objects.get(id=company_id)
        return lock_session(request, c)
    except Company.DoesNotExist:
        return JsonError(_("Company does not exist"))


@api_view(['GET', 'POST'])
@permission_classes((IsAuthenticated,))
def unlock_session(request, company_id):
    """
        always returns an ajax response
    """
    try:
        c = Company.objects.get(id=company_id)
    except Company.DoesNotExist:
        return JsonError(_("Company does not exist"))

    cleaned_data = switch_user_(request, c)

    if cleaned_data['status'] == 'ok':
        user = cleaned_data['user']

        if not user:
            return JsonError(_("User authentication failed."))

        c = cleaned_data['company']

        token, created = Token.objects.get_or_create(user=user)
        user_credentials = get_user_credentials(user)

        return JsonResponse({'token': token.key,
                             'user': user_credentials,
                             'config': company_config_to_dict(request, c),
                             'company': company_to_dict(user, c, android=True),
                             'status': "ok"})

    else:
        return JsonResponse(cleaned_data)

