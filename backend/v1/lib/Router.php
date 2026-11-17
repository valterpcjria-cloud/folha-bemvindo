<?php
declare(strict_types=1);

class Router
{
    private array $routes = [];
    private $notFoundHandler;

    public function add(string $route, callable $handler): void
    {
        $this->routes[$route] = $handler;
    }

    public function setNotFound(callable $handler): void
    {
        $this->notFoundHandler = $handler;
    }

    public function dispatch(string $route): void
    {
        if (isset($this->routes[$route])) {
            call_user_func($this->routes[$route]);
        }
        elseif ($this->notFoundHandler) {
            call_user_func($this->notFoundHandler);
        }
        else {
            http_response_code(404);
            echo json_encode(["error" => "Rota não encontrada", "route" => $route]);
        }
    }
}