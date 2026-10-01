from rest_framework.views import APIView
from rest_framework.generics import CreateAPIView, ListAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from api.permissions import IsAdmin
from accounts.models import User
from api.serializers.accounts import (
    UserSerializer,
    RegisterSerializer,
    StaffCreateSerializer,
    StaffSerializer
)


class MeView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class RegisterView(CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    

class StaffCreateView(CreateAPIView):
    queryset = User.objects.all()
    serializer_class = StaffCreateSerializer
    permission_classes = [IsAdmin]


class StaffListView(ListAPIView):
    permission_classes = [IsAdmin]
    serializer_class = StaffSerializer

    def get_queryset(self):
        qs = User.objects.filter(role='STAFF').select_related('school').order_by('-date_joined')
        school_id = self.request.query_params.get('school')
        if school_id:
            qs = qs.filter(school_id=school_id)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search) |
                Q(phone_number__icontains=search) |
                Q(school__name__icontains=search)
            )
        return qs


class StaffDetailView(RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdmin]
    serializer_class = StaffSerializer
    queryset = User.objects.filter(role='STAFF')