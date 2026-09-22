from datetime import datetime, date
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView, RetrieveUpdateAPIView
from rest_framework.permissions import IsAuthenticated
from fees.models import FeeStructure, Invoice, StatusChoices as InvoiceStatusChoices
from students.models import Student, StatusChoices as StudentStatusChoices
from api.serializers.fees import FeeStructureSerializer, InvoiceSerializer
from api.permissions import IsStaffOrAdmin, IsAdmin
from notifications.services import send_due_reminder

class FeeStructureListCreateView(ListCreateAPIView):
    serializer_class = FeeStructureSerializer
    permission_classes = [IsStaffOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'STAFF' and user.school:
            return FeeStructure.objects.filter(school=user.school)
        return FeeStructure.objects.all()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'STAFF' and user.school and 'school' not in serializer.validated_data:
            serializer.save(school=user.school)
        else:
            serializer.save()


class FeeStructureDetailView(RetrieveUpdateDestroyAPIView):
    serializer_class = FeeStructureSerializer

    def get_permissions(self):
        if self.request.method == 'DELETE':
            return [IsAdmin()]
        return [IsStaffOrAdmin()]

    def get_queryset(self):
        user = self.request.user
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