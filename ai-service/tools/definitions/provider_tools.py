from typing import List, Optional
from pydantic import BaseModel, Field
from ..base import BaseTool
from models.recommendation import ProviderCandidate, ProviderMatchProposal


# --- 1. FindProviders Tool ---
class FindProvidersInput(BaseModel):
    category: str = Field(..., description="Required skill category (e.g. Roofing, Plumbing)")
    city: str = Field(..., description="Asset city location")
    max_distance_km: float = Field(default=25.0, ge=1.0)


class ProviderSummary(BaseModel):
    provider_id: str
    business_name: str
    city: str
    rating: float
    completed_jobs: int


class FindProvidersOutput(BaseModel):
    candidates: List[ProviderSummary]
    total_found: int


class FindProvidersTool(BaseTool):
    name = "FindProviders"
    description = "Searches verified service providers matching skill category and service radius."
    input_schema = FindProvidersInput
    output_schema = FindProvidersOutput

    async def _run(self, validated_input: FindProvidersInput) -> FindProvidersOutput:
        return FindProvidersOutput(
            total_found=2,
            candidates=[
                ProviderSummary(
                    provider_id="prov-colombo-01",
                    business_name="Lanka Roof Masters & Waterproofing",
                    city="Colombo",
                    rating=4.8,
                    completed_jobs=34
                ),
                ProviderSummary(
                    provider_id="prov-colombo-02",
                    business_name="Cinnamon Builders & Restorations",
                    city="Dehiwala",
                    rating=4.5,
                    completed_jobs=19
                )
            ]
        )


# --- 2. GetProviderDetails Tool ---
class GetProviderDetailsInput(BaseModel):
    provider_id: str = Field(..., description="ServiceProvider GUID")


class GetProviderDetailsOutput(BaseModel):
    provider_id: str
    business_name: str
    verification_status: str
    skills: List[str]
    service_radius_km: float
    contact_person: str


class GetProviderDetailsTool(BaseTool):
    name = "GetProviderDetails"
    description = "Fetches comprehensive profile, license, and skills data for a contractor."
    input_schema = GetProviderDetailsInput
    output_schema = GetProviderDetailsOutput

    async def _run(self, validated_input: GetProviderDetailsInput) -> GetProviderDetailsOutput:
        return GetProviderDetailsOutput(
            provider_id=validated_input.provider_id,
            business_name="Lanka Roof Masters & Waterproofing",
            verification_status="Verified",
            skills=["RoofingAndWaterproofing", "MasonryAndPlastering"],
            service_radius_km=30.0,
            contact_person="Sunil Jayawardena"
        )


# --- 3. GetProviderHistory Tool ---
class GetProviderHistoryInput(BaseModel):
    provider_id: str = Field(..., description="ServiceProvider GUID")


class ProviderHistoryEvent(BaseModel):
    incident_title: str
    rating_given: float
    completion_date_utc: str
    feedback: str


class GetProviderHistoryOutput(BaseModel):
    provider_id: str
    average_rating: float
    job_history: List[ProviderHistoryEvent]


class GetProviderHistoryTool(BaseTool):
    name = "GetProviderHistory"
    description = "Retrieves contractor past performance ratings and milestone quality history."
    input_schema = GetProviderHistoryInput
    output_schema = GetProviderHistoryOutput

    async def _run(self, validated_input: GetProviderHistoryInput) -> GetProviderHistoryOutput:
        return GetProviderHistoryOutput(
            provider_id=validated_input.provider_id,
            average_rating=4.8,
            job_history=[
                ProviderHistoryEvent(
                    incident_title="Tile repair and waterproofing at Havelock City",
                    rating_given=5.0,
                    completion_date_utc="2026-07-20T11:00:00Z",
                    feedback="Fast execution, clean site management, no recurring leaks."
                )
            ]
        )


# --- 4. CheckAvailability Tool ---
class CheckAvailabilityInput(BaseModel):
    provider_id: str = Field(..., description="ServiceProvider GUID")
    required_date: str = Field(..., description="ISO 8601 target date (YYYY-MM-DD)")


class CheckAvailabilityOutput(BaseModel):
    provider_id: str
    is_available: bool
    earliest_available_date: str
    available_slots: List[str]


class CheckAvailabilityTool(BaseTool):
    name = "CheckAvailability"
    description = "Checks schedule slots and dispatch readiness for a service provider."
    input_schema = CheckAvailabilityInput
    output_schema = CheckAvailabilityOutput

    async def _run(self, validated_input: CheckAvailabilityInput) -> CheckAvailabilityOutput:
        return CheckAvailabilityOutput(
            provider_id=validated_input.provider_id,
            is_available=True,
            earliest_available_date=validated_input.required_date,
            available_slots=["09:00-13:00", "14:00-18:00"]
        )


# --- 5. CalculateDistance Tool ---
class CalculateDistanceInput(BaseModel):
    origin_lat: float
    origin_lng: float
    dest_lat: float
    dest_lng: float


class CalculateDistanceOutput(BaseModel):
    distance_km: float
    is_within_service_radius: bool


class CalculateDistanceTool(BaseTool):
    name = "CalculateDistance"
    description = "Computes Haversine geospatial distance between asset and contractor base coordinates."
    input_schema = CalculateDistanceInput
    output_schema = CalculateDistanceOutput

    async def _run(self, validated_input: CalculateDistanceInput) -> CalculateDistanceOutput:
        import math
        r = 6371.0
        dlat = math.radians(validated_input.dest_lat - validated_input.origin_lat)
        dlng = math.radians(validated_input.dest_lng - validated_input.origin_lng)
        a = (math.sin(dlat / 2) ** 2 +
             math.cos(math.radians(validated_input.origin_lat)) *
             math.cos(math.radians(validated_input.dest_lat)) *
             math.sin(dlng / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        distance = round(r * c, 2)
        
        return CalculateDistanceOutput(
            distance_km=distance,
            is_within_service_radius=distance <= 30.0
        )


# --- 6. FindRepresentative Tool ---
class FindRepresentativeInput(BaseModel):
    district: str = Field(..., description="Target district (e.g. Colombo, Kandy)")


class RepresentativeSummary(BaseModel):
    representative_id: str
    full_name: str
    district: str
    active_properties_managed: int
    verification_status: str


class FindRepresentativeOutput(BaseModel):
    representatives: List[RepresentativeSummary]


class FindRepresentativeTool(BaseTool):
    name = "FindRepresentative"
    description = "Finds assigned on-the-ground local representatives in the asset's operating district."
    input_schema = FindRepresentativeInput
    output_schema = FindRepresentativeOutput

    async def _run(self, validated_input: FindRepresentativeInput) -> FindRepresentativeOutput:
        return FindRepresentativeOutput(
            representatives=[
                RepresentativeSummary(
                    representative_id="rep-colombo-01",
                    full_name="Kamal Perera",
                    district=validated_input.district,
                    active_properties_managed=8,
                    verification_status="Verified"
                )
            ]
        )
