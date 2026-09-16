from django.contrib import admin
from .models import Payment, Receipt, GatewayTransaction

admin.site.register(Payment)
admin.site.register(Receipt)


@admin.register(GatewayTransaction)
class GatewayTransactionAdmin(admin.ModelAdmin):
    list_display = ('tx_ref', 'user', 'gateway', 'purpose', 'amount', 'status', 'created_at')
    list_filter = ('gateway', 'purpose', 'status', 'created_at')
    search_fields = ('tx_ref', 'user__email', 'gateway_reference')
    readonly_fields = ('created_at', 'updated_at')