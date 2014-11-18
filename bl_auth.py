from django.contrib.auth.models import check_password
from django.db import connections

from blusers.models import BlocklogicUser

import settings

class MailUser(object):
    def exists(self, email):
        """
        If user is in mail database (e.g. has user@blocklogic.net email).
        """

        if email is None:
            return False

        email = email.split("@")

        if len(email) < 2:
            return False
        
        cursor = connections['bl_mail'].cursor()
        cursor.execute("SELECT username || '@' || domain AS mailbox FROM mailbox WHERE username = %s AND domain = %s", [email[0], email[1]]) 
        row = cursor.fetchone()

        if row and len(row) == 1:
            return True

        return False

    def password_valid(self, email, password):
        email = email.split("@")

        if len(email) < 2:
            return False

        cursor = connections['bl_mail'].cursor()
        cursor.execute("SELECT username || '@' || domain AS mailbox FROM mailbox WHERE username = %s AND domain = %s AND password = MD5(%s)", [email[0], email[1], password])
        row = cursor.fetchone()

        if row and len(row) == 1:
            return True

        return False


class User(object):
    def exists(self, email):
        """
        If user is in "master" users table.
        """
        
        cursor = connections['bl_users'].cursor()
        cursor.execute("SELECT email FROM users WHERE email = %s", [email])
        row = cursor.fetchone()

        if row and len(row) == 1:
            return True

        return False

    def user_password_valid(self, email, password):
        cursor = connections['bl_users'].cursor()
        cursor.execute("SELECT email, password FROM users WHERE email = %s", [email])
        row = cursor.fetchone()

        if row is None or len(row) == 0:
            return False

        if check_password(password, row[1]):
            return True
        
        return False

    def user_data(self, email):
        cursor = connections['bl_users'].cursor()
        cursor.execute("SELECT data FROM users WHERE email = %s", [email])
        row = cursor.fetchone()

        return row    


class BlocklogicMailAuthBackend(object):
    """
    Authenticate against the Blocklogic mail server (bl_mail_user_*) or Blocklogic users (bl_user_*) database.
    """

    def authenticate(self, username=None, password=None, type='normal'):
        if username == '' or username is None:
            return None

        if 'mailuser' in settings.USED_BLUSER_BACKENDS:
            mail_user = MailUser()

        user = User()
        login_valid = False

        if type == "google":
            login_valid = True

        if 'mailuser' in settings.USED_BLUSER_BACKENDS:
            if mail_user.exists(username) and mail_user.password_valid(username, password):
                login_valid = True

        if not login_valid and user.exists(username) and user.user_password_valid(username, password):
            login_valid = True

        if login_valid:
            try:
                bl_user = BlocklogicUser.objects.get(email=username)

                if bl_user.is_active == False:
                    return None

            except BlocklogicUser.DoesNotExist:
                bl_user = BlocklogicUser.objects.create_user(username=username, email=username, password=password)
                bl_user.is_staff = False
                bl_user.is_superuser = False
                bl_user.save()

            return bl_user

        return None

    def get_user(self, user_id):
        try:
            return BlocklogicUser.objects.using('default').get(pk=user_id)
        except BlocklogicUser.DoesNotExist:
            return None
