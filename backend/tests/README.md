# MindCare Tests

## Run all tests
```bash
cd backend
pytest tests/ -v
```

## Run specific test
```bash
pytest tests/test_api.py::test_register_success -v
```

## What is tested
- Health endpoints
- User registration (success, weak password, no number, bad email)
- Login (success, wrong password)
- Auth protection (all protected endpoints return 401 without token)
- PHQ-9 scoring (minimal, severe, wrong count)
- GAD-7 scoring
- Chat message validation (too long)
- Metrics endpoints
- Trajectory endpoint
- Emotion status
