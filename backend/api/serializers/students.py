from django.db.models import Sum
from rest_framework import serializers
from students.models import Student
from accounts.models import User
from fees.models import Invoice


class StudentSerializer(serializers.ModelSerializer):
    school_name = serializers.CharField(source='school.name', read_only=True)
    parent_name = serializers.SerializerMethodField()
    parent_email = serializers.CharField(source='parent.email', read_only=True)
    parent_phone = serializers.CharField(source='parent.phone_number', read_only=True)
    
    # Financial telemetry per student
    total_invoiced = serializers.SerializerMethodField()
    total_paid = serializers.SerializerMethodField()
    balance_remaining = serializers.SerializerMethodField()
    invoices_count = serializers.SerializerMethodField()
    tuition_status = serializers.SerializerMethodField()

    # Optional write-only helper to assign parent by email or phone
    parent_identifier = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Student
        fields = [
            'id',
            'full_name',
            'gender',
            'grade',
            'section',
            'parent',
            'parent_identifier',
            'parent_name',
            'parent_email',
            'parent_phone',
            'school',
            'school_name',
            'date_of_birth',
            'status',
            'total_invoiced',
            'total_paid',
            'balance_remaining',
            'invoices_count',
            'tuition_status'
        ]
        extra_kwargs = {
            'parent': {'required': False},
            'school': {'required': False},
        }

    def get_parent_name(self, obj):
        if obj.parent:
            name = f"{obj.parent.first_name} {obj.parent.last_name}".strip()
            return name or obj.parent.email
        return "N/A"

    def get_total_invoiced(self, obj):
        val = obj.invoices.aggregate(total=Sum('amount'))['total']
        return str(val or '0.00')

    def get_total_paid(self, obj):
        val = obj.invoices.aggregate(total=Sum('amount_paid'))['total']
        return str(val or '0.00')

    def get_balance_remaining(self, obj):
        invoiced = obj.invoices.aggregate(total=Sum('amount'))['total'] or 0
        paid = obj.invoices.aggregate(total=Sum('amount_paid'))['total'] or 0
        rem = max(0, invoiced - paid)
        return str(rem)

    def get_invoices_count(self, obj):
        return obj.invoices.count()

    def get_tuition_status(self, obj):
        invoices = obj.invoices.all()
        if not invoices.exists():
            return 'NO_INVOICES'
        has_unpaid = invoices.filter(status='UNPAID').exists()
        has_overdue = invoices.filter(status='OVERDUE').exists()
        has_partial = invoices.filter(status='PARTIALLY_PAID').exists()

        if has_overdue:
            return 'OVERDUE'
        if has_unpaid or has_partial:
            return 'PENDING'
        return 'CLEARED'

    def create(self, validated_data):
        parent_identifier = validated_data.pop('parent_identifier', None)

        # If parent_identifier is passed, find matching user
        if parent_identifier and 'parent' not in validated_data:
            parent_user = (
                User.objects.filter(email__iexact=parent_identifier).first()
                or User.objects.filter(phone_number=parent_identifier).first()
            )
            if not parent_user:
                raise serializers.ValidationError({
                    'parent_identifier': f"No parent account found matching '{parent_identifier}'."
                })
            validated_data['parent'] = parent_user

        if 'parent' not in validated_data:
            # If logged in user is parent
            req_user = self.context['request'].user
            if req_user.role == 'PARENT':
                validated_data['parent'] = req_user
            else:
                raise serializers.ValidationError({
                    'parent': "Please select a parent account or enter the parent's email/phone."
                })

        return super().create(validated_data)