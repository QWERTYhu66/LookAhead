"""MCC → the 9 category ids the app shows. Cash/transfers are excluded, not 'other'."""

from __future__ import annotations

CATEGORIES: dict[str, list[int]] = {
    "groceries": [5411, 5422, 5441, 5451, 5462, 5499, 5300, 5309, 5310, 5311, 5331, 5399],
    "eating_out": [5811, 5812, 5813, 5814],
    "transport": [
        4111, 4112, 4121, 4131, 4784, 4789, 5541, 5542, 7523, 7512, 3351, 5511, 5532, 5533,
        7531, 7538, 7542, 5172, 5983,
    ],
    "travel": [3000, 3501, 4411, 4511, 4722, 7011],
    "shopping": [
        5611, 5621, 5631, 5641, 5651, 5655, 5661, 5681, 5691, 5697, 5699, 5131, 5137, 5200,
        5211, 5231, 5251, 5261, 5712, 5713, 5714, 5719, 5722, 5732, 5733, 5734, 5735,
        *range(5940, 5951),
        *range(5964, 5972),
        5977, 5992, 5993, 5995, 5999, 5013, 5039, 5044, 5045, 5065, 5072, 5074, 5085, 5094,
        5099, 5111, 5169, 5192, 5193, 5199, 5931, 7278,
    ],
    "entertainment": [5816, 7829, 7832, 7841, 7922, 7932, 7933, 7991, 7993, 7994, 7995, 7996, 7997, 7999, 5921, 7273],
    "health": [5912, 5122, 5976, 8011, 8021, 8043, 8062, 8071, 8099, 7298, 5047],
    "bills_services": [
        4814, 4812, 4816, 4899, 4900, 7372, 7375, 7399, 7311, 7338, 7210, 7216, 7221, 7230,
        7299, 7395, 7629, 7699, 8999, 6300, 6513, 9211, 9222, 9311, 9399, 9402, 4214, 4215,
        2741, 742, 1711, 1731, 1799, 8220, 8244, 8299, 8398, 8641, 8699, 6211,
    ],
}

# Order is category_id 0..8. The app has a label for each of these ids.
CATEGORY_ORDER = [
    "groceries",
    "eating_out",
    "transport",
    "travel",
    "shopping",
    "entertainment",
    "health",
    "bills_services",
    "other",
]
CATEGORY_ID = {name: i for i, name in enumerate(CATEGORY_ORDER)}

# Cash and transfers: we cannot know what the money was for, so they are not a target.
EXCLUDED_MCC = {6010, 6011, 4829, 6536, 6051, 6012}

MCC_TO_CATEGORY: dict[int, str] = {
    mcc: name for name, codes in CATEGORIES.items() for mcc in codes
}


def category_of(mcc: int) -> str | None:
    """Map a merchant code to a category. None means drop the row (cash/transfer)."""
    code = int(mcc)
    if code in EXCLUDED_MCC:
        return None
    return MCC_TO_CATEGORY.get(code, "other")
