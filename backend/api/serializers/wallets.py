from rest_framework import serializers
from fees.models import Invoice, StatusChoices
from payments.models import Payment, Receipt
from wallets.models import Wallet, WalletTransaction, TransactionChoices


class DepositSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalletTransaction
        fields = '__all__'
        read_only_fields = ['wallet', 'transaction_type']

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['wallet'] = user.wallet
        validated_data['transaction_type'] = TransactionChoices.DEPOSIT
        transaction = super().create(validated_data)

        wallet = transaction.wallet
        wallet.balance += transaction.amount
        wallet.save()

        return transaction


class WalletPaymentSerializer(serializers.Serializer):
    invoice = serializers.PrimaryKeyRelatedField(queryset=Invoice.objects.all())

    def validate(self, data):
        invoice = data['invoice']
        user = self.context['request'].user
        wallet = user.wallet

        if wallet.balance < invoice.amount:
            raise serializers.ValidationError("Insufficient wallet balance.")

        return data

    def create(self, validated_data):
        invoice = validated_data['invoice']
        user = self.context['request'].user
        wallet = user.wallet

        wallet.balance -= invoice.amount
        wallet.save()

        WalletTransaction.objects.create(
            wallet=wallet,
            transaction_type=TransactionChoices.DEDUCTION,
            amount=invoice.amount,
            related_invoice=invoice
        )

        payment = Payment.objects.create(
            invoice=invoice,
            paid_by=user,
            amount=invoice.amount,
            method='WALLET'
        )

        invoice.status = StatusChoices.PAID
        invoice.save()

        Receipt.objects.create(
            payment=payment,
            receipt_number=f"RCP-{payment.id:06d}"
        )

        return payment