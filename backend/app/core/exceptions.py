from fastapi import HTTPException, status

class HRMSException(HTTPException):
    def __init__(self, status_code: int, detail: str, code: str = None):
        super().__init__(status_code=status_code, detail=detail)
        self.code = code

class PermissionDeniedException(HRMSException):
    def __init__(self, detail: str = "Permission denied"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail, code="PERMISSION_DENIED")

class ResourceNotFoundException(HRMSException):
    def __init__(self, resource: str, id: any = None):
        detail = f"{resource} with id {id} not found" if id else f"{resource} not found"
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail, code="RESOURCE_NOT_FOUND")

class AuthenticationException(HRMSException):
    def __init__(self, detail: str = "Could not validate credentials"):
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail, code="AUTHENTICATION_ERROR")
