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