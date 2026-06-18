import asyncio

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.users import User
from app.models.roles import Role
from app.modules.auth.password_hashing import hash


async def seed_roles_and_admin():
    async with AsyncSessionLocal() as db:

        # Create ADMIN role
        admin_role_result = await db.execute(
            select(Role).where(Role.name == "ADMIN")
        )
        admin_role = admin_role_result.scalar_one_or_none()

        if not admin_role:
            admin_role = Role(name="ADMIN")
            db.add(admin_role)

        # Create USER role
        user_role_result = await db.execute(
            select(Role).where(Role.name == "USER")
        )
        user_role = user_role_result.scalar_one_or_none()

        if not user_role:
            user_role = Role(name="USER")
            db.add(user_role)

        await db.commit()

        # Refresh to get UUIDs
        await db.refresh(admin_role)
        await db.refresh(user_role)

        # Check if admin user exists
        admin_user_result = await db.execute(
            select(User).where(User.email == "admin@gmail.com")
        )
        existing_admin = admin_user_result.scalar_one_or_none()

        if not existing_admin:
            admin_user = User(
                email="admin@gmail.com",
                password_hash=hash("Admin@123"),
                full_name="System Admin",
                phone="7234567891",
                role_id=admin_role.id
            )

            db.add(admin_user)
            await db.commit()

        print("Roles seeded successfully")
        print("Admin user seeded successfully")


if __name__ == "__main__":
    asyncio.run(seed_roles_and_admin())
