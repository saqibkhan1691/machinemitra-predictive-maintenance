import sys
sys.path.insert(0, '/app')
from app.main import risk_for

def test_risk_thresholds():
    assert risk_for(0.2999) == 'Low'
    assert risk_for(0.30) == 'Medium'
    assert risk_for(0.6999) == 'Medium'
    assert risk_for(0.70) == 'High'
