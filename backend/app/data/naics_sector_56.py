"""Sector 56 NAICS leaf codes (6-digit) for government Radar coverage.

SAM queries require full six-digit codes. Parents (56 / 5613) are grouping only.
Add future sectors as sibling modules and register them in SECTOR_SEEDS.
"""

from __future__ import annotations

SECTOR_56 = {
    "sector_code": "56",
    "sector_title": "Administrative and Support and Waste Management and Remediation Services",
    "groups": [
        {
            "group_code": "5611",
            "group_title": "Office Administrative Services",
            "codes": [
                ("561110", "Office Administrative Services"),
            ],
        },
        {
            "group_code": "5612",
            "group_title": "Facilities Support Services",
            "codes": [
                ("561210", "Facilities Support Services"),
            ],
        },
        {
            "group_code": "5613",
            "group_title": "Employment Services",
            "codes": [
                ("561311", "Employment Placement Agencies"),
                ("561312", "Executive Search Services"),
                ("561320", "Temporary Help Services"),
                ("561330", "Professional Employer Organizations"),
            ],
        },
        {
            "group_code": "5614",
            "group_title": "Business Support Services",
            "codes": [
                ("561410", "Document Preparation Services"),
                ("561421", "Telephone Answering Services"),
                ("561422", "Telemarketing Bureaus and Other Contact Centers"),
                ("561431", "Private Mail Centers"),
                ("561439", "Other Business Service Centers (including Copy Shops)"),
                ("561440", "Collection Agencies"),
                ("561450", "Credit Bureaus"),
                ("561491", "Repossession Services"),
                ("561492", "Court Reporting and Stenotype Services"),
                ("561499", "All Other Business Support Services"),
            ],
        },
        {
            "group_code": "5615",
            "group_title": "Travel Arrangement and Reservation Services",
            "codes": [
                ("561510", "Travel Agencies"),
                ("561520", "Tour Operators"),
                ("561591", "Convention and Visitors Bureaus"),
                ("561599", "All Other Travel Arrangement and Reservation Services"),
            ],
        },
        {
            "group_code": "5616",
            "group_title": "Investigation and Security Services",
            "codes": [
                ("561611", "Investigation and Personal Background Check Services"),
                ("561612", "Security Guards and Patrol Services"),
                ("561613", "Armored Car Services"),
                ("561621", "Security Systems Services (except Locksmiths)"),
                ("561622", "Locksmiths"),
            ],
        },
        {
            "group_code": "5617",
            "group_title": "Services to Buildings and Dwellings",
            "codes": [
                ("561710", "Exterminating and Pest Control Services"),
                ("561720", "Janitorial Services"),
                ("561730", "Landscaping Services"),
                ("561740", "Carpet and Upholstery Cleaning Services"),
                ("561790", "Other Services to Buildings and Dwellings"),
            ],
        },
        {
            "group_code": "5619",
            "group_title": "Other Support Services",
            "codes": [
                ("561910", "Packaging and Labeling Services"),
                ("561920", "Convention and Trade Show Organizers"),
                ("561990", "All Other Support Services"),
            ],
        },
        {
            "group_code": "5621",
            "group_title": "Waste Collection",
            "codes": [
                ("562111", "Solid Waste Collection"),
                ("562112", "Hazardous Waste Collection"),
                ("562119", "Other Waste Collection"),
            ],
        },
        {
            "group_code": "5622",
            "group_title": "Waste Treatment and Disposal",
            "codes": [
                ("562211", "Hazardous Waste Treatment and Disposal"),
                ("562212", "Solid Waste Landfill"),
                ("562213", "Solid Waste Combustors and Incinerators"),
                ("562219", "Other Nonhazardous Waste Treatment and Disposal"),
            ],
        },
        {
            "group_code": "5629",
            "group_title": "Remediation and Other Waste Management Services",
            "codes": [
                ("562910", "Remediation Services"),
                ("562920", "Materials Recovery Facilities"),
                ("562991", "Septic Tank and Related Services"),
                ("562998", "All Other Miscellaneous Waste Management Services"),
            ],
        },
    ],
}

# Register more sectors here later (e.g. SECTOR_54). Admin catalog picks them up after seed.
SECTOR_SEEDS: list[dict] = [SECTOR_56]

# Default coverage for new free / invited workspaces until sales expands them.
DEFAULT_USER_NAICS_CODES: tuple[str, ...] = (
    "561311",
    "561312",
    "561320",
    "561330",
)
