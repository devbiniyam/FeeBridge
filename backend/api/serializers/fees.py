from rest_framework import serializers
from fees.models import FeeStructure, Invoice

class FeeStructureSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeeStructure
        fields = '__all__'
      

class InvoiceSerializer(serializers.ModelSerializer):
    balance_remaining = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    student_grade = serializers.IntegerField(source='student.grade', read_only=True)
    student_section = serializers.CharField(source='student.section', read_only=True)
    school_name = serializers.CharField(source='student.school.name', read_only=True)

    class Meta:
        model = Invoice
        fields = '__all__'
        read_only_fields = ['amount', 'amount_paid', 'balance_remaining']

    def create(self, validated_data):
        validated_data['amount'] = validated_data['fee_structure'].amount
        return super().create(validated_data)