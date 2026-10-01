from datetime import datetime, date, timedelta
from decimal import Decimal
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView, RetrieveUpdateAPIView
from rest_framework.permissions import IsAuthenticated
from fees.models import FeeStructure, Invoice, InvoiceInstallment, StatusChoices as InvoiceStatusChoices
from students.models import Student, StatusChoices as StudentStatusChoices
from api.serializers.fees import FeeStructureSerializer, InvoiceSerializer
from api.permissions import IsStaffOrAdmin, IsAdmin
from notifications.services import send_due_reminder
from payments.services import run_auto_pay_settlement_batch

class FeeStructureListCreateView(ListCreateAPIView):
    serializer_class = FeeStructureSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsStaffOrAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'PARENT':
            school_ids = Student.objects.filter(parent=user).values_list('school_id', flat=True).distinct()
            return FeeStructure.objects.filter(school_id__in=school_ids).order_by('grade')
        if user.role == 'STAFF' and user.school:
            return FeeStructure.objects.filter(school=user.school).order_by('grade')
        return FeeStructure.objects.all().order_by('grade')

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'STAFF' and user.school and 'school' not in serializer.validated_data:
            serializer.save(school=user.school)
        else:
            serializer.save()


class FeeStructureDetailView(RetrieveUpdateDestroyAPIView):
    serializer_class = FeeStructureSerializer

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH']:
            return [IsStaffOrAdmin()]
        if self.request.method == 'DELETE':
            return [IsAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'PARENT':
            school_ids = Student.objects.filter(parent=user).values_list('school_id', flat=True).distinct()
            return FeeStructure.objects.filter(school_id__in=school_ids)
        if user.role == 'STAFF' and user.school:
            return FeeStructure.objects.filter(school=user.school)
        return FeeStructure.objects.all()


class InvoiceListCreateView(ListCreateAPIView):
    serializer_class = InvoiceSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsStaffOrAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'PARENT':
            return Invoice.objects.filter(student__parent=user)
        if user.role == 'STAFF' and user.school:
            return Invoice.objects.filter(student__school=user.school)
        return Invoice.objects.all()


class InvoiceDetailView(RetrieveUpdateAPIView):
    serializer_class = InvoiceSerializer

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH']:
            return [IsStaffOrAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'PARENT':
            return Invoice.objects.filter(student__parent=user)
        if user.role == 'STAFF' and user.school:
            return Invoice.objects.filter(student__school=user.school)
        return Invoice.objects.all()


class BatchGenerateInvoicesView(APIView):
    permission_classes = [IsStaffOrAdmin]

    def post(self, request):
        user = request.user
        data = request.data

        # 1. Determine target school
        if user.role == 'STAFF':
            school = user.school
            if not school:
                return Response(
                    {"detail": "Staff member is not assigned to any school campus."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            school_id = data.get('school_id')
            if school_id:
                from schools.models import School
                try:
                    school = School.objects.get(id=school_id)
                except School.DoesNotExist:
                    return Response({"detail": "School not found."}, status=status.HTTP_404_NOT_FOUND)
            else:
                school = user.school

        # 2. Parse target month
        month_str = data.get('month')
        if not month_str:
            today = date.today()
            target_month = date(today.year, today.month, 1)
        else:
            try:
                if len(str(month_str)) == 7:
                    dt = datetime.strptime(str(month_str), "%Y-%m").date()
                else:
                    dt = datetime.strptime(str(month_str)[:10], "%Y-%m-%d").date()
                target_month = date(dt.year, dt.month, 1)
            except ValueError:
                return Response(
                    {"detail": "Invalid month format. Please use YYYY-MM or YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # 3. Parse due date
        due_date_str = data.get('due_date')
        if due_date_str:
            try:
                due_date = datetime.strptime(str(due_date_str)[:10], "%Y-%m-%d").date()
            except ValueError:
                due_date = date(target_month.year, target_month.month, 10)
        else:
            due_date = date(target_month.year, target_month.month, 10)

        # 4. Scope query
        grade_filter = data.get('grade')
        student_query = Student.objects.filter(status=StudentStatusChoices.ACTIVE)
        if school:
            student_query = student_query.filter(school=school)
        if grade_filter:
            try:
                student_query = student_query.filter(grade=int(grade_filter))
            except (ValueError, TypeError):
                pass

        students = list(student_query.select_related('school', 'parent'))
        if not students:
            return Response({
                "success": True,
                "created_count": 0,
                "skipped_count": 0,
                "total_students": 0,
                "message": "No active enrolled students found for the selected scope.",
                "created": [],
                "skipped": []
            })

        created_invoices = []
        skipped_invoices = []

        for student in students:
            # Check duplicate invoice for month
            if Invoice.objects.filter(student=student, month=target_month).exists():
                skipped_invoices.append({
                    "student_name": student.full_name,
                    "grade": student.grade,
                    "reason": f"Already has an invoice for {target_month.strftime('%B %Y')}"
                })
                continue

            # Lookup fee structure for student's grade and school
            try:
                fee_structure = FeeStructure.objects.get(
                    school=student.school,
                    grade=student.grade
                )
            except FeeStructure.DoesNotExist:
                skipped_invoices.append({
                    "student_name": student.full_name,
                    "grade": student.grade,
                    "reason": f"No fee structure defined for Grade {student.grade}"
                })
                continue

            invoice = Invoice.objects.create(
                student=student,
                fee_structure=fee_structure,
                amount=fee_structure.amount,
                amount_paid=0,
                month=target_month,
                due_date=due_date,
                status=InvoiceStatusChoices.UNPAID
            )

            created_invoices.append({
                "invoice_id": invoice.id,
                "student_name": student.full_name,
                "grade": student.grade,
                "amount": str(invoice.amount)
            })

            # Fire parent due reminder notification
            if student.parent:
                try:
                    send_due_reminder(invoice)
                except Exception:
                    pass

        return Response({
            "success": True,
            "created_count": len(created_invoices),
            "skipped_count": len(skipped_invoices),
            "total_students": len(students),
            "month": target_month.isoformat(),
            "due_date": due_date.isoformat(),
            "school_name": school.name if school else "All Campuses",
            "created": created_invoices,
            "skipped": skipped_invoices
        }, status=status.HTTP_201_CREATED if created_invoices else status.HTTP_200_OK)


class CreateInstallmentPlanView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            invoice = Invoice.objects.get(pk=pk)
        except Invoice.DoesNotExist:
            return Response({"detail": "Invoice not found."}, status=status.HTTP_404_NOT_FOUND)

        # Check authorization
        user = request.user
        if user.role == 'PARENT' and invoice.student.parent != user:
            return Response({"detail": "You do not have permission to modify this invoice."}, status=status.HTTP_403_FORBIDDEN)
        if user.role == 'STAFF' and invoice.student.school != user.school:
            return Response({"detail": "You do not have permission to modify this invoice."}, status=status.HTTP_403_FORBIDDEN)

        if invoice.status == InvoiceStatusChoices.PAID:
            return Response({"detail": "Cannot create an installment plan for an already paid invoice."}, status=status.HTTP_400_BAD_REQUEST)

        if invoice.installments.exists():
            return Response({"detail": "An installment plan already exists for this invoice."}, status=status.HTTP_400_BAD_REQUEST)

        if invoice.amount_paid > Decimal('0.00'):
            return Response({"detail": "Cannot create an installment plan for an invoice with existing partial payments."}, status=status.HTTP_400_BAD_REQUEST)

        data = request.data
        plan_type = str(data.get('plan_type', '2_PART')).upper()
        custom_installments = data.get('installments')

        created_installments = []
        with transaction.atomic():
            if custom_installments and isinstance(custom_installments, list):
                if len(custom_installments) < 2:
                    return Response({"detail": "An installment plan requires at least 2 installments."}, status=status.HTTP_400_BAD_REQUEST)
                
                total_custom = Decimal('0.00')
                installment_objs = []
                for idx, item in enumerate(custom_installments, start=1):
                    try:
                        amt = Decimal(str(item.get('amount', '0.00')))
                        due_str = item.get('due_date')
                        title = item.get('title') or f"Milestone #{idx}"
                        if amt <= Decimal('0.00'):
                            return Response({"detail": f"Amount for milestone #{idx} must be greater than zero."}, status=status.HTTP_400_BAD_REQUEST)
                        due_d = datetime.strptime(str(due_str)[:10], "%Y-%m-%d").date()
                    except (ValueError, TypeError):
                        return Response({"detail": f"Invalid amount or date format for milestone #{idx}."}, status=status.HTTP_400_BAD_REQUEST)
                    
                    total_custom += amt
                    installment_objs.append({
                        "number": idx,
                        "title": title,
                        "amount": amt,
                        "due_date": due_d
                    })

                diff = invoice.amount - total_custom
                if abs(diff) > Decimal('0.05'):
                    return Response(
                        {"detail": f"Total installment sum ({total_custom:,.2f}) must equal invoice total ({invoice.amount:,.2f})."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                if diff != Decimal('0.00'):
                    installment_objs[-1]["amount"] += diff

                for obj in installment_objs:
                    created_inst = InvoiceInstallment.objects.create(
                        invoice=invoice,
                        installment_number=obj["number"],
                        title=obj["title"],
                        amount=obj["amount"],
                        due_date=obj["due_date"],
                        status=InvoiceStatusChoices.OVERDUE if obj["due_date"] < date.today() else InvoiceStatusChoices.UNPAID
                    )
                    created_installments.append(created_inst)

            elif plan_type == '2_PART':
                part1_amt = (invoice.amount / Decimal('2')).quantize(Decimal('0.01'))
                part2_amt = invoice.amount - part1_amt
                base_due = invoice.due_date

                due1 = base_due
                due2 = base_due + timedelta(days=30)

                t1 = data.get('milestone_1_title') or "Milestone 1 of 2 (50%)"
                t2 = data.get('milestone_2_title') or "Milestone 2 of 2 (50%)"

                i1 = InvoiceInstallment.objects.create(
                    invoice=invoice,
                    installment_number=1,
                    title=t1,
                    amount=part1_amt,
                    due_date=due1,
                    status=InvoiceStatusChoices.OVERDUE if due1 < date.today() else InvoiceStatusChoices.UNPAID
                )
                i2 = InvoiceInstallment.objects.create(
                    invoice=invoice,
                    installment_number=2,
                    title=t2,
                    amount=part2_amt,
                    due_date=due2,
                    status=InvoiceStatusChoices.OVERDUE if due2 < date.today() else InvoiceStatusChoices.UNPAID
                )
                created_installments.extend([i1, i2])

            elif plan_type == '3_PART':
                part1_amt = (invoice.amount * Decimal('0.40')).quantize(Decimal('0.01'))
                part2_amt = (invoice.amount * Decimal('0.30')).quantize(Decimal('0.01'))
                part3_amt = invoice.amount - part1_amt - part2_amt
                base_due = invoice.due_date

                due1 = base_due
                due2 = base_due + timedelta(days=30)
                due3 = base_due + timedelta(days=60)

                t1 = data.get('milestone_1_title') or "Milestone 1 of 3 (40%)"
                t2 = data.get('milestone_2_title') or "Milestone 2 of 3 (30%)"
                t3 = data.get('milestone_3_title') or "Milestone 3 of 3 (30%)"

                i1 = InvoiceInstallment.objects.create(
                    invoice=invoice,
                    installment_number=1,
                    title=t1,
                    amount=part1_amt,
                    due_date=due1,
                    status=InvoiceStatusChoices.OVERDUE if due1 < date.today() else InvoiceStatusChoices.UNPAID
                )
                i2 = InvoiceInstallment.objects.create(
                    invoice=invoice,
                    installment_number=2,
                    title=t2,
                    amount=part2_amt,
                    due_date=due2,
                    status=InvoiceStatusChoices.OVERDUE if due2 < date.today() else InvoiceStatusChoices.UNPAID
                )
                i3 = InvoiceInstallment.objects.create(
                    invoice=invoice,
                    installment_number=3,
                    title=t3,
                    amount=part3_amt,
                    due_date=due3,
                    status=InvoiceStatusChoices.OVERDUE if due3 < date.today() else InvoiceStatusChoices.UNPAID
                )
                created_installments.extend([i1, i2, i3])
            else:
                return Response({"detail": f"Unsupported plan type: {plan_type}. Use '2_PART', '3_PART', or custom 'installments'."}, status=status.HTTP_400_BAD_REQUEST)

        invoice.refresh_from_db()
        return Response(InvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)

    def delete(self, request, pk):
        try:
            invoice = Invoice.objects.get(pk=pk)
        except Invoice.DoesNotExist:
            return Response({"detail": "Invoice not found."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user.role == 'PARENT' and invoice.student.parent != user:
            return Response({"detail": "You do not have permission to modify this invoice."}, status=status.HTTP_403_FORBIDDEN)
        if user.role == 'STAFF' and invoice.student.school != user.school:
            return Response({"detail": "You do not have permission to modify this invoice."}, status=status.HTTP_403_FORBIDDEN)

        if not invoice.installments.exists():
            return Response({"detail": "No installment plan exists on this invoice."}, status=status.HTTP_400_BAD_REQUEST)

        if invoice.installments.filter(amount_paid__gt=Decimal('0.00')).exists():
            return Response({"detail": "Cannot cancel installment plan once payments have been recorded."}, status=status.HTTP_400_BAD_REQUEST)

        invoice.installments.all().delete()
        invoice.refresh_from_db()
        return Response({
            "message": "Installment plan cancelled. Reverted to standard lump-sum invoice.",
            "invoice": InvoiceSerializer(invoice).data
        }, status=status.HTTP_200_OK)


class AutoPayRunView(APIView):
    permission_classes = [IsStaffOrAdmin]

    def post(self, request):
        user = request.user
        if user.role == 'STAFF':
            school_id = user.school.id if user.school else None
        else:
            school_id = request.data.get('school_id') or None

        results = run_auto_pay_settlement_batch(school_id=school_id)
        return Response({
            "success": True,
            "settled_count": results["settled_count"],
            "total_amount_settled": str(results["total_amount_settled"]),
            "settled_items": results["settled_items"],
            "low_balance_count": results["low_balance_count"],
            "low_balance_items": results["low_balance_items"],
            "message": f"Settlement run completed: {results['settled_count']} invoices/milestones auto-cleared ({results['total_amount_settled']} ETB). {results['low_balance_count']} accounts warned for low balance."
        }, status=status.HTTP_200_OK)