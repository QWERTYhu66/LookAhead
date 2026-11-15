from app.categories import CATEGORY_ID, CATEGORY_ORDER, category_of


def test_known_mcc():
    assert category_of(5411) == "groceries"
    assert category_of(5812) == "eating_out"
    assert category_of(5541) == "transport"
    assert category_of(7011) == "travel"
    assert category_of(5732) == "shopping"
    assert category_of(7832) == "entertainment"
    assert category_of(5912) == "health"
    assert category_of(4814) == "bills_services"


def test_unknown_mcc_is_other():
    assert category_of(9999) == "other"


def test_cash_and_transfers_are_dropped():
    for mcc in (6010, 6011, 4829, 6536, 6051, 6012):
        assert category_of(mcc) is None


def test_category_ids_are_0_to_8():
    assert CATEGORY_ORDER[-1] == "other"
    assert CATEGORY_ID["groceries"] == 0
    assert CATEGORY_ID["other"] == 8
    assert len(CATEGORY_ORDER) == 9
