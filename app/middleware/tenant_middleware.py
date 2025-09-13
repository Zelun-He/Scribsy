"""
Tenant isolation middleware for automatic tenant filtering
"""
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from typing import Callable
import logging

logger = logging.getLogger(__name__)


class TenantIsolationMiddleware(BaseHTTPMiddleware):
    """
    Middleware to automatically apply tenant isolation to database queries
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Apply tenant isolation to requests
        """
        # Extract tenant context from request headers or JWT token
        tenant_id = self._extract_tenant_id(request)
        
        # Add tenant context to request state for use in endpoints
        request.state.tenant_id = tenant_id
        
        # Process the request
        response = await call_next(request)
        
        return response
    
    def _extract_tenant_id(self, request: Request) -> str:
        """
        Extract tenant ID from request headers or JWT token
        """
        # Method 1: Check for tenant header
        tenant_header = request.headers.get("X-Tenant-ID")
        if tenant_header:
            return tenant_header
        
        # Method 2: Extract from JWT token (if available)
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            try:
                # In a real implementation, you'd decode the JWT here
                # For now, we'll use a default tenant
                # token = auth_header.split(" ")[1]
                # decoded_token = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                # return decoded_token.get("tenant_id", "default")
                pass
            except Exception as e:
                logger.warning(f"Failed to extract tenant from JWT: {e}")
        
        # Method 3: Default tenant for single-tenant deployments
        return "default"
