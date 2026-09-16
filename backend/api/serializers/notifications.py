from rest_framework import serializers
from notifications.models import Notification, NotificationStatusChoices


class NotificationSerializer(serializers.ModelSerializer):
    recipient_email = serializers.ReadOnlyField(source='recipient.email')

    class Meta:
        model = Notification
        fields = [
            'id',
            'recipient',
            'recipient_email',
            'notification_type',
            'message',
            'status',
            'is_read',
            'related_invoice',
            'created_at',
        ]
        read_only_fields = ['status', 'created_at']

    def create(self, validated_data):
        validated_data.setdefault('status', NotificationStatusChoices.SENT)
        return super().create(validated_data)
