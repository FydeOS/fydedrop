 #!/bin/bash

WORKING_DIR="$(cd "$(dirname "$0")"; pwd -P)"
DOCKER_COMPOSE_BIN=$(which docker-compose)
DOCKER_COMPOSE_FILE="$WORKING_DIR/docker-compose.yml"
SERVICE_NAME="fydedrop"

usage() {
    echo "Usage: $(basename -- "$0") start|stop|restart|status|debug|rebuild|down [stag]"
    exit 1
}

main() {
    if [[ $# -lt 1 || $# -gt 2 ]]; then
        usage
    fi

    if [ "$2" == "stag" ]; then
        DOCKER_COMPOSE_FILE="$WORKING_DIR/docker-compose.stag.yml"
        SERVICE_NAME+="-stag"
    fi

    echo $DOCKER_COMPOSE_FILE

    COMMAND_COMMON="$DOCKER_COMPOSE_BIN -f $DOCKER_COMPOSE_FILE -p $SERVICE_NAME"
    case "$1" in
        start)
            echo "Starting all containers"
            sh -c "$COMMAND_COMMON up -d"
            ;;
        stop)
            echo "Stopping all containers"
            sh -c "$COMMAND_COMMON stop"
            ;;
        restart)
            echo  "Restarting all containers"
            sh -c "$COMMAND_COMMON restart"
            ;;
        status)
            sh -c "$COMMAND_COMMON ps"
            ;;
        debug)
            echo "Starting all containers foreground"
            sh -c "$COMMAND_COMMON up"
            ;;
        rebuild)
            echo "Rebuilding all containers"
            sh -c "$COMMAND_COMMON up -d --build"
            ;;
        down)
            echo "Removing all containers and images"
            sh -c "$COMMAND_COMMON down"
            ;;
        *)
            usage
            ;;
    esac
}

main "$@"
