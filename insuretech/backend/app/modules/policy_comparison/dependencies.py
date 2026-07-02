from app.modules.policy_comparison.provider import Provider as DefaultProvider


async def get_business_context_provider():
    return DefaultProvider
