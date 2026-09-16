from decimal import Decimal
from django.db.models import Sum, Count, Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from api.permissions import IsStaffOrAdmin
from fees.models import Invoice, StatusChoices as InvoiceStatusChoices
from students.models import Student


class FinancialSummaryReportView(APIView):
    permission_classes = [IsStaffOrAdmin]

    def get(self, request):
        user = request.user
        invoices = Invoice.objects.all()

        # Scope by staff member's school
        if user.role == 'STAFF' and user.school:
            invoices = invoices.filter(student__school=user.school)
        elif user.role == 'ADMIN':
            school_id = request.query_params.get('school')
            if school_id:
                invoices = invoices.filter(student__school_id=school_id)

        aggregates = invoices.aggregate(
            total_billed=Sum('amount'),
            total_collected=Sum('amount_paid'),
            total_count=Count('id'),
            paid_count=Count('id', filter=Q(status=InvoiceStatusChoices.PAID)),
            partially_paid_count=Count('id', filter=Q(status=InvoiceStatusChoices.PARTIALLY_PAID)),
            unpaid_count=Count('id', filter=Q(status=InvoiceStatusChoices.UNPAID)),
            overdue_count=Count('id', filter=Q(status=InvoiceStatusChoices.OVERDUE)),
        )

        total_billed = aggregates['total_billed'] or Decimal('0.00')
        total_collected = aggregates['total_collected'] or Decimal('0.00')
        total_outstanding = max(Decimal('0.00'), total_billed - total_collected)

        collection_rate = (
            round(float(total_collected / total_billed * 100), 2)
            if total_billed > Decimal('0.00')
            else 0.0
        )

        return Response({
            "total_billed": total_billed,
            "total_collected": total_collected,
            "total_outstanding": total_outstanding,
            "collection_rate_percentage": collection_rate,
            "invoices_breakdown": {
                "total": aggregates['total_count'] or 0,
                "paid": aggregates['paid_count'] or 0,
                "partially_paid": aggregates['partially_paid_count'] or 0,
                "unpaid": aggregates['unpaid_count'] or 0,
                "overdue": aggregates['overdue_count'] or 0,
            }
        }, status=status.HTTP_200_OK)


class GradeBreakdownReportView(APIView):
    permission_classes = [IsStaffOrAdmin]

    def get(self, request):
        user = request.user
        students_qs = Student.objects.all()
        invoices_qs = Invoice.objects.all()

        if user.role == 'STAFF' and user.school:
            students_qs = students_qs.filter(school=user.school)
            invoices_qs = invoices_qs.filter(student__school=user.school)
        elif user.role == 'ADMIN':
            school_id = request.query_params.get('school')
            if school_id:
                students_qs = students_qs.filter(school_id=school_id)
                invoices_qs = invoices_qs.filter(student__school_id=school_id)

        grades = students_qs.values_list('grade', flat=True).distinct().order_by('grade')

        breakdown = []
        for grade in grades:
            grade_invoices = invoices_qs.filter(student__grade=grade)
            grade_students_count = students_qs.filter(grade=grade).count()

            agg = grade_invoices.aggregate(
                billed=Sum('amount'),
                collected=Sum('amount_paid')
            )
            billed = agg['billed'] or Decimal('0.00')
            collected = agg['collected'] or Decimal('0.00')
            outstanding = max(Decimal('0.00'), billed - collected)
            rate = (
                round(float(collected / billed * 100), 2)
                if billed > Decimal('0.00')
                else 0.0
            )

            breakdown.append({
                "grade": grade,
                "students_count": grade_students_count,
                "total_billed": billed,
                "total_collected": collected,
                "total_outstanding": outstanding,
                "collection_rate_percentage": rate,
            })

        return Response({"grades": breakdown}, status=status.HTTP_200_OK)
