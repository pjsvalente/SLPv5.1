"""
SmartLamppost v5.0 - Error Codes
Standardized error codes for frontend translation.
"""


class ErrorCode:
    """Error codes that can be translated by the frontend."""

    # Authentication errors
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
    ACCOUNT_LOCKED = "ACCOUNT_LOCKED"
    ACCOUNT_INACTIVE = "ACCOUNT_INACTIVE"
    INVALID_2FA_CODE = "INVALID_2FA_CODE"
    SESSION_EXPIRED = "SESSION_EXPIRED"
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"

    # Validation errors
    VALIDATION_ERROR = "VALIDATION_ERROR"
    FIELDS_REQUIRED = "FIELDS_REQUIRED"
    EMAIL_REQUIRED = "EMAIL_REQUIRED"
    PASSWORD_REQUIRED = "PASSWORD_REQUIRED"
    INVALID_EMAIL = "INVALID_EMAIL"
    PASSWORD_TOO_SHORT = "PASSWORD_TOO_SHORT"
    PASSWORDS_DONT_MATCH = "PASSWORDS_DONT_MATCH"
    EMAIL_ALREADY_EXISTS = "EMAIL_ALREADY_EXISTS"

    # Resource errors
    NOT_FOUND = "NOT_FOUND"
    USER_NOT_FOUND = "USER_NOT_FOUND"
    TENANT_NOT_FOUND = "TENANT_NOT_FOUND"
    ASSET_NOT_FOUND = "ASSET_NOT_FOUND"
    INTERVENTION_NOT_FOUND = "INTERVENTION_NOT_FOUND"
    TECHNICIAN_NOT_FOUND = "TECHNICIAN_NOT_FOUND"
    PRODUCT_NOT_FOUND = "PRODUCT_NOT_FOUND"

    # Plan/limit errors
    LIMIT_EXCEEDED = "LIMIT_EXCEEDED"
    MODULE_NOT_AVAILABLE = "MODULE_NOT_AVAILABLE"

    # Server errors
    SERVER_ERROR = "SERVER_ERROR"
    NETWORK_ERROR = "NETWORK_ERROR"
    UNKNOWN_ERROR = "UNKNOWN_ERROR"


def error_response(error_code: str, status_code: int = 400, details: str = None):
    """
    Create a standardized error response with error code.

    Args:
        error_code: One of the ErrorCode constants
        status_code: HTTP status code (default 400)
        details: Optional additional details for debugging

    Returns:
        Tuple of (response dict, status code)
    """
    response = {'error_code': error_code}
    if details:
        response['details'] = details
    return response, status_code
