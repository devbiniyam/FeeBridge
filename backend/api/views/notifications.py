from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.generics import ListCreateAPIView, RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.permissions import IsStaffOrAdmin
from api.serializers.notifications import NotificationSerializer
from notifications.models import Notification


class NotificationListCreateView(ListCreateAPIView):
    serializer_class = NotificationSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsStaffOrAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'PARENT':
            queryset = Notification.objects.filter(recipient=user)
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

        return queryset


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
