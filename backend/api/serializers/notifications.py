from rest_framework import serializers
from notifications.models import Notification, NotificationStatusChoices


class NotificationSerializer(serializers.ModelSerializer):
    recipient_email = serializers.ReadOnlyField(source='recipient.email')
    recipient_name = serializers.SerializerMethodField()
    recipient_role = serializers.ReadOnlyField(source='recipient.role')
    student_name = serializers.SerializerMethodField()
    invoice_amount = serializers.SerializerMethodField()
    invoice_status = serializers.SerializerMethodField()
    invoice_due_date = serializers.SerializerMethodField()
    invoice_month = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id',
            'recipient',
            'recipient_email',
            'recipient_name',
            'recipient_role',
            'notification_type',
            'message',
            'status',
            'is_read',
            'related_invoice',
            'student_name',
            'invoice_amount',
            'invoice_status',
            'invoice_due_date',
            'invoice_month',
            'created_at',
        ]
        read_only_fields = ['status', 'created_at']

    def get_recipient_name(self, obj):
        if not obj.recipient:
            return ""
        name = f"{obj.recipient.first_name} {obj.recipient.last_name}".strip()
        return name or obj.recipient.email

    def get_student_name(self, obj):
        if obj.related_invoice and obj.related_invoice.student:
            return obj.related_invoice.student.full_name
        return None

    def get_invoice_amount(self, obj):
        if obj.related_invoice:
            return str(obj.related_invoice.amount)
        return None

    def get_invoice_status(self, obj):
        if obj.related_invoice:
            return obj.related_invoice.status
        return None

    def get_invoice_due_date(self, obj):
        if obj.related_invoice:
            return str(obj.related_invoice.due_date)
        return None

    def get_invoice_month(self, obj):
        if obj.related_invoice and obj.related_invoice.month:
            return obj.related_invoice.month.strftime("%B %Y")
        return None

    def create(self, validated_data):
        validated_data.setdefault('status', NotificationStatusChoices.SENT)
        return super().create(validated_data)
