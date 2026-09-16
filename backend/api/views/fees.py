from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView, RetrieveUpdateAPIView
from rest_framework.permissions import IsAuthenticated
from fees.models import FeeStructure, Invoice
from api.serializers.fees import FeeStructureSerializer, InvoiceSerializer
from api.permissions import IsStaffOrAdmin, IsAdmin

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