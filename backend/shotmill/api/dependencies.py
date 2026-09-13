from typing import Annotated

from fastapi import Depends, Request

from shotmill.application.container import ApplicationContainer


def get_container(request: Request) -> ApplicationContainer:
    return request.app.state.container


ContainerDep = Annotated[ApplicationContainer, Depends(get_container)]
