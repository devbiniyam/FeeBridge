from rest_framework import serializers
from accounts.models import User, RoleChoices


class UserSerializer(serializers.ModelSerializer):
    school_name = serializers.ReadOnlyField(source='school.name')
    wallet_balance = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'role', 'phone_number', 'email', 'school', 'school_name', 'wallet_balance']

    def get_wallet_balance(self, obj):
        wallet = getattr(obj, 'wallet', None)
        return str(wallet.balance) if wallet else None


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'phone_number','email', 'password', 'gender']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.role = RoleChoices.PARENT
        user.set_password(password)
        user.save()
        return user
    
class StaffCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'phone_number', 'email', 'password', 'gender', 'role', 'school']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user