from rest_framework import serializers
from payments.models import Payment, PaymentChoices
from payments.services import process_payment


class PaymentSerializer(serializers.ModelSerializer):
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    installment = serializers.IntegerField(required=False, allow_null=True, write_only=True)

    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ['paid_by']

    def validate(self, data):
        invoice = data.get('invoice')
        amount = data.get('amount')
        installment_id = data.get('installment')

        if installment_id:
            inst = invoice.installments.filter(id=installment_id).first()
            if not inst:
                raise serializers.ValidationError("Installment does not belong to this invoice.")
            if inst.balance_remaining <= 0:
                raise serializers.ValidationError("This installment is already fully paid.")
            if not amount:
                amount = inst.balance_remaining
                data['amount'] = amount
            elif amount > inst.balance_remaining:
                raise serializers.ValidationError(
                    f"Amount ({amount} ETB) exceeds installment balance ({inst.balance_remaining} ETB)."
                )
            data['installment_obj'] = inst
        else:
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
        funding_source = validated_data.get('funding_source') or str(method)
        source_account = validated_data.get('source_account', '')
        reference_number = validated_data.get('reference_number', '')
        installment = validated_data.get('installment_obj')

        return process_payment(
            invoice=invoice,
            paid_by=user,
            amount=amount,
            method=method,
            funding_source=funding_source,
            source_account=source_account,
            reference_number=reference_number,
            installment=installment
        )
