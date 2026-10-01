from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from schools.models import School
from api.permissions import IsAdmin, IsStaffOrAdmin
from api.serializers.schools import SchoolSerializer, SchoolAnalyticsSerializer


class SchoolListCreateView(generics.ListCreateAPIView):
    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return SchoolSerializer
        # For listing, if user is admin or staff, provide rich analytics
        if self.request.user.role in ['ADMIN', 'STAFF']:
            return SchoolAnalyticsSerializer
        return SchoolSerializer

    def get_queryset(self):
        user = self.request.user
        qs = School.objects.all()

        if user.role == 'ADMIN':
            pass
        elif user.role == 'STAFF' and user.school:
            qs = qs.filter(id=user.school.id)
        elif user.role == 'PARENT':
            school_ids = user.children.values_list('school_id', flat=True).distinct()
            qs = qs.filter(id__in=school_ids)
        else:
            qs = School.objects.none()

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(name__icontains=search) |
                Q(unique_code__icontains=search) |
                Q(address__icontains=search)
            )

        return qs.order_by('name')


class SchoolDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = School.objects.all()

    def get_permissions(self):
        if self.request.method in ['PATCH', 'PUT', 'DELETE']:
            return [IsAdmin()]
        return [IsStaffOrAdmin()]

    def get_serializer_class(self):
        if self.request.method == 'GET' and self.request.user.role == 'ADMIN':
            return SchoolAnalyticsSerializer
        return SchoolSerializer

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        # Staff can only view their own school
        if request.user.role == 'STAFF' and request.user.school != obj:
            self.permission_denied(
                request,
                message="You do not have permission to access another campus."
            )
