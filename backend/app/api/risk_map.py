"""
Dashboard Risk Map API — computes per-country risk from article_analysis.affected_regions.

Endpoints:
  GET /api/v2/dashboard/risk_map          → aggregated country risk data
  GET /api/v2/dashboard/risk_map/articles → articles for a specific country
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional
from app.core.database import get_db

router = APIRouter(prefix="/api/v2/dashboard", tags=["Dashboard"])

# ---------------------------------------------------------------------------
# Region → standard country name normalization
# ---------------------------------------------------------------------------

# Maps TopoJSON names ↔ common DB variants
_ALIAS_TO_COUNTRY: dict[str, str] = {
    # Direct aliases
    "us": "United States of America",
    "usa": "United States of America",
    "u.s.": "United States of America",
    "u.s.a.": "United States of America",
    "united states": "United States of America",
    "america": "United States of America",
    "uk": "United Kingdom",
    "united kingdom": "United Kingdom",
    "britain": "United Kingdom",
    "great britain": "United Kingdom",
    "england": "United Kingdom",
    "russia": "Russia",
    "china": "China",
    "iran": "Iran",
    "israel": "Israel",
    "palestine": "Palestine",
    "palestinian territories": "Palestine",
    "gaza": "Palestine",
    "gaza strip": "Palestine",
    "occupied west bank": "Palestine",
    "east jerusalem": "Palestine",
    "north korea": "North Korea",
    "korea (north)": "North Korea",
    "south korea": "South Korea",
    "korea (south)": "South Korea",
    "turkey": "Turkey",
    "japan": "Japan",
    "india": "India",
    "pakistan": "Pakistan",
    "australia": "Australia",
    "france": "France",
    "germany": "Germany",
    "spain": "Spain",
    "mexico": "Mexico",
    "canada": "Canada",
    "brazil": "Brazil",
    "ukraine": "Ukraine",
    "cuba": "Cuba",
    "nigeria": "Nigeria",
    "lebanon": "Lebanon",
    "nepal": "Nepal",
    "ireland": "Ireland",
    "norway": "Norway",
    "poland": "Poland",
    "greece": "Greece",
    "kuwait": "Kuwait",
    "bahrain": "Bahrain",
    "qatar": "Qatar",
    "indonesia": "Indonesia",
    "malaysia": "Malaysia",
    "thailand": "Thailand",
    "peru": "Peru",
    "belgium": "Belgium",
    "sudan": "Sudan",
    "somalia": "Somalia",
    "afghanistan": "Afghanistan",
    "myanmar (burma)": "Myanmar",
    "myanmar": "Myanmar",
    "sri lanka": "Sri Lanka",
    "latvia": "Latvia",
    "czechia": "Czechia",
    "switzerland": "Switzerland",
    "south africa": "South Africa",
    "democratic republic of congo": "Dem. Rep. Congo",
    "bosnia and herzegovina": "Bosnia and Herz.",
}

# Broad-region → constituent countries expansion
_REGION_EXPANSION: dict[str, list[str]] = {
    "middle east": ["Iran", "Iraq", "Israel", "Palestine", "Saudi Arabia", "Syria",
                     "Jordan", "Lebanon", "Yemen", "Oman", "Kuwait", "Bahrain",
                     "Qatar", "United Arab Emirates", "Turkey"],
    "middle east (iran)": ["Iran"],
    "west asia (middle east)": ["Iran", "Iraq", "Israel", "Palestine", "Saudi Arabia",
                                 "Syria", "Jordan", "Lebanon"],
    "gulf region": ["Saudi Arabia", "Kuwait", "Bahrain", "Qatar",
                    "United Arab Emirates", "Oman", "Iran"],
    "persian gulf": ["Saudi Arabia", "Kuwait", "Bahrain", "Qatar",
                     "United Arab Emirates", "Oman", "Iran"],
    "southeast asia": ["Indonesia", "Malaysia", "Thailand", "Vietnam",
                       "Philippines", "Myanmar", "Singapore", "Cambodia",
                       "Laos", "Brunei"],
    "south asia": ["India", "Pakistan", "Bangladesh", "Sri Lanka", "Nepal",
                   "Bhutan", "Afghanistan"],
    "south asia (india and surrounding regions)": ["India", "Pakistan",
                                                    "Bangladesh", "Sri Lanka", "Nepal"],
    "south asia (pakistan's region of influence)": ["Pakistan", "Afghanistan"],
    "east asia": ["China", "Japan", "South Korea", "North Korea", "Mongolia", "Taiwan"],
    "eastern europe": ["Poland", "Ukraine", "Romania", "Hungary", "Czechia",
                       "Slovakia", "Bulgaria", "Belarus", "Moldova"],
    "european union": ["France", "Germany", "Italy", "Spain", "Netherlands",
                       "Belgium", "Poland", "Sweden", "Austria", "Ireland",
                       "Denmark", "Finland", "Portugal", "Greece", "Czechia",
                       "Romania", "Hungary", "Croatia", "Slovakia", "Bulgaria",
                       "Lithuania", "Latvia", "Estonia", "Slovenia", "Luxembourg",
                       "Cyprus", "Malta"],
    "europe": ["France", "Germany", "Italy", "Spain", "Netherlands", "Belgium",
               "Poland", "Sweden", "Austria", "Ireland", "Denmark", "Finland",
               "Portugal", "Greece", "Norway", "Switzerland", "United Kingdom"],
    "north america": ["United States of America", "Canada", "Mexico"],
    "indo-pacific region": ["India", "Australia", "Japan", "Indonesia",
                            "Philippines", "South Korea"],
    "indo-pacific": ["India", "Australia", "Japan", "Indonesia",
                     "Philippines", "South Korea"],
    "baltic region": ["Lithuania", "Latvia", "Estonia"],
    "nato member states": ["United States of America", "United Kingdom", "France",
                           "Germany", "Italy", "Canada", "Turkey", "Poland",
                           "Norway", "Denmark", "Netherlands", "Belgium",
                           "Spain", "Portugal", "Greece"],
    "caribbean region": ["Cuba", "Jamaica", "Haiti", "Dominican Rep.",
                         "Trinidad and Tobago"],
    "asia-pacific": ["China", "Japan", "Australia", "South Korea", "India",
                     "Indonesia"],
    "asia-pacific region": ["China", "Japan", "Australia", "South Korea", "India",
                            "Indonesia"],
    "eastern mediterranean": ["Turkey", "Greece", "Cyprus", "Syria", "Lebanon"],
    "africa": ["Nigeria", "South Africa", "Kenya", "Egypt", "Ethiopia",
               "Ghana", "Tanzania", "Algeria", "Morocco", "Sudan"],
}

# Regions to skip entirely (not geographically meaningful for a map)
_SKIP_REGIONS = {
    "global", "global markets", "global economy", "global financial markets",
    "global oil markets", "global oil market", "global energy markets",
    "global energy market", "global trade markets", "global market",
    "global crypto markets", "cryptocurrency markets",
    "cryptocurrency markets worldwide", "global community",
    "global sports community", "global football community",
    "global aviation community", "global maritime areas",
    "global tourism industry", "entertainment industry",
    "global (due to potential regional instability)",
    "global (public perception and reputation of bill gates and jeffrey epstein)",
    "international football associations", "international sports industry",
    "us stock market", "us navy operations", "us interests in the region",
    "us embassy in brussels", "us allies in the gulf (kuwait, bahrain)",
    "global sports community", "us west coast",
    "united states (lawmakers and government institutions)",
    "united states (pension funds)",
    "member states of the eu", "european commission",
    "european capitals", "neighboring countries",
    "arab states", "gulf cooperation council (gcc) countries",
    "qatar (host country)", "qeshm island", "qeshm island (iran)",
    "europe (uefa region)",
}


def _normalize_region(raw_region: str) -> list[str]:
    """
    Given a raw affected_region string from the DB, return a list of
    standard country names that match TopoJSON vocabulary.
    """
    key = raw_region.strip().lower()

    # Skip non-geographic regions
    if key in _SKIP_REGIONS:
        return []

    # Direct alias match
    if key in _ALIAS_TO_COUNTRY:
        return [_ALIAS_TO_COUNTRY[key]]

    # Region expansion
    if key in _REGION_EXPANSION:
        return _REGION_EXPANSION[key]

    # Try title-case match against alias keys (handles "Iran" → "iran")
    if key in _ALIAS_TO_COUNTRY:
        return [_ALIAS_TO_COUNTRY[key]]

    # If it looks like a proper country name already, pass it through
    # (TopoJSON might match it directly)
    return [raw_region.strip()]


# ---------------------------------------------------------------------------
# Risk scoring formula
# ---------------------------------------------------------------------------

_RISK_LEVEL_WEIGHT = {"low": 0.15, "medium": 0.45, "high": 0.75, "critical": 1.0}


def _compute_risk_tier(score: float) -> str:
    if score >= 0.70:
        return "Critical"
    elif score >= 0.50:
        return "High"
    elif score >= 0.30:
        return "Medium"
    return "Low"


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/risk_map")
async def get_risk_map(db: AsyncSession = Depends(get_db)):
    """
    Aggregate per-country risk data from all analyzed articles.

    Returns a dict of country → { risk, score, article_count, avg_sentiment,
    avg_strategic, max_risk }.
    """
    rows = await db.execute(text("""
        SELECT
            jsonb_array_elements_text(aa.affected_regions) AS region,
            aa.risk_level,
            aa.sentiment_score,
            aa.strategic_score,
            a.id AS article_id
        FROM article_analysis aa
        JOIN articles a ON a.id = aa.article_id
        WHERE aa.affected_regions IS NOT NULL
          AND jsonb_array_length(aa.affected_regions) > 0
    """))

    # Accumulate per-country stats
    country_stats: dict[str, dict] = {}

    for row in rows:
        raw_region = row[0]
        risk_level = (row[1] or "low").lower()
        sentiment = row[2] if row[2] is not None else 0.0
        strategic = row[3] if row[3] is not None else 0.0

        countries = _normalize_region(raw_region)
        for country in countries:
            if country not in country_stats:
                country_stats[country] = {
                    "sentiments": [],
                    "strategics": [],
                    "risk_weights": [],
                    "article_ids": set(),
                }
            stats = country_stats[country]
            stats["sentiments"].append(sentiment)
            stats["strategics"].append(strategic)
            stats["risk_weights"].append(_RISK_LEVEL_WEIGHT.get(risk_level, 0.15))
            stats["article_ids"].add(str(row[4]))

    # Compute composite scores
    result: dict[str, dict] = {}
    for country, stats in country_stats.items():
        n = len(stats["sentiments"])
        avg_sentiment = sum(stats["sentiments"]) / n
        avg_strategic = sum(stats["strategics"]) / n
        avg_risk_weight = sum(stats["risk_weights"]) / n

        # Normalize sentiment: -1 (very negative) → 1.0 risk, +1 (positive) → 0.0
        norm_sentiment = (1.0 - avg_sentiment) / 2.0  # maps [-1,1] → [1,0]
        # Normalize strategic: 0–100 → 0–1
        norm_strategic = min(avg_strategic / 100.0, 1.0)

        composite = 0.4 * avg_risk_weight + 0.3 * norm_sentiment + 0.3 * norm_strategic
        composite = min(max(composite, 0.0), 1.0)

        result[country] = {
            "risk": _compute_risk_tier(composite),
            "score": round(composite, 3),
            "article_count": len(stats["article_ids"]),
            "avg_sentiment": round(avg_sentiment, 3),
            "avg_strategic": round(avg_strategic, 1),
            "max_risk": _compute_risk_tier(max(stats["risk_weights"])),
        }

    return {"countries": result}


@router.get("/risk_map/articles")
async def get_country_articles(
    country: str = Query(..., description="Country name to filter articles by"),
    db: AsyncSession = Depends(get_db),
):
    """
    Return all articles whose affected_regions matches the given country.
    Applies the same normalization so clicking 'United States of America' on
    the map also returns articles tagged with 'US', 'United States', etc.
    """
    # Build reverse lookup: which raw region strings map to this country?
    matching_raw_regions: set[str] = set()

    # Check direct aliases
    for alias, std_name in _ALIAS_TO_COUNTRY.items():
        if std_name.lower() == country.lower() or alias == country.lower():
            matching_raw_regions.add(alias)
            matching_raw_regions.add(std_name.lower())

    # Check region expansions
    for region_key, expansion_countries in _REGION_EXPANSION.items():
        for ec in expansion_countries:
            if ec.lower() == country.lower():
                matching_raw_regions.add(region_key)

    # Always include the country name itself (case-insensitive)
    matching_raw_regions.add(country.lower())

    # Query articles whose affected_regions array contains any matching region
    # We use a lateral join approach: unnest each article's regions and check
    rows = await db.execute(text("""
        SELECT DISTINCT
            a.id, a.title, a.url, a.published_at, a.language,
            aa.sentiment_label, aa.sentiment_score,
            aa.risk_level, aa.strategic_score,
            aa.summary, aa.affected_regions
        FROM article_analysis aa
        JOIN articles a ON a.id = aa.article_id,
        LATERAL jsonb_array_elements_text(aa.affected_regions) AS region
        WHERE aa.affected_regions IS NOT NULL
          AND jsonb_array_length(aa.affected_regions) > 0
          AND LOWER(region) = ANY(:regions)
        ORDER BY a.published_at DESC
    """), {"regions": list(matching_raw_regions)})

    articles = []
    for row in rows:
        d = dict(row._mapping)
        d["id"] = str(d["id"])
        if d["published_at"]:
            d["published_at"] = d["published_at"].isoformat()
        articles.append(d)

    return {"country": country, "article_count": len(articles), "articles": articles}
