from django.contrib import admin
from .models import Notification

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('id', 'recipient', 'notification_type', 'status', 'is_read', 'created_at')
    list_filter = ('notification_type', 'status', 'is_read', 'created_at')
    search_fields = ('recipient__email', 'recipient__phone_number', 'message')
    readonly_fields = ('created_at',)
    actions = ['mark_as_read']

    @admin.action(description="Mark selected notifications as read")
    def mark_as_read(self, request, queryset):
        queryset.update(is_read=True)