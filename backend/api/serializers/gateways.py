from decimal import Decimal
from rest_framework import serializers

from fees.models import Invoice
from payments.models import (
    GatewayTransaction,
    GatewayChoices,
    TransactionPurposeChoices
)


class CheckoutInitializeSerializer(serializers.Serializer):
    purpose = serializers.ChoiceField(choices=TransactionPurposeChoices.choices)
    invoice = serializers.PrimaryKeyRelatedField(
        queryset=Invoice.objects.all(),
        required=False,
        allow_null=True
    )
    amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True
    )
    return_url = serializers.URLField(required=False, allow_null=True)

    def validate(self, data):
        purpose = data.get('purpose')
        invoice = data.get('invoice')
        amount = data.get('amount')
        user = self.context['request'].user

        if purpose == TransactionPurposeChoices.INVOICE_PAYMENT:
            if not invoice:
                raise serializers.ValidationError({"invoice": "Invoice is required for invoice payments."})

            # Check invoice access
            if user.role == 'PARENT' and invoice.student.parent != user:
                raise serializers.ValidationError({"invoice": "You do not have access to pay this invoice."})

            if invoice.balance_remaining <= Decimal('0.00'):
                raise serializers.ValidationError({"invoice": "This invoice is already fully paid."})

            if not amount:
                data['amount'] = invoice.balance_remaining
            else:
                if amount <= Decimal('0.00'):
                    raise serializers.ValidationError({"amount": "Payment amount must be greater than zero."})
                if amount > invoice.balance_remaining:
                    raise serializers.ValidationError({
                        "amount": f"Amount ({amount} ETB) exceeds remaining balance ({invoice.balance_remaining} ETB)."
                    })

        elif purpose == TransactionPurposeChoices.WALLET_DEPOSIT:
            if not amount or amount <= Decimal('0.00'):
                raise serializers.ValidationError({"amount": "A positive deposit amount is required."})

        return data


class GatewayTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = GatewayTransaction
        fields = [
            'id',
            'tx_ref',
            'gateway',
            'purpose',
            'amount',
            'status',
            'related_invoice',
            'gateway_reference',
            'checkout_url',
            'created_at',
        ]
        read_only_fields = fields
