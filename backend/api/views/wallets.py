from rest_framework.generics import CreateAPIView
from rest_framework.permissions import IsAuthenticated
from wallets.models import WalletTransaction
from api.serializers.wallets import DepositSerializer, WalletPaymentSerializer


class DepositView(CreateAPIView):
    queryset = WalletTransaction.objects.all()
    serializer_class = DepositSerializer
    permission_classes = [IsAuthenticated]


class WalletPaymentView(CreateAPIView):
    serializer_class = WalletPaymentSerializer
    permission_classes = [IsAuthenticated]