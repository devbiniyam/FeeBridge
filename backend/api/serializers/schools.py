from decimal import Decimal
from rest_framework import serializers
from django.db.models import Sum
from schools.models import School
from students.models import Student
from accounts.models import User
from fees.models import FeeStructure, Invoice


class SchoolSerializer(serializers.ModelSerializer):
    class Meta:
        model = School
        fields = ['id', 'name', 'address', 'phone_number', 'unique_code']


class SchoolAnalyticsSerializer(serializers.ModelSerializer):
    student_count = serializers.SerializerMethodField()
    staff_count = serializers.SerializerMethodField()
    fee_structures_count = serializers.SerializerMethodField()
    total_billed = serializers.SerializerMethodField()
    total_collected = serializers.SerializerMethodField()
    total_outstanding = serializers.SerializerMethodField()
    collection_rate = serializers.SerializerMethodField()

    class Meta:
        model = School
        fields = [
            'id',
            'name',
            'address',
            'phone_number',
            'unique_code',
            'student_count',
            'staff_count',
            'fee_structures_count',
            'total_billed',
            'total_collected',
            'total_outstanding',
            'collection_rate',
        ]

    def get_student_count(self, obj):
        return obj.students.filter(status='ACTIVE').count()

    def get_staff_count(self, obj):
        return obj.staff_members.filter(role='STAFF').count()

    def get_fee_structures_count(self, obj):
        return obj.fee_structures.count()

    def get_total_billed(self, obj):
        billed = Invoice.objects.filter(student__school=obj).aggregate(tot=Sum('amount'))['tot'] or Decimal('0.00')
        return billed

    def get_total_collected(self, obj):
        collected = Invoice.objects.filter(student__school=obj).aggregate(tot=Sum('amount_paid'))['tot'] or Decimal('0.00')
        return collected

    def get_total_outstanding(self, obj):
        billed = self.get_total_billed(obj)
        collected = self.get_total_collected(obj)
        return max(Decimal('0.00'), billed - collected)

    def get_collection_rate(self, obj):
        billed = self.get_total_billed(obj)
        collected = self.get_total_collected(obj)
        if billed > Decimal('0.00'):
            return round(float(collected / billed * 100), 2)
        return 0.0
