from decimal import Decimal
from rest_framework import serializers
from fees.models import FeeStructure, Invoice, InvoiceInstallment
from schools.models import School


class FeeStructureSerializer(serializers.ModelSerializer):
    school = serializers.PrimaryKeyRelatedField(
        queryset=School.objects.all(),
        required=False
    )
    school_name = serializers.ReadOnlyField(source='school.name')
    grade_display = serializers.SerializerMethodField()
    student_count = serializers.SerializerMethodField()
    annual_estimate = serializers.SerializerMethodField()

    class Meta:
        model = FeeStructure
        fields = [
            'id',
            'school',
            'school_name',
            'grade',
            'grade_display',
            'amount',
            'student_count',
            'annual_estimate',
        ]

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        request = self.context.get('request')
        if 'school' not in data and request and hasattr(request.user, 'school') and request.user.school:
            data['school'] = request.user.school.id
        return super().to_internal_value(data)

    def get_grade_display(self, obj):
        return f"Grade {obj.grade}"

    def get_student_count(self, obj):
        if not obj.school:
            return 0
        return obj.school.students.filter(grade=obj.grade, status='ACTIVE').count()

    def get_annual_estimate(self, obj):
        # 10 academic months per Ethiopian school year
        return str(Decimal(obj.amount) * 10)

    def validate_grade(self, value):
        if value < 1 or value > 12:
            raise serializers.ValidationError("Grade must be between 1 and 12.")
        return value

    def validate_amount(self, value):
        if value <= Decimal('0.00'):
            raise serializers.ValidationError("Tuition amount must be greater than 0.")
        return value

    def validate(self, attrs):
        request = self.context.get('request')
        school = attrs.get('school')
        if not school and request and hasattr(request.user, 'school') and request.user.school:
            school = request.user.school

        grade = attrs.get('grade')
        if school and grade is not None:
            qs = FeeStructure.objects.filter(school=school, grade=grade)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    f"A fee structure for Grade {grade} already exists at {school.name}. Please edit the existing fee structure instead."
                )
        return attrs


class InvoiceInstallmentSerializer(serializers.ModelSerializer):
    balance_remaining = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    is_paid = serializers.BooleanField(read_only=True)

    class Meta:
        model = InvoiceInstallment
        fields = [
            'id',
            'invoice',
            'installment_number',
            'title',
            'amount',
            'amount_paid',
            'balance_remaining',
            'due_date',
            'status',
            'paid_at',
            'is_paid',
        ]
        read_only_fields = ['amount_paid', 'balance_remaining', 'status', 'paid_at']


class InvoiceSerializer(serializers.ModelSerializer):
    balance_remaining = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    student_grade = serializers.IntegerField(source='student.grade', read_only=True)
    student_section = serializers.CharField(source='student.section', read_only=True)
    school_name = serializers.CharField(source='student.school.name', read_only=True)
    has_installments = serializers.BooleanField(read_only=True)
    installments_count = serializers.IntegerField(read_only=True)
    paid_installments_count = serializers.IntegerField(read_only=True)
    installments = InvoiceInstallmentSerializer(many=True, read_only=True)

    class Meta:
        model = Invoice
        fields = '__all__'
        read_only_fields = ['amount', 'amount_paid', 'balance_remaining']

    def create(self, validated_data):
        validated_data['amount'] = validated_data['fee_structure'].amount
        return super().create(validated_data)