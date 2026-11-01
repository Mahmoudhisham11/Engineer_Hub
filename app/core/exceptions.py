"""Centralized custom exceptions and HTTP error status mappings."""

from typing import Any, Dict, Optional
from fastapi import HTTPException, status


class AppException(HTTPException):
    """Base application exception with error code and structured payload."""

    def __init__(
        self,
        status_code: int,
        message: str,
        code: str = "ERROR",
        details: Optional[Any] = None,
    ):
        super().__init__(status_code=status_code, detail=message)
        self.message = message
        self.code = code
        self.details = details


class AuthenticationError(AppException):
    def __init__(self, message: str = "Could not validate credentials", details: Optional[Any] = None):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            message=message,
            code="AUTHENTICATION_FAILED",
            details=details,
        )


class PermissionDeniedError(AppException):
    def __init__(self, message: str = "Not enough permissions to perform this action", details: Optional[Any] = None):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            message=message,
            code="FORBIDDEN",
            details=details,
        )


class NotFoundError(AppException):
    def __init__(self, message: str = "Resource not found", code: str = "NOT_FOUND", details: Optional[Any] = None):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            message=message,
            code=code,
            details=details,
        )


class ConflictError(AppException):
    def __init__(self, message: str = "Resource already exists", code: str = "CONFLICT", details: Optional[Any] = None):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            message=message,
            code=code,
            details=details,
        )


class BusinessRuleError(AppException):
    def __init__(self, message: str, code: str = "BUSINESS_RULE_VIOLATION", details: Optional[Any] = None):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            message=message,
            code=code,
            details=details,
        )


class NonWorkingDayError(BusinessRuleError):
    def __init__(self, message: str = "Work log cannot be created on non-working days (Friday/Saturday).", details: Optional[Any] = None):
        super().__init__(
            message=message,
            code="NON_WORKING_DAY",
            details=details,
        )


class MaxHoursExceededError(BusinessRuleError):
    def __init__(self, message: str = "Daily work hours limit exceeded for this date.", details: Optional[Any] = None):
        super().__init__(
            message=message,
            code="MAX_HOURS_EXCEEDED",
            details=details,
        )
