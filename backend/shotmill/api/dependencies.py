from fastapi import Request

from shotmill.application.container import ApplicationContainer


def get_container(request: Request) -> ApplicationContainer:
    return request.app.state.container
