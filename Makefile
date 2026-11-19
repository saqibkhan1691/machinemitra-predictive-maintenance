.PHONY: up down logs train
up:
	docker compose up --build -d
down:
	docker compose down
logs:
	docker compose logs -f
train:
	curl -X POST http://localhost:8000/api/train
