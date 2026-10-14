from django.urls import path
from .notifications import NotificationsAPIView
from .designer_login import DesignerOTPAPIView, DesignerVerifyOTPAPIView, DesignerPasswordLoginAPIView
from .views import (RegisterAPIView,
                    LoginAPIView,
                    GoogleLoginAPIView,
                    ForgotPasswordAPIView,
                    VerifyPasswordOTPAPIView,
                    ResetPasswordAPIView,

                    )

urlpatterns = [
    path("notifications/", NotificationsAPIView.as_view(), name="requests-notifications"),
    path("designer/login/", DesignerPasswordLoginAPIView.as_view(), name="designer-password-login"),
    path("designer/send-otp/", DesignerOTPAPIView.as_view(), name="designer-send-otp"),
    path("designer/verify-otp/", DesignerVerifyOTPAPIView.as_view(), name="designer-verify-otp"),

    path("register/",RegisterAPIView.as_view(),name="register"),
    path("login/",LoginAPIView.as_view(),name="login"),
    path("google-login/",GoogleLoginAPIView.as_view()),
    path("forgot-password/",ForgotPasswordAPIView.as_view(),name="forgot-password"),
    path("verify-otp/",VerifyPasswordOTPAPIView.as_view(),name="verify-otp"),
    path("reset-password/",ResetPasswordAPIView.as_view(),name="reset-password"),

]
