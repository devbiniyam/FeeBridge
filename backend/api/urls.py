from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from api.views.accounts import MeView, RegisterView, StaffCreateView
from api.views.students import StudentListCreateView, StudentDetailView
from api.views.fees import FeeStructureListCreateView, FeeStructureDetailView, InvoiceListCreateView, InvoiceDetailView
from api.views.payments import PaymentCreateView
from api.views.wallets import DepositView, WalletPaymentView
from api.views.notifications import (
    NotificationListCreateView,
    NotificationDetailView,
    NotificationMarkAsReadView,
    NotificationMarkAllAsReadView,
    NotificationUnreadCountView,
)
from api.views.reports import FinancialSummaryReportView, GradeBreakdownReportView
from api.views.gateways import (
    CheckoutInitializeView,
    ChapaWebhookView,
    CheckoutVerifyView,
)

urlpatterns = [
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    path('me/', MeView.as_view(), name='me'),
    path('register/', RegisterView.as_view(), name='register'),
    
    path('students/', StudentListCreateView.as_view(), name='student-list-create'),
    path('students/<int:pk>/', StudentDetailView.as_view(), name='student-detail'),
    
    path('fee-structures/', FeeStructureListCreateView.as_view(), name='fee-structure-list-create'),
    path('fee-structures/<int:pk>/', FeeStructureDetailView.as_view(), name='fee-structure-detail'),

    path('invoices/', InvoiceListCreateView.as_view(), name='invoice-list-create'),
    path('invoices/<int:pk>/', InvoiceDetailView.as_view(), name='invoice-detail'),
    
    path('payments/', PaymentCreateView.as_view(), name='payment-create'),
    path('payments/checkout/initialize/', CheckoutInitializeView.as_view(), name='checkout-initialize'),
    path('payments/checkout/verify/<str:tx_ref>/', CheckoutVerifyView.as_view(), name='checkout-verify'),
    path('payments/webhook/chapa/', ChapaWebhookView.as_view(), name='webhook-chapa'),
    
    path('wallets/deposit/', DepositView.as_view(), name='wallet-deposit'),
    path('wallets/pay-invoice/', WalletPaymentView.as_view(), name='wallet-pay-invoice'),
    
    path('staff/create/', StaffCreateView.as_view(), name='staff-create'),

    path('notifications/', NotificationListCreateView.as_view(), name='notification-list-create'),
    path('notifications/unread-count/', NotificationUnreadCountView.as_view(), name='notification-unread-count'),
    path('notifications/mark-all-as-read/', NotificationMarkAllAsReadView.as_view(), name='notification-mark-all-as-read'),
    path('notifications/<int:pk>/', NotificationDetailView.as_view(), name='notification-detail'),
    path('notifications/<int:pk>/mark-as-read/', NotificationMarkAsReadView.as_view(), name='notification-mark-as-read'),

    path('reports/financial-summary/', FinancialSummaryReportView.as_view(), name='report-financial-summary'),
    path('reports/grade-breakdown/', GradeBreakdownReportView.as_view(), name='report-grade-breakdown'),
]