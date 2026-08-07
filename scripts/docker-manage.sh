#!/bin/bash

# Utility script to manage docker environments

COMMAND=$1
ENV=$2

if [ -z "$COMMAND" ] || [ -z "$ENV" ]; then
    echo "Usage: ./docker-manage.sh [up|down|logs|build|restart|scale] [dev|uat|prod] [additional_args...]"
    echo "Example: ./docker-manage.sh up dev -d"
    exit 1
fi

COMPOSE_FILE="docker-compose.${ENV}.yml"

if [ ! -f "$COMPOSE_FILE" ]; then
    echo "Error: Compose file $COMPOSE_FILE does not exist."
    exit 1
fi

shift 2

case "$COMMAND" in
    up)
        docker compose -f "$COMPOSE_FILE" up "$@"
        ;;
    down)
        docker compose -f "$COMPOSE_FILE" down "$@"
        ;;
    logs)
        docker compose -f "$COMPOSE_FILE" logs -f "$@"
        ;;
    build)
        docker compose -f "$COMPOSE_FILE" build "$@"
        ;;
    restart)
        docker compose -f "$COMPOSE_FILE" restart "$@"
        ;;
    scale)
        # Usage: ./docker-manage.sh scale uat app=3
        docker compose -f "$COMPOSE_FILE" up -d --scale "$@"
        ;;
    *)
        echo "Unknown command: $COMMAND"
        exit 1
        ;;
esac
