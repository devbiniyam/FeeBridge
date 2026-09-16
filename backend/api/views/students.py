from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from students.models import Student
from api.serializers.students import StudentSerializer
from api.permissions import IsStaffOrAdmin, IsAdmin


class StudentListCreateView(ListCreateAPIView):
    serializer_class = StudentSerializer
    permission_classes = [IsStaffOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'STAFF' and user.school:
            return Student.objects.filter(school=user.school)
        if user.role == 'PARENT':
            return Student.objects.filter(parent=user)
        return Student.objects.all()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'STAFF' and user.school and 'school' not in serializer.validated_data:
            serializer.save(school=user.school)
        else:
            serializer.save()


class StudentDetailView(RetrieveUpdateDestroyAPIView):
    serializer_class = StudentSerializer

    def get_permissions(self):
        if self.request.method == 'DELETE':
            return [IsAdmin()]
        return [IsStaffOrAdmin()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'STAFF' and user.school:
            return Student.objects.filter(school=user.school)
        if user.role == 'PARENT':
            return Student.objects.filter(parent=user)
        return Student.objects.all()