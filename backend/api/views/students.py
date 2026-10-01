from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.permissions import IsAuthenticated
from students.models import Student
from api.serializers.students import StudentSerializer
from api.permissions import IsStaffOrAdmin, IsAdmin


class StudentListCreateView(ListCreateAPIView):
    serializer_class = StudentSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsStaffOrAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        queryset = Student.objects.all()
        if user.role == 'STAFF' and user.school:
            queryset = Student.objects.filter(school=user.school)
        elif user.role == 'PARENT':
            queryset = Student.objects.filter(parent=user)

        # Filters
        grade = self.request.query_params.get('grade')
        if grade:
            queryset = queryset.filter(grade=grade)

        section = self.request.query_params.get('section')
        if section:
            queryset = queryset.filter(section=section)

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(full_name__icontains=search)

        return queryset.order_by('grade', 'section', 'full_name')

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
        if self.request.method in ['PUT', 'PATCH']:
            return [IsStaffOrAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'STAFF' and user.school:
            return Student.objects.filter(school=user.school)
        if user.role == 'PARENT':
            return Student.objects.filter(parent=user)
        return Student.objects.all()