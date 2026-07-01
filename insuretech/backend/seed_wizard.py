import json
import logging
import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import QuestionFactorMapping, AnswerScoreRule, RiskFactor, RiskCategory, Question
from app.core.database import AsyncSessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def seed_underwriting_wizard(session: AsyncSession, json_filepath: str):
    logger.info(f"Starting seed process from {json_filepath}...")

    with open(json_filepath, 'r') as f:
        json_data = json.load(f)

    try:
        category_cache = {}
        factor_cache = {}
        question_cache = {}

        logger.info("Phase 1: Resolving Risk Categories and Factors...")
        for q_data in json_data:
            if q_data.get("skip"):
                continue
            for rule in q_data.get("scoring_rules", []):
                cat_name = rule["risk_category_name"]
                fac_name = rule["factor_name"]

                if cat_name not in category_cache:
                    result = await session.execute(select(RiskCategory).filter_by(name=cat_name))
                    cat_obj = result.scalar_one_or_none()
                    if not cat_obj:
                        cat_obj = RiskCategory(name=cat_name, description=f"Auto-generated category for {cat_name}")
                        session.add(cat_obj)
                        await session.flush()
                    category_cache[cat_name] = cat_obj.id

                cat_id = category_cache[cat_name]

                fac_key = (fac_name, cat_id)
                if fac_key not in factor_cache:
                    result = await session.execute(
                        select(RiskFactor).filter_by(factor_name=fac_name, risk_category_id=cat_id)
                    )
                    fac_obj = result.scalar_one_or_none()
                    if not fac_obj:
                        fac_obj = RiskFactor(
                            factor_name=fac_name,
                            risk_category_id=cat_id,
                            description=f"Auto-generated factor for {fac_name}",
                            weight=1.0,
                        )
                        session.add(fac_obj)
                        await session.flush()
                    factor_cache[fac_key] = fac_obj.id

        logger.info("Phase 2: Inserting Questions...")
        for q_data in json_data:
            if q_data.get("skip"):
                continue
            result = await session.execute(select(Question).filter_by(unified_id=q_data["unified_id"]))
            q_obj = result.scalar_one_or_none()
            if not q_obj:
                q_obj = Question(
                    unified_id=q_data["unified_id"],
                    question_text=q_data["question_text"],
                    section=q_data["section"],
                    question_type=q_data["question_type"],
                    applicable_segment=q_data["applicable_segment"],
                    options=q_data.get("options", []),
                    legacy_metadata=q_data.get("mapped_from", []),
                    is_conditional=q_data.get("is_conditional", False),
                    tier=q_data.get("tier", 1),
                    order_index=q_data.get("order_index", 0),
                    is_active=True,
                )
                session.add(q_obj)
                await session.flush()
            question_cache[q_data["unified_id"]] = q_obj.id

        logger.info("Phase 2.5: Resolving parent question relationships...")
        for q_data in json_data:
            if q_data.get("skip"):
                continue
            parent_uid = q_data.get("parent_unified_id")
            if parent_uid:
                q_id = question_cache.get(q_data["unified_id"])
                parent_id = question_cache.get(parent_uid)
                if q_id and parent_id:
                    result = await session.execute(
                        select(Question).filter_by(id=q_id)
                    )
                    q_obj = result.scalar_one_or_none()
                    if q_obj:
                        q_obj.parent_question_id = parent_id
                        q_obj.parent_answer_value = q_data.get("parent_answer_value")
                        await session.flush()

        logger.info("Phase 3: Creating Factor Mappings and Scoring Rules...")
        for q_data in json_data:
            if q_data.get("skip"):
                continue
            q_id = question_cache[q_data["unified_id"]]
            mapped_factors = set()

            for rule in q_data.get("scoring_rules", []):
                cat_name = rule["risk_category_name"]
                fac_name = rule["factor_name"]
                cat_id = category_cache[cat_name]
                fac_id = factor_cache[(fac_name, cat_id)]

                if fac_id not in mapped_factors:
                    result = await session.execute(
                        select(QuestionFactorMapping).filter_by(question_id=q_id, risk_factor_id=fac_id)
                    )
                    existing_map = result.scalar_one_or_none()
                    if not existing_map:
                        qfm = QuestionFactorMapping(question_id=q_id, risk_factor_id=fac_id)
                        session.add(qfm)
                    mapped_factors.add(fac_id)

                result = await session.execute(
                    select(AnswerScoreRule).filter_by(
                        question_id=q_id,
                        risk_factor_id=fac_id,
                        answer_value=rule["answer_value"],
                    )
                )
                existing_rule = result.scalar_one_or_none()

                if not existing_rule:
                    score_rule = AnswerScoreRule(
                        question_id=q_id,
                        risk_factor_id=fac_id,
                        answer_value=rule["answer_value"],
                        score=float(rule["score"]),
                        weight=float(rule.get("weight", 1.0)),
                    )
                    session.add(score_rule)

        await session.commit()
        logger.info("SUCCESS! The Golden Record has been securely seeded into PostgreSQL.")

    except Exception as e:
        await session.rollback()
        logger.error(f"CRITICAL ERROR during seed. Transaction rolled back entirely.\nDetails: {str(e)}")
        raise e


if __name__ == "__main__":
    async def main():
        async with AsyncSessionLocal() as db:
            await seed_underwriting_wizard(db, "master_seed_final.json")
    asyncio.run(main())
