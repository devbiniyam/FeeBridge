import json
import uuid
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from api.serializers.gateways import (
    CheckoutInitializeSerializer,
    GatewayTransactionSerializer
)
from payments.models import (
    GatewayTransaction,
    GatewayChoices,
    GatewayTransactionStatus,
    TransactionPurposeChoices
)
from payments.gateways.chapa import (
    initialize_chapa_transaction,
    verify_webhook_signature
)
from payments.services import fulfill_gateway_transaction


class CheckoutInitializeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CheckoutInitializeSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        user = request.user
        purpose = serializer.validated_data['purpose']
        invoice = serializer.validated_data.get('invoice')
        amount = serializer.validated_data['amount']
        return_url = serializer.validated_data.get('return_url')

        tx_ref = f"FB-{uuid.uuid4().hex[:12].upper()}"

        title = "FeeBridge School Fee Payment"
        if purpose == TransactionPurposeChoices.INVOICE_PAYMENT:
            desc = f"Payment for {invoice.student.full_name} ({invoice.month.strftime('%B %Y')})"
        else:
            desc = f"Wallet Deposit for {user.get_full_name() or user.email}"

        # Initialize checkout with Chapa
        gateway_response = initialize_chapa_transaction(
            tx_ref=tx_ref,
            amount=amount,
            user=user,
            return_url=return_url,
            title=title,
            description=desc
        )

        checkout_url = gateway_response.get('data', {}).get('checkout_url', '')

        tx = GatewayTransaction.objects.create(
            tx_ref=tx_ref,
            user=user,
            gateway=GatewayChoices.CHAPA,
            purpose=purpose,
            amount=amount,
            status=GatewayTransactionStatus.PENDING,
            related_invoice=invoice,
            checkout_url=checkout_url
        )

        return Response(GatewayTransactionSerializer(tx).data, status=status.HTTP_201_CREATED)


class ChapaWebhookView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        signature = (
            request.headers.get('x-chapa-signature')
            or request.META.get('HTTP_X_CHAPA_SIGNATURE')
        )

        # Validate signature if configured
        if signature and not verify_webhook_signature(request.body, signature):
            return Response(
                {"error": "Invalid webhook signature."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            payload = json.loads(request.body.decode('utf-8'))
        except (json.JSONDecodeError, UnicodeDecodeError):
            payload = request.data

        tx_ref = payload.get('tx_ref')
        if not tx_ref:
            return Response(
                {"error": "Missing tx_ref in payload."},
                status=status.HTTP_400_BAD_REQUEST
            )

        tx = GatewayTransaction.objects.filter(tx_ref=tx_ref).first()
        if not tx:
            return Response(
                {"error": f"Transaction {tx_ref} not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        gateway_status = payload.get('status', '').lower()
        gateway_ref = payload.get('reference') or payload.get('transaction_id')

        if gateway_status == 'success':
            fulfill_gateway_transaction(tx, gateway_reference=gateway_ref)
            return Response(
                {"status": "success", "message": "Transaction fulfilled successfully."},
                status=status.HTTP_200_OK
            )
        else:
            tx.status = GatewayTransactionStatus.FAILED
            if gateway_ref:
                tx.gateway_reference = gateway_ref
            tx.save()
            return Response(
                {"status": "failed", "message": "Transaction marked failed."},
                status=status.HTTP_200_OK
            )


class CheckoutVerifyView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, tx_ref):
        user = request.user
        if user.role == 'PARENT':
            tx = get_object_or_404(GatewayTransaction, tx_ref=tx_ref, user=user)
        else:
            tx = get_object_or_404(GatewayTransaction, tx_ref=tx_ref)

        return Response(GatewayTransactionSerializer(tx).data, status=status.HTTP_200_OK)
