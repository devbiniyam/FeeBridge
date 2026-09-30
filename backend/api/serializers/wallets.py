import uuid
from django.db import transaction
from rest_framework import serializers
from fees.models import Invoice
from payments.models import PaymentChoices
from payments.services import process_payment
from wallets.models import Wallet, WalletTransaction, TransactionChoices


class DepositSerializer(serializers.ModelSerializer):
    funding_source = serializers.CharField(max_length=50, required=False, default="DIRECT")
    source_account = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    reference_number = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")

    class Meta:
        model = WalletTransaction
        fields = [
            'id',
            'amount',
            'funding_source',
            'source_account',
            'reference_number',
            'created_at',
            'transaction_type'
        ]
        read_only_fields = ['wallet', 'transaction_type', 'created_at']

    @transaction.atomic
    def create(self, validated_data):
        user = self.context['request'].user
        wallet = Wallet.objects.select_for_update().get(parent=user)

        funding_source = validated_data.get('funding_source') or "DIRECT"
        source_account = validated_data.get('source_account') or ""
        reference_number = validated_data.get('reference_number')

        if not reference_number:
            code = uuid.uuid4().hex[:8].upper()
            prefix_map = {
                'CBE': f'CBE-FT{code}',
                'TELEBIRR': f'TB-{code}',
                'BOA': f'BOA-{code}',
                'AWASH': f'AW-{code}',
                'DASHEN': f'DSH-{code}',
                'COOP': f'COP-{code}',
                'CARD': f'CARD-{code}',
                'CHAPA': f'CHP-{code}'
            }
            reference_number = prefix_map.get(funding_source.upper(), f'DEP-{code}')

        validated_data['wallet'] = wallet
        validated_data['transaction_type'] = TransactionChoices.DEPOSIT
        validated_data['funding_source'] = funding_source
        validated_data['source_account'] = source_account
        validated_data['reference_number'] = reference_number

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


class WalletTransactionSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='related_invoice.student.full_name', read_only=True, default=None)
    invoice_month = serializers.DateField(source='related_invoice.month', read_only=True, default=None)

    class Meta:
        model = WalletTransaction
        fields = [
            'id',
            'transaction_type',
            'amount',
            'funding_source',
            'source_account',
            'reference_number',
            'created_at',
            'related_invoice',
            'student_name',
            'invoice_month'
        ]



class WalletDetailSerializer(serializers.ModelSerializer):
    total_deposited = serializers.SerializerMethodField()
    total_deducted = serializers.SerializerMethodField()
    recent_transactions = serializers.SerializerMethodField()

    class Meta:
        model = Wallet
        fields = [
            'id',
            'balance',
            'total_deposited',
            'total_deducted',
            'recent_transactions'
        ]

    def get_total_deposited(self, obj):
        from django.db.models import Sum
        val = obj.transactions.filter(transaction_type='DEPOSIT').aggregate(total=Sum('amount'))['total']
        return str(val or '0.00')

    def get_total_deducted(self, obj):
        from django.db.models import Sum
        val = obj.transactions.filter(transaction_type='DEDUCTION').aggregate(total=Sum('amount'))['total']
        return str(val or '0.00')

    def get_recent_transactions(self, obj):
        txs = obj.transactions.order_by('-created_at')[:20]
        return WalletTransactionSerializer(txs, many=True).data