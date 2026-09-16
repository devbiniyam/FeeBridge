from rest_framework import serializers
from payments.models import Payment, PaymentChoices
from payments.services import process_payment


class PaymentSerializer(serializers.ModelSerializer):
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)

    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ['paid_by']

    def validate(self, data):
        invoice = data.get('invoice')
        amount = data.get('amount')
        if not amount:
            data['amount'] = invoice.balance_remaining
        elif amount > invoice.balance_remaining:
            raise serializers.ValidationError(
                f"Amount ({amount} ETB) exceeds outstanding balance ({invoice.balance_remaining} ETB)."
            )
        return data

    def create(self, validated_data):
        user = self.context['request'].user
        invoice = validated_data['invoice']
        amount = validated_data['amount']
        method = validated_data.get('method', PaymentChoices.DIRECT)

        return process_payment(
            invoice=invoice,
            paid_by=user,
            amount=amount,
            method=method
        )