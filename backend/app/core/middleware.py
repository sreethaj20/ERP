import time
import uuid
from fastapi import Request
import logging
import traceback

logger = logging.getLogger(__name__)

class LoggingMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope.get("method") == "OPTIONS":
            return await self.app(scope, receive, send)

        start_time = time.time()
        request_id = str(uuid.uuid4())
        scope.setdefault("state", {})
        scope["state"]["request_id"] = request_id

        # Minimal request object for headers without consuming body
        request = Request(scope, receive=receive)
        user_agent = request.headers.get("user-agent", "unknown").lower()
        
        # Bot/Scraper Protection (Simplified for Stabilized Environment)
        # We only log automated access rather than blocking it during development/stabilization
        if any(keyword in user_agent for keyword in ["scrapy", "headless"]):
             logger.info(f"[INFO] Automated tool detected: {user_agent}")

        path = scope.get("path", "")
        method = scope.get("method", "")
        status_code = [500]

        async def send_wrapper(message):
            try:
                if message["type"] == "http.response.start":
                    status_code[0] = message.get("status", 500)
                    headers = list(message.get("headers", []))
                    headers.append((b"X-Request-ID", request_id.encode()))
                    headers.append((b"X-Process-Time", str(time.time() - start_time).encode()))
                    message["headers"] = headers
            except Exception as e:
                trace = traceback.format_exc()
                print("\n" + "!"*60)
                print(f"[CRITICAL BREACH] {method} {path}")
                print(f"Error: {e}")
                print(f"Traceback:\n{trace}")
                print("!"*60 + "\n")
                logger.error(f"[CRITICAL ERROR] {method} {path}: {e}")
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        except Exception as e:
            # Check if it is a Starlette/FastAPI HTTPException - these should be handled by FastAPI
            from fastapi import HTTPException as FastAPIHTTPException
            from starlette.exceptions import HTTPException as StarletteHTTPException
            
            if isinstance(e, (FastAPIHTTPException, StarletteHTTPException)):
                # Re-raise so FastAPI exception handlers can catch it and return 400/404 etc
                raise e
                
            trace = traceback.format_exc()
            print("\n" + "!"*60)
            print(f"[CRITICAL APP CRASH] {method} {path}")
            print(f"Error: {e}")
            print(f"Traceback:\n{trace}")
            print("!"*60 + "\n")
            
            logger.error(f"App crashed in LoggingMiddleware: {e}")
            from fastapi.responses import JSONResponse
            
            response = JSONResponse(
                status_code=500,
                content={
                    "detail": "Internal Server Error",
                    "error": str(e),
                    "request_id": request_id
                }
            )
            return await response(scope, receive, send)
        finally:
            duration = time.time() - start_time
            logger.info(f"Response: {status_code[0]} {method} {path} (Duration: {duration:.4f}s)")


