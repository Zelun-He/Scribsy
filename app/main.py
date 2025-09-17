"""
main.py: FastAPI app entry point. Sets up the application, CORS, and includes API routers.
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from jose import jwt, JWTError
from datetime import datetime, timedelta
import importlib
from app.api.endpoints.transcribe import router as transcribe_router
from app.api.endpoints.notes import router as notes_router
from app.api.endpoints.auth import router as auth_router
from app.api.endpoints.patients import router as patients_router
from app.api.endpoints.s3 import router as s3_router
from app.api.endpoints.preferences import router as preferences_router
from app.api.endpoints.nudge import router as nudge_router
from app.api.endpoints.admin import router as admin_router
from app.api.endpoints.legal import router as legal_router
from app.api.endpoints.working_hours import router as working_hours_router
from app.api.endpoints.export import router as export_router
from app.api.endpoints.audio_retention import router as audio_retention_router
from app.api.endpoints.tenant_management import router as tenant_management_router
from app.utils.exceptions import ScribsyException, handle_scribsy_exception
from app.utils.logging import logger, log_error
from dotenv import load_dotenv
import os
import time
from app.config import settings
import logging
from app.db.database import engine, init_db
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.middleware import SlowAPIMiddleware
from slowapi.errors import RateLimitExceeded

# Import auth constants for session timeout
SECRET_KEY = settings.secret_key
ALGORITHM = settings.algorithm

def _load_sentry():
    try:
        sentry_sdk_mod = importlib.import_module('sentry_sdk')
        fastapi_integration_mod = importlib.import_module('sentry_sdk.integrations.fastapi')
        logging_integration_mod = importlib.import_module('sentry_sdk.integrations.logging')
        return (
            sentry_sdk_mod,
            getattr(fastapi_integration_mod, 'FastApiIntegration', None),
            getattr(logging_integration_mod, 'LoggingIntegration', None),
        )
    except Exception:
        return (None, None, None)

load_dotenv()

# Initialize Sentry if configured
_sentry_sdk, _SentryFastApiIntegration, _SentryLoggingIntegration = _load_sentry()
if settings.sentry_dsn and _sentry_sdk and _SentryFastApiIntegration and _SentryLoggingIntegration:
    _sentry_sdk.init(
        dsn=settings.sentry_dsn,
        integrations=[_SentryFastApiIntegration(), _SentryLoggingIntegration(level=logging.INFO, event_level=logging.ERROR)],
        traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.2")),
        environment=settings.sentry_environment,
    )

app = FastAPI(title="Scribsy", redirect_slashes=False)

# Global exception handler for ScribsyException
@app.exception_handler(ScribsyException)
async def scribsy_exception_handler(request: Request, exc: ScribsyException):
    log_error(exc, context=f"API endpoint: {request.url.path}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message}
    )

# Global exception handler for general exceptions
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    log_error(exc, context=f"Unhandled exception at: {request.url.path}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

# HTTPS redirect in production
if settings.https_redirect and not settings.debug:
    app.add_middleware(HTTPSRedirectMiddleware)

# CORS - configured via env
allowed_origins = settings.allowed_origins_list()
allow_credentials = False if "*" in allowed_origins else True
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=allow_credentials,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "User-Agent"],
)

# Basic rate limiting (per IP)
# Use higher limits in DEBUG/local dev to accommodate dashboard burst requests
_default_limits = ["200/minute", "10/second"]
if settings.debug:
    _default_limits = ["5000/minute", "200/second"]
limiter = Limiter(key_func=get_remote_address, default_limits=_default_limits)
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Trusted hosts and proxy headers
allowed_hosts = settings.allowed_hosts_list()
if allowed_hosts != ["*"]:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)

# Honor X-Forwarded-* from platform proxy (if available without static import)
_ProxyHeadersMiddleware = None
try:
    _ProxyHeadersMiddleware = importlib.import_module('starlette.middleware.proxy_headers').ProxyHeadersMiddleware
except Exception:
    _ProxyHeadersMiddleware = None

if _ProxyHeadersMiddleware:
    app.add_middleware(_ProxyHeadersMiddleware)


# HIPAA-compliant Security headers
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        
        # HTTPS Security (HIPAA requires encryption in transit)
        if settings.https_redirect and not settings.debug:
            response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
        
        # Content security and privacy headers (HIPAA compliance)
        if "X-Content-Type-Options" not in response.headers:
            response.headers["X-Content-Type-Options"] = "nosniff"
        if "X-Frame-Options" not in response.headers:  # Prevent clickjacking
            response.headers["X-Frame-Options"] = "DENY"
        if "X-XSS-Protection" not in response.headers:
            response.headers["X-XSS-Protection"] = "1; mode=block"
        if "Referrer-Policy" not in response.headers:  # Protect PHI in referrers
            response.headers["Referrer-Policy"] = "no-referrer"
        
        # Content Security Policy (prevent XSS and data exfiltration)
        csp_policy = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: blob:; "
            "font-src 'self'; "
            "connect-src 'self' https://scribsy-production.up.railway.app; "
            "media-src 'self'; "
            "object-src 'none'; "
            "frame-src 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
        if "Content-Security-Policy" not in response.headers:
            response.headers["Content-Security-Policy"] = csp_policy
        
        # Feature Policy / Permissions Policy (restrict sensitive features)
        permissions_policy = (
            "geolocation=(), "
            "microphone=(), "
            "camera=(), "
            "payment=(), "
            "usb=(), "
            "magnetometer=(), "
            "gyroscope=(), "
            "accelerometer=(), "
            "ambient-light-sensor=(), "
            "autoplay=(), "
            "encrypted-media=(), "
            "fullscreen=(self), "
            "picture-in-picture=()"
        )
        if "Permissions-Policy" not in response.headers:
            response.headers["Permissions-Policy"] = permissions_policy
        
        # Cache control for sensitive data (HIPAA requirement)
        if request.url.path.startswith("/patients") or request.url.path.startswith("/notes"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        
        # Remove server information (MutableHeaders supports deletion via __delitem__)
        try:
            if "server" in response.headers:
                del response.headers["server"]
            if "Server" in response.headers:
                del response.headers["Server"]
        except Exception:
            pass
        
        return response

# Session timeout middleware for HIPAA compliance
class SessionTimeoutMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        # Skip session timeout for auth endpoints
        if request.url.path.startswith("/auth/") or request.url.path in ["/", "/healthz", "/readyz"]:
            return await call_next(request)
        
        # Check for session timeout on protected endpoints
        try:
            from app.api.endpoints.auth import oauth2_scheme
            from app.db.database import get_db
            from app.audit.logger import HIPAAAuditLogger
            from jose import jwt, JWTError
            
            # Prefer Authorization header token; fall back to cookie
            token = None
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
            if not token:
                token = request.cookies.get("auth_token")
            
            if token:
                try:
                    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                    issued_at = payload.get("iat", None)
                    # Backward-compatibility: if token has no iat (older tokens), skip max-duration enforcement
                    if issued_at is not None:
                        current_time = datetime.utcnow().timestamp()
                        # Check if session has exceeded maximum duration
                        max_duration_seconds = settings.max_session_duration_hours * 3600
                        if current_time - issued_at > max_duration_seconds:
                            # Log session timeout
                            db = next(get_db())
                            try:
                                HIPAAAuditLogger.log_action(
                                    db=db,
                                    user_id=None,
                                    username=payload.get("sub", "unknown"),
                                    action_type="LOGOUT",
                                    resource_type="auth",
                                    description="Session expired - maximum duration exceeded",
                                    request=request
                                )
                            finally:
                                db.close()
                            return JSONResponse(
                                status_code=401,
                                content={"detail": "Session expired"}
                            )
                except JWTError:
                    pass  # Invalid token, let the auth dependency handle it
        except Exception:
            pass  # Skip session checks if there's an error
        
        return await call_next(request)

app.add_middleware(SessionTimeoutMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

# Mount API routers
app.include_router(transcribe_router)
app.include_router(notes_router)
app.include_router(auth_router)
app.include_router(patients_router, prefix="/patients", tags=["patients"])
app.include_router(s3_router)
app.include_router(preferences_router)
app.include_router(nudge_router)
app.include_router(admin_router)
app.include_router(legal_router)
app.include_router(working_hours_router)
app.include_router(export_router)
app.include_router(audio_retention_router)
app.include_router(tenant_management_router)

@app.on_event("startup")
def on_startup():
    """Initialize database tables on application startup."""
    try:
        init_db()
        logger.info("Database initialized (tables ensured)")
    except Exception as e:
        log_error(e, context="DB init on startup")

@app.get("/")
def root():
    logger.info("Root endpoint accessed")
    return {
        "message": "Welcome to Scribsy API",
        "documentation": "http://127.0.0.1:8000/docs",
        "health": "OK"
    }

# Liveness probe
@app.get("/healthz")
def healthz():
    return {"status": "ok", "time": int(time.time())}

# Readiness probe - checks DB and optional S3
from sqlalchemy import text
from app.services.s3_service import s3_service

@app.get("/readyz")
def readyz():
    # Check DB
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        return JSONResponse(status_code=503, content={"status": "db_unavailable", "error": str(e)})

    # Check S3 if enabled
    if settings.use_s3 and not s3_service.is_available():
        return JSONResponse(status_code=503, content={"status": "s3_unavailable"})

    return {"status": "ready"}

@app.get("/test-env")
def test_env():
    return {"OPENAI_API_KEY": os.getenv("OPENAI_API_KEY")}
