from django.db import transaction
from rest_framework import serializers
from fees.models import Invoice
from payments.models import PaymentChoices
from payments.services import process_payment
from wallets.models import Wallet, WalletTransaction, TransactionChoices


class DepositSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalletTransaction
        fields = '__all__'
        read_only_fields = ['wallet', 'transaction_type']

    @transaction.atomic
    def create(self, validated_data):
        user = self.context['request'].user
        wallet = Wallet.objects.select_for_update().get(parent=user)

        validated_data['wallet'] = wallet
        validated_data['transaction_type'] = TransactionChoices.DEPOSIT
        transaction_obj = super().create(validated_data)

        wallet.balance += transaction_obj.amount
        wallet.save()

        return transaction_obj


class WalletPaymentSerializer(serializers.Serializer):
    invoice = serializers.PrimaryKeyRelatedField(queryset=Invoice.objects.all())
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)

    def validate(self, data):
        invoice = data['invoice']
        user = self.context['request'].user
        wallet = getattr(user, 'wallet', None)

        if not wallet:
            raise serializers.ValidationError("User does not have a wallet.")

        amount = data.get('amount')
        if not amount:
            amount = invoice.balance_remaining
            data['amount'] = amount

        if amount <= 0:
            raise serializers.ValidationError("Payment amount must be greater than zero.")

        if amount > invoice.balance_remaining:
            raise serializers.ValidationError(
                f"Amount ({amount} ETB) exceeds outstanding balance ({invoice.balance_remaining} ETB)."
            )

        if wallet.balance < amount:
            raise serializers.ValidationError(
                f"Insufficient wallet balance ({wallet.balance} ETB < {amount} ETB)."
            )

        return data

    def create(self, validated_data):
        invoice = validated_data['invoice']
        user = self.context['request'].user
        amount = validated_data['amount']

        return process_payment(
            invoice=invoice,
            paid_by=user,
            amount=amount,
            method=PaymentChoices.WALLET,
            wallet=user.wallet
        )

    def to_representation(self, instance):
        receipt = getattr(instance, 'receipt', None)
        user = self.context['request'].user
        wallet = getattr(user, 'wallet', None)
        return {
            'payment_id': instance.id,
            'receipt_number': receipt.receipt_number if receipt else f"RCP-{instance.id:06d}",
            'invoice_id': instance.invoice.id,
            'amount_paid': str(instance.amount),
            'method': instance.method,
            'paid_at': instance.paid_at.isoformat() if instance.paid_at else None,
            'invoice_status': instance.invoice.status,
            'invoice_balance': str(instance.invoice.balance_remaining),
            'wallet_balance': str(wallet.balance) if wallet else "0.00"
        }