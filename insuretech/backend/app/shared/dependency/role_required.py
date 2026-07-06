from fastapi import Depends

from app.shared.dependency.get_current_user import (
    get_current_user
)

from app.core.exceptions import ForbiddenException


def role_required(required_role: str):

    async def checker(
        current_user=Depends(get_current_user)
    ):

        if current_user.role.name != required_role:
            raise ForbiddenException(
                "Permission denied"
            )

        return current_user

    return checker
