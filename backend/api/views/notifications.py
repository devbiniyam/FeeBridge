from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.generics import ListCreateAPIView, RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.permissions import IsStaffOrAdmin
from api.serializers.notifications import NotificationSerializer
from accounts.models import User
from students.models import Student
from fees.models import Invoice, StatusChoices
from notifications.models import Notification, NotificationTypeChoices, NotificationStatusChoices
from notifications.services import send_due_reminder, send_overdue_alert


class NotificationListCreateView(ListCreateAPIView):
    serializer_class = NotificationSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsStaffOrAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        scope = self.request.query_params.get('scope')

        if user.role == 'PARENT' or scope == 'mine':
            queryset = Notification.objects.filter(recipient=user)
        else:
            if user.role == 'STAFF' and user.school:
                school_parent_ids = Student.objects.filter(school=user.school).values_list('parent_id', flat=True).distinct()
                queryset = Notification.objects.filter(
                    Q(recipient_id__in=school_parent_ids) |
                    Q(recipient=user) |
                    Q(related_invoice__student__school=user.school)
                ).distinct()
            else:
                queryset = Notification.objects.all()

            recipient_id = self.request.query_params.get('recipient')
            if recipient_id:
                queryset = queryset.filter(recipient_id=recipient_id)

        # Filter by read status
        is_read = self.request.query_params.get('is_read')
        if is_read is not None:
            if is_read.lower() in ['true', '1']:
                queryset = queryset.filter(is_read=True)
            elif is_read.lower() in ['false', '0']:
                queryset = queryset.filter(is_read=False)

        unread = self.request.query_params.get('unread')
        if unread is not None and unread.lower() in ['true', '1']:
            queryset = queryset.filter(is_read=False)

        # Filter by notification type
        notification_type = self.request.query_params.get('type')
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)

        # Search by message or recipient info
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(message__icontains=search) |
                Q(recipient__first_name__icontains=search) |
                Q(recipient__last_name__icontains=search) |
                Q(recipient__email__icontains=search)
            )

        return queryset.order_by('-created_at')


class NotificationDetailView(RetrieveAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'PARENT':
            return Notification.objects.filter(recipient=user)
        return Notification.objects.all()


class NotificationMarkAsReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        return self._mark_read(request, pk)

    def patch(self, request, pk):
        return self._mark_read(request, pk)

    def _mark_read(self, request, pk):
        user = request.user
        if user.role == 'PARENT':
            notification = get_object_or_404(Notification, pk=pk, recipient=user)
        else:
            notification = get_object_or_404(Notification, pk=pk)

        notification.is_read = True
        notification.save()
        return Response({
            "detail": "Notification marked as read.",
            "id": notification.id,
            "is_read": True
        }, status=status.HTTP_200_OK)


class NotificationMarkAllAsReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        updated_count = Notification.objects.filter(
            recipient=request.user,
            is_read=False
        ).update(is_read=True)

        return Response({
            "detail": f"{updated_count} notifications marked as read.",
            "updated_count": updated_count
        }, status=status.HTTP_200_OK)


class NotificationUnreadCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(
            recipient=request.user,
            is_read=False
        ).count()
        return Response({"unread_count": count}, status=status.HTTP_200_OK)


class NotificationBroadcastView(APIView):
    permission_classes = [IsStaffOrAdmin]

    def post(self, request):
        user = request.user
        audience_type = request.data.get('audience_type', 'ALL_PARENTS')
        grade = request.data.get('grade')
        recipient_id = request.data.get('recipient_id')
        recipient_email = request.data.get('recipient_email')
        notification_type = request.data.get('notification_type', NotificationTypeChoices.GENERAL)
        message = (request.data.get('message') or '').strip()
        title = (request.data.get('title') or '').strip()

        if not message:
            return Response({"detail": "Message content is required."}, status=status.HTTP_400_BAD_REQUEST)

        full_message = f"[{title}] {message}" if title else message

        target_parents = set()

        if audience_type == 'INDIVIDUAL':
            if recipient_id:
                try:
                    p = User.objects.get(id=recipient_id)
                    target_parents.add(p)
                except User.DoesNotExist:
                    return Response({"detail": f"User with id {recipient_id} not found."}, status=status.HTTP_404_NOT_FOUND)
            elif recipient_email:
                try:
                    p = User.objects.get(email=recipient_email)
                    target_parents.add(p)
                except User.DoesNotExist:
                    return Response({"detail": f"User with email {recipient_email} not found."}, status=status.HTTP_404_NOT_FOUND)
            else:
                return Response({"detail": "recipient_id or recipient_email is required for individual broadcast."}, status=status.HTTP_400_BAD_REQUEST)
        elif audience_type == 'GRADE':
            if not grade:
                return Response({"detail": "Grade is required for grade-specific broadcast."}, status=status.HTTP_400_BAD_REQUEST)
            students = Student.objects.filter(grade=grade)
            if user.role == 'STAFF' and user.school:
                students = students.filter(school=user.school)
            parent_ids = students.values_list('parent_id', flat=True).distinct()
            target_parents = set(User.objects.filter(id__in=parent_ids))
        else:  # ALL_PARENTS
            students = Student.objects.all()
            if user.role == 'STAFF' and user.school:
                students = students.filter(school=user.school)
            parent_ids = students.values_list('parent_id', flat=True).distinct()
            target_parents = set(User.objects.filter(id__in=parent_ids))

        if not target_parents:
            return Response({
                "detail": "No target parents found for the selected audience.",
                "count": 0
            }, status=status.HTTP_200_OK)

        notifications_to_create = [
            Notification(
                recipient=parent,
                notification_type=notification_type,
                message=full_message,
                status=NotificationStatusChoices.SENT,
            )
            for parent in target_parents
        ]

        Notification.objects.bulk_create(notifications_to_create)

        return Response({
            "detail": f"Broadcast successfully dispatched to {len(notifications_to_create)} parent(s).",
            "count": len(notifications_to_create),
            "audience_type": audience_type,
        }, status=status.HTTP_201_CREATED)


class NotificationDispatchRemindersView(APIView):
    permission_classes = [IsStaffOrAdmin]

    def post(self, request):
        user = request.user
        reminder_type = request.data.get('reminder_type', 'DUE_SOON')

        invoices = Invoice.objects.filter(status__in=[StatusChoices.UNPAID, StatusChoices.PARTIALLY_PAID])
        if user.role == 'STAFF' and user.school:
            invoices = invoices.filter(student__school=user.school)

        today = timezone.localdate()

        if reminder_type == 'OVERDUE':
            invoices = invoices.filter(due_date__lt=today)
            send_func = send_overdue_alert
            alert_name = "Overdue Alert"
            notif_choice = NotificationTypeChoices.OVERDUE_ALERT
        else:
            invoices = invoices.filter(due_date__gte=today)
            send_func = send_due_reminder
            alert_name = "Due Reminder"
            notif_choice = NotificationTypeChoices.DUE_REMINDER

        dispatched_count = 0
        for invoice in invoices:
            # Prevent spamming multiple of the same reminder type on the same date
            already_sent_today = Notification.objects.filter(
                related_invoice=invoice,
                notification_type=notif_choice,
                created_at__date=today
            ).exists()

            if not already_sent_today:
                send_func(invoice)
                dispatched_count += 1

        return Response({
            "detail": f"Dispatched {dispatched_count} {alert_name}(s) across {invoices.count()} pending invoice(s).",
            "dispatched_count": dispatched_count,
            "total_eligible": invoices.count(),
            "reminder_type": reminder_type,
        }, status=status.HTTP_200_OK)
