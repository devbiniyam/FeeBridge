from decimal import Decimal
from django.db.models import Sum, Count, Q
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from api.permissions import IsStaffOrAdmin
from fees.models import Invoice, StatusChoices as InvoiceStatusChoices, FeeStructure
from students.models import Student
from payments.models import Payment, PaymentChoices


class FinancialSummaryReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        invoices = Invoice.objects.all()
        payments = Payment.objects.all()

        # Scoping based on user role and campus tenancy
        if user.role == 'PARENT':
            invoices = invoices.filter(student__parent=user)
            payments = payments.filter(paid_by=user)
        elif user.role == 'STAFF' and user.school:
            invoices = invoices.filter(student__school=user.school)
            payments = payments.filter(invoice__student__school=user.school)
        elif user.role == 'ADMIN':
            school_id = request.query_params.get('school')
            if school_id:
                invoices = invoices.filter(student__school_id=school_id)
                payments = payments.filter(invoice__student__school_id=school_id)

        # 1. Invoice & Collection Aggregates
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

        # 2. Payment Method Breakdown (CBE, Telebirr, BoA, Awash, Dashen, Cards, Wallet)
        total_payments_amount = payments.aggregate(tot=Sum('amount'))['tot'] or Decimal('0.00')
        method_aggs = payments.values('method').annotate(
            total_amount=Sum('amount'),
            count=Count('id')
        ).order_by('-total_amount')

        method_choices_dict = dict(PaymentChoices.choices)
        payment_methods_breakdown = []
        for m in method_aggs:
            amt = m['total_amount'] or Decimal('0.00')
            pct = round(float(amt / total_payments_amount * 100), 1) if total_payments_amount > Decimal('0.00') else 0.0
            payment_methods_breakdown.append({
                "method": m['method'],
                "label": method_choices_dict.get(m['method'], m['method']),
                "total_amount": amt,
                "count": m['count'],
                "percentage": pct,
            })

        # 3. Monthly Billing & Collection Trends
        month_aggs = invoices.values('month').annotate(
            billed=Sum('amount'),
            collected=Sum('amount_paid'),
            count=Count('id')
        ).order_by('month')

        monthly_trends = []
        for ma in month_aggs:
            m_date = ma['month']
            monthly_trends.append({
                "month_str": m_date.strftime("%B %Y") if hasattr(m_date, 'strftime') else str(m_date),
                "billed": ma['billed'] or Decimal('0.00'),
                "collected": ma['collected'] or Decimal('0.00'),
                "count": ma['count']
            })

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
            },
            "payment_methods_breakdown": payment_methods_breakdown,
            "monthly_trends": monthly_trends,
        }, status=status.HTTP_200_OK)


class GradeBreakdownReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        students_qs = Student.objects.all()
        invoices_qs = Invoice.objects.all()

        if user.role == 'PARENT':
            students_qs = students_qs.filter(parent=user)
            invoices_qs = invoices_qs.filter(student__parent=user)
        elif user.role == 'STAFF' and user.school:
            students_qs = students_qs.filter(school=user.school)
            invoices_qs = invoices_qs.filter(student__school=user.school)
        elif user.role == 'ADMIN':
            school_id = request.query_params.get('school')
            if school_id:
                students_qs = students_qs.filter(school_id=school_id)
                invoices_qs = invoices_qs.filter(student__school_id=school_id)

        # Collect all active grades from enrolled students or issued invoices
        grades_from_students = set(students_qs.values_list('grade', flat=True).distinct())
        grades_from_invoices = set(invoices_qs.values_list('student__grade', flat=True).distinct())
        all_grades = sorted(list(grades_from_students.union(grades_from_invoices)))

        breakdown = []
        for grade in all_grades:
            grade_invoices = invoices_qs.filter(student__grade=grade)
            grade_students_count = students_qs.filter(grade=grade).count()

            agg = grade_invoices.aggregate(
                billed=Sum('amount'),
                collected=Sum('amount_paid'),
                total_invoices=Count('id'),
                paid_invoices=Count('id', filter=Q(status=InvoiceStatusChoices.PAID))
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
                "grade_display": f"Grade {grade}",
                "students_count": grade_students_count,
                "total_invoices": agg['total_invoices'] or 0,
                "paid_invoices": agg['paid_invoices'] or 0,
                "total_billed": billed,
                "total_collected": collected,
                "total_outstanding": outstanding,
                "collection_rate_percentage": rate,
            })

        return Response({"grades": breakdown}, status=status.HTTP_200_OK)


class AuditLedgerReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        payments_qs = Payment.objects.select_related(
            'invoice',
            'invoice__student',
            'invoice__student__school',
            'paid_by',
            'receipt'
        ).order_by('-paid_at')

        # Scoping
        if user.role == 'PARENT':
            payments_qs = payments_qs.filter(paid_by=user)
        elif user.role == 'STAFF' and user.school:
            payments_qs = payments_qs.filter(invoice__student__school=user.school)
        elif user.role == 'ADMIN':
            school_id = request.query_params.get('school')
            if school_id:
                payments_qs = payments_qs.filter(invoice__student__school_id=school_id)

        # Filters
        method = request.query_params.get('method')
        if method:
            payments_qs = payments_qs.filter(method=method)

        search = request.query_params.get('search')
        if search:
            payments_qs = payments_qs.filter(
                Q(invoice__student__full_name__icontains=search) |
                Q(paid_by__email__icontains=search) |
                Q(paid_by__first_name__icontains=search) |
                Q(paid_by__last_name__icontains=search) |
                Q(receipt__receipt_number__icontains=search) |
                Q(reference_number__icontains=search)
            )

        from_date = request.query_params.get('from_date')
        if from_date:
            payments_qs = payments_qs.filter(paid_at__date__gte=from_date)

        to_date = request.query_params.get('to_date')
        if to_date:
            payments_qs = payments_qs.filter(paid_at__date__lte=to_date)

        method_choices_dict = dict(PaymentChoices.choices)

        ledger = []
        for p in payments_qs[:200]:  # Cap at recent 200 items
            receipt_no = ""
            if hasattr(p, 'receipt') and p.receipt:
                receipt_no = p.receipt.receipt_number
            else:
                receipt_no = f"RCP-{p.id:06d}"

            student_name = p.invoice.student.full_name if p.invoice and p.invoice.student else "Unknown Student"
            student_grade = p.invoice.student.grade if p.invoice and p.invoice.student else None
            school_name = p.invoice.student.school.name if p.invoice and p.invoice.student and p.invoice.student.school else "Campus"
            month_str = p.invoice.month.strftime("%B %Y") if p.invoice and p.invoice.month else ""

            parent_name = f"{p.paid_by.first_name} {p.paid_by.last_name}".strip() if p.paid_by else ""
            parent_email = p.paid_by.email if p.paid_by else ""

            ledger.append({
                "id": p.id,
                "receipt_number": receipt_no,
                "reference_number": p.reference_number or f"REF-{p.id:06d}",
                "student_name": student_name,
                "student_grade": student_grade,
                "school_name": school_name,
                "parent_name": parent_name or parent_email,
                "parent_email": parent_email,
                "amount": str(p.amount),
                "method": p.method,
                "method_label": method_choices_dict.get(p.method, p.method),
                "funding_source": p.funding_source or p.method,
                "paid_at": p.paid_at.isoformat(),
                "invoice_id": p.invoice.id if p.invoice else None,
                "invoice_month": month_str,
                "invoice_status": p.invoice.status if p.invoice else "",
            })

        return Response({
            "total_count": len(ledger),
            "ledger": ledger
        }, status=status.HTTP_200_OK)
