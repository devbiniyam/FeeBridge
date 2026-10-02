import random
import logging
from datetime import timedelta
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.generics import CreateAPIView, ListAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from api.permissions import IsAdmin
from accounts.models import User, PasswordResetCode
from api.serializers.accounts import (
    UserSerializer,
    RegisterSerializer,
    StaffCreateSerializer,
    StaffSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer
)

logger = logging.getLogger(__name__)



class MeView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class RegisterView(CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    

class StaffCreateView(CreateAPIView):
    queryset = User.objects.all()
    serializer_class = StaffCreateSerializer
    permission_classes = [IsAdmin]


class StaffListView(ListAPIView):
    permission_classes = [IsAdmin]
    serializer_class = StaffSerializer

    def get_queryset(self):
        qs = User.objects.filter(role='STAFF').select_related('school').order_by('-date_joined')
        school_id = self.request.query_params.get('school')
        if school_id:
            qs = qs.filter(school_id=school_id)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search) |
                Q(phone_number__icontains=search) |
                Q(school__name__icontains=search)
            )
        return qs


class StaffDetailView(RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdmin]
    serializer_class = StaffSerializer
    queryset = User.objects.filter(role='STAFF')


class PasswordResetRequestView(APIView):
    permission_classes = []

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].strip().lower()

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response({
                "detail": "If an account with that email exists, a password reset code has been sent."
            }, status=status.HTTP_200_OK)

        # Invalidate old unused codes for this user
        PasswordResetCode.objects.filter(user=user, is_used=False).update(is_used=True)

        # Generate 6-digit code
        code = f"{random.randint(100000, 999999)}"
        expires_at = timezone.now() + timedelta(minutes=15)

        PasswordResetCode.objects.create(
            user=user,
            code=code,
            expires_at=expires_at,
        )

        subject = "FeeBridge Password Reset Code"
        message = (
            f"Hello {user.first_name or 'there'},\n\n"
            f"Your FeeBridge password reset verification code is: {code}\n\n"
            f"This code will expire in 15 minutes. If you did not request this password reset, please ignore this email.\n\n"
            f"Best regards,\nFeeBridge Security Team"
        )
        html_message = f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #2563eb; margin: 0; font-size: 24px;">FeeBridge</h1>
                <p style="color: #64748b; font-size: 14px; margin-top: 4px;">School Fee & Escrow Infrastructure</p>
            </div>
            <p style="color: #1e293b; font-size: 16px;">Hello <strong>{user.first_name or 'User'}</strong>,</p>
            <p style="color: #475569; font-size: 15px; line-height: 1.5;">We received a request to reset your password. Use the verification code below to complete the reset process:</p>
            <div style="text-align: center; margin: 28px 0;">
                <span style="display: inline-block; font-size: 32px; font-weight: 700; letter-spacing: 6px; padding: 12px 24px; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; border-radius: 8px;">
                    {code}
                </span>
            </div>
            <p style="color: #64748b; font-size: 14px; line-height: 1.5;">This code is valid for <strong>15 minutes</strong>. If you did not make this request, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">&copy; FeeBridge System. All rights reserved.</p>
        </div>
        """

        email_sent = False
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )
            email_sent = True
        except Exception as e:
            logger.warning(f"Could not send email via SMTP: {e}")

        response_data = {
            "detail": f"A 6-digit verification code has been sent to {user.email}.",
            "email": user.email,
        }
        if settings.DEBUG or not email_sent:
            response_data["demo_code_hint"] = code

        return Response(response_data, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    permission_classes = []

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].strip().lower()
        code = serializer.validated_data['code'].strip()
        new_password = serializer.validated_data['new_password']

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response({"error": "Invalid email or reset code."}, status=status.HTTP_400_BAD_REQUEST)

        reset_obj = PasswordResetCode.objects.filter(
            user=user,
            code=code,
            is_used=False,
            expires_at__gte=timezone.now()
        ).order_by('-created_at').first()

        if not reset_obj:
            return Response(
                {"error": "Invalid or expired reset code. Please request a new code."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Set new password
        user.set_password(new_password)
        user.save()

        # Invalidate code
        reset_obj.is_used = True
        reset_obj.save()

        return Response(
            {"detail": "Password successfully reset! You can now log in with your new password."},
            status=status.HTTP_200_OK
        )
