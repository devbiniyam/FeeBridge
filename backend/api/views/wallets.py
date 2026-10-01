from decimal import Decimal
from rest_framework.generics import CreateAPIView, ListAPIView
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from wallets.models import Wallet, WalletTransaction
from api.serializers.wallets import (
    DepositSerializer,
    WalletPaymentSerializer,
    WalletDetailSerializer,
    WalletTransactionSerializer
)


class DepositView(CreateAPIView):
    queryset = WalletTransaction.objects.all()
    serializer_class = DepositSerializer
    permission_classes = [IsAuthenticated]


class WalletPaymentView(CreateAPIView):
    serializer_class = WalletPaymentSerializer
    permission_classes = [IsAuthenticated]


class MyWalletView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        wallet, _ = Wallet.objects.get_or_create(parent=user)
        serializer = WalletDetailSerializer(wallet)
        return Response(serializer.data)


class WalletTransactionListView(ListAPIView):
    serializer_class = WalletTransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return WalletTransaction.objects.filter(wallet__parent=user).order_by('-created_at')


class ToggleAutoPayView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        wallet, _ = Wallet.objects.get_or_create(parent=user)

        data = request.data
        if 'auto_pay_enabled' in data:
            wallet.auto_pay_enabled = bool(data.get('auto_pay_enabled'))

        if 'low_balance_threshold' in data:
            try:
                threshold = Decimal(str(data.get('low_balance_threshold')))
                if threshold < Decimal('0.00'):
                    return Response({"detail": "Low-balance threshold cannot be negative."}, status=status.HTTP_400_BAD_REQUEST)
                wallet.low_balance_threshold = threshold
            except (ValueError, TypeError):
                return Response({"detail": "Invalid low-balance threshold value."}, status=status.HTTP_400_BAD_REQUEST)

        wallet.save()
        return Response(WalletDetailSerializer(wallet).data, status=status.HTTP_200_OK)